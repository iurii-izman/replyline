export type InterviewQuestionReportDto = {
  timestamp: string;
  rawTranscript: string;
  cleanQuestion: string;
  questionType: string;
  answerMain: string;
  hints: string[];
  signals: string[];
};

export type InterviewReportDto = {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  language: string;
  questions: InterviewQuestionReportDto[];
  fullTranscript: string;
  scores: {
    clarity: number;
    relevance: number;
    accuracy: number;
  };
  feedback: {
    strengths: string[];
    improvements: string[];
    missingExamples: string[];
  };
};

export type InterviewSessionStateDto = {
  active: boolean;
  sessionId: string;
  startedAt: string;
  language: string;
  questions: InterviewQuestionReportDto[];
};
