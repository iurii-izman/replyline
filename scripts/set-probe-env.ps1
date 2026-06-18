# replyline/scripts/set-probe-env.ps1
# Securely reads API keys from Windows Credential Manager and sets them as
# environment variables for the current PowerShell session.
# Usage (dot-source): . .\scripts\set-probe-env.ps1
# After sourcing, run: pnpm probe:runtime
param()

$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class CredentialManager {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CredRead(string targetName, int type, int flags, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern void CredFree(IntPtr buffer);

    public static string GetCredential(string targetName) {
        IntPtr credPtr;
        if (!CredRead(targetName, 1, 0, out credPtr)) {
            return null;
        }
        try {
            var cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
            if (cred.CredentialBlobSize > 0 && cred.CredentialBlob != IntPtr.Zero) {
                return Marshal.PtrToStringUni(cred.CredentialBlob, cred.CredentialBlobSize / 2);
            }
            return null;
        } finally {
            CredFree(credPtr);
        }
    }
}
'@

$service = "com.replyline.app.credentials"
$targets = @(
    @{Name="DEEPGRAM_API_KEY"; Account="deepgram_api_key"},
    @{Name="LLM_API_KEY"; Account="llm_api_key"}
)

Write-Host "[set-probe-env] Reading credentials from Windows Credential Manager..." -ForegroundColor Cyan

$found = 0
foreach ($t in $targets) {
    $targetName = "$service`:$($t.Account)"
    $value = [CredentialManager]::GetCredential($targetName)
    if (-not $value) {
        # Try without colon separator (keyring v3 format)
        $targetName = "$service/$($t.Account)"
        $value = [CredentialManager]::GetCredential($targetName)
    }
    if (-not $value) {
        # Try account-only (older keyring versions)
        $value = [CredentialManager]::GetCredential($t.Account)
    }
    if ($value) {
        [Environment]::SetEnvironmentVariable($t.Name, $value, "Process")
        $found++
        Write-Host "  [OK] $($t.Name) set (${targetName})" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $($t.Name) not found in Credential Manager" -ForegroundColor Yellow
    }
}

if ($found -eq 0) {
    Write-Host "[set-probe-env] WARNING: No API keys found. Set them manually:" -ForegroundColor Red
    Write-Host '  $env:DEEPGRAM_API_KEY = "your-key"' -ForegroundColor Red
    Write-Host '  $env:LLM_API_KEY = "your-key"' -ForegroundColor Red
} else {
    Write-Host "[set-probe-env] $found key(s) loaded. Run: pnpm probe:runtime" -ForegroundColor Green
}
