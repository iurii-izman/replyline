use crate::app_log;
use crate::context_pack;
use crate::credentials;
use crate::settings;
use crate::types::{
    AppSettings, CommandError, SecretSlot, SupportSnapshotDto, SupportSnapshotInputDto,
    SupportSnapshotPayloadDto, SupportSnapshotProviderReadinessDto, SupportSnapshotRuntimeDto,
    TraceStatusDto,
};

fn llm_route_kind(settings: &AppSettings) -> String {
    if settings.llm_base_url.trim().is_empty() {
        return "not_configured".to_string();
    }
    let url = settings.llm_base_url.to_lowercase();
    if url.contains("openrouter.ai") {
        "openrouter".to_string()
    } else if url.contains("api.openai.com") {
        "openai".to_string()
    } else if url.contains("api.groq.com") {
        "groq".to_string()
    } else if url.contains("localhost") || url.contains("127.0.0.1") {
        "local".to_string()
    } else if url.starts_with("https://") {
        "remote_https".to_string()
    } else {
        "custom".to_string()
    }
}

fn normalize_snapshot_phase(value: &str) -> String {
    match value.trim() {
        "booting" | "idle" | "capturing" | "transcribing" | "analyzing" | "ready" | "error" => {
            value.trim().to_string()
        }
        "" => "unknown".to_string(),
        _ => "unknown".to_string(),
    }
}

fn sanitize_error_category(value: Option<String>) -> Option<String> {
    let raw = value?.trim().to_string();
    match raw.as_str() {
        "Settings" | "Credential" | "Capture" | "Pipeline" | "Internal" => Some(raw),
        "" => None,
        _ => Some("Internal".to_string()),
    }
}

fn support_snapshot_markdown(snapshot: &SupportSnapshotDto, json: &str) -> String {
    let active_context = snapshot.active_context_title.as_deref().unwrap_or("none");
    let last_error = snapshot.last_error_category.as_deref().unwrap_or("none");
    [
        "# Replyline Support Snapshot".to_string(),
        String::new(),
        format!("- appVersion: {}", snapshot.app_version),
        format!("- currentPhase: {}", snapshot.current_phase),
        format!("- activeContextTitle: {active_context}"),
        format!("- lastErrorCategory: {last_error}"),
        format!(
            "- providerReadiness: sttKeyPresent={}, llmRouteConfigured={}, llmKeyPresent={}, runtimePathReady={}",
            snapshot.provider_readiness.stt_key_present,
            snapshot.provider_readiness.llm_route_configured,
            snapshot.provider_readiness.llm_key_present,
            snapshot.provider_readiness.runtime_path_ready
        ),
        format!(
            "- runtime: {} {} ({})",
            snapshot.runtime.os, snapshot.runtime.arch, snapshot.runtime.desktop_runtime
        ),
        String::new(),
        "```json".to_string(),
        json.to_string(),
        "```".to_string(),
    ]
    .join("\n")
}

fn build_support_snapshot_payload(
    input: SupportSnapshotInputDto,
    settings: AppSettings,
    deepgram_key_present: bool,
    llm_key_present: bool,
    active_context_title: Option<String>,
) -> Result<SupportSnapshotPayloadDto, CommandError> {
    let llm_route_configured =
        !settings.llm_base_url.trim().is_empty() && !settings.llm_model.trim().is_empty();
    let route_kind = llm_route_kind(&settings);
    let snapshot = SupportSnapshotDto {
        schema_version: 1,
        generated_at: chrono::Utc::now().to_rfc3339(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        commit_sha: option_env!("REPLYLINE_GIT_SHA")
            .unwrap_or("unknown")
            .to_string(),
        current_phase: normalize_snapshot_phase(&input.current_phase),
        active_context_title: active_context_title.and_then(|title| {
            let trimmed = title.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.chars().take(120).collect::<String>())
            }
        }),
        last_error_category: sanitize_error_category(input.last_error_category),
        provider_readiness: SupportSnapshotProviderReadinessDto {
            stt_provider: "deepgram".to_string(),
            stt_key_present: deepgram_key_present,
            llm_route_configured,
            llm_key_present,
            runtime_path_ready: settings.runtime_path_configured(deepgram_key_present),
            selected_model_preset: settings.selected_model_preset,
            llm_route_kind: route_kind,
        },
        runtime: SupportSnapshotRuntimeDto {
            os: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
            family: std::env::consts::FAMILY.to_string(),
            desktop_runtime: "tauri".to_string(),
        },
    };
    let json = serde_json::to_string_pretty(&snapshot)
        .map_err(|err| CommandError::Internal(err.to_string()))?;
    let markdown = support_snapshot_markdown(&snapshot, &json);
    Ok(SupportSnapshotPayloadDto {
        snapshot,
        json,
        markdown,
    })
}

#[tauri::command]
pub fn get_trace_status() -> Result<TraceStatusDto, CommandError> {
    let settings = settings::load()?;
    let traces_dir = crate::trace_manifest::traces_base_dir().map_err(CommandError::Internal)?;
    let total_runs = if traces_dir.exists() {
        std::fs::read_dir(&traces_dir)
            .map_err(|err| CommandError::Internal(err.to_string()))?
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.path().is_dir())
            .count()
    } else {
        0
    };
    Ok(TraceStatusDto {
        mode: settings.debug_trace_mode,
        retention_days: settings.debug_trace_retention_days,
        traces_dir: traces_dir.display().to_string(),
        total_runs,
    })
}

#[tauri::command]
pub fn get_support_snapshot(
    input: SupportSnapshotInputDto,
) -> Result<SupportSnapshotPayloadDto, CommandError> {
    let settings = settings::load()?;
    let deepgram_key_present = credentials::present(SecretSlot::DeepgramApiKey)?;
    let llm_key_present = credentials::present(SecretSlot::LlmApiKey)?;
    let active_context_title = context_pack::get_active_context_pack()
        .map_err(CommandError::Internal)?
        .map(|pack| pack.title);
    build_support_snapshot_payload(
        input,
        settings,
        deepgram_key_present,
        llm_key_present,
        active_context_title,
    )
}

#[tauri::command]
pub fn clear_debug_traces() -> Result<(), CommandError> {
    let removed_traces =
        crate::trace_manifest::clear_all_traces().map_err(CommandError::Internal)?;
    let removed_legacy_wavs =
        crate::capture_debug::clear_all_debug_wavs().map_err(CommandError::Internal)?;
    let _ = app_log::append_metadata_event(
        "debug_traces_cleared",
        vec![
            ("removed_traces", removed_traces.to_string()),
            ("removed_legacy_wavs", removed_legacy_wavs.to_string()),
        ],
    );
    Ok(())
}

#[tauri::command]
pub fn open_trace_folder() -> Result<(), CommandError> {
    let traces_dir = crate::trace_manifest::traces_base_dir().map_err(CommandError::Internal)?;
    std::fs::create_dir_all(&traces_dir).map_err(|err| CommandError::Internal(err.to_string()))?;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&traces_dir)
            .spawn()
            .map_err(|err| CommandError::Internal(err.to_string()))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&traces_dir)
            .spawn()
            .map_err(|err| CommandError::Internal(err.to_string()))?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&traces_dir)
            .spawn()
            .map_err(|err| CommandError::Internal(err.to_string()))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn support_snapshot_contains_expected_public_metadata() {
        let settings = AppSettings {
            llm_base_url: "https://openrouter.ai/api/v1".to_string(),
            llm_model: "openai/gpt-4.1-mini".to_string(),
            selected_model_preset: "openrouter_balanced_paid".to_string(),
            ..AppSettings::default()
        };
        let payload = build_support_snapshot_payload(
            SupportSnapshotInputDto {
                current_phase: "analyzing".to_string(),
                last_error_category: Some("Pipeline".to_string()),
            },
            settings,
            true,
            false,
            Some("Client QBR".to_string()),
        )
        .expect("snapshot");

        assert_eq!(payload.snapshot.schema_version, 1);
        assert_eq!(payload.snapshot.current_phase, "analyzing");
        assert_eq!(
            payload.snapshot.active_context_title.as_deref(),
            Some("Client QBR")
        );
        assert_eq!(
            payload.snapshot.last_error_category.as_deref(),
            Some("Pipeline")
        );
        assert_eq!(payload.snapshot.provider_readiness.stt_provider, "deepgram");
        assert!(payload.snapshot.provider_readiness.stt_key_present);
        assert!(payload.snapshot.provider_readiness.llm_route_configured);
        assert_eq!(
            payload.snapshot.provider_readiness.llm_route_kind,
            "openrouter"
        );
        assert_eq!(payload.snapshot.runtime.desktop_runtime, "tauri");
        assert!(payload.markdown.contains("# Replyline Support Snapshot"));
        assert!(payload.markdown.contains("```json"));
    }

    #[test]
    fn support_snapshot_omits_sensitive_runtime_content() {
        let settings = AppSettings {
            llm_base_url: "https://api.openai.com/v1".to_string(),
            llm_model: "gpt-4o-mini".to_string(),
            ..AppSettings::default()
        };
        let payload = build_support_snapshot_payload(
            SupportSnapshotInputDto {
                current_phase: "ready".to_string(),
                last_error_category: Some("Credential".to_string()),
            },
            settings,
            true,
            true,
            Some("Safe title only".to_string()),
        )
        .expect("snapshot");
        let combined = format!("{}\n{}", payload.json, payload.markdown).to_lowercase();

        for forbidden in [
            "raw transcript",
            "full prompt",
            "provider response",
            "context content",
            "sk-",
            "bearer ",
            "dg_",
            "secret project plan",
            "c:\\users\\",
            "/users/",
            "%appdata%",
        ] {
            assert!(
                !combined.contains(forbidden),
                "snapshot leaked forbidden marker: {forbidden}"
            );
        }
    }

    #[test]
    fn support_snapshot_sanitizes_unexpected_ui_state() {
        let payload = build_support_snapshot_payload(
            SupportSnapshotInputDto {
                current_phase: "raw transcript: confidential".to_string(),
                last_error_category: Some("API key sk-test".to_string()),
            },
            AppSettings::default(),
            false,
            false,
            None,
        )
        .expect("snapshot");

        assert_eq!(payload.snapshot.current_phase, "unknown");
        assert_eq!(
            payload.snapshot.last_error_category.as_deref(),
            Some("Internal")
        );
        assert!(!payload.json.contains("confidential"));
        assert!(!payload.json.contains("sk-test"));
    }
}
