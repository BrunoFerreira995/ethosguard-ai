export type ScoredLabel = {
  name: string;
  confidence: number;
  evidence?: string[];
};

export type Analysis = {
  moral_classification: string;
  confidence: number;
  virtues: ScoredLabel[];
  principles: ScoredLabel[];
  ethical_issues: ScoredLabel[];
};

export type Explanation = {
  summary: string;
  reasoning: string[];
};

export type ClassificationResponse = {
  analysis: Analysis;
  explanation: Explanation;
  model: string;
  device: string;
};

export type ServiceHealth = {
  status: string;
  model_loaded?: boolean;
  model?: string;
  device?: string;
};

