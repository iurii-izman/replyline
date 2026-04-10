use crate::ui_strings::{en, pick_lang, ru};

/// Tray tooltip strings. Keep in sync with UI honesty / copy-rules.
pub fn tooltip_for_phase(lang: &str, phase: &str, detail: Option<&str>) -> String {
    let base = match phase {
        "booting" => pick_lang(lang, en::TRAY_BOOTING, ru::TRAY_BOOTING),
        "setup_needed" => pick_lang(lang, en::TRAY_SETUP_NEEDED, ru::TRAY_SETUP_NEEDED),
        "idle_ready" => pick_lang(lang, en::TRAY_IDLE_READY, ru::TRAY_IDLE_READY),
        "hotkey_failed" => pick_lang(lang, en::TRAY_HOTKEY_FAILED, ru::TRAY_HOTKEY_FAILED),
        "capturing" => pick_lang(lang, en::TRAY_CAPTURING, ru::TRAY_CAPTURING),
        "transcribing" => pick_lang(lang, en::TRAY_TRANSCRIBING, ru::TRAY_TRANSCRIBING),
        "analyzing" => pick_lang(lang, en::TRAY_ANALYZING, ru::TRAY_ANALYZING),
        "ready_card" => pick_lang(lang, en::TRAY_READY_CARD, ru::TRAY_READY_CARD),
        "error" => pick_lang(lang, en::TRAY_ERROR, ru::TRAY_ERROR),
        _ => pick_lang(lang, en::TRAY_FALLBACK, ru::TRAY_FALLBACK),
    };
    match detail {
        Some(d) if !d.trim().is_empty() => format!("{base} ({})", d.trim()),
        _ => base.to_string(),
    }
}
