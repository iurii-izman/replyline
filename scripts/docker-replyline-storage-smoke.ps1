param(
  [string]$ProjectName = "replyline"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-Docker {
  param([string[]]$Arguments)

  $output = & docker @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed: docker $($Arguments -join ' ')`n$($output -join "`n")"
  }
  return @($output)
}

function Get-ServiceContainer {
  param([string]$Service)

  $names = @(
    @(
      Invoke-Docker -Arguments @(
        "ps",
        "--filter", "label=com.docker.compose.project=$ProjectName",
        "--filter", "label=com.docker.compose.service=$Service",
        "--format", "{{.Names}}"
      )
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })

  if ($names.Count -ne 1) {
    throw "Expected one running container for service $Service, found $($names.Count)."
  }
  return $names[0].Trim()
}

function Assert-ContainsOk {
  param(
    [string]$Probe,
    [object[]]$Output
  )

  if (-not (@($Output) -contains "ok")) {
    throw "$Probe storage probe did not return the expected marker."
  }
  Write-Host "[replyline-docker] $Probe write/read/delete: OK"
}

$postgres = Get-ServiceContainer -Service "langfuse-db"
$redis = Get-ServiceContainer -Service "langfuse-redis"
$clickhouse = Get-ServiceContainer -Service "langfuse-clickhouse"
$minio = Get-ServiceContainer -Service "langfuse-minio"
$qdrant = Get-ServiceContainer -Service "qdrant"
$web = Get-ServiceContainer -Service "langfuse-web"
$probeId = "replyline_storage_smoke_$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())_$((Get-Random -Minimum 1000 -Maximum 9999))"

$postgresOutput = Invoke-Docker -Arguments @(
  "exec", $postgres, "sh", "-lc",
  "psql -v ON_ERROR_STOP=1 -U `"`$POSTGRES_USER`" -d `"`$POSTGRES_DB`" -c `"CREATE TABLE $probeId (value text NOT NULL); INSERT INTO $probeId VALUES ('ok');`" -tAc `"SELECT value FROM $probeId;`" -c `"DROP TABLE $probeId;`""
)
Assert-ContainsOk -Probe "Postgres" -Output $postgresOutput

$redisOutput = Invoke-Docker -Arguments @(
  "exec", $redis, "sh", "-lc",
  "test -n `"`$REDIS_AUTH`"; REDISCLI_AUTH=`"`$REDIS_AUTH`" redis-cli SET $probeId ok EX 60 >/dev/null; REDISCLI_AUTH=`"`$REDIS_AUTH`" redis-cli GET $probeId; REDISCLI_AUTH=`"`$REDIS_AUTH`" redis-cli DEL $probeId >/dev/null"
)
Assert-ContainsOk -Probe "Redis" -Output $redisOutput

$clickhouseOutput = Invoke-Docker -Arguments @(
  "exec", $clickhouse, "clickhouse-client", "--multiquery", "--query",
  "CREATE TABLE default.$probeId (value String) ENGINE=MergeTree ORDER BY tuple(); INSERT INTO default.$probeId VALUES ('ok'); SELECT value FROM default.$probeId; DROP TABLE default.$probeId;"
)
Assert-ContainsOk -Probe "ClickHouse" -Output $clickhouseOutput

$minioOutput = Invoke-Docker -Arguments @(
  "exec", $minio, "sh", "-lc",
  "mc alias set replyline-smoke http://localhost:9000 `"`$MINIO_ROOT_USER`" `"`$MINIO_ROOT_PASSWORD`" >/dev/null && printf ok | mc pipe replyline-smoke/langfuse/$probeId.txt >/dev/null && mc cat replyline-smoke/langfuse/$probeId.txt && mc rm replyline-smoke/langfuse/$probeId.txt >/dev/null && mc alias remove replyline-smoke >/dev/null"
)
Assert-ContainsOk -Probe "MinIO" -Output $minioOutput

$qdrantInspect = (Invoke-Docker -Arguments @("inspect", "--format", "{{json .NetworkSettings.Ports}}", $qdrant)) -join ""
$qdrantPorts = $qdrantInspect | ConvertFrom-Json
$qdrantBinding = @($qdrantPorts."6333/tcp")[0]
$qdrantPort = [int]$qdrantBinding.HostPort
$collection = $probeId.Replace("_", "-")
$qdrantBase = "http://127.0.0.1:$qdrantPort"
try {
  $collectionBody = @{ vectors = @{ size = 2; distance = "Cosine" } } | ConvertTo-Json -Depth 4
  $null = Invoke-RestMethod -Method Put -Uri "$qdrantBase/collections/$collection" -ContentType "application/json" -Body $collectionBody
  $pointBody = @{
    points = @(
      @{
        id = 1
        vector = @(0.1, 0.2)
        payload = @{ probe = "ok" }
      }
    )
  } | ConvertTo-Json -Depth 5
  $null = Invoke-RestMethod -Method Put -Uri "$qdrantBase/collections/$collection/points?wait=true" -ContentType "application/json" -Body $pointBody
  $point = Invoke-RestMethod -Uri "$qdrantBase/collections/$collection/points/1"
  if ($point.result.payload.probe -ne "ok") {
    throw "Qdrant storage probe did not return the expected marker."
  }
  Write-Host "[replyline-docker] Qdrant write/read/delete: OK"
} finally {
  try {
    $null = Invoke-RestMethod -Method Delete -Uri "$qdrantBase/collections/$collection"
  } catch {
    Write-Warning "Unable to remove the Qdrant smoke collection."
  }
}

$webInspect = (Invoke-Docker -Arguments @("inspect", "--format", "{{json .NetworkSettings.Ports}}", $web)) -join ""
$webPorts = $webInspect | ConvertFrom-Json
$webBinding = @($webPorts."3000/tcp")[0]
$webPort = [int]$webBinding.HostPort
$health = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$webPort/api/public/health" -TimeoutSec 15
if ($health.StatusCode -ne 200) {
  throw "Langfuse health endpoint returned HTTP $($health.StatusCode)."
}
Write-Host "[replyline-docker] Langfuse HTTP health: OK"
Write-Host "[replyline-docker] Storage smoke check passed."
