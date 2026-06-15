use crate::state::ReplylineState;
use crate::types::{CommandError, ContextStatusDto};
use tauri::State;

#[tauri::command]
pub fn clear_context(state: State<'_, ReplylineState>) -> Result<ContextStatusDto, CommandError> {
    let mut guard = state
        .context
        .lock()
        .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
    guard.clear();
    Ok(guard.status())
}

#[tauri::command]
pub fn get_context_status(
    state: State<'_, ReplylineState>,
) -> Result<ContextStatusDto, CommandError> {
    let mut guard = state
        .context
        .lock()
        .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
    Ok(guard.status())
}
