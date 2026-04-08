use crate::llm;
use crate::types::{AnalysisCardDto, AppSettings};

pub async fn analyze(
    settings: &AppSettings,
    llm_key: Option<&str>,
    transcript: &str,
    context_text: &str,
) -> Result<AnalysisCardDto, String> {
    llm::analyze_transcript(settings, llm_key, transcript, context_text).await
}
