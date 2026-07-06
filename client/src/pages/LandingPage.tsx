import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, CheckCircle2, GitCompareArrows, Layers, Shield, Workflow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';

const features = [
  { icon: Layers, title: 'Structured scope', desc: 'Keep requirements, baselines, and client intent in one calm workspace.' },
  { icon: GitCompareArrows, title: 'Model-backed drift', desc: 'Compare new client messages against approved requirements using the local Qwen GGUF engine.' },
  { icon: Workflow, title: 'Change requests', desc: 'Turn material drift into reviewed client approval drafts.' },
];

const stats = [
  { label: 'Requirement-first analysis', value: '1:1' },
  { label: 'Local model path', value: 'Q3_K_M' },
  { label: 'Primary workflow', value: 'Drift' },
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

        <section className="border-t border-[var(--color-border)] bg-[var(--color-bg-soft)] py-16">
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

        <section className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-10">
          <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <Shield className="h-4 w-4" />
            <span>Secrets stay server-side. Inference runs through the configured backend route.</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <BarChart3 className="h-4 w-4" />
            <span>Designed for requirement-level analysis and review.</span>
          </div>
        </section>
      </main>
    </div>
  );
}
