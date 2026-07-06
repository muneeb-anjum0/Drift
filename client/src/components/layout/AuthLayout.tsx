import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="relative z-10 mx-auto min-h-screen max-w-7xl gap-0 lg:grid lg:grid-cols-[1fr_1fr]">
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden flex-col justify-between border-r border-[var(--color-border)] px-14 py-20 lg:flex"
        >
          <div>
            <motion.div whileHover={{ y: -2 }} className="mb-12 text-3xl font-bold tracking-normal">
              <span>Drift</span>
              <span className="text-[var(--color-text-muted)]">Ledger</span>
            </motion.div>

            <div className="space-y-8">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl font-bold leading-tight text-[var(--color-text)]"
              >
                Welcome Back
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-md text-xl leading-relaxed text-[var(--color-text-muted)]"
              >
                Manage workspaces, project scope, baselines, and requirement drift from one clean control surface.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid gap-4"
              >
                {[
                  { title: 'Workspaces', desc: 'Organize client environments' },
                  { title: 'Requirements', desc: 'Preserve agreed scope' },
                  { title: 'Drift Analysis', desc: 'Review Qwen GGUF model output' },
                ].map((item) => (
                  <motion.div
                    key={item.title}
                    whileHover={{ x: 4 }}
                    className="flex gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[var(--color-text)]"
                  >
                    <div className="mt-2 h-1 w-1 rounded-full bg-[var(--color-text)]" />
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{item.title}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-sm text-[var(--color-text-soft)]">
            © 2026 DriftLedger. All rights reserved.
          </motion.p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center px-6 py-14 sm:px-10 lg:px-14"
        >
          <div className="w-full max-w-md rounded-[var(--radius-modal)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
            {children}
          </div>
        </motion.section>
      </div>
    </div>
  );
};
