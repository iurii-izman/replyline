use crate::credentials;
use crate::settings;
use crate::types::{CheckItemDto, CommandError, RuntimeCheckDto, SecretSlot};

#[tauri::command]
pub fn check_stt_config() -> Result<CheckItemDto, CommandError> {
    match credentials::present(SecretSlot::DeepgramApiKey) {
        Ok(true) => Ok(CheckItemDto {
            ok: true,
            code: "ok".to_string(),
            message: "Deepgram API key configured".to_string(),
            action: None,
        }),
        Ok(false) => Ok(CheckItemDto {
            ok: false,
            code: "missing_key".to_string(),
            message: "Deepgram API key is not set".to_string(),
            action: Some("Add your Deepgram API key in the Speech section".to_string()),
        }),
        Err(err) => {
            let safe_err = crate::privacy::safe_preview(&err.to_string(), 200);
            Ok(CheckItemDto {
                ok: false,
                code: "config_error".to_string(),
                message: format!("Cannot read Deepgram key: {safe_err}"),
                action: Some("Check system credential store availability".to_string()),
            })
        }
    }
}

#[tauri::command]
pub async fn check_llm_config() -> Result<CheckItemDto, CommandError> {
    let settings = settings::load()?;
    let base_url = settings.llm_base_url.trim().to_string();
    let model = settings.llm_model.trim().to_string();

    if base_url.is_empty() {
        return Ok(CheckItemDto {
            ok: false,
            code: "config_error".to_string(),
            message: "LLM base URL is empty".to_string(),
            action: Some("Set the LLM gateway URL in the Reply section".to_string()),
        });
    }

    if model.is_empty() {
        return Ok(CheckItemDto {
            ok: false,
            code: "config_error".to_string(),
            message: "LLM model name is empty".to_string(),
            action: Some("Set the LLM model name in the Reply section".to_string()),
        });
    }

    let llm_key = credentials::load(SecretSlot::LlmApiKey).unwrap_or(None);
    let base_trimmed = base_url.trim_end_matches('/');

    // Try /models first (OpenAI-compatible health check).
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|err| CommandError::Internal(format!("HTTP client: {err}")))?;

    let models_url = format!("{base_trimmed}/models");
    let mut req = client.get(&models_url);
    if let Some(ref token) = llm_key {
        if !token.trim().is_empty() {
            req = req.bearer_auth(token.trim());
        }
    }

    match req.send().await {
        Ok(resp) if resp.status().is_success() => {
            return Ok(CheckItemDto {
                ok: true,
                code: "ok".to_string(),
                message: format!("LLM endpoint reachable: {base_trimmed} (model: {model})"),
                action: None,
            });
        }
        Ok(resp) if resp.status().as_u16() == 401 || resp.status().as_u16() == 403 => {
            return Ok(CheckItemDto {
                ok: false,
                code: "auth_error".to_string(),
                message: format!(
                    "LLM endpoint returned {}: check your API key",
                    resp.status()
                ),
                action: Some("Verify your LLM API key in the Reply section".to_string()),
            });
        }
        Ok(resp) => {
            // Non-success, non-404 — try base URL as fallback.
            let _status = resp.status();
        }
        Err(_err) => {
            // Network error to /models — try base URL as fallback.
        }
    }

    // Fallback: try GET to base URL (some proxies expose a health endpoint at root).
    let health_url = format!("{base_trimmed}/");
    let mut health_req = client.get(&health_url);
    if let Some(ref token) = llm_key {
        if !token.trim().is_empty() {
            health_req = health_req.bearer_auth(token.trim());
        }
    }

    match health_req.send().await {
        Ok(resp) if resp.status().is_success() => Ok(CheckItemDto {
            ok: true,
            code: "ok".to_string(),
            message: format!("LLM endpoint reachable (root check): {base_trimmed}"),
            action: None,
        }),
        Ok(resp) if resp.status().as_u16() == 401 || resp.status().as_u16() == 403 => {
            Ok(CheckItemDto {
                ok: false,
                code: "auth_error".to_string(),
                message: format!(
                    "LLM endpoint returned {}: check your API key",
                    resp.status()
                ),
                action: Some("Verify your LLM API key in the Reply section".to_string()),
            })
        }
        Ok(_resp) => Ok(CheckItemDto {
            ok: false,
            code: "endpoint_error".to_string(),
            message: format!(
                "LLM endpoint unreachable: {base_trimmed}. The server may not support health checks."
            ),
            action: Some(
                "Check the URL, ensure the server is running, or proceed anyway \u{2014} the capture flow may still work."
                    .to_string(),
            ),
        }),
        Err(err) => {
            let safe_err = crate::privacy::safe_preview(&err.to_string(), 200);
            Ok(CheckItemDto {
                ok: false,
                code: "network_error".to_string(),
                message: format!("Cannot reach LLM endpoint: {safe_err}"),
                action: Some(
                    "Check your network connection and the LLM base URL".to_string(),
                ),
            })
        }
    }
}

#[tauri::command]
pub async fn check_runtime_config() -> Result<RuntimeCheckDto, CommandError> {
    let stt = check_stt_config()?;

    // LLM check is independent of STT result — always run both.
    let llm = check_llm_config().await?;

    // Settings validation.
    let settings_result = match settings::load() {
        Ok(ref s) => match settings::validate(s) {
            Ok(()) => CheckItemDto {
                ok: true,
                code: "ok".to_string(),
                message: "Settings valid".to_string(),
                action: None,
            },
            Err(err) => CheckItemDto {
                ok: false,
                code: "config_error".to_string(),
                message: format!("Settings validation failed: {err}"),
                action: Some("Review settings fields for errors".to_string()),
            },
        },
        Err(err) => CheckItemDto {
            ok: false,
            code: "config_error".to_string(),
            message: format!("Cannot load settings: {err}"),
            action: Some("Check that settings file is accessible".to_string()),
        },
    };

    let runtime_ready = stt.ok && llm.ok && settings_result.ok;

    Ok(RuntimeCheckDto {
        stt,
        llm,
        settings: settings_result,
        runtime_ready,
    })
}
