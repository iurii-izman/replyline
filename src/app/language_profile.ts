/**
 * Minimal centralized language profile (v1).
 *
 * RU-first by design. No runtime language switching is exposed to the user yet.
 * All runtime language decisions flow through this module so there is a single
 * source of truth instead of scattered `"ru"` literals.
 */

export const DEFAULT_LANGUAGE = "ru";
export type LanguageCode = "ru" | "en";

export interface LanguageProfile {
  code: LanguageCode;
}

/**
 * Returns the current application language code.
 * Currently always RU — future versions may read from settings or OS locale.
 */
export function currentLanguage(): LanguageCode {
  return DEFAULT_LANGUAGE;
}

/**
 * Returns the current language profile.
 * Currently always RU profile — future versions may read from settings or OS locale.
 */
export function currentProfile(): LanguageProfile {
  return { code: DEFAULT_LANGUAGE };
}
