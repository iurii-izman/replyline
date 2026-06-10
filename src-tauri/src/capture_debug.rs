use std::fs;
use std::path::PathBuf;
#[cfg(test)]
use std::sync::OnceLock;

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

pub fn clear_all_debug_wavs() -> Result<usize, String> {
    let dir = debug_capture_dir()?;
    if !dir.is_dir() {
        return Ok(0);
    }

    let mut removed = 0usize;
    for entry in fs::read_dir(dir).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|value| value.to_str()) == Some("wav") {
            fs::remove_file(path).map_err(|err| err.to_string())?;
            removed += 1;
        }
    }
    Ok(removed)
}

fn debug_capture_dir() -> Result<PathBuf, String> {
    #[cfg(test)]
    {
        static TEST_DEBUG_DIR: OnceLock<PathBuf> = OnceLock::new();
        return Ok(TEST_DEBUG_DIR
            .get_or_init(|| {
                std::env::temp_dir().join(format!(
                    "replyline-capture-debug-test-{}-{}",
                    std::process::id(),
                    chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
                ))
            })
            .clone());
    }

    #[cfg(not(test))]
    let base = dirs::data_local_dir().ok_or_else(|| "local_data_dir_unavailable".to_string())?;
    #[cfg(not(test))]
    {
        Ok(base.join("com.replyline.app").join("capture-debug"))
    }
}

#[cfg(test)]
mod tests {
    use super::{clear_all_debug_wavs, debug_capture_dir, latest_debug_wav_path};
    use std::fs;

    #[test]
    fn clear_removes_only_legacy_wav_files() {
        let dir = debug_capture_dir().expect("debug dir");
        fs::create_dir_all(&dir).expect("create debug dir");
        fs::write(dir.join("old.wav"), b"RIFF").expect("write wav");
        fs::write(dir.join("keep.txt"), b"keep").expect("write marker");

        assert!(latest_debug_wav_path()
            .expect("latest")
            .expect("wav")
            .ends_with("old.wav"));
        assert_eq!(clear_all_debug_wavs().expect("clear"), 1);
        assert!(!dir.join("old.wav").exists());
        assert!(dir.join("keep.txt").exists());
    }

    #[test]
    fn test_debug_dir_is_isolated_from_local_app_data() {
        let dir = debug_capture_dir().expect("debug dir");
        assert!(dir.starts_with(std::env::temp_dir()));
        if let Some(data_dir) = dirs::data_local_dir() {
            assert_ne!(
                dir,
                data_dir.join("com.replyline.app").join("capture-debug")
            );
        }
    }
}
