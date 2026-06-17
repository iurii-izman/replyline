import { card_ru, card_en } from "./localeCard";
import { settings_ru, settings_en } from "./localeSettings";
import { ui_shell_ru, ui_shell_en } from "./localeUi";

export const ui_ru = {
  ...ui_shell_ru,
  card: card_ru,
  settings: settings_ru,
} as const;

export type UiStrings = typeof ui_ru;

export const ui_en: UiStrings = {
  ...ui_shell_en,
  card: card_en,
  settings: settings_en,
} as const;

export function getUi(lang: string): UiStrings {
  return lang.startsWith("en") ? ui_en : ui_ru;
}
