import { describe, expect, it } from "vitest";

import { ui_en, ui_ru } from "./locale";

function collectKeys(value: unknown, prefix = ""): string[] {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix].filter(Boolean);
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, next]) =>
    collectKeys(next, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale parity", () => {
  it("keeps RU and EN locale keys in sync", () => {
    const ruKeys = collectKeys(ui_ru).sort((a, b) => a.localeCompare(b));
    const enKeys = collectKeys(ui_en).sort((a, b) => a.localeCompare(b));
    expect(enKeys).toEqual(ruKeys);
  });
});
