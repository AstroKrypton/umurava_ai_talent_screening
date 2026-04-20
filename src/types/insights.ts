export type InclusionInsightsReport = {
  inclusionScore: number;
  skillDiversityIndex: number;
  educationNeutrality: string;
  inclusionSummary: string;
  justification?: string;
  source?: "gemini" | "heuristic";
};

export type InclusionInsightsRequest = {
  shortlistId: string;
  shortlist: Array<Record<string, unknown>>;
};
