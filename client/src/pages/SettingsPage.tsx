import { Bot, KeyRound, LogOut, Settings, ShieldCheck, UserCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useAuth } from '../hooks/useAuth';

const SettingRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
    <span className="text-sm text-gray-400">{label}</span>
    <span className="text-sm font-semibold text-white">{value}</span>
  </div>
);

export const SettingsPage = () => {
  const { user, logout } = useAuth();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-5 rounded-[2.25rem] border border-lime-400/20 bg-black/75 p-6 shadow-[0_24px_90px_rgba(163,230,53,0.06)] sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-lime-400">Settings</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">Control room</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">Manage your account, local AI runtime, and portfolio-ready app configuration.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-[2rem] border-white/10 bg-black/65 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-lime-400/25 bg-lime-400/10">
              <UserCircle2 className="h-7 w-7 text-lime-300" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">Account</p>
              <h3 className="mt-1 text-xl font-semibold text-white">{user?.name || 'DriftLedger user'}</h3>
              <p className="mt-1 text-sm text-gray-400">{user?.email || 'Signed in user'}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <SettingRow label="Email verified" value={user?.isEmailVerified ? 'Yes' : 'Not confirmed'} />
            <SettingRow label="Auth mode" value="JWT session" />
            <SettingRow label="Theme" value="Black / White / Neon Green" />
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="rounded-[2rem] border-white/10 bg-black/65 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">Local AI</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Ollama drift engine</h3>
              </div>
              <Bot className="h-5 w-5 text-lime-400" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <SettingRow label="Provider" value="Ollama" />
              <SettingRow label="Model" value="llama3.1:8b" />
              <SettingRow label="Endpoint" value="localhost:11434" />
              <SettingRow label="Drift mode" value="AI first" />
            </div>
          </Card>

          <Card className="rounded-[2rem] border-white/10 bg-black/65 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">App posture</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Portfolio-ready controls</h3>
              </div>
              <Settings className="h-5 w-5 text-lime-400" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <motion.div whileHover={{ y: -4 }} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                <ShieldCheck className="h-5 w-5 text-lime-300" />
                <p className="mt-4 font-semibold text-white">Protected workspace data</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">Routes use authenticated access and workspace/project scoping.</p>
              </motion.div>
              <motion.div whileHover={{ y: -4 }} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                <KeyRound className="h-5 w-5 text-lime-300" />
                <p className="mt-4 font-semibold text-white">Secrets stay server-side</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">Runtime settings are read from environment variables.</p>
              </motion.div>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
