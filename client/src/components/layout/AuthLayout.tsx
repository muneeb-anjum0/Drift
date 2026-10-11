import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const steps = [
  ['01', 'Keep the agreement visible', 'Capture the scope your team and client agreed to.'],
  ['02', 'Compare a new request', 'See what may have changed before work begins.'],
  ['03', 'Make a human decision', 'Review the impact and record the next step.'],
];

export const AuthLayout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)]">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link to="/" className="text-xl font-bold tracking-tight">Drift<span className="text-[var(--v-accent)]">.</span></Link>
      <Link to="/" className="v-link text-sm">Explore Drift</Link>
    </header>

    <main className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-6 sm:px-8 lg:min-h-[calc(100vh-124px)] lg:grid-cols-2 lg:gap-20 lg:pb-20 lg:pt-8">
      <section className="hidden lg:block" aria-label="How Drift works">
        <p className="v-kicker">Agree → Compare → Decide</p>
        <h2 className="mt-5 max-w-xl text-5xl font-semibold leading-[1.1] tracking-tight">A clear place to manage changing scope.</h2>
        <p className="v-muted mt-6 max-w-lg text-lg leading-8">Keep the original agreement close, understand a new ask, and make the next decision with your team.</p>
        <ol className="v-hero mt-9 overflow-hidden px-7 py-2">
          {steps.map(([number, title, description]) => (
            <li key={number} className="flex gap-5 border-b border-[var(--v-border)] py-5 last:border-b-0">
              <span className="v-kicker pt-1">{number}</span>
              <div><h3 className="font-semibold">{title}</h3><p className="v-muted mt-1 text-sm leading-6">{description}</p></div>
            </li>
          ))}
        </ol>
        <p className="v-muted mt-5 text-xs">The model suggests differences; people decide what to do with them.</p>
      </section>

      <section className="flex justify-center lg:justify-end" aria-label="Account access">
        <div className="v-panel w-full max-w-md p-6 shadow-[var(--shadow-card)] sm:p-9">{children}</div>
      </section>
    </main>

    <footer className="v-muted mx-auto max-w-6xl px-5 pb-7 text-xs sm:px-8">Drift · Scope change, made visible</footer>
  </div>
);
