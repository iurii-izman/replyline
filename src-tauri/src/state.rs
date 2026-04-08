use std::sync::Mutex;

use crate::audio::CaptureRun;
use crate::context::ConversationContext;

#[derive(Default)]
pub struct CaptureController {
    pub active: Option<CaptureRun>,
}

pub struct ReplylineState {
    pub capture: Mutex<CaptureController>,
    pub context: Mutex<ConversationContext>,
}

impl Default for ReplylineState {
    fn default() -> Self {
        Self {
            capture: Mutex::new(CaptureController::default()),
            context: Mutex::new(ConversationContext::default()),
        }
    }
}
