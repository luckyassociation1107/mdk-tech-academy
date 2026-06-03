export type MasteryNodeStatus = 'locked' | 'unlocked' | 'completed';

export interface MasteryNode {
  id: string;
  title: string;
  objective: string;
  concept: string;
  codeTask: string;
  starterCode: string;
  successCriteria: string[];
  credits: number;
  status: MasteryNodeStatus;
  efficiencyScore?: number;
  feedback?: string;
}

export interface MasteryState {
  path: string;
  nodes: MasteryNode[];
  cognitiveCredits: number;
  totalAvailableCredits: number;
  updatedAt: string;
}

export interface EvaluationResult {
  passed: boolean;
  efficiencyScore: number;
  feedback: string;
}
