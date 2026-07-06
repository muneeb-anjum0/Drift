import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import type { SignupFormValues } from './auth.types';

export const RegisterForm = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [values, setValues] = useState<SignupFormValues>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (field: keyof SignupFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (values.name.trim().length < 2) {
      setError('Name is required');
      return;
    }

    if (values.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(values.name.trim(), values.email, values.password);
      navigate('/dashboard');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create account');
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
          <span className="text-xs font-semibold text-lime-400 uppercase tracking-wider">Create Account</span>
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-white"
        >
          Sign Up
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-400"
        >
          Join Drift and start detecting requirement changes
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
          transition={{ delay: 0.35 }}
        >
          <label htmlFor="register-name" className="block text-sm font-semibold text-white mb-2">Name</label>
          <input
            id="register-name"
            type="text"
            value={values.name}
            onChange={(event) => onChange('name', event.target.value)}
            placeholder="Alex Morgan"
            required
            className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 transition-all"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <label htmlFor="register-email" className="block text-sm font-semibold text-white mb-2">Email Address</label>
          <input
            id="register-email"
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
          <label htmlFor="register-password" className="block text-sm font-semibold text-white mb-2">Password</label>
          <div className="relative">
            <input
              id="register-password"
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <label htmlFor="register-confirm-password" className="block text-sm font-semibold text-white mb-2">Confirm Password</label>
          <div className="relative">
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={values.confirmPassword}
              onChange={(event) => onChange('confirmPassword', event.target.value)}
              placeholder="********"
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 transition-all"
            />
            <motion.button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-lime-400 transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </motion.button>
      </motion.form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-6 text-center text-sm text-gray-400"
      >
        Already have an account?{' '}
        <Link to="/login" className="text-lime-400 font-semibold hover:text-lime-300 transition-colors">
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  );
};
