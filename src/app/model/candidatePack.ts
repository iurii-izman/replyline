export type CandidateFactStrength = "strong" | "medium" | "weak";

export type CandidateFact = {
  id: string;
  title: string;
  claim: string;
  description: string;
  evidence: string;
  skills: string[];
  metrics: string[];
  strength: CandidateFactStrength;
  suitableForQuestions: string[];
};

export type CandidatePackDto = {
  candidateSummary: string;
  targetRole: string;
  resumeFacts: CandidateFact[];
  jobDescription: {
    title: string;
    company: string;
    requirements: string[];
    responsibilities: string[];
    keywords: string[];
  };
  companyValues: string[];
  answerConstraints: {
    avoidClaims: string[];
    preferredExamples: string[];
    language: string;
  };
};

export type CandidatePackStatusDto = {
  exists: boolean;
  factCount: number;
  weakFactCount: number;
};

export type CandidatePackDraftFact = {
  fact: string;
  evidence: string;
  strength: "strong" | "medium" | "weak";
  metrics: string[];
};

export type CandidatePackDraft = {
  packQualityScore: number;
  missingDataWarnings: string[];
  suggestedMissingInfo: string[];
  candidateFacts: CandidatePackDraftFact[];
  roleKeywords: string[];
  companyValues: string[];
};
