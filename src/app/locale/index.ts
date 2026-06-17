import { card_ru, card_en } from "./card";
import { common_ru, common_en } from "./common";
import { contextPack_ru, contextPack_en } from "./contextPack";
import { settings_ru, settings_en } from "./settings";

export const ui_ru = {
  ...common_ru,
  card: card_ru,
  settings: settings_ru,
  contextPack: contextPack_ru,
} as const;

export type UiStrings = typeof ui_ru;

export const ui_en: UiStrings = {
  ...common_en,
  card: card_en,
  settings: settings_en,
  contextPack: contextPack_en,
} as const;

export function getUi(lang: string): UiStrings {
  return lang.startsWith("en") ? ui_en : ui_ru;
}
