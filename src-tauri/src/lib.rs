mod app_log;
mod audio;
mod audio_streaming;
mod bilingual;
mod candidate_pack;
mod capture_debug;
mod card_v3;
mod commands;
mod context;
mod credentials;
mod diag_contract;
mod fs_atomic;
mod interview_card_v1;
mod interview_report;
mod language_profile;
mod llm;
mod model_presets;
mod observability;
mod pipeline_timing;
mod privacy;
mod prompt_registry;
mod providers;
mod services;
mod settings;
mod state;
mod trace_manifest;
mod tray_status;
mod types;
mod ui_strings;

use tauri::{
    menu::{Menu, MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime,
};

use crate::observability::{Fields, PrivacyClass};
use crate::state::ReplylineState;
use crate::types::SecretSlot;

/// Rebuilt when UI language changes (`refresh_tray_menu`) and on startup.
pub(crate) fn build_main_tray_menu<R: Runtime>(
    app: &AppHandle<R>,
    lang: &str,
) -> tauri::Result<Menu<R>> {
    use crate::ui_strings::{en, pick_lang, ru};
    let open_item = MenuItemBuilder::with_id("open", pick_lang(lang, en::MENU_OPEN, ru::MENU_OPEN))
        .build(app)?;
    let settings_item = MenuItemBuilder::with_id(
        "settings",
        pick_lang(lang, en::MENU_SETTINGS, ru::MENU_SETTINGS),
    )
    .build(app)?;
    let clear_item = MenuItemBuilder::with_id(
        "clear-context",
        pick_lang(lang, en::MENU_CLEAR_CONTEXT, ru::MENU_CLEAR_CONTEXT),
    )
    .build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", pick_lang(lang, en::MENU_QUIT, ru::MENU_QUIT))
        .build(app)?;

    MenuBuilder::new(app)
        .items(&[&open_item, &settings_item, &clear_item, &quit_item])
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(ReplylineState::default())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let _ = observability::log_audit(
                "app_start",
                Fields::new()
                    .with("source", "app")
                    .with("phase", "boot")
                    .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
            );
            let _ = app_log::append_event("app_boot_start", "setup");
            let settings = settings::load().unwrap_or_default();
            if let Ok((removed, kept)) = trace_manifest::enforce_trace_retention(
                chrono::Utc::now(),
                settings.debug_trace_retention_days,
            ) {
                let _ = app_log::append_event(
                    "debug_trace_retention_applied",
                    format!("removed={removed} kept={kept}"),
                );
            }
            let lang = language_profile::default_language();
            let handle = app.handle().clone();
            let menu = build_main_tray_menu(&handle, lang)?;

            let deepgram_ok = credentials::present(SecretSlot::DeepgramApiKey).unwrap_or(false);
            let needs_setup = !settings.runtime_path_configured(deepgram_ok);

            let initial_tooltip = if needs_setup {
                tray_status::tooltip_for_phase(lang, "setup_needed", None)
            } else {
                tray_status::tooltip_for_phase(lang, "booting", None)
            };

            let mut tray_builder = TrayIconBuilder::with_id("main-tray");
            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
            }

            tray_builder
                .tooltip(&initial_tooltip)
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => {
                        let _ = app_log::append_event("tray_action_received", "open");
                        let _ = observability::log_audit(
                            "tray_open_main",
                            Fields::new()
                                .with("source", "tray")
                                .with("phase", "ui")
                                .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
                        );
                        let _ = open_main_window(app);
                    }
                    "settings" => {
                        let _ = app_log::append_event("tray_action_received", "settings");
                        let _ = observability::log_audit(
                            "settings_opened",
                            Fields::new()
                                .with("source", "tray")
                                .with("phase", "ui")
                                .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
                        );
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
                        let _ = app_log::append_event("tray_action_received", "quit");
                        let _ = observability::log_audit(
                            "tray_quit_requested",
                            Fields::new()
                                .with("source", "tray")
                                .with("phase", "ui")
                                .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
                        );
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

            if needs_setup {
                let _ = open_main_window(app.handle());
                if needs_setup {
                    let _ = app.emit("replyline://open-settings", ());
                }
            }
            let _ = observability::log_audit(
                "app_ready",
                Fields::new()
                    .with("source", "app")
                    .with("phase", "boot")
                    .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
            );

            Ok(())
        });
    #[cfg(any(debug_assertions, test))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        commands::load_bootstrap,
        commands::save_settings,
        commands::load_candidate_pack,
        commands::save_candidate_pack,
        commands::clear_candidate_pack,
        commands::get_candidate_pack_status,
        commands::save_secret,
        commands::clear_context,
        commands::delete_secret,
        commands::get_context_status,
        commands::capture_start,
        commands::capture_stop_and_analyze,
        commands::retry_last_analysis,
        commands::sync_tray_ui_phase,
        commands::refresh_tray_menu,
        commands::tray_open_main,
        commands::start_bilingual_session,
        commands::stop_bilingual_session,
        commands::capture_bilingual_answer,
        commands::export_bilingual_interview_report,
        commands::log_client_event,
        commands::quit_app,
        commands::check_stt_config,
        commands::check_llm_config,
        commands::check_runtime_config,
        commands::get_setup_status,
        commands::get_persistence_diagnostics,
        commands::prepare_candidate_pack,
        commands::save_prepared_candidate_pack,
        commands::start_interview_session,
        commands::end_interview_session,
        commands::get_interview_report,
        commands::export_interview_report_markdown,
        commands::export_interview_report_redacted_markdown,
        commands::clear_interview_reports,
        commands::open_trace_folder,
        commands::clear_debug_traces,
        commands::get_trace_status
    ]);
    #[cfg(not(any(debug_assertions, test)))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        commands::load_bootstrap,
        commands::save_settings,
        commands::load_candidate_pack,
        commands::save_candidate_pack,
        commands::clear_candidate_pack,
        commands::get_candidate_pack_status,
        commands::save_secret,
        commands::clear_context,
        commands::delete_secret,
        commands::get_context_status,
        commands::capture_start,
        commands::capture_stop_and_analyze,
        commands::retry_last_analysis,
        commands::sync_tray_ui_phase,
        commands::refresh_tray_menu,
        commands::tray_open_main,
        commands::start_bilingual_session,
        commands::stop_bilingual_session,
        commands::capture_bilingual_answer,
        commands::export_bilingual_interview_report,
        commands::log_client_event,
        commands::quit_app,
        commands::check_stt_config,
        commands::check_llm_config,
        commands::check_runtime_config,
        commands::get_setup_status,
        commands::get_persistence_diagnostics,
        commands::prepare_candidate_pack,
        commands::save_prepared_candidate_pack,
        commands::start_interview_session,
        commands::end_interview_session,
        commands::get_interview_report,
        commands::export_interview_report_markdown,
        commands::export_interview_report_redacted_markdown,
        commands::clear_interview_reports,
        commands::open_trace_folder,
        commands::clear_debug_traces,
        commands::get_trace_status
    ]);
    builder
        .run(tauri::generate_context!())
        .unwrap_or_else(|err| {
            eprintln!("Fatal: Replyline failed to start: {err}");
            std::process::exit(1);
        });
}

fn open_main_window(app: &tauri::AppHandle) -> Result<(), tauri::Error> {
    if let Some(window) = app.get_webview_window("main") {
        window.show()?;
        window.set_focus()?;
        let _ = observability::log_audit(
            "window_show",
            Fields::new()
                .with("source", "window")
                .with("phase", "ui")
                .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
        );
    }
    Ok(())
}
