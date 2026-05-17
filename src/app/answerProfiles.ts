export type AnswerProfileId =
  | "interview_default"
  | "interview_concise"
  | "interview_star"
  | "interview_executive"
  | "interview_technical"
  | "interview_product"
  | "interview_hr";

export type AnswerProfileOption = {
  id: AnswerProfileId;
  title: string;
  description: string;
};

export const DEFAULT_ANSWER_PROFILE: AnswerProfileId = "interview_default";

export const ANSWER_PROFILE_OPTIONS: AnswerProfileOption[] = [
  {
    id: "interview_default",
    title: "Interview Default",
    description: "Balanced interview answer with clear action and concrete next step.",
  },
  {
    id: "interview_concise",
    title: "Interview Concise",
    description: "Short answer first, then one concrete action.",
  },
  {
    id: "interview_star",
    title: "Interview STAR",
    description: "Bias to STAR framing with explicit situation-task-action-result logic.",
  },
  {
    id: "interview_executive",
    title: "Interview Executive",
    description: "Executive tone: crisp recommendation, risk framing, accountable next step.",
  },
  {
    id: "interview_technical",
    title: "Interview Technical",
    description: "Technical explanation with assumptions, mechanism, and tradeoffs.",
  },
  {
    id: "interview_product",
    title: "Interview Product",
    description: "Product framing with user impact, tradeoff, and decision path.",
  },
  {
    id: "interview_hr",
    title: "Interview HR",
    description: "Professional people-oriented framing with policy-safe wording.",
  },
];

export function resolveAnswerProfileOption(id: string): AnswerProfileOption {
  return (
    ANSWER_PROFILE_OPTIONS.find((option) => option.id === id) ??
    ANSWER_PROFILE_OPTIONS[0]
  );
}
