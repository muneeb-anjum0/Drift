import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { SignupFormValues } from './auth.types';

const inputClass = 'w-full rounded-lg border border-[var(--v-border)] bg-white px-4 py-3 text-[var(--v-text)] placeholder:text-[var(--v-muted)] focus:border-[var(--v-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--v-accent)]';

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
    <div className="w-full">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--v-accent)] hover:underline">
        <ArrowLeft size={16} aria-hidden="true" /> Back to home
      </Link>

      <p className="v-kicker">Create your workspace</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--v-text)]">Create your account</h1>
      <p className="v-muted mt-3 text-sm leading-6">Start with a project and what your team agreed to deliver.</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="register-name" className="mb-2 block text-sm font-semibold text-[var(--v-text)]">Name</label>
          <input id="register-name" type="text" autoComplete="name" value={values.name} onChange={(event) => onChange('name', event.target.value)} placeholder="Alex Morgan" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="register-email" className="mb-2 block text-sm font-semibold text-[var(--v-text)]">Email address</label>
          <input id="register-email" type="email" autoComplete="email" value={values.email} onChange={(event) => onChange('email', event.target.value)} placeholder="you@company.com" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="register-password" className="mb-2 block text-sm font-semibold text-[var(--v-text)]">Password</label>
          <div className="relative">
            <input id="register-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={values.password} onChange={(event) => onChange('password', event.target.value)} placeholder="********" required className={`${inputClass} pr-12`} />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--v-muted)] hover:text-[var(--v-accent)]">
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="register-confirm-password" className="mb-2 block text-sm font-semibold text-[var(--v-text)]">Confirm password</label>
          <div className="relative">
            <input id="register-confirm-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" value={values.confirmPassword} onChange={(event) => onChange('confirmPassword', event.target.value)} placeholder="********" required className={`${inputClass} pr-12`} />
            <button type="button" aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'} onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--v-muted)] hover:text-[var(--v-accent)]">
              {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

        <button type="submit" disabled={isSubmitting} className="v-button w-full disabled:cursor-not-allowed disabled:opacity-50">
          {isSubmitting ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="v-muted mt-7 border-t border-[var(--v-border)] pt-6 text-center text-sm">
        Already have an account? <Link to="/login" className="v-link">Sign in</Link>
      </p>
    </div>
  );
};
