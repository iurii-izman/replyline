mod audio;
mod commands;
mod context;
mod credentials;
mod deepgram;
mod llm;
mod memory;
mod settings;
mod types;

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

use crate::commands::ReplylineState;
use crate::types::SecretSlot;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ReplylineState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let open_item = MenuItemBuilder::with_id("open", "Открыть").build(app)?;
            let settings_item = MenuItemBuilder::with_id("settings", "Настройки").build(app)?;
            let clear_item = MenuItemBuilder::with_id("clear-context", "Сбросить контекст").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Выход").build(app)?;

            let menu = MenuBuilder::new(app)
                .items(&[&open_item, &settings_item, &clear_item, &quit_item])
                .build()?;

            TrayIconBuilder::with_id("main-tray")
                .tooltip("Replyline · Готово")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => {
                        let _ = open_main_window(app);
                    }
                    "settings" => {
                        let _ = open_main_window(app);
                        let _ = app.emit("replyline://open-settings", ());
                    }
                    "clear-context" => {
                        if let Ok(state) = app.try_state::<ReplylineState>().ok_or(()) {
                            if let Ok(mut guard) = state.context.lock() {
                                guard.clear();
                            }
                        }
                        let _ = app.emit("replyline://context-cleared", ());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let _ = open_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            let needs_onboarding =
                !crate::credentials::present(SecretSlot::DeepgramApiKey).unwrap_or(false);
            if needs_onboarding {
                let _ = open_main_window(app.handle());
                let _ = app.emit("replyline://open-settings", ());
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_bootstrap,
            commands::save_settings,
            commands::save_secret,
            commands::delete_secret,
            commands::clear_context,
            commands::capture_start,
            commands::capture_stop_and_analyze,
            commands::retry_last_analysis,
            commands::tray_open_main,
            commands::memory_list_spaces,
            commands::memory_get_space_record,
            commands::memory_save_space_record
        ])
        .run(tauri::generate_context!())
        .expect("error while running replyline");
}

fn open_main_window(app: &tauri::AppHandle) -> Result<(), tauri::Error> {
    if let Some(window) = app.get_webview_window("main") {
        window.show()?;
        window.set_focus()?;
    }
    Ok(())
}
