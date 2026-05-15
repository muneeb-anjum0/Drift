import { motion } from 'framer-motion';
import { ChevronRight, Zap, Shield, BarChart3, ArrowRight, GitBranch, Layers, Workflow, CheckCircle2, Star, Users } from 'lucide-react';
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
              className="px-6 py-2 bg-lime-400 text-black rounded-full font-semibold hover:bg-lime-300 transition-colors"
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
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-lime-400 text-black rounded-full font-semibold flex items-center gap-2 hover:bg-lime-300 transition-all"
              >
                Get Started <ArrowRight size={20} />
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
            <span className="text-lime-400">Developers</span> First
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

      {/* Stats Section */}
      <section className="relative z-10 py-20 border-t border-lime-400/10 bg-black/30">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center"
          >
            {[
              { label: 'Active Users', value: '5000+' },
              { label: 'Projects Tracked', value: '25000+' },
              { label: 'Changes Logged', value: '2.5M+' },
              { label: 'Uptime', value: '99.9%' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <motion.h3 className="text-4xl font-bold text-lime-400 mb-2">{stat.value}</motion.h3>
                <p className="text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-20 border-t border-lime-400/10">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-bold text-center mb-16"
          >
            How <span className="text-lime-400">It</span> Works
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ staggerChildren: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              { 
                icon: Layers,
                num: '01',
                title: 'Create Workspace',
                desc: 'Set up your workspace and invite team members'
              },
              {
                icon: GitBranch,
                num: '02',
                title: 'Add Projects',
                desc: 'Connect your repositories and projects'
              },
              {
                icon: BarChart3,
                num: '03',
                title: 'Monitor Changes',
                desc: 'Track all code changes in real-time'
              }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="relative h-full"
              >
                <div className="absolute -top-6 -left-6 text-6xl font-bold text-lime-400/10 font-mono">{step.num}</div>
                <motion.div
                  whileHover={{ scale: 1.05, borderColor: '#22ff00', boxShadow: '0 0 20px rgba(34, 255, 0, 0.2)' }}
                  className="h-full p-8 border border-lime-400/20 rounded-2xl bg-black/40 backdrop-blur-sm transition-all flex flex-col"
                >
                  <motion.div
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    className="inline-block p-3 bg-lime-400/10 rounded-full mb-4 w-fit"
                  >
                    <step.icon className="w-6 h-6 text-lime-400" />
                  </motion.div>
                  <h3 className="font-semibold text-xl mb-3">{step.title}</h3>
                  <p className="text-gray-400 flex-1">{step.desc}</p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative z-10 py-20 border-t border-lime-400/10 bg-black/30">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-bold text-center mb-16"
          >
            Loved by <span className="text-lime-400">Teams</span>
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              { name: 'Alex Chen', role: 'Tech Lead', company: 'StartupXYZ', quote: 'DriftLedger transformed how we track code changes.' },
              { name: 'Sarah Williams', role: 'DevOps Engineer', company: 'CloudTech', quote: 'The analytics dashboard is incredibly intuitive.' },
              { name: 'Marcus Johnson', role: 'CTO', company: 'InnovateLabs', quote: 'Best investment we made for our development workflow.' }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05, borderColor: '#22ff00' }}
                className="p-6 border border-lime-400/20 rounded-xl bg-black/60 backdrop-blur-sm transition-all"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-lime-400 text-lime-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role} at {testimonial.company}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-20 border-t border-lime-400/10">
        <div className="max-w-3xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-bold text-center mb-16"
          >
            Frequently Asked <span className="text-lime-400">Questions</span>
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ staggerChildren: 0.08 }}
            className="space-y-4"
          >
            {[
              { q: 'Is there a free tier?', a: 'Yes! DriftLedger offers a generous free tier perfect for individual developers.' },
              { q: 'How secure is my data?', a: 'We use bank-level encryption and comply with GDPR, HIPAA, and SOC 2 standards.' },
              { q: 'Can I integrate with GitHub/GitLab?', a: 'Absolutely! We support seamless integration with major git platforms.' },
              { q: 'What is the API rate limit?', a: 'Our free tier allows 1000 API calls per month, plus unlimited for paid plans.' }
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-6 border border-lime-400/20 rounded-xl bg-black/40 hover:border-lime-400/50 transition-all"
              >
                <div className="flex gap-3">
                  <CheckCircle2 className="w-6 h-6 text-lime-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                    <p className="text-gray-400">{faq.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 py-20 border-t border-lime-400/10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-gray-400 mb-6">Still have questions? Reach out to our support team.</p>
          <motion.a
            href="mailto:support@driftledger.io"
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center gap-2 px-6 py-3 border border-lime-400/50 rounded-full text-lime-400 hover:border-lime-400 hover:bg-lime-400/5 transition-all"
          >
            Get in Touch <ChevronRight size={16} />
          </motion.a>
        </motion.div>
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
