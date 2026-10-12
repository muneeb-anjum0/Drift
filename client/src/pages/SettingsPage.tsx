import { LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { SettingsAccordion } from '../features/settings/SettingsAccordion';
import { getSettingsSections } from '../features/settings/settingsSections';
import { ProviderSettings } from '../features/settings/ProviderSettings';

export const SettingsPage = () => {
  const { user, logout } = useAuth();
  const sections = getSettingsSections(user);
  const confirmLogout = () => {
    if (window.confirm('Log out of Drift?')) {
      void logout();
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div>
          <p className="app-eyebrow">About</p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--color-text)]">Account and runtime</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            Configure analysis for a workspace below. Account and installation details remain read-only.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={confirmLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </section>

      <ProviderSettings />
      <SettingsAccordion sections={sections} />
    </motion.div>
  );
};
