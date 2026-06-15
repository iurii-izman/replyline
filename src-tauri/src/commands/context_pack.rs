use crate::app_log;
use crate::context_pack;
use crate::types::CommandError;

#[tauri::command]
pub fn list_context_packs() -> Result<context_pack::ContextPackListDto, CommandError> {
    context_pack::list_context_packs().map_err(CommandError::Internal)
}

#[tauri::command]
pub fn save_context_pack(
    input: context_pack::ContextPackDto,
) -> Result<context_pack::ContextPackDto, CommandError> {
    let _ = app_log::append_event(
        "context_pack_save_attempt",
        format!(
            "id={} title_len={} content_len={}",
            input.id,
            input.title.len(),
            input.content.len()
        ),
    );
    match context_pack::save_context_pack(&input) {
        Ok(saved) => {
            let _ = app_log::append_event(
                "context_pack_save_ok",
                format!("id={} active={}", saved.id, saved.is_active),
            );
            Ok(saved)
        }
        Err(err) => {
            let _ = app_log::append_event(
                "context_pack_save_failed",
                app_log::safe_status_detail("failed"),
            );
            Err(CommandError::Internal(err))
        }
    }
}

#[tauri::command]
pub fn delete_context_pack(id: String) -> Result<(), CommandError> {
    let _ = app_log::append_event("context_pack_delete_attempt", format!("id={id}"));
    context_pack::delete_context_pack(&id).map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "context_pack_delete_ok",
        app_log::safe_status_detail("deleted"),
    );
    Ok(())
}

#[tauri::command]
pub fn set_active_context_pack(id: String) -> Result<context_pack::ContextPackDto, CommandError> {
    let _ = app_log::append_event("context_pack_set_active_attempt", format!("id={id}"));
    context_pack::set_active_context_pack(&id).map_err(CommandError::Internal)
}

#[tauri::command]
pub fn clear_active_context_pack() -> Result<(), CommandError> {
    let _ = app_log::append_event("context_pack_clear_active_attempt", "-");
    context_pack::clear_active_context_pack().map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "context_pack_clear_active_ok",
        app_log::safe_status_detail("cleared"),
    );
    Ok(())
}

#[tauri::command]
pub fn get_active_context_pack() -> Result<Option<context_pack::ContextPackDto>, CommandError> {
    context_pack::get_active_context_pack().map_err(CommandError::Internal)
}

#[tauri::command]
pub fn get_context_pack_status() -> Result<context_pack::ContextPackStatusDto, CommandError> {
    context_pack::status().map_err(CommandError::Internal)
}
