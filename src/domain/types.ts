export type Confidence = 'low' | 'medium' | 'high';

export interface Criterion {
  id: string;
  name: string;
  weight: number;
  description: string;
}

export interface ScoreCell {
  value: number;
  confidence: Confidence;
  note: string;
}

export interface DecisionOption {
  id: string;
  name: string;
  summary: string;
  scores: Record<string, ScoreCell>;
}

export interface Scenario {
  id: string;
  name: string;
  weights: Record<string, number>;
}

export interface Decision {
  schemaVersion: 1;
  id: string;
  title: string;
  framing: string;
  criteria: Criterion[];
  options: DecisionOption[];
  scenarios: Scenario[];
  activeScenarioId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RankedOption {
  optionId: string;
  name: string;
  score: number;
  confidence: number;
  contributions: Record<string, number>;
}

export interface SensitivityFinding {
  criterionId: string;
  criterionName: string;
  originalWeight: number;
  flipWeight: number;
  delta: number;
  newLeaderId: string;
  newLeaderName: string;
}
