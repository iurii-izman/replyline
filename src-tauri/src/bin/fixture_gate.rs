#![allow(dead_code)]

use std::env;
use std::fs;
use std::path::PathBuf;

use serde::Deserialize;

#[path = "../llm.rs"]
mod llm;
#[path = "../fs_atomic.rs"]
mod fs_atomic;
#[path = "../settings.rs"]
mod settings;
#[path = "../types.rs"]
mod types;

use types::AppSettings;

#[derive(Debug, Deserialize)]
struct FixtureSnippetRow {
    id: String,
    snippet: String,
}

fn fixture_path() -> Result<PathBuf, String> {
    Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or_else(|| "Cannot resolve workspace root.".to_string())?
        .join("fixtures")
        .join("ru-work-snippets.json"))
}

fn parse_fixture_ids(input: &str) -> Vec<String> {
    input
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

fn assert_guardrails(id: &str, card: &types::AnalysisCardDto) -> Result<(), String> {
    let gist_len = card.gist.chars().count();
    let say_len = card.say_now.chars().count();
    let next_len = card.next_move.chars().count();
    if gist_len == 0 || gist_len > 110 {
        return Err(format!("Fixture {id}: gist length out of range ({gist_len})."));
    }
    if say_len == 0 || say_len > 220 {
        return Err(format!("Fixture {id}: say_now length out of range ({say_len})."));
    }
    if next_len == 0 || next_len > 110 {
        return Err(format!(
            "Fixture {id}: next_move length out of range ({next_len})."
        ));
    }
    let lower = card.say_now.to_lowercase();
    let apology_only = ["простите", "извините", "сожалею"]
        .iter()
        .any(|token| lower.starts_with(token));
    if apology_only
        && !["сегодня", "до ", "пришлю", "сделаю", "давайте", "фиксируем", "уточню"]
            .iter()
            .any(|token| lower.contains(token))
    {
        return Err(format!("Fixture {id}: say_now looks apology-only."));
    }
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), String> {
    let llm_api_key = env::var("OPENROUTER_API_KEY")
        .or_else(|_| env::var("LLM_API_KEY"))
        .map_err(|_| "OPENROUTER_API_KEY or LLM_API_KEY is missing.".to_string())?;

    let fixture_raw = fs::read_to_string(fixture_path()?)
        .map_err(|err| format!("Failed to read fixtures file: {err}"))?;
    let fixtures: Vec<FixtureSnippetRow> =
        serde_json::from_str(&fixture_raw).map_err(|err| format!("Bad fixtures JSON: {err}"))?;

    if fixtures.is_empty() {
        return Err("Fixture file is empty.".to_string());
    }

    let ids = env::var("REPLYLINE_FIXTURE_IDS")
        .ok()
        .map(|v| parse_fixture_ids(&v))
        .filter(|v| !v.is_empty());

    let selected: Vec<&FixtureSnippetRow> = if let Some(wanted) = ids {
        wanted
            .iter()
            .map(|id| {
                fixtures
                    .iter()
                    .find(|row| row.id == *id)
                    .ok_or_else(|| format!("Unknown fixture id: {id}"))
            })
            .collect::<Result<Vec<_>, _>>()?
    } else {
        fixtures.iter().take(3).collect()
    };

    let settings = AppSettings {
        llm_base_url: env::var("REPLYLINE_LLM_BASE_URL")
            .unwrap_or_else(|_| "https://openrouter.ai/api/v1".to_string()),
        llm_model: env::var("REPLYLINE_LLM_MODEL")
            .unwrap_or_else(|_| "openai/gpt-4o-mini".to_string()),
        // Keep fixture gate deterministic; reduces flaky LLM wording drift.
        llm_temperature: 0.0,
        ..AppSettings::default()
    };

    println!("Fixture gate running: {} case(s)", selected.len());
    for fixture in selected {
        let mut last_err: Option<String> = None;
        let mut passed = false;
        for attempt in 1..=3 {
            match llm::analyze_transcript(&settings, Some(&llm_api_key), &fixture.snippet, "").await {
                Ok(card) => {
                    if card.gist.trim().is_empty()
                        || card.say_now.trim().is_empty()
                        || card.next_move.trim().is_empty()
                    {
                        last_err = Some(format!("Fixture {} produced empty card fields.", fixture.id));
                        continue;
                    }
                    if let Err(err) = assert_guardrails(&fixture.id, &card) {
                        last_err = Some(err);
                        continue;
                    }
                    println!(
                        "ok {} (attempt {}) -> gist={} chars, say_now={} chars, next_move={} chars",
                        fixture.id,
                        attempt,
                        card.gist.chars().count(),
                        card.say_now.chars().count(),
                        card.next_move.chars().count()
                    );
                    passed = true;
                    break;
                }
                Err(err) => {
                    last_err = Some(format!("Fixture {} attempt {} failed: {}", fixture.id, attempt, err));
                }
            }
        }
        if !passed {
            return Err(last_err.unwrap_or_else(|| format!("Fixture {} failed without details.", fixture.id)));
        }
    }

    println!("Fixture gate OK.");
    Ok(())
}
