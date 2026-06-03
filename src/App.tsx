import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Editor from '@monaco-editor/react';
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Code2,
  DatabaseZap,
  Gauge,
  Globe2,
  GraduationCap,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';
import { evaluateChallenge, generateMasteryTree } from './academyEngine';
import type { EvaluationResult, MasteryNode, MasteryState } from './types';

const STORAGE_KEY = 'mdk-mastery-state';
const SAMPLE_PATHS = ['AI Engineering', 'Cloud Architecture', 'Cybersecurity', 'Data Science'];

export default function App() {
  const isAdmin = window.location.pathname === '/mdk-admin-core';
  return isAdmin ? <AdminCore /> : <Academy />;
}

function Academy() {
  const [state, setState] = useState<MasteryState | null>(() => loadState());
  const [path, setPath] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(state?.nodes.find((node) => node.status !== 'locked')?.id ?? null);
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const activeNode = useMemo(
    () => state?.nodes.find((node) => node.id === activeNodeId) ?? state?.nodes.find((node) => node.status === 'unlocked') ?? null,
    [activeNodeId, state],
  );

  useEffect(() => {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const glow = state ? Math.round((state.cognitiveCredits / state.totalAvailableCredits) * 100) : 0;
  const completedNodes = state ? state.nodes.filter((node) => node.status === 'completed') : [];
  const averageEfficiency = completedNodes.length
    ? Math.round(completedNodes.reduce((sum, node) => sum + (node.efficiencyScore ?? 0), 0) / completedNodes.length)
    : 0;
  const currentCode = activeNode ? codeDrafts[activeNode.id] ?? activeNode.starterCode : '';

  async function beginPath() {
    if (!path.trim()) return;
    setIsGenerating(true);
    setEvaluation(null);
    const generated = await generateMasteryTree(path);
    setState(generated);
    setActiveNodeId(generated.nodes[0]?.id ?? null);
    setCodeDrafts({});
    setIsGenerating(false);
  }

  async function executeChallenge() {
    if (!state || !activeNode || activeNode.status === 'locked') return;
    setIsExecuting(true);
    const result = await evaluateChallenge(activeNode, currentCode, state.path);
    setEvaluation(result);

    if (result.passed) {
      const nextUnlockedId = state.nodes[state.nodes.findIndex((node) => node.id === activeNode.id) + 1]?.id;
      setState((previous) => {
        if (!previous) return previous;
        const completedIndex = previous.nodes.findIndex((node) => node.id === activeNode.id);
        const nodes = previous.nodes.map((node, index) => {
          if (node.id === activeNode.id) {
            return { ...node, status: 'completed' as const, efficiencyScore: result.efficiencyScore, feedback: result.feedback };
          }
          if (index === completedIndex + 1 && node.status === 'locked') {
            return { ...node, status: 'unlocked' as const };
          }
          return node;
        });
        const completedNode = previous.nodes[completedIndex];
        const alreadyCompleted = completedNode?.status === 'completed';
        return {
          ...previous,
          nodes,
          cognitiveCredits: alreadyCompleted ? previous.cognitiveCredits : previous.cognitiveCredits + (completedNode?.credits ?? 0),
          updatedAt: new Date().toISOString(),
        };
      });
      if (nextUnlockedId) setActiveNodeId(nextUnlockedId);
    }
    setIsExecuting(false);
  }

  if (!state) {
    return <Landing path={path} setPath={setPath} beginPath={beginPath} isGenerating={isGenerating} />;
  }

  return (
    <main className="min-h-screen bg-academy-pearl text-academy-ink">
      <header className="border-b border-academy-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-academy-slate">
              <GraduationCap size={16} /> MDK Tech Academy
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-academy-navy">{state.path} Mastery Engine</h1>
          </div>
          <button
            className="rounded-full border border-academy-line px-4 py-2 text-sm font-semibold text-academy-slate transition hover:border-academy-navy hover:text-academy-navy"
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setState(null);
              setPath('');
            }}
          >
            Select new path
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <MasteryGlobe glow={glow} credits={state.cognitiveCredits} total={state.totalAvailableCredits} />
          <section className="grid grid-cols-2 gap-3">
            <Metric icon={<CheckCircle2 size={18} />} label="Nodes Cleared" value={`${completedNodes.length}/6`} />
            <Metric icon={<Gauge size={18} />} label="Efficiency" value={`${averageEfficiency}%`} />
          </section>
          <MasteryTree nodes={state.nodes} activeNodeId={activeNode?.id} onSelect={setActiveNodeId} />
        </aside>

        <Workspace
          node={activeNode}
          code={currentCode}
          onCodeChange={(value) => activeNode && setCodeDrafts((drafts) => ({ ...drafts, [activeNode.id]: value }))}
          onExecute={executeChallenge}
          evaluation={evaluation}
          isExecuting={isExecuting}
        />
      </section>
    </main>
  );
}

function Landing({ path, setPath, beginPath, isGenerating }: { path: string; setPath: (value: string) => void; beginPath: () => void; isGenerating: boolean }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-academy-navy px-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(121,216,255,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_45%)]" />
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-3xl text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-glow backdrop-blur">
          <BrainCircuit size={34} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-academy-cyan">Autonomous Learning Engine</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight md:text-7xl">MDK TECH ACADEMY</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          Enter a discipline. The engine composes a six-node mastery tree, validates your work, and illuminates your mastery globe as your cognitive credits compound.
        </p>
        <div className="mt-10 flex rounded-full border border-white/15 bg-white p-2 shadow-2xl">
          <input
            value={path}
            onChange={(event) => setPath(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && beginPath()}
            className="min-w-0 flex-1 rounded-full px-6 text-lg text-academy-navy outline-none placeholder:text-slate-400"
            placeholder="Select your path to mastery."
          />
          <button
            onClick={beginPath}
            disabled={isGenerating || !path.trim()}
            className="flex items-center gap-2 rounded-full bg-academy-navy px-6 py-4 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? 'Composing' : 'Generate'} <ArrowRight size={18} />
          </button>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {SAMPLE_PATHS.map((sample) => (
            <button
              key={sample}
              onClick={() => setPath(sample)}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur transition hover:border-academy-cyan hover:text-white"
            >
              {sample}
            </button>
          ))}
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.3em] text-slate-500">Deploy-ready static web app • Local AI fallback • Admin override enabled</p>
      </motion.div>
    </main>
  );
}

function MasteryGlobe({ glow, credits, total }: { glow: number; credits: number; total: number }) {
  const springGlow = useSpring(glow, { stiffness: 80, damping: 18 });
  const orbitOpacity = useTransform(springGlow, (value: number) => 0.18 + value / 140);
  const coreOpacity = useTransform(springGlow, (value: number) => value / 140);
  useEffect(() => springGlow.set(glow), [glow, springGlow]);

  return (
    <section className="rounded-[2rem] border border-academy-line bg-white p-6 shadow-institutional">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-academy-slate">Mastery Globe</p>
          <h2 className="mt-1 text-xl font-semibold text-academy-navy">{glow}% illuminated</h2>
        </div>
        <Globe2 className="text-academy-gold" />
      </div>
      <motion.div
        className="relative mx-auto mt-8 flex h-64 w-64 items-center justify-center rounded-full bg-gradient-to-br from-academy-navy via-slate-800 to-slate-500"
        animate={{
          boxShadow: `0 0 ${24 + glow * 1.1}px rgba(121, 216, 255, ${0.18 + glow / 130})`,
          scale: 1 + glow / 1200,
        }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      >
        <motion.div className="absolute inset-5 rounded-full border border-white/20" style={{ opacity: orbitOpacity }} />
        <motion.div className="absolute h-44 w-44 rounded-full bg-academy-cyan blur-3xl" style={{ opacity: coreOpacity }} />
        <div className="relative rounded-full border border-white/25 bg-white/10 p-8 backdrop-blur">
          <Sparkles size={58} className="text-white" />
        </div>
      </motion.div>
      <div className="mt-7 grid grid-cols-2 gap-3">
        <Metric icon={<DatabaseZap size={18} />} label="Cognitive Credits" value={`${credits}`} />
        <Metric icon={<Gauge size={18} />} label="Total Available" value={`${total}`} />
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-academy-line bg-slate-50 p-4">
      <div className="text-academy-slate">{icon}</div>
      <p className="mt-3 text-xs uppercase tracking-[0.25em] text-academy-slate">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-academy-navy">{value}</p>
    </div>
  );
}

function MasteryTree({ nodes, activeNodeId, onSelect }: { nodes: MasteryNode[]; activeNodeId?: string; onSelect: (nodeId: string) => void }) {
  return (
    <section className="rounded-[2rem] border border-academy-line bg-white p-5 shadow-institutional">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-academy-slate">Mastery Tree</p>
      <div className="space-y-3">
        {nodes.map((node, index) => (
          <motion.button
            key={node.id}
            layout
            disabled={node.status === 'locked'}
            onClick={() => onSelect(node.id)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              activeNodeId === node.id ? 'border-academy-navy bg-academy-navy text-white' : 'border-academy-line bg-slate-50 text-academy-ink hover:border-academy-slate'
            } ${node.status === 'locked' ? 'cursor-not-allowed opacity-55' : ''}`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/25 text-sm font-semibold">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{node.title}</p>
                <p className={`mt-1 text-xs ${activeNodeId === node.id ? 'text-slate-300' : 'text-academy-slate'}`}>{node.credits} credits</p>
              </div>
              {node.status === 'completed' ? <CheckCircle2 size={20} className="text-academy-gold" /> : node.status === 'locked' ? <Lock size={18} /> : <ChevronRight size={18} />}
            </div>
            <AnimatePresence>
              {node.efficiencyScore !== undefined && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-sm font-semibold text-academy-gold">
                  Efficiency Score: {node.efficiencyScore}%
                </motion.p>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function Workspace({
  node,
  code,
  onCodeChange,
  onExecute,
  evaluation,
  isExecuting,
}: {
  node: MasteryNode | null;
  code: string;
  onCodeChange: (value: string) => void;
  onExecute: () => void;
  evaluation: EvaluationResult | null;
  isExecuting: boolean;
}) {
  if (!node) return null;
  return (
    <section className="overflow-hidden rounded-[2rem] border border-academy-line bg-white shadow-institutional">
      <div className="border-b border-academy-line bg-slate-50 px-6 py-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-academy-slate"><ShieldCheck size={15} /> Operational Challenge</p>
        <h2 className="mt-2 text-3xl font-semibold text-academy-navy">{node.title}</h2>
        <p className="mt-2 text-academy-slate">{node.objective}</p>
      </div>
      <div className="grid min-h-[720px] lg:grid-cols-2">
        <article className="border-b border-academy-line p-8 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-academy-slate">Concept Overview</p>
          <div className="mt-5 space-y-5 font-serif text-xl leading-9 text-slate-700">
            <p>{node.concept}</p>
            <p className="rounded-3xl border border-academy-line bg-slate-50 p-5 text-lg leading-8">{node.codeTask}</p>
          </div>
          <div className="mt-8 rounded-3xl bg-academy-navy p-5 text-white">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><TerminalSquare size={18} /> Success Criteria</p>
            <ul className="space-y-2 text-sm text-slate-300">
              {node.successCriteria.map((criterion) => <li key={criterion}>• {criterion}</li>)}
            </ul>
          </div>
        </article>
        <div className="flex min-h-[720px] flex-col bg-[#0b1220]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white">
            <p className="flex items-center gap-2 font-semibold"><Code2 size={18} /> Interactive Challenge</p>
            <button
              onClick={onExecute}
              disabled={isExecuting || node.status === 'locked'}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-academy-navy transition hover:bg-academy-cyan disabled:opacity-50"
            >
              <Play size={15} /> {isExecuting ? 'Evaluating' : 'Execute'}
            </button>
          </div>
          <div className="min-h-[520px] flex-1">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              theme="vs-dark"
              value={code}
              onChange={(value) => onCodeChange(value ?? '')}
              options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: 'JetBrains Mono, monospace', padding: { top: 18 }, wordWrap: 'on' }}
            />
          </div>
          <FeedbackPanel evaluation={evaluation} />
        </div>
      </div>
    </section>
  );
}

function FeedbackPanel({ evaluation }: { evaluation: EvaluationResult | null }) {
  return (
    <div className="border-t border-white/10 bg-[#0f172a] p-5 text-white">
      <AnimatePresence mode="wait">
        {evaluation ? (
          <motion.div key={evaluation.feedback} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className={`flex items-center gap-2 font-semibold ${evaluation.passed ? 'text-academy-cyan' : 'text-amber-300'}`}>
              {evaluation.passed ? <CheckCircle2 size={18} /> : <Gauge size={18} />} {evaluation.passed ? 'Unlock Protocol Accepted' : 'Technical Feedback'}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{evaluation.feedback}</p>
            <p className="mt-3 text-sm font-semibold text-white">Efficiency Score: {evaluation.efficiencyScore}%</p>
          </motion.div>
        ) : (
          <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-slate-400">
            Execution feedback will appear here after the LLM validation pass.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminCore() {
  const [json, setJson] = useState(() => localStorage.getItem('mdk-admin-override') ?? '{\n  "path": "AI Engineering",\n  "nodes": []\n}');
  const [status, setStatus] = useState('Override JSON is local to this testing browser.');

  function saveOverride() {
    try {
      JSON.parse(json);
      localStorage.setItem('mdk-admin-override', json);
      localStorage.removeItem(STORAGE_KEY);
      setStatus('Override saved. The next generated mastery tree will use this JSON when its path matches.');
    } catch {
      setStatus('Invalid JSON. Correct the payload before saving.');
    }
  }

  return (
    <main className="min-h-screen bg-academy-navy px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-white/15 bg-white/10 p-8 shadow-glow backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-academy-cyan">Hidden Admin Core</p>
        <h1 className="mt-3 text-4xl font-semibold">Curriculum Override Console</h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          Provide optional JSON for six curriculum nodes. Leave this empty in normal operation; the academy defaults to AI-driven generation from the learner's chosen path.
        </p>
        <textarea
          value={json}
          onChange={(event) => setJson(event.target.value)}
          className="mt-8 h-[520px] w-full rounded-3xl border border-white/15 bg-[#071429] p-5 font-mono text-sm leading-6 text-slate-100 outline-none focus:border-academy-cyan"
          spellCheck={false}
        />
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-300">{status}</p>
          <button onClick={saveOverride} className="rounded-full bg-white px-6 py-3 font-semibold text-academy-navy transition hover:bg-academy-cyan">
            Save Override JSON
          </button>
        </div>
      </section>
    </main>
  );
}

function loadState(): MasteryState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MasteryState;
  } catch {
    return null;
  }
}
