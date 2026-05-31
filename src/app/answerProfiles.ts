import answerProfilesSpec from "../../specs/answer-profiles.json";

type AnswerProfilesSpec = {
  defaultProfileId: string;
  profiles: Array<{
    id: string;
    title: string;
    description: string;
  }>;
};

export type AnswerProfileOption = {
  id: string;
  title: string;
  description: string;
};

const SPEC = answerProfilesSpec as AnswerProfilesSpec;

export const ANSWER_PROFILE_OPTIONS: AnswerProfileOption[] = SPEC.profiles.map((profile) => ({
  id: profile.id,
  title: profile.title,
  description: profile.description,
}));

export type AnswerProfileId = (typeof ANSWER_PROFILE_OPTIONS)[number]["id"];

export const DEFAULT_ANSWER_PROFILE: AnswerProfileId = SPEC.defaultProfileId;

export function resolveAnswerProfileOption(id: string): AnswerProfileOption {
  return ANSWER_PROFILE_OPTIONS.find((option) => option.id === id) ?? ANSWER_PROFILE_OPTIONS[0]!;
}
