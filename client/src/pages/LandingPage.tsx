import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  GitCompareArrows,
  Layers,
  ListChecks,
  LockKeyhole,
  Shield,
  Workflow,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';

const features = [
  { icon: Layers, title: 'Structured scope', desc: 'Keep requirements, baselines, and client intent in one calm workspace.' },
  { icon: GitCompareArrows, title: 'Model-backed drift', desc: 'Compare new client messages against approved requirements using the local Qwen GGUF engine.' },
  { icon: Workflow, title: 'Change requests', desc: 'Turn material drift into reviewed client approval drafts.' },
];

const stats = [
  { label: 'Requirement-first analysis', value: '1:1' },
  { label: 'Local model path', value: 'Q4_K_M' },
  { label: 'Primary workflow', value: 'Drift' },
];

const steps = [
  'Capture requirements',
  'Freeze a baseline',
  'Compare new client input',
  'Generate approval-ready change requests',
];

const modules = [
  { icon: ListChecks, title: 'Requirements', text: 'Extract, edit, and approve project requirements before scope starts moving.' },
  { icon: GitCompareArrows, title: 'Drift Analysis', text: 'Compare client updates against one requirement at a time and aggregate the real impact.' },
  { icon: Workflow, title: 'Change Requests', text: 'Convert material drift into client-ready scope, cost, timeline, and recommendation language.' },
  { icon: ClipboardCheck, title: 'Approvals', text: 'Submit, approve, reject, or request revision with persisted decision history.' },
  { icon: BarChart3, title: 'Evaluation', text: 'Show Q4_K_M pass rate, latency, test cases, and model-readiness recommendations.' },
  { icon: LockKeyhole, title: 'Local AI Runtime', text: 'Run Qwen2.5-7B + DriftLedger LoRA as a local GGUF Q4_K_M artifact through Docker.' },
];

const planFeatures = [
  'Unlimited local projects',
  'Baseline and drift tracking',
  'Change request and approval workflows',
  'Evaluation dashboard',
  'Local Q4_K_M inference',
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)]">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <motion.div whileHover={{ y: -2 }} className="text-2xl font-bold tracking-normal">
            <span>Drift</span>
            <span className="text-[var(--color-text-muted)]">Ledger</span>
          </motion.div>
          <Button type="button" onClick={() => navigate('/login')}>
            Get Started
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-[1fr_0.92fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="app-eyebrow">Requirement drift control</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight tracking-normal sm:text-6xl">
              Keep client scope changes visible before they become unpaid work.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--color-text-muted)]">
              DriftLedger gives teams a clean place to preserve requirements, compare new client messages, and produce change requests from model-backed drift analysis.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button type="button" size="lg" onClick={() => navigate('/login')}>
                Open Workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button type="button" size="lg" variant="secondary" onClick={() => navigate('/register')}>
                Create Account
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="app-panel overflow-hidden p-5"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <p className="app-eyebrow">Model result</p>
                <h2 className="mt-1 text-2xl font-semibold">Monthly report request</h2>
              </div>
              <span className="app-badge">unchanged</span>
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Baseline requirement</p>
                <p className="mt-2 text-sm leading-6">The system shall allow admins to export monthly reports as CSV.</p>
              </div>
              <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)]">New client message</p>
                <p className="mt-2 text-sm leading-6">Can admins download the same monthly report from the reports page?</p>
              </div>
              <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-primary)] p-4 text-[var(--color-primary-text)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-sm font-semibold">No material drift detected</p>
                </div>
                <p className="mt-2 text-sm leading-6 opacity-80">Same report, different access path. The baseline scope remains intact.</p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="border-y border-[var(--color-border)] bg-[var(--color-bg-soft)] py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-4 md:grid-cols-3">
              {features.map(({ icon: Icon, title, desc }) => (
                <motion.div key={title} whileHover={{ y: -4 }} className="app-panel p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-accent-soft)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <p className="text-3xl font-semibold">{stat.value}</p>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="max-w-3xl">
            <p className="app-eyebrow">Problem</p>
            <h2 className="mt-2 text-3xl font-semibold">Scope creep should not be discovered after delivery.</h2>
            <p className="mt-4 text-base leading-8 text-[var(--color-text-muted)]">
              Client requests often arrive through calls, meeting notes, and quick messages. The original requirement gets buried, teams lose proof of what changed, and change requests arrive too late. DriftLedger keeps that comparison visible early.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <span className="app-badge">{index + 1}</span>
                <p className="mt-5 font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--color-border)] bg-[var(--color-bg-soft)] py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl">
              <p className="app-eyebrow">Product modules</p>
              <h2 className="mt-2 text-3xl font-semibold">One workflow from baseline to approval.</h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {modules.map(({ icon: Icon, title, text }) => (
                <div key={title} className="app-panel p-5">
                  <Icon className="h-5 w-5" />
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-[1fr_0.8fr]">
          <div className="app-panel p-6">
            <p className="app-eyebrow">Local AI and privacy</p>
            <h2 className="mt-2 text-3xl font-semibold">Local-first inference, no hosted AI dependency.</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">
              DriftLedger runs Qwen2.5-7B + DriftLedger LoRA as a merged GGUF Q4_K_M artifact through llama.cpp and Docker. Project data is stored in the local app database for this demo workflow, which makes the architecture suitable for portfolio reviews and academic demos.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="app-badge">GGUF Q4_K_M</span>
              <span className="app-badge">Docker runtime</span>
              <span className="app-badge">Local-first data</span>
            </div>
          </div>

          <div className="app-panel p-6">
            <p className="app-eyebrow">Plan</p>
            <h2 className="mt-2 text-2xl font-semibold">DriftLedger Local Pro</h2>
            <p className="mt-2 text-4xl font-semibold">$19/month</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">Demo billing placeholder. No real payment processing is connected.</p>
            <div className="mt-5 grid gap-2">
              {planFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" onClick={() => navigate('/billing')}>View Billing</Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/register')}>Start Local Demo</Button>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--color-border)] bg-[var(--color-bg-soft)] py-12">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6">
            <div>
              <h2 className="text-2xl font-semibold">Start detecting scope drift before it becomes unpaid work.</h2>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-2"><Shield className="h-4 w-4" /> Local-first runtime</span>
                <span className="inline-flex items-center gap-2"><FileCheck2 className="h-4 w-4" /> Approval-ready workflow</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => navigate('/projects')}>Create Project</Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/evaluation')}>View Evaluation</Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
