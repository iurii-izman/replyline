use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};

pub fn write_bytes_atomically(path: &Path, payload: &[u8]) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let temp_path = reserve_temp_path(path)?;
    let write_result = (|| -> io::Result<()> {
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temp_path)?;
        file.write_all(payload)?;
        file.sync_all()?;
        replace_path(&temp_path, path)
    })();

    if write_result.is_err() {
        let _ = fs::remove_file(&temp_path);
    }

    write_result
}

pub fn write_json_atomically<T: serde::Serialize>(path: &Path, payload: &T) -> io::Result<()> {
    let bytes = serde_json::to_vec_pretty(payload)
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
    write_bytes_atomically(path, &bytes)
}

fn reserve_temp_path(path: &Path) -> io::Result<PathBuf> {
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("replyline");

    for suffix in 0..64 {
        let candidate = if suffix == 0 {
            path.with_file_name(format!("{file_name}.tmp"))
        } else {
            path.with_file_name(format!("{file_name}.{suffix}.tmp"))
        };
        if !candidate.exists() {
            return Ok(candidate);
        }
    }

    Err(io::Error::new(
        io::ErrorKind::AlreadyExists,
        "could not reserve temp file path",
    ))
}

#[cfg(windows)]
fn replace_path(source: &Path, destination: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;

    use windows::core::PCWSTR;
    use windows::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };

    fn wide(path: &Path) -> Vec<u16> {
        path.as_os_str().encode_wide().chain(Some(0)).collect()
    }

    let source_wide = wide(source);
    let destination_wide = wide(destination);

    unsafe {
        MoveFileExW(
            PCWSTR(source_wide.as_ptr()),
            PCWSTR(destination_wide.as_ptr()),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    }
    .map_err(|err| io::Error::other(err.to_string()))
}

#[cfg(not(windows))]
fn replace_path(source: &Path, destination: &Path) -> io::Result<()> {
    fs::rename(source, destination)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_path(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("replyline-fs-atomic-{unique}"));
        fs::create_dir_all(&root).expect("root dir");
        root.join(name)
    }

    #[test]
    fn replaces_existing_file_and_cleans_temp_files() {
        let path = temp_path("settings.json");
        write_bytes_atomically(&path, br#"{"hotkey":"Ctrl+Shift+Space"}"#).expect("first write");
        write_bytes_atomically(&path, br#"{"hotkey":"Ctrl+Alt+Space"}"#).expect("replace");

        let content = fs::read_to_string(&path).expect("read");
        assert!(content.contains("Ctrl+Alt+Space"));

        let parent = path.parent().expect("parent");
        let temp_entries = fs::read_dir(parent)
            .expect("list")
            .filter_map(Result::ok)
            .filter(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .contains("settings.json.tmp")
            })
            .count();
        assert_eq!(temp_entries, 0);
    }
}
