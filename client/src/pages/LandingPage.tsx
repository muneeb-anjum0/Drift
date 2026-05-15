import { motion } from 'framer-motion';
import { ChevronRight, Zap, Shield, BarChart3, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const floatingAnimation = {
    animate: {
      y: [0, -10, 0]
    },
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: [0.42, 0, 0.58, 1]
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated background grid */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400 via-black to-black"></div>
        <svg className="w-full h-full" width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#22ff00" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 border-b border-lime-400/20 backdrop-blur-md"
      >
        <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="text-2xl font-bold tracking-wider"
          >
            <span className="text-lime-400">Drift</span>
            <span>Ledger</span>
          </motion.div>
          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/login')}
              className="px-6 py-2 text-white hover:text-lime-400 transition-colors"
            >
              Sign In
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/register')}
              className="px-6 py-2 bg-lime-400 text-black rounded-lg font-semibold hover:bg-lime-300 transition-colors"
            >
              Get Started
            </motion.button>
          </div>
        </nav>
      </motion.header>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center pt-20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="text-center"
          >
            <motion.h1 
              variants={fadeInUp}
              className="text-6xl md:text-7xl font-bold mb-6 leading-tight"
            >
              Track Your
              <motion.span 
                className="block text-lime-400 mt-2"
                variants={floatingAnimation}
              >
                Code Evolution
              </motion.span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed"
            >
              DriftLedger helps you monitor, analyze, and understand code changes across your projects in real-time.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex gap-4 justify-center flex-wrap"
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(34, 255, 0, 0.5)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-lime-400 text-black rounded-lg font-semibold flex items-center gap-2 hover:bg-lime-300 transition-all"
              >
                Start Free <ArrowRight size={20} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, borderColor: '#22ff00' }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 border-2 border-lime-400/50 text-lime-400 rounded-lg font-semibold hover:border-lime-400 transition-colors"
              >
                Watch Demo
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Floating cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20"
          >
            {[
              { icon: Zap, title: 'Real-time', desc: 'Live activity monitoring' },
              { icon: Shield, title: 'Secure', desc: 'Enterprise-grade security' },
              { icon: BarChart3, title: 'Analytics', desc: 'Deep insights & metrics' }
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={floatingAnimation}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                whileHover={{ y: -5, boxShadow: '0 0 20px rgba(34, 255, 0, 0.2)' }}
                className="p-6 border border-lime-400/20 rounded-xl bg-black/40 backdrop-blur-sm hover:border-lime-400/50 transition-all"
              >
                <item.icon className="w-8 h-8 text-lime-400 mb-3" />
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 border-t border-lime-400/10">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-bold text-center mb-16"
          >
            Built for Developers
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-12"
          >
            {[
              { title: 'Smart Workspaces', desc: 'Organize projects and collaborate with your team seamlessly' },
              { title: 'Project Management', desc: 'Track all your repositories in one unified dashboard' },
              { title: 'Activity Logging', desc: 'Detailed logs of every change and action taken' },
              { title: 'Secure Auth', desc: 'Enterprise-grade authentication with JWT tokens' }
            ].map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4"
              >
                <div className="w-2 h-2 bg-lime-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{feat.title}</h3>
                  <p className="text-gray-400">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 border-t border-lime-400/10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-gray-300 mb-8">Join developers who trust DriftLedger for code change management.</p>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(34, 255, 0, 0.6)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/register')}
              className="px-10 py-4 bg-lime-400 text-black rounded-lg font-semibold text-lg hover:bg-lime-300 transition-all inline-flex items-center gap-2"
            >
              Create Free Account <ChevronRight size={20} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="relative z-10 border-t border-lime-400/10 py-8 text-center text-gray-400"
      >
        <p>© 2026 DriftLedger. All rights reserved.</p>
      </motion.footer>
    </div>
  );
}
