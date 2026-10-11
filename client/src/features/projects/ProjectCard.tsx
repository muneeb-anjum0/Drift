import { Link } from 'react-router-dom';
import type { Project } from '../../types';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatDate';

export const ProjectCard = ({ project, canEdit, onEdit, onDelete }: {
  project: Project;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <article className="v-panel flex h-full flex-col p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><p className="v-muted text-sm">{project.clientName}</p><h3 className="mt-1 text-lg font-semibold leading-snug"><Link to={`/projects/${project._id}`} className="hover:underline">{project.name}</Link></h3></div>
      <span className="v-pill capitalize">{project.status}</span>
    </div>
    <p className="v-muted mt-3 line-clamp-2 text-sm leading-6">{project.description || project.originalScope || 'Add a short description of the work.'}</p>
    <div className="v-rule mt-auto flex flex-wrap items-center justify-between gap-3 pt-4 text-sm">
      <span className="v-muted">Updated {formatDate(project.updatedAt)}</span>
      <div className="flex gap-2"><Link to={`/projects/${project._id}`} className="v-link self-center">Open project</Link>{canEdit ? <><Button type="button" variant="ghost" size="sm" onClick={onEdit}>Edit</Button><Button type="button" variant="ghost" size="sm" onClick={onDelete}>Delete</Button></> : null}</div>
    </div>
  </article>
);
