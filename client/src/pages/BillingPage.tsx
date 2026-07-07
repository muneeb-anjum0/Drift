import { CheckCircle2, CreditCard, LockKeyhole } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { useBillingSummary } from '../hooks/useBilling';

const planFeatures = [
  'Unlimited local projects',
  'Requirement baselines',
  'AI drift analysis',
  'Saved analysis history',
  'Change request generation',
  'Approval workflow',
  'Evaluation dashboard',
  'Local Q4_K_M inference',
  'No hosted AI dependency',
  'Data stays local-first',
];

export const BillingPage = () => {
  const { data: summary, isLoading, isError, refetch } = useBillingSummary();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <EmptyState
        title="Billing summary unavailable"
        description="The backend could not read the local demo plan summary right now."
        actionLabel="Try again"
        onAction={() => void refetch()}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="app-eyebrow">Billing</p>
          <h1 className="mt-2 text-3xl font-semibold">Plan and local runtime</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            A product-ready billing surface for the local-first demo. No real payment processor is connected.
          </p>
        </div>
        <span className="app-badge">{summary.status.replace('_', ' ')}</span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="app-eyebrow">Current plan</p>
              <h2 className="mt-2 text-2xl font-semibold">{summary.planName}</h2>
              <p className="mt-2 text-4xl font-semibold">{summary.price}</p>
            </div>
            <CreditCard className="h-6 w-6 text-[var(--color-text-muted)]" />
          </div>

          <p className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 text-sm leading-6 text-[var(--color-text-muted)]">
            {summary.runtimeNote}
          </p>

          <div className="mt-5 grid gap-2">
            {planFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" disabled>
              Current Plan
            </Button>
            <Button type="button" variant="secondary" onClick={() => window.alert('Billing management is a demo placeholder for this local-first portfolio build.')}>
              Manage Billing
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <p className="app-eyebrow">Stripe placeholder</p>
          <h2 className="mt-2 text-xl font-semibold">Payment area reserved</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
            This space is prepared for a future Stripe customer portal, subscription checkout, invoices, and payment-method management.
          </p>

          <div className="mt-5 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                <LockKeyhole className="h-5 w-5 text-[var(--color-text-muted)]" />
              </div>
              <div>
                <p className="font-semibold">Stripe integration not connected</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Demo billing only. No cards are charged.</p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--color-border)] p-4">
            <p className="text-sm font-semibold">Local runtime</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
              {summary.model} runs through llama.cpp as GGUF {summary.quantization}. The base model and LoRA adapter are not loaded separately at runtime.
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
};
