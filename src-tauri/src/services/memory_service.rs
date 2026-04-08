use crate::memory::{JsonMemoryStore, MemorySpace, MemorySpaceRecord};
use crate::types::CommandError;

pub fn list_spaces() -> Result<Vec<MemorySpace>, CommandError> {
    let store = JsonMemoryStore::default().map_err(memory_error_for_command)?;
    list_spaces_with_store(&store)
}

pub fn get_space_record(space_id: &str) -> Result<MemorySpaceRecord, CommandError> {
    let store = JsonMemoryStore::default().map_err(memory_error_for_command)?;
    get_space_record_with_store(&store, space_id)
}

pub fn save_space_record(input: MemorySpaceRecord) -> Result<MemorySpaceRecord, CommandError> {
    let store = JsonMemoryStore::default().map_err(memory_error_for_command)?;
    save_space_record_with_store(&store, input)
}

pub(crate) fn list_spaces_with_store(
    store: &JsonMemoryStore,
) -> Result<Vec<MemorySpace>, CommandError> {
    store.list_spaces().map_err(memory_error_for_command)
}

pub(crate) fn get_space_record_with_store(
    store: &JsonMemoryStore,
    space_id: &str,
) -> Result<MemorySpaceRecord, CommandError> {
    store
        .load_record(space_id.trim())
        .map_err(memory_error_for_command)
}

pub(crate) fn save_space_record_with_store(
    store: &JsonMemoryStore,
    input: MemorySpaceRecord,
) -> Result<MemorySpaceRecord, CommandError> {
    store
        .save_record(&input)
        .map_err(memory_error_for_command)?;
    Ok(input)
}

fn memory_error_for_command(err: impl std::fmt::Display) -> CommandError {
    let text = err.to_string();
    if text.starts_with("VALIDATION:") {
        return CommandError::Memory("Memory input is invalid.".to_string());
    }
    if text.starts_with("NOT_FOUND:") {
        return CommandError::Memory("Memory space not found.".to_string());
    }
    CommandError::Memory("Memory store operation failed.".to_string())
}
