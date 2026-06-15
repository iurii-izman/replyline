use crate::app_log;
use crate::settings;
use crate::types::{CommandError, TraceStatusDto};

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
