import { motion } from 'framer-motion';
import { Fragment } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Github,
  GitCompareArrows,
  Layers,
  ListChecks,
  LockKeyhole,
  Mail,
  Workflow,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';

const features = [
  { icon: Layers, title: 'Baseline control', desc: 'Organize requirements and approved versions before client scope starts shifting.' },
  { icon: GitCompareArrows, title: 'Requirement-level drift', desc: 'Compare new client input against the right baseline requirement using the local Qwen GGUF engine.' },
  { icon: Workflow, title: 'Approval-ready output', desc: 'Turn material drift into change requests with impact, cost, timeline, and decision history.' },
];

const stats = [
  { label: 'Comparison pattern', value: '1 requirement' },
  { label: 'Runtime artifact', value: 'Q4_K_M' },
  { label: 'Workflow focus', value: 'Baseline to approval' },
];

const steps = [
  { title: 'Capture scope', text: 'Write or extract requirements.' },
  { title: 'Freeze baseline', text: 'Save an approved version.' },
  { title: 'Compare input', text: 'Analyze the new client message.' },
  { title: 'Prepare approval', text: 'Generate the change request.' },
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

const runtimeNotes = [
  { title: 'Merged local model', text: 'Qwen2.5-7B + DriftLedger LoRA runs as one GGUF Q4_K_M artifact.' },
  { title: 'Docker runtime', text: 'llama.cpp, inference, backend, frontend, and MongoDB run together in Compose.' },
  { title: 'Local-first project data', text: 'Project records live in the app database for this demo instead of a hosted AI workflow.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <main>
        <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-[1fr_0.92fr]">
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
            <div className="max-w-3xl">
              <p className="app-eyebrow">Product shape</p>
              <h2 className="mt-2 text-3xl font-semibold">A focused workspace for controlled scope decisions.</h2>
              <p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">
                DriftLedger keeps the product loop narrow: preserve the baseline, detect the drift, and turn real changes into approval-ready work.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
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

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)]">{stat.label}</p>
                  <p className="mt-1 text-base font-semibold">{stat.value}</p>
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

          <div className="mt-8 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center">
            {steps.map((step, index) => (
              <Fragment key={step.title}>
                <div key={step.title} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border)] text-sm font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{step.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{step.text}</p>
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 ? (
                  <ArrowRight key={`${step.title}-arrow`} className="hidden h-5 w-5 text-[var(--color-text-muted)] md:block" />
                ) : null}
              </Fragment>
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

        <section className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-[1.05fr_0.8fr]">
          <div className="app-panel p-6">
            <p className="app-eyebrow">Local AI and privacy</p>
            <h2 className="mt-2 text-3xl font-semibold">Private by posture, practical by design.</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">
              The model runtime is packaged for local demos: no hosted AI endpoint, no separate base-model download at runtime, and no client requirement text sent to third-party inference services.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {runtimeNotes.map((item) => (
                <div key={item.title} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{item.text}</p>
                </div>
              ))}
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

        <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-soft)] py-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6">
            <div>
              <p className="text-base font-semibold">DriftLedger</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">Requirement drift workspace built by Muneeb Anjum.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-muted)]">
              <a href="https://github.com/muneeb-anjum0" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:text-[var(--color-text)]">
                <Github className="h-4 w-4" />
                github.com/muneeb-anjum0
              </a>
              <a href="mailto:muneeb.anjum0@gmail.com" className="inline-flex items-center gap-2 transition hover:text-[var(--color-text)]">
                <Mail className="h-4 w-4" />
                muneeb.anjum0@gmail.com
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
