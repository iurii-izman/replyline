export type LegacyAnalysisCard = {
  gist: string;
  sayNow: string;
  nextMove: string;
  /// Always present in Rust AnalysisCardDto (chars_band: String, not Option).
  charsBand: string;
  /// Supporting evidence snippet from the LLM response.
  starEvidence?: string;
  riskOrClarifier?: string;
  /// Rich Answer Card fields (CardSchemaV4). When present, UI uses explicit structure
  /// instead of splitting sayNow on the first sentence boundary.
  answerShort?: string;
  answerFull?: string;
  followUpLine?: string;
};

export type InterviewAnswerDto = {
  main: string;
  short: string;
  strong: string;
  structure: "STAR" | "CASE" | "DIRECT" | "CLARIFY";
};

export type InterviewQuestionDto = {
  rawTranscript: string;
  cleanQuestion: string;
  interviewerIntent: string;
  questionType: string;
  confidence: "low" | "medium" | "high";
};

export type InterviewSignalsDto = {
  mustMention: string[];
  keywords: string[];
  metrics?: string[];
  resumeAnchors?: string[];
};

export type InterviewRisksDto = {
  weakPoints: string[];
  avoid: string[];
  safeReframe: string;
};

export type InterviewFollowUpDto = {
  question: string;
  bridgeAnswer: string;
};

export type InterviewClarifierDto = {
  needed: boolean;
  text?: string | null;
};

import type { BilingualMetaDto } from "./bilingualExperimental";

export type InterviewCardDto = {
  mode: "interview";
  answer: InterviewAnswerDto;
  question: InterviewQuestionDto;
  signals: InterviewSignalsDto;
  risks: InterviewRisksDto;
  followUps: InterviewFollowUpDto[];
  clarifier: InterviewClarifierDto;
  bilingualMeta?: BilingualMetaDto | null;
};

export type WorkConversationCard = LegacyAnalysisCard & {
  mode: "work";
};

export type InterviewAnalysisCard = LegacyAnalysisCard & {
  mode: "interview";
  interview: InterviewCardDto;
};

export type AnalysisCard = WorkConversationCard | InterviewAnalysisCard;

export type AnalysisCardDto = LegacyAnalysisCard & {
  interviewCard?: InterviewCardDto | null;
  interviewCardSchemaV1?: InterviewCardDto | null;
};

export function asAnalysisCard(input: AnalysisCardDto): AnalysisCard {
  const interview = input.interviewCardSchemaV1 ?? input.interviewCard ?? null;
  if (interview) {
    return {
      ...input,
      mode: "interview",
      interview,
      // Keep action semantics stable: primary copy always mirrors interview answer.
      sayNow: interview.answer.main?.trim() || input.sayNow,
    };
  }
  return {
    ...input,
    mode: "work",
  };
}

export type StatusEvent = {
  runId?: string;
  phase: string;
  detail?: string | null;
};
