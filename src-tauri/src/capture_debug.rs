use std::fs;
use std::path::PathBuf;

use chrono::Local;

pub fn should_persist_stt_debug(err: &str) -> bool {
    let text = err.to_ascii_lowercase();
    text.contains("empty transcript") || text.contains("empty transcription")
}

pub fn save_failed_stt_wav(wav_bytes: &[u8]) -> Result<PathBuf, String> {
    let dir = debug_capture_dir()?;
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    let timestamp = Local::now().format("%Y%m%d-%H%M%S");
    let path = dir.join(format!("stt-empty-{timestamp}.wav"));
    fs::write(&path, wav_bytes).map_err(|err| err.to_string())?;
    Ok(path)
}

pub fn latest_debug_wav_path() -> Result<Option<PathBuf>, String> {
    let dir = debug_capture_dir()?;
    if !dir.is_dir() {
        return Ok(None);
    }

    let mut latest: Option<(std::time::SystemTime, PathBuf)> = None;
    for entry in fs::read_dir(dir).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("wav") {
            continue;
        }
        let modified = entry
            .metadata()
            .and_then(|meta| meta.modified())
            .map_err(|err| err.to_string())?;
        match &latest {
            Some((current, _)) if &modified <= current => {}
            _ => latest = Some((modified, path)),
        }
    }

    Ok(latest.map(|(_, path)| path))
}

fn debug_capture_dir() -> Result<PathBuf, String> {
    let base = dirs::data_local_dir().ok_or_else(|| "local_data_dir_unavailable".to_string())?;
    Ok(base.join("com.replyline.app").join("capture-debug"))
}
