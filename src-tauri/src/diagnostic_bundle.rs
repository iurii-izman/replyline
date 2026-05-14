//! Local runtime evidence bundle: same layout as `scripts/runtime-evidence-bundle.ps1`.

use std::fs;
use std::path::{Path, PathBuf};

use chrono::Local;
use serde::Serialize;

use crate::app_log;
use crate::diag_contract::is_known_diag_code;
use crate::types::DiagnosticBundleDto;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Manifest<'a> {
    generated_at_local: String,
    source_runtime_dir: Option<String>,
    source_log_path: Option<String>,
    bundle_dir: String,
    runtime_report_count: usize,
    copied_file_count: usize,
    log_included: bool,
    runtime_artifacts_optional: bool,
    files: Vec<String>,
    sections: BundleSections,
    provenance_notes: Vec<String>,
    benchmark_labels: BenchmarkLabels<'a>,
    honesty: Honesty<'a>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BenchmarkLabels<'a> {
    target: &'a str,
    measured: &'a str,
    pending_verification: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Honesty<'a> {
    proves: [&'a str; 2],
    does_not_prove: [&'a str; 3],
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BundleSections {
    runtime: String,
    logs: String,
    diagnostics: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RuntimeEvent {
    ts_local: String,
    stage: String,
    outcome: String,
    code: String,
    detail: String,
}

pub fn collect_runtime_evidence_bundle() -> Result<DiagnosticBundleDto, String> {
    let _ = app_log::append_event("diagnostic_bundle_attempt", "start");
    let workspace = resolve_workspace_root();
    let bundle_root = workspace
        .as_ref()
        .map(|root| root.join("reports"))
        .unwrap_or(app_log::bundle_root_dir()?);
    let log_path = app_log::log_file_path().ok();

    collect_runtime_evidence_bundle_with_inputs(workspace, bundle_root, log_path)
}

fn collect_runtime_evidence_bundle_with_inputs(
    workspace: Option<PathBuf>,
    bundle_root: PathBuf,
    log_path: Option<PathBuf>,
) -> Result<DiagnosticBundleDto, String> {
    let runtime_dir = workspace
        .as_ref()
        .map(|root| root.join("reports").join("runtime"));

    let mut files: Vec<PathBuf> = Vec::new();
    if let Some(runtime_dir) = runtime_dir.as_ref().filter(|dir| dir.is_dir()) {
        let entries = fs::read_dir(runtime_dir).map_err(|err| err.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|err| err.to_string())?;
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
                continue;
            };
            if !ext.eq_ignore_ascii_case("json")
                && !ext.eq_ignore_ascii_case("md")
                && !ext.eq_ignore_ascii_case("txt")
            {
                continue;
            }
            files.push(path);
        }
    }

    let log_path = log_path.filter(|path| path.is_file());
    if let Some(log_path) = log_path.as_ref() {
        files.push(log_path.clone());
    }

    files.sort();
    files.dedup();

    let log_included = log_path.is_some();

    let runtime_json: Vec<&PathBuf> = files
        .iter()
        .filter(|p| {
            runtime_dir
                .as_ref()
                .filter(|dir| p.starts_with(dir))
                .is_some()
                && p.extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e.eq_ignore_ascii_case("json"))
                    .unwrap_or(false)
                && !p
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n.eq_ignore_ascii_case("latency-comparison.json"))
                    .unwrap_or(false)
        })
        .collect();

    let timestamp = Local::now().format("%Y%m%d-%H%M%S");
    let bundle_dir = bundle_root.join(format!("runtime-evidence-{timestamp}"));
    fs::create_dir_all(&bundle_dir).map_err(|err| err.to_string())?;

    let mut copied_names: Vec<String> = Vec::new();
    let runtime_target_dir = bundle_dir.join("runtime");
    let logs_target_dir = bundle_dir.join("logs");
    fs::create_dir_all(&runtime_target_dir).map_err(|err| err.to_string())?;
    fs::create_dir_all(&logs_target_dir).map_err(|err| err.to_string())?;

    for path in &files {
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "Некорректное имя файла в evidence bundle.".to_string())?;
        let dest = if path
            .file_name()
            .and_then(|n| n.to_str())
            .map(|n| n.eq_ignore_ascii_case("app.log"))
            .unwrap_or(false)
        {
            logs_target_dir.join(name)
        } else {
            runtime_target_dir.join(name)
        };
        fs::copy(path, &dest).map_err(|err| err.to_string())?;
        let rel = dest
            .strip_prefix(&bundle_dir)
            .map_err(|err| err.to_string())?
            .display()
            .to_string();
        copied_names.push(rel);
    }
    copied_names.sort();

    let runtime_events =
        parse_runtime_events(log_path.as_deref().unwrap_or_else(|| Path::new("")))?;
    let diagnostics_target_dir = bundle_dir.join("diagnostics");
    fs::create_dir_all(&diagnostics_target_dir).map_err(|err| err.to_string())?;
    let runtime_events_path = diagnostics_target_dir.join("runtime-events.json");
    fs::write(
        &runtime_events_path,
        serde_json::to_vec_pretty(&runtime_events).map_err(|err| err.to_string())?,
    )
    .map_err(|err| err.to_string())?;
    copied_names.push("diagnostics/runtime-events.json".to_string());
    copied_names.sort();

    let manifest = Manifest {
        generated_at_local: Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
        source_runtime_dir: runtime_dir
            .as_ref()
            .filter(|dir| dir.is_dir())
            .map(|dir| dir.display().to_string()),
        source_log_path: log_path.as_ref().map(|path| path.display().to_string()),
        bundle_dir: bundle_dir.display().to_string(),
        runtime_report_count: runtime_json.len(),
        copied_file_count: copied_names.len(),
        log_included,
        runtime_artifacts_optional: true,
        files: copied_names.clone(),
        sections: BundleSections {
            runtime: "runtime/".to_string(),
            logs: "logs/".to_string(),
            diagnostics: "diagnostics/".to_string(),
        },
        provenance_notes: vec![
            "Runtime artifacts are copied only from a detected local Replyline workspace reports/runtime directory.".to_string(),
            "App log is included when available, even if no nearby repo runtime artifacts exist.".to_string(),
            "Bundle location may fall back to the installed app support-bundles directory outside the repo.".to_string(),
        ],
        benchmark_labels: BenchmarkLabels {
            target: "intended design goal without local runtime artifact",
            measured: "supported by local runtime artifact in this bundle or reports/runtime",
            pending_verification: "path exists but proof is incomplete, noisy, stale, or missing",
        },
        honesty: Honesty {
            proves: [
                "local provider path worked",
                "local capture->transcript->card timing was recorded",
            ],
            does_not_prove: [
                "same behavior on every workstation",
                "same behavior in every call app",
                "product-market fit",
            ],
        },
    };

    let manifest_path = bundle_dir.join("manifest.json");
    let json = serde_json::to_vec_pretty(&manifest).map_err(|err| err.to_string())?;
    fs::write(&manifest_path, json).map_err(|err| err.to_string())?;
    let _ = app_log::append_event(
        "diagnostic_bundle_ok",
        format!(
            "runtime_reports={} log_included={} bundle={}",
            runtime_json.len(),
            log_included,
            bundle_dir.display()
        ),
    );

    Ok(DiagnosticBundleDto {
        bundle_path: bundle_dir.display().to_string(),
        manifest_path: manifest_path.display().to_string(),
    })
}

fn parse_runtime_events(log_path: &Path) -> Result<Vec<RuntimeEvent>, String> {
    if !log_path.is_file() {
        return Ok(Vec::new());
    }
    let body = fs::read_to_string(log_path).map_err(|err| err.to_string())?;
    let mut events = Vec::new();
    for line in body.lines() {
        if !line.contains("[diag_runtime_event]") {
            continue;
        }
        let ts = line.split_whitespace().next().unwrap_or("").to_string();
        let stage = parse_field(line, "stage=").unwrap_or_else(|| "unknown".to_string());
        let outcome = parse_field(line, "outcome=").unwrap_or_else(|| "unknown".to_string());
        let code_raw = parse_field(line, "code=").unwrap_or_else(|| "RL_UNKNOWN".to_string());
        let code = if is_known_diag_code(&code_raw) {
            code_raw
        } else {
            "RL_UNKNOWN".to_string()
        };
        let detail = parse_field(line, "detail=").unwrap_or_else(|| "-".to_string());
        events.push(RuntimeEvent {
            ts_local: ts,
            stage,
            outcome,
            code,
            detail,
        });
    }
    Ok(events)
}

fn parse_field(line: &str, key: &str) -> Option<String> {
    let start = line.find(key)? + key.len();
    let tail = &line[start..];
    let mut end = tail.len();
    for marker in [" stage=", " outcome=", " code=", " detail="] {
        if key == marker.trim_start() {
            continue;
        }
        if let Some(pos) = tail.find(marker) {
            end = end.min(pos);
        }
    }
    Some(tail[..end].trim().to_string())
}

fn resolve_workspace_root() -> Option<PathBuf> {
    if let Ok(raw) = std::env::var("REPLYLINE_WORKSPACE_ROOT") {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            return None;
        }
        let p = PathBuf::from(trimmed);
        if is_replyline_workspace(&p) {
            return Some(p);
        }
        return None;
    }

    if let Ok(current_dir) = std::env::current_dir() {
        if let Some(found) = search_ancestors(current_dir) {
            return Some(found);
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            if let Some(found) = search_ancestors(parent.to_path_buf()) {
                return Some(found);
            }
        }
    }

    None
}

fn search_ancestors(mut dir: PathBuf) -> Option<PathBuf> {
    for _ in 0..24 {
        if is_replyline_workspace(&dir) {
            return Some(dir);
        }
        if !dir.pop() {
            break;
        }
    }
    None
}

fn is_replyline_workspace(dir: &Path) -> bool {
    dir.join("package.json").is_file() && dir.join("reports").join("runtime").is_dir()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_root(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("replyline-bundle-test-{name}-{unique}"));
        fs::create_dir_all(&root).expect("root dir");
        root
    }

    fn write_file(path: &Path, body: &str) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("parent dir");
        }
        fs::write(path, body).expect("write file");
    }

    #[test]
    fn bundle_falls_back_without_workspace_and_still_copies_log() {
        let root = temp_root("fallback");
        let bundle_root = root.join("support-bundles");
        let log_path = root.join("logs").join("app.log");
        write_file(&log_path, "2026-04-07T12:00:00 [analysis_ok] card_ready\n");

        let dto =
            collect_runtime_evidence_bundle_with_inputs(None, bundle_root.clone(), Some(log_path))
                .expect("collect bundle");

        let bundle_path = PathBuf::from(&dto.bundle_path);
        let manifest_path = PathBuf::from(&dto.manifest_path);
        assert!(bundle_path.starts_with(&bundle_root));
        assert!(manifest_path.is_file());
        assert!(bundle_path.join("logs").join("app.log").is_file());
        assert!(bundle_path
            .join("diagnostics")
            .join("runtime-events.json")
            .is_file());

        let manifest: Value =
            serde_json::from_slice(&fs::read(&manifest_path).expect("manifest bytes"))
                .expect("manifest json");
        assert_eq!(manifest["runtimeReportCount"], 0);
        assert_eq!(manifest["logIncluded"], true);
        assert_eq!(manifest["runtimeArtifactsOptional"], true);
        assert_eq!(manifest["sections"]["logs"], "logs/");
    }

    #[test]
    fn bundle_copies_runtime_reports_when_workspace_exists() {
        let root = temp_root("workspace");
        write_file(&root.join("package.json"), "{\"name\":\"replyline\"}\n");
        write_file(
            &root
                .join("reports")
                .join("runtime")
                .join("first-latency-report.json"),
            "{\"releaseToCardMs\":4300}\n",
        );
        write_file(
            &root
                .join("reports")
                .join("runtime")
                .join("duration-comparison.md"),
            "# Duration comparison\n",
        );
        let log_path = root.join("logs").join("app.log");
        write_file(
            &log_path,
            "2026-04-07T12:00:00 [bootstrap_loaded] runtime_ready=true\n",
        );

        let dto = collect_runtime_evidence_bundle_with_inputs(
            Some(root.clone()),
            root.join("reports"),
            Some(log_path),
        )
        .expect("collect bundle");

        let bundle_path = PathBuf::from(&dto.bundle_path);
        assert!(bundle_path
            .join("runtime")
            .join("first-latency-report.json")
            .is_file());
        assert!(bundle_path
            .join("runtime")
            .join("duration-comparison.md")
            .is_file());
        assert!(bundle_path.join("logs").join("app.log").is_file());
    }

    #[test]
    fn bundle_extracts_diag_runtime_events_from_log() {
        let root = temp_root("diag-events");
        write_file(&root.join("package.json"), "{\"name\":\"replyline\"}\n");
        fs::create_dir_all(root.join("reports").join("runtime")).expect("runtime dir");
        let log_path = root.join("logs").join("app.log");
        write_file(
            &log_path,
            "2026-04-07T12:00:00 [diag_runtime_event] stage=stt outcome=fail code=RL_STT_FAILED detail=empty transcript\n",
        );

        let dto = collect_runtime_evidence_bundle_with_inputs(
            Some(root.clone()),
            root.join("reports"),
            Some(log_path),
        )
        .expect("collect bundle");
        let bundle_path = PathBuf::from(&dto.bundle_path);
        let events_raw = fs::read(bundle_path.join("diagnostics").join("runtime-events.json"))
            .expect("events bytes");
        let events: Value = serde_json::from_slice(&events_raw).expect("events json");
        assert!(events.is_array());
        let first = &events[0];
        assert_eq!(first["stage"], "stt");
        assert_eq!(first["outcome"], "fail");
        assert_eq!(first["code"], "RL_STT_FAILED");
    }

    #[test]
    fn search_ancestors_finds_workspace_from_nested_dir() {
        let root = temp_root("ancestor");
        write_file(&root.join("package.json"), "{\"name\":\"replyline\"}\n");
        fs::create_dir_all(root.join("reports").join("runtime")).expect("runtime dir");
        let nested = root.join("src").join("deep").join("nested");
        fs::create_dir_all(&nested).expect("nested dir");

        let found = search_ancestors(nested).expect("workspace");
        assert_eq!(found, root);
    }
}
