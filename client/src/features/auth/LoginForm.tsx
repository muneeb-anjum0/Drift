import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
    <div className="w-full">
      <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-[var(--v-accent)] hover:underline">
        <ArrowLeft size={16} aria-hidden="true" /> Back to home
      </Link>

      <p className="v-kicker">Your workspace</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--v-text)]">Sign in</h1>
      <p className="v-muted mt-3 text-sm leading-6">Pick up where your team left off, with the agreed scope in view.</p>

      <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-[var(--v-text)]">Email address</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => onChange('email', event.target.value)}
            placeholder="you@company.com"
            required
            className="w-full rounded-lg border border-[var(--v-border)] bg-white px-4 py-3 text-[var(--v-text)] placeholder:text-[var(--v-muted)] focus:border-[var(--v-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--v-accent)]"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-[var(--v-text)]">Password</label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={values.password}
              onChange={(event) => onChange('password', event.target.value)}
              placeholder="Enter your password"
              required
              className="w-full rounded-lg border border-[var(--v-border)] bg-white px-4 py-3 pr-12 text-[var(--v-text)] placeholder:text-[var(--v-muted)] focus:border-[var(--v-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--v-accent)]"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--v-muted)] hover:text-[var(--v-accent)]"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

        <button type="submit" disabled={isSubmitting} className="v-button w-full disabled:cursor-not-allowed disabled:opacity-50">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="v-muted mt-7 border-t border-[var(--v-border)] pt-6 text-center text-sm">
        New to Drift? <Link to="/register" className="v-link">Create an account</Link>
      </p>
    </div>
  );
};
