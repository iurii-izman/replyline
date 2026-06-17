import type { SettingsSectionId } from "../model";
import type { ReplylineController } from "../controller";

export function formatDurationLabel(
  startIso?: string | null,
  endIso?: string | null,
): string | null {
  if (!startIso) return null;
  const start = Date.parse(startIso);
  if (!Number.isFinite(start)) return null;
  const end = endIso ? Date.parse(endIso) : Date.now();
  if (!Number.isFinite(end)) return null;
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function mapSetupStepToSection(label: string): SettingsSectionId {
  if (label.startsWith("1.")) return "speech";
  if (label.startsWith("2.")) return "llm";
  return "hotkey";
}

export function joinList(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(" • ");
  }
  return typeof value === "string" ? value : "";
}

export function interviewCardLabel(
  controller: ReplylineController,
  key: "answer" | "question" | "signals" | "risks" | "followUps" | "clarifier",
) {
  const st = controller.strings();
  if (key === "answer") return st.card.interview.cardLabels.answer;
  if (key === "question") return st.card.interview.cardLabels.question;
  if (key === "signals") return st.card.interview.cardLabels.signals;
  if (key === "risks") return st.card.interview.cardLabels.risks;
  if (key === "followUps") return st.card.interview.cardLabels.followUps;
  return st.card.interview.cardLabels.clarifier;
}

export type InterviewCardKey = Parameters<typeof interviewCardLabel>[1];

export function interviewCardTabId(key: InterviewCardKey): string {
  return `interview-card-tab-${key}`;
}

export function interviewCardPanelId(key: InterviewCardKey): string {
  return `interview-card-panel-${key}`;
}
