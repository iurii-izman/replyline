pub mod bilingual_experimental;
pub mod bootstrap;
pub mod capture;
pub mod context;
pub mod context_pack;
pub mod diagnostics;
pub mod interview;
pub mod registry;
pub mod runtime_checks;
pub mod secrets;
pub mod settings;
pub mod shared;
pub mod tray_window;

static RUN_SEQ: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

pub(crate) fn next_run_id() -> String {
    let ts = chrono::Utc::now().timestamp_millis() as u64;
    let seq = RUN_SEQ.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    format!("{}-{}", ts, seq)
}

pub(crate) fn hash_path_for_log(path: &std::path::Path) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    path.to_string_lossy().hash(&mut hasher);
    format!("{:x}", hasher.finish())
}
