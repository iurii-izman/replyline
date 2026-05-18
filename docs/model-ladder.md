# Model Ladder

Interview Mode model selection is based on static presets.

## OpenRouter presets

Current preset ladder is defined in `src/app/modelPresets.ts` and exposed in Settings:

- `OpenRouter Free / Dev`
- `OpenRouter Fast / Budget`
- `OpenRouter Balanced Paid`
- `OpenRouter Quality Paid`
- `Custom OpenAI-compatible`

## Ladder behavior

- OpenRouter presets can provide fallback model ladders (`models` payload).
- Custom/OpenAI-compatible preset uses only `model` for compatibility.

## Cost and reliability caveats

- Free models can be rate-limited and availability may vary.
- Paid presets require active credits/billing.
- A higher-cost model is not a permanent guarantee of best outcome.

Do not publish a permanent "best model" claim. Re-validate with interview quality dataset before rollout.

## Review checklist (release)

1. Preset metadata reviewed (`lastReviewedAt`, fallback ladder).
2. Credits caveats and free-tier caveats documented.
3. `pnpm test:interview-quality` and `pnpm report:interview-quality` reviewed.
