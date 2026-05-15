import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 opacity-5">
        <svg className="w-full h-full" width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#22ff00" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto min-h-screen max-w-7xl lg:grid lg:grid-cols-[1fr_1fr] gap-0">
        {/* Left side - Brand */}
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex flex-col justify-between px-14 py-20 border-r border-lime-400/20"
        >
          <div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-3xl font-bold tracking-wider mb-12"
            >
              <span className="text-lime-400">Drift</span>
              <span>Ledger</span>
            </motion.div>

            <div className="space-y-8">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl font-bold leading-tight"
              >
                Welcome Back
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-gray-300 leading-relaxed max-w-md"
              >
                Manage your workspaces, projects, and track code changes with DriftLedger.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid gap-4"
              >
                {[
                  { title: 'Workspaces', desc: 'Organize your projects' },
                  { title: 'Projects', desc: 'Track your code changes' },
                  { title: 'Activity Logs', desc: 'Full audit trail' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ x: 5 }}
                    className="flex gap-3 p-3 rounded-lg border border-lime-400/20 hover:border-lime-400/50 transition-colors"
                  >
                    <div className="w-1 h-1 bg-lime-400 rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-gray-400">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-gray-500"
          >
            © 2026 DriftLedger. All rights reserved.
          </motion.p>
        </motion.section>

        {/* Right side - Form */}
        <motion.section 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center px-6 py-14 sm:px-10 lg:px-14"
        >
          <div className="w-full max-w-md">{children}</div>
        </motion.section>
      </div>
    </div>
  );
};
