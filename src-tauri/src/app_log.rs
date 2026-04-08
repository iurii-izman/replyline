//! Minimal local app log for internal alpha support.

use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;

use crate::capture_debug;
use crate::types::LogStatusDto;
use chrono::Local;

pub fn append_event(event: &str, detail: impl AsRef<str>) -> Result<(), String> {
    let path = log_file_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let _ = maybe_rotate(&path);
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|err| err.to_string())?;
    let ts = Local::now().format("%Y-%m-%dT%H:%M:%S");
    let detail = sanitize(detail.as_ref());
    writeln!(file, "{ts} [{event}] {detail}").map_err(|err| err.to_string())
}

pub fn status() -> Result<LogStatusDto, String> {
    let path = log_file_path()?;
    let last_line = read_last_line(&path)?;
    Ok(LogStatusDto {
        log_path: path.display().to_string(),
        last_line,
        last_debug_wav_path: capture_debug::latest_debug_wav_path()?
            .map(|value| value.display().to_string()),
    })
}

pub fn log_file_path() -> Result<PathBuf, String> {
    let base = dirs::data_local_dir().ok_or_else(|| "local_data_dir_unavailable".to_string())?;
    Ok(base.join("com.replyline.app").join("logs").join("app.log"))
}

pub fn bundle_root_dir() -> Result<PathBuf, String> {
    let base = dirs::data_local_dir().ok_or_else(|| "local_data_dir_unavailable".to_string())?;
    Ok(base.join("com.replyline.app").join("support-bundles"))
}

fn read_last_line(path: &PathBuf) -> Result<Option<String>, String> {
    if !path.is_file() {
        return Ok(None);
    }
    let file = OpenOptions::new()
        .read(true)
        .open(path)
        .map_err(|err| err.to_string())?;
    let mut last = None;
    for line in BufReader::new(file).lines() {
        let line = line.map_err(|err| err.to_string())?;
        if !line.trim().is_empty() {
            last = Some(line);
        }
    }
    Ok(last)
}

fn sanitize(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return "-".to_string();
    }
    trimmed
        .replace(['\r', '\n'], " ")
        .chars()
        .take(400)
        .collect()
}

const MAX_LOG_BYTES: u64 = 5 * 1024 * 1024;

fn maybe_rotate(path: &std::path::Path) -> Result<(), String> {
    if !path.is_file() {
        return Ok(());
    }
    let meta = fs::metadata(path).map_err(|err| err.to_string())?;
    if meta.len() < MAX_LOG_BYTES {
        return Ok(());
    }
    let rotated = path.with_extension("1.log");
    if rotated.is_file() {
        let _ = fs::remove_file(&rotated);
    }
    fs::rename(path, &rotated).map_err(|err| err.to_string())
}
