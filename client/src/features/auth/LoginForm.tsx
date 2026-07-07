import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import type { LoginFormValues } from './auth.types';

export const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [values, setValues] = useState<LoginFormValues>({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (field: keyof LoginFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      const redirectTo = typeof location.state?.from?.pathname === 'string' ? `${location.state.from.pathname}${location.state.from.search ?? ''}` : '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to log in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full"
    >
      <motion.button
        type="button"
        onClick={() => navigate('/')}
        whileHover={{ scale: 1.05, x: -5 }}
        whileTap={{ scale: 0.95 }}
        className="mb-8 flex items-center gap-2 text-gray-400 hover:text-lime-400 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back to Home</span>
      </motion.button>

      <div className="mb-8 space-y-3">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-lime-400/30 bg-lime-400/5"
        >
          <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
          <span className="text-xs font-semibold text-lime-400 uppercase tracking-wider">Secure Login</span>
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-white"
        >
          Sign In
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-400"
        >
          Access your workspaces and projects
        </motion.p>
      </div>

      <motion.form 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="space-y-5" 
        onSubmit={handleSubmit}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <label htmlFor="login-email" className="block text-sm font-semibold text-white mb-2">Email Address</label>
          <input
            id="login-email"
            type="email"
            value={values.email}
            onChange={(event) => onChange('email', event.target.value)}
            placeholder="you@company.com"
            required
            className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 transition-all"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <label htmlFor="login-password" className="block text-sm font-semibold text-white mb-2">Password</label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={values.password}
              onChange={(event) => onChange('password', event.target.value)}
              placeholder="********"
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 transition-all"
            />
            <motion.button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-lime-400 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </motion.button>
          </div>
        </motion.div>

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400"
          >
            {error}
          </motion.div>
        ) : null}

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-lime-400 text-black font-semibold rounded-lg hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </motion.button>
      </motion.form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-6 text-center text-sm text-gray-400"
      >
        Don't have an account?{' '}
        <Link to="/register" className="text-lime-400 font-semibold hover:text-lime-300 transition-colors">
          Create one
        </Link>
      </motion.p>
    </motion.div>
  );
};
