use std::sync::Mutex;

use crate::audio::CaptureRun;
use crate::bilingual::session::BilingualSessionState;
use crate::context::ConversationContext;
use crate::interview_report::InterviewSessionState;

#[derive(Default)]
pub struct CaptureController {
    pub active: Option<CaptureRun>,
    pub active_run_id: Option<String>,
}

pub struct ReplylineState {
    pub capture: Mutex<CaptureController>,
    pub context: Mutex<ConversationContext>,
    pub interview_session: Mutex<InterviewSessionState>,
    pub bilingual_session: Mutex<BilingualSessionState>,
}

impl Default for ReplylineState {
    fn default() -> Self {
        Self {
            capture: Mutex::new(CaptureController::default()),
            context: Mutex::new(ConversationContext::default()),
            interview_session: Mutex::new(InterviewSessionState::default()),
            bilingual_session: Mutex::new(BilingualSessionState::default()),
        }
    }
}
