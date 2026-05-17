//! Lightweight pipeline stage timing.
//! Logs only: stage name, duration_ms, outcome, and code.

use std::time::Instant;

use crate::app_log;

#[derive(Debug, Clone)]
pub struct StageTiming {
    pub stage: &'static str,
    pub duration_ms: u128,
    pub outcome: &'static str,
    pub code: &'static str,
}

pub struct PipelineTimer {
    start: Instant,
}

impl PipelineTimer {
    pub fn start() -> Self {
        Self {
            start: Instant::now(),
        }
    }

    pub fn measure(
        self,
        stage: &'static str,
        outcome: &'static str,
        code: &'static str,
    ) -> StageTiming {
        StageTiming {
            stage,
            duration_ms: self.start.elapsed().as_millis(),
            outcome,
            code,
        }
    }
}

pub fn log_stage_timing(timing: &StageTiming) -> Result<(), String> {
    app_log::append_event(
        "pipeline_timing",
        format!(
            "stage={} duration_ms={} outcome={} code={}",
            timing.stage, timing.duration_ms, timing.outcome, timing.code
        ),
    )
}
