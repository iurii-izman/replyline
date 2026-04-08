/// Centralized user-facing strings (Russian alpha).
///
/// All user-visible text from the Rust backend lives here so a future
/// i18n pass only needs to swap this module for a locale-aware loader.
pub mod ru {
    // -- Tray tooltip --
    pub const TRAY_BOOTING: &str = "Replyline · Загрузка…";
    pub const TRAY_SETUP_NEEDED: &str = "Replyline · Нужны данные в настройках";
    pub const TRAY_IDLE_READY: &str = "Replyline · К захвату — удержите клавишу";
    pub const TRAY_HOTKEY_FAILED: &str = "Replyline · Клавиша не зарегистрирована";
    pub const TRAY_CAPTURING: &str = "Replyline · Запись…";
    pub const TRAY_TRANSCRIBING: &str = "Replyline · Звук → текст…";
    pub const TRAY_ANALYZING: &str = "Replyline · Карточка…";
    pub const TRAY_READY_CARD: &str = "Replyline · Карточка есть";
    pub const TRAY_ERROR: &str = "Replyline · Ошибка — разверните окно";
    pub const TRAY_FALLBACK: &str = "Replyline";

    // -- Tray menu items --
    pub const MENU_OPEN: &str = "Открыть";
    pub const MENU_SETTINGS: &str = "Настройки";
    pub const MENU_CLEAR_CONTEXT: &str = "Сбросить контекст";
    pub const MENU_COLLECT_DIAGNOSTIC: &str = "Собрать сводку диагностики…";
    pub const MENU_COPY_READINESS: &str = "Копировать JSON готовности…";
    pub const MENU_QUIT: &str = "Выход";

    // -- Pipeline status --
    pub const STATUS_WAITING_TEXT: &str = "Ждём текст…";
    pub const STATUS_WAITING_CARD: &str = "Ждём карточку…";
    pub const STATUS_RETRYING_CARD: &str = "Пересбор карточки…";

    // -- User-facing errors --
    pub const ERR_NO_ACTIVE_CAPTURE: &str =
        "Запись не была активна. Сначала удержите горячую клавишу.";
    pub const ERR_NO_DEEPGRAM_KEY: &str = "Нет ключа Deepgram. Настройки → ключ → Сохранить.";
    pub const ERR_NOTHING_TO_RETRY: &str = "Пока нечего пересобрать — сначала сделайте захват.";
}
