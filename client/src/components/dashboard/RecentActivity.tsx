import { useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { Button } from '../common/Button';
import { formatDate } from '../../utils/formatDate';
import type { ActivityLog } from '../../types';

const ACTIVITY_PAGE_SIZE = 10;

const cleanText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const numberText = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  return typeof value === 'string' && value.trim() ? value.trim() : '';
};

const compact = (value: unknown, max = 88) => {
  const text = cleanText(value).replace(/\s+/g, ' ');
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 3).trim()}...`;
};

const readableAction = (action: string) =>
  action
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const projectCopy = (metadata: Record<string, unknown>, fallbackId: string) => cleanText(metadata.name) || `Project ${fallbackId.slice(-6)}`;

const scoreCopy = (score: string, riskLevel: string, projectRef: string) => {
  const parts = [];
  if (score) {
    parts.push(`Score ${score}/100`);
  }
  if (riskLevel) {
    parts.push(`${riskLevel} risk`);
  }
  if (projectRef) {
    parts.push(projectRef);
  }
  return parts.join(' · ');
};

const describeActivity = (activity: ActivityLog) => {
  const metadata = activity.metadata ?? {};
  const projectName = cleanText(metadata.projectName);
  const projectId = cleanText(metadata.projectId);
  const projectRef = projectName || (projectId ? `Project ${projectId.slice(-6)}` : '');
  const inputText = compact(metadata.inputText);
  const summary = compact(metadata.summary);
  const title = cleanText(metadata.title);
  const score = numberText(metadata.driftScore);
  const riskLevel = cleanText(metadata.riskLevel);
  const driftSubject = inputText || summary;
  const driftDetail = scoreCopy(score, riskLevel, projectRef);

  switch (activity.action) {
    case 'WORKSPACE_CREATED':
      return { title: `Workspace created: ${cleanText(metadata.name) || activity.entityId}`, detail: 'Ready for projects and requirements.' };
    case 'WORKSPACE_UPDATED':
      return { title: `Workspace updated: ${cleanText(metadata.name) || activity.entityId}`, detail: 'Workspace details changed.' };
    case 'WORKSPACE_DELETED':
      return { title: `Workspace deleted: ${cleanText(metadata.name) || activity.entityId}`, detail: 'Workspace was removed.' };
    case 'PROJECT_CREATED':
      return { title: `Project created: ${projectCopy(metadata, activity.entityId)}`, detail: cleanText(metadata.clientName) || 'Project workspace is ready.' };
    case 'PROJECT_UPDATED':
      return { title: `Project updated: ${projectCopy(metadata, activity.entityId)}`, detail: cleanText(metadata.status) || 'Project details changed.' };
    case 'PROJECT_DELETED':
      return { title: `Project deleted: ${projectCopy(metadata, activity.entityId)}`, detail: 'Project was removed.' };
    case 'REQUIREMENT_CREATED':
      return { title: `Requirement created: ${title || activity.entityId}`, detail: projectRef || compact(metadata.description) || 'Requirement added to the project.' };
    case 'REQUIREMENT_UPDATED':
      return { title: `Requirement updated: ${title || activity.entityId}`, detail: projectRef || 'Requirement details changed.' };
    case 'REQUIREMENT_DELETED':
      return { title: `Requirement deleted: ${title || activity.entityId}`, detail: projectRef || 'Requirement was removed.' };
    case 'REQUIREMENT_BASELINE_CREATED':
      return { title: `Baseline created: version ${numberText(metadata.versionNumber) || 'new'}`, detail: projectRef || 'Requirements were frozen into a baseline.' };
    case 'REQUIREMENTS_EXTRACTED':
      return { title: 'Requirements extracted from scope text', detail: `${numberText(metadata.suggestionCount) || 'New'} suggestions${projectRef ? ` for ${projectRef}` : ''}` };
    case 'DRIFT_ANALYSIS_CREATED':
      return {
        title: driftSubject ? `Drift analysis saved: ${compact(driftSubject, 64)}` : 'Drift analysis saved',
        detail: driftDetail || 'Older analysis did not store client-input context.',
      };
    case 'DRIFT_ANALYSIS_DELETED':
      return {
        title: driftSubject ? `Drift analysis deleted: ${compact(driftSubject, 64)}` : 'Drift analysis deleted',
        detail: driftDetail || 'Older deletion did not store analysis context.',
      };
    case 'CHANGE_REQUEST_CREATED':
      return { title: `Change request drafted: ${title || 'Untitled draft'}`, detail: summary || projectRef || 'Approval-ready client change request created.' };
    case 'CHANGE_REQUEST_UPDATED':
      return { title: `Change request updated: ${title || 'Untitled draft'}`, detail: summary || projectRef || 'Draft details changed.' };
    case 'CHANGE_REQUEST_APPROVAL_UPDATED':
      return { title: `Approval updated: ${cleanText(metadata.approvalStatus) || 'status changed'}`, detail: title || projectRef || 'Change request approval state changed.' };
    case 'CHANGE_REQUEST_DELETED':
      return { title: title ? `Change request deleted: ${title}` : 'Change request deleted', detail: summary || projectRef || 'Older deletion did not store draft context.' };
    case 'FILE_UPLOADED':
      return { title: `Document uploaded: ${cleanText(metadata.originalName) || activity.entityId}`, detail: projectRef || 'Project document attached.' };
    case 'FILE_DELETED':
      return { title: `Document deleted: ${cleanText(metadata.originalName) || activity.entityId}`, detail: projectRef || 'Project document removed.' };
    default:
      return { title: readableAction(activity.action), detail: `${activity.entityType} ${activity.entityId}` };
  }
};

export const RecentActivity = ({ activities }: { activities: ActivityLog[] }) => {
  const [visibleCount, setVisibleCount] = useState(ACTIVITY_PAGE_SIZE);
  const visibleActivities = useMemo(() => activities.slice(0, visibleCount), [activities, visibleCount]);
  const hasMore = visibleCount < activities.length;

  if (!activities.length) {
    return (
      <EmptyState
        title="No activity yet"
        description="Create a workspace or project to see recent actions here."
        icon={<Clock3 className="h-5 w-5" />}
      />
    );
  }

  return (
    <Card className="border-lime-600/20 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Recent Activity</h2>
          <p className="mt-1 text-sm text-gray-400">Latest workspace and project events</p>
        </div>
      </div>

      <div className="space-y-3">
        {visibleActivities.map((activity, i) => {
          const copy = describeActivity(activity);

          return (
            <motion.div
              key={activity._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.24) }}
              whileHover={{ scale: 1.006 }}
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-800 bg-black/50 p-3 transition-all hover:shadow-[0_8px_30px_rgba(16,185,129,0.04)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/30 ring-1 ring-lime-400/15">
                  <Clock3 className="h-4 w-4 text-lime-400" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{copy.title}</p>
                  <p className="mt-1 truncate text-xs text-gray-400">{copy.detail}</p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-xs text-gray-500">{formatDate(activity.createdAt)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="secondary" onClick={() => setVisibleCount((count) => count + ACTIVITY_PAGE_SIZE)}>
            Show more
          </Button>
        </div>
      ) : null}
    </Card>
  );
};
