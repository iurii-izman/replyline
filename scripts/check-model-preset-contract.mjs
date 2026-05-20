import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const tsPath = join(root, "src/app/modelPresets.ts");
const rsPath = join(root, "src-tauri/src/model_presets.rs");

const tsSource = readFileSync(tsPath, "utf8");
const rsSource = readFileSync(rsPath, "utf8");

const idRegex = /id:\s*"([^"]+)"/g;
const tsPresetIds = [];
for (const match of tsSource.matchAll(idRegex)) {
  tsPresetIds.push(match[1]);
}

const backendKnownIds = new Set(
  [...rsSource.matchAll(/"([^"]+)"\s*=>\s*ModelPreset\s*\{/g)].map((match) => match[1]),
);

const failures = [];
for (const id of tsPresetIds) {
  if (!backendKnownIds.has(id)) {
    failures.push(`Backend resolver does not know TS preset id "${id}".`);
  }
}

const openrouterIds = tsPresetIds.filter((id) => id.startsWith("openrouter_"));
for (const id of openrouterIds) {
  const blockMatch = rsSource.match(
    new RegExp(String.raw`"${id}"\s*=>\s*ModelPreset\s*\{([\s\S]*?)\},`, "m"),
  );
  if (!blockMatch) {
    failures.push(`Missing backend block for OpenRouter preset "${id}".`);
    continue;
  }
  const block = blockMatch[1];
  if (!/provider_kind:\s*ProviderKind::OpenRouter/.test(block)) {
    failures.push(`OpenRouter preset "${id}" must map to ProviderKind::OpenRouter.`);
  }
  if (/fallback_models:\s*&\[\s*]/.test(block)) {
    failures.push(`OpenRouter preset "${id}" must have non-empty fallback_models.`);
  }
}

const customBlock = rsSource.match(
  /"custom_openai_compatible"\s*=>\s*ModelPreset\s*\{([\s\S]*?)\},/m,
);
if (!customBlock) {
  failures.push('Missing backend block for "custom_openai_compatible".');
} else {
  const block = customBlock[1];
  if (!/provider_kind:\s*ProviderKind::Custom/.test(block)) {
    failures.push('"custom_openai_compatible" must map to ProviderKind::Custom.');
  }
  if (!/fallback_models:\s*&\[\s*]/.test(block)) {
    failures.push('"custom_openai_compatible" must keep empty fallback_models.');
  }
}

const hasUnknownFallbackProvider = /_\s*=>\s*ModelPreset\s*\{[\s\S]*provider_kind:\s*ProviderKind::OpenAiCompatible/.test(
  rsSource,
);
if (hasUnknownFallbackProvider === false) {
  failures.push("Unknown preset safe fallback must resolve to ProviderKind::OpenAiCompatible.");
}
const hasUnknownFallbackModels = /_\s*=>\s*ModelPreset\s*\{[\s\S]*fallback_models:\s*&\[\s*]/.test(
  rsSource,
);
if (hasUnknownFallbackModels === false) {
  failures.push("Unknown preset safe fallback must keep empty fallback_models.");
}

if (failures.length > 0) {
  console.error("Model preset contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Model preset contract OK. TS presets=${tsPresetIds.length}; OpenRouter presets=${openrouterIds.length}; backend known ids=${backendKnownIds.size}.`,
);
