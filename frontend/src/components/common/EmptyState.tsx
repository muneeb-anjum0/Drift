import type { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export const EmptyState = ({ title, description, actionLabel, onAction, icon }: EmptyStateProps) => <section className="rounded-xl border border-[var(--v-border)] bg-[var(--v-surface)] px-5 py-8 text-center sm:px-8">
  {icon ? <div aria-hidden="true" className="mb-3 flex justify-center text-[var(--v-accent)]">{icon}</div> : null}
  <h3 className="text-lg font-semibold text-[var(--v-text)]">{title}</h3>
  <p className="v-muted mx-auto mt-2 max-w-md text-sm leading-6">{description}</p>
  {actionLabel && onAction ? <Button type="button" className="mt-5" onClick={onAction}>{actionLabel}</Button> : null}
</section>;
