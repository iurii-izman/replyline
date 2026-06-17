/// Single-source registry for all IPC commands.
/// Used by lib.rs instead of duplicated generate_handler! blocks.
///
/// Diagnostics commands extracted to `diagnostics` module (proof-of-split).
/// Other commands remain in `mod.rs` until future splits.
#[macro_export]
macro_rules! replyline_commands {
    () => {
        tauri::generate_handler![
            $crate::commands::bootstrap::load_bootstrap,
            $crate::commands::settings::save_settings,
            $crate::commands::context_pack::list_context_packs,
            $crate::commands::context_pack::save_context_pack,
            $crate::commands::context_pack::delete_context_pack,
            $crate::commands::context_pack::set_active_context_pack,
            $crate::commands::context_pack::clear_active_context_pack,
            $crate::commands::context_pack::get_active_context_pack,
            $crate::commands::context_pack::get_context_pack_status,
            $crate::commands::secrets::save_secret,
            $crate::commands::context::clear_context,
            $crate::commands::secrets::delete_secret,
            $crate::commands::context::get_context_status,
            $crate::commands::capture::capture_start,
            $crate::commands::capture::capture_stop_and_analyze,
            $crate::commands::capture::retry_last_analysis,
            $crate::commands::tray_window::sync_tray_ui_phase,
            $crate::commands::tray_window::refresh_tray_menu,
            $crate::commands::tray_window::tray_open_main,
            $crate::commands::bilingual_experimental::start_bilingual_session,
            $crate::commands::bilingual_experimental::stop_bilingual_session,
            $crate::commands::bilingual_experimental::capture_bilingual_answer,
            $crate::commands::bilingual_experimental::export_bilingual_interview_report,
            $crate::commands::bootstrap::log_client_event,
            $crate::commands::bootstrap::quit_app,
            $crate::commands::runtime_checks::check_stt_config,
            $crate::commands::runtime_checks::check_llm_config,
            $crate::commands::runtime_checks::check_runtime_config,
            $crate::commands::settings::get_setup_status,
            $crate::commands::settings::get_feedback_payload,
            $crate::commands::settings::get_persistence_diagnostics,
            $crate::commands::interview::start_interview_session,
            $crate::commands::interview::end_interview_session,
            $crate::commands::interview::get_interview_report,
            $crate::commands::interview::export_interview_report_markdown,
            $crate::commands::interview::export_interview_report_redacted_markdown,
            $crate::commands::interview::clear_interview_reports,
            $crate::commands::diagnostics::open_trace_folder,
            $crate::commands::diagnostics::clear_debug_traces,
            $crate::commands::diagnostics::get_trace_status
        ]
    };
}
