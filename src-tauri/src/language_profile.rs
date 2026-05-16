//! Minimal centralized language profile (v1).
//!
//! RU-first by design. No runtime language switching is exposed to the user yet.
//! All runtime language decisions flow through this module so there is a single
//! source of truth instead of scattered `"ru"` literals.

/// Default application language — currently always "ru".
/// Future versions may read from settings or OS locale.
pub fn default_language() -> &'static str {
    "ru"
}

/// STT (Deepgram) language code for the default profile.
pub fn stt_language() -> &'static str {
    "ru"
}

/// LLM prompt language code for the default profile.
pub fn llm_language() -> &'static str {
    "ru"
}
