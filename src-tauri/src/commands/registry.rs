/// Single-source registry for all IPC commands.
/// Used by lib.rs instead of duplicated generate_handler! blocks.
///
/// Diagnostics commands extracted to `diagnostics` module (proof-of-split).
/// Other commands remain in `mod.rs` until future splits.
#[macro_export]
macro_rules! replyline_commands {
    () => {
        tauri::generate_handler![
            $crate::commands::load_bootstrap,
            $crate::commands::save_settings,
            $crate::commands::load_candidate_pack,
            $crate::commands::save_candidate_pack,
            $crate::commands::clear_candidate_pack,
            $crate::commands::get_candidate_pack_status,
            $crate::commands::save_secret,
            $crate::commands::clear_context,
            $crate::commands::delete_secret,
            $crate::commands::get_context_status,
            $crate::commands::capture_start,
            $crate::commands::capture_stop_and_analyze,
            $crate::commands::retry_last_analysis,
            $crate::commands::tray_window::sync_tray_ui_phase,
            $crate::commands::tray_window::refresh_tray_menu,
            $crate::commands::tray_window::tray_open_main,
            $crate::commands::start_bilingual_session,
            $crate::commands::stop_bilingual_session,
            $crate::commands::capture_bilingual_answer,
            $crate::commands::export_bilingual_interview_report,
            $crate::commands::log_client_event,
            $crate::commands::quit_app,
            $crate::commands::check_stt_config,
            $crate::commands::check_llm_config,
            $crate::commands::check_runtime_config,
            $crate::commands::get_setup_status,
            $crate::commands::get_feedback_payload,
            $crate::commands::get_persistence_diagnostics,
            $crate::commands::prepare_candidate_pack,
            $crate::commands::save_prepared_candidate_pack,
            $crate::commands::start_interview_session,
            $crate::commands::end_interview_session,
            $crate::commands::get_interview_report,
            $crate::commands::export_interview_report_markdown,
            $crate::commands::export_interview_report_redacted_markdown,
            $crate::commands::clear_interview_reports,
            $crate::commands::diagnostics::open_trace_folder,
            $crate::commands::diagnostics::clear_debug_traces,
            $crate::commands::diagnostics::get_trace_status
        ]
    };
}
