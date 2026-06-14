export type Phase =
  | "booting"
  | "idle"
  | "capturing"
  | "transcribing"
  | "analyzing"
  | "ready"
  | "error";

export type SettingsSectionId =
  | "overview"
  | "speech"
  | "llm"
  | "hotkey"
  | "reports"
  | "candidatePack";

export type Panel = "main" | "settings" | "candidatePackStudio";

export type AppSettings = {
  schemaVersion: 10;
  hotkey: string;
  llmBaseUrl: string;
  llmModel: string;
  selectedModelPreset: string;
  captureMaxSeconds: number;
  activeAnswerProfile: string;
  windowOpacity: 100 | 90 | 80 | 70;
  hideToTrayOnClose: boolean;
  keepOnTopDuringCapture: boolean;
  interviewCompactMode: boolean;
  interviewReportRetentionDays: 0 | 7 | 30 | 90;
  debugTraceMode: "off" | "redacted" | "full_local";
  debugTraceRetentionDays: 0 | 1 | 3 | 7;
  bilingualInterviewEnabled: boolean;
  interviewInputLanguage: "en" | "ru";
  translationLanguage: "en" | "ru";
  liveTranslationEnabled: boolean;
  translationDebounceMs: number;
  translationMinWordCount: number;
  bilingualRetentionBehavior: "session_only";
  bilingualAnswerStyle: "b2_conversational";
};

export type MainUiState = "idle" | "capturing" | "transcribing" | "analyzing" | "ready" | "error";

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 10,
  hotkey: "Ctrl+Alt+Space",
  llmBaseUrl: "",
  llmModel: "gpt-4o-mini",
  selectedModelPreset: "custom_openai_compatible",
  captureMaxSeconds: 45,
  activeAnswerProfile: "interview_default",
  windowOpacity: 100,
  hideToTrayOnClose: true,
  keepOnTopDuringCapture: false,
  interviewCompactMode: false,
  interviewReportRetentionDays: 0,
  debugTraceMode: "redacted",
  debugTraceRetentionDays: 3,
  bilingualInterviewEnabled: false,
  interviewInputLanguage: "en",
  translationLanguage: "ru",
  liveTranslationEnabled: false,
  translationDebounceMs: 600,
  translationMinWordCount: 3,
  bilingualRetentionBehavior: "session_only",
  bilingualAnswerStyle: "b2_conversational",
};
