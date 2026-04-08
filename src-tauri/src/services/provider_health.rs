use crate::types::{AppSettings, CommandError, HealthCheckResult};

pub async fn check_provider_health(
    settings: &AppSettings,
    deepgram_key: Option<&str>,
    llm_key: Option<&str>,
) -> Result<HealthCheckResult, CommandError> {
    let client = crate::services::http_client::build_client(8)
        .map_err(CommandError::Internal)?;

    let deepgram_ok = if let Some(key) = deepgram_key {
        client
            .get("https://api.deepgram.com/v1/projects")
            .header("Authorization", format!("Token {key}"))
            .send()
            .await
            .map(|r| r.status().is_success() || r.status().as_u16() == 401)
            .unwrap_or(false)
    } else {
        false
    };

    let llm_ok = {
        let url = format!("{}/models", settings.llm_base_url.trim().trim_end_matches('/'));
        let mut req = client.get(&url);
        if let Some(key) = llm_key {
            req = req.header("Authorization", format!("Bearer {key}"));
        }
        req.send()
            .await
            .map(|r| r.status().is_success() || r.status().as_u16() == 401)
            .unwrap_or(false)
    };

    let detail = match (deepgram_ok, llm_ok) {
        (true, true) => "Both providers reachable".to_string(),
        (true, false) => "Deepgram OK, LLM gateway unreachable".to_string(),
        (false, true) => "LLM gateway OK, Deepgram unreachable".to_string(),
        (false, false) => "Both providers unreachable".to_string(),
    };

    Ok(HealthCheckResult {
        deepgram_ok,
        llm_ok,
        detail,
    })
}
