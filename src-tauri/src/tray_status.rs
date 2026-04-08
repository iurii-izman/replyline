use crate::ui_strings::ru;

/// Tray tooltip strings (RU). Keep in sync with UI honesty / copy-rules.
pub fn tooltip_for_phase(phase: &str, detail: Option<&str>) -> String {
    let base = match phase {
        "booting" => ru::TRAY_BOOTING,
        "setup_needed" => ru::TRAY_SETUP_NEEDED,
        "idle_ready" => ru::TRAY_IDLE_READY,
        "hotkey_failed" => ru::TRAY_HOTKEY_FAILED,
        "capturing" => ru::TRAY_CAPTURING,
        "transcribing" => ru::TRAY_TRANSCRIBING,
        "analyzing" => ru::TRAY_ANALYZING,
        "ready_card" => ru::TRAY_READY_CARD,
        "error" => ru::TRAY_ERROR,
        _ => ru::TRAY_FALLBACK,
    };
    match detail {
        Some(d) if !d.trim().is_empty() => format!("{base} ({})", d.trim()),
        _ => base.to_string(),
    }
}
