import type { EvaluationResult, MasteryNode, MasteryState } from './types';

const API_GENERATE_URL = import.meta.env.VITE_MDK_LLM_GENERATE_URL ?? '/api/generate-curriculum';
const API_EVALUATE_URL = import.meta.env.VITE_MDK_LLM_EVALUATE_URL ?? '/api/evaluate-challenge';

const nodeFrames = [
  ['Foundation Protocol', 'Translate the vocabulary of the discipline into an executable mental model.'],
  ['Systems Mapping', 'Identify the moving parts, constraints, and professional failure modes.'],
  ['Implementation Lab', 'Construct a working artifact that demonstrates operational fluency.'],
  ['Validation Review', 'Measure correctness, reliability, and edge-case behavior.'],
  ['Optimization Brief', 'Refine the solution for clarity, speed, and maintainability.'],
  ['Capstone Deployment', 'Synthesize the full skill path into a defensible production plan.'],
];

const pathTerms = (path: string) =>
  path
    .split(/[^a-zA-Z0-9+#.]+/)
    .map((term) => term.trim())
    .filter(Boolean);

const titleCase = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1).toLowerCase()}`)
    .join(' ');

export async function generateMasteryTree(path: string): Promise<MasteryState> {
  const trimmedPath = titleCase(path.trim() || 'Applied Technology');
  const override = loadAdminOverride(trimmedPath);
  if (override) {
    return createState(trimmedPath, normalizeNodes(override, trimmedPath));
  }

  const llmNodes = await requestGeneratedNodes(trimmedPath);
  return createState(trimmedPath, normalizeNodes(llmNodes ?? generateFallbackNodes(trimmedPath), trimmedPath));
}

export async function evaluateChallenge(node: MasteryNode, code: string, path: string): Promise<EvaluationResult> {
  const llmResult = await requestEvaluation(node, code, path);
  if (llmResult) return llmResult;

  const criteriaHits = node.successCriteria.filter((criterion) =>
    code.toLowerCase().includes(criterion.split(' ')[0]?.toLowerCase() ?? criterion.toLowerCase()),
  ).length;
  const hasImplementation = code.replace(/\s/g, '').length > node.starterCode.replace(/\s/g, '').length + 80;
  const hasFunction = /function|=>|class|def\s+/i.test(code);
  const passed = hasImplementation && (criteriaHits >= 1 || hasFunction);
  const efficiencyScore = Math.min(100, Math.max(42, 58 + criteriaHits * 9 + (hasFunction ? 14 : 0) + (hasImplementation ? 10 : 0)));

  return {
    passed,
    efficiencyScore: passed ? efficiencyScore : Math.min(74, efficiencyScore),
    feedback: passed
      ? 'Validation accepted. The solution demonstrates a coherent implementation and addresses the operational objective.'
      : 'Validation needs revision. Expand the implementation, explicitly address the success criteria, and make the objective testable in code.',
  };
}

function createState(path: string, nodes: MasteryNode[]): MasteryState {
  const totalAvailableCredits = nodes.reduce((sum, node) => sum + node.credits, 0);
  return {
    path,
    nodes: nodes.map((node, index) => ({ ...node, status: index === 0 ? 'unlocked' : 'locked' })),
    cognitiveCredits: 0,
    totalAvailableCredits,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeNodes(nodes: Partial<MasteryNode>[], path: string): MasteryNode[] {
  const fallbackNodes = generateFallbackNodes(path);
  return Array.from({ length: 6 }, (_, index) => nodes[index] ?? fallbackNodes[index]).map((node, index) => {
    const [frameTitle, frameObjective] = nodeFrames[index] ?? nodeFrames[0];
    const title = node.title ?? `${path}: ${frameTitle}`;
    return {
      id: node.id ?? `node-${index + 1}`,
      title,
      objective: node.objective ?? frameObjective,
      concept: node.concept ?? buildConcept(path, frameTitle),
      codeTask: node.codeTask ?? buildTask(path, frameTitle, index),
      starterCode: node.starterCode ?? buildStarterCode(path, index),
      successCriteria: node.successCriteria?.length ? node.successCriteria : buildCriteria(path, index),
      credits: node.credits ?? 120 + index * 30,
      status: node.status ?? 'locked',
      efficiencyScore: node.efficiencyScore,
      feedback: node.feedback,
    };
  });
}

function generateFallbackNodes(path: string): MasteryNode[] {
  return nodeFrames.map(([frameTitle, objective], index) => ({
    id: `node-${index + 1}`,
    title: `${path}: ${frameTitle}`,
    objective,
    concept: buildConcept(path, frameTitle),
    codeTask: buildTask(path, frameTitle, index),
    starterCode: buildStarterCode(path, index),
    successCriteria: buildCriteria(path, index),
    credits: 120 + index * 30,
    status: 'locked',
  }));
}

function buildConcept(path: string, frameTitle: string) {
  const terms = pathTerms(path).join(', ') || path;
  return `In ${path}, mastery begins by making expert judgment explicit. This module treats ${frameTitle.toLowerCase()} as an operational challenge: define the goal, expose assumptions, and convert theory into a small professional artifact. Focus on the core terms (${terms}), the inputs that shape decisions, and the evidence that proves your work is reliable. Elite technical work is not merely functional; it is legible, auditable, and resilient under constraints.`;
}

function buildTask(path: string, frameTitle: string, index: number) {
  const focus = ['taxonomy', 'risk map', 'prototype', 'test harness', 'optimizer', 'deployment brief'][index] ?? 'artifact';
  return `Build a compact ${focus} for ${path}'s ${frameTitle.toLowerCase()}. Your code should accept structured inputs, produce an interpretable output, and include at least one safeguard that a senior reviewer would expect.`;
}

function buildStarterCode(path: string, index: number) {
  const fn = path.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ').map((part, i) => (i === 0 ? part.toLowerCase() : titleCase(part))).join('') || 'mastery';
  return `type MasteryInput = {\n  signal: string;\n  constraints: string[];\n  evidence: number;\n};\n\nexport function ${fn}Challenge(input: MasteryInput) {\n  // Node ${index + 1}: replace this sketch with your operational solution.\n  return {\n    decision: input.signal,\n    confidence: input.evidence,\n    rationale: input.constraints.join(', '),\n  };\n}\n`;
}

function buildCriteria(path: string, index: number) {
  const base = pathTerms(path)[0] ?? 'mastery';
  return [
    `${base} objective is represented in code`,
    'structured input is transformed into structured output',
    index > 2 ? 'validation or optimization logic is included' : 'professional rationale is documented',
  ];
}

async function requestGeneratedNodes(path: string): Promise<Partial<MasteryNode>[] | null> {
  try {
    const response = await fetch(API_GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path,
        requirement: 'Generate exactly six mastery tree nodes. Return JSON array only.',
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { nodes?: Partial<MasteryNode>[] } | Partial<MasteryNode>[];
    return Array.isArray(data) ? data : data.nodes ?? null;
  } catch {
    return null;
  }
}

async function requestEvaluation(node: MasteryNode, code: string, path: string): Promise<EvaluationResult | null> {
  try {
    const response = await fetch(API_EVALUATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, node, code }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as EvaluationResult;
    if (typeof data.passed !== 'boolean' || typeof data.efficiencyScore !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

function loadAdminOverride(path: string): Partial<MasteryNode>[] | null {
  const raw = localStorage.getItem('mdk-admin-override');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { path?: string; nodes?: Partial<MasteryNode>[] } | Partial<MasteryNode>[];
    if (Array.isArray(parsed)) return parsed;
    if (parsed.path && parsed.path.toLowerCase() !== path.toLowerCase()) return null;
    return parsed.nodes ?? null;
  } catch {
    return null;
  }
}
