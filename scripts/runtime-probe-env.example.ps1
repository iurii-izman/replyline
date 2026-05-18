# Runtime probe local env template.
# Never put real secrets into this file in Git history.
# Copy this file to scripts/runtime-probe-env.local.ps1 for local use only.
# Do not commit scripts/runtime-probe-env.local.ps1.

$env:DEEPGRAM_API_KEY = "replace-with-real-deepgram-key"
$env:LLM_API_KEY = "replace-with-real-llm-key"
# Or use OPENROUTER_API_KEY instead of LLM_API_KEY when applicable:
# $env:OPENROUTER_API_KEY = "replace-with-real-openrouter-key"

pnpm probe:runtime

# Cleanup after run
Remove-Item Env:DEEPGRAM_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:LLM_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:OPENROUTER_API_KEY -ErrorAction SilentlyContinue
