import type { Project } from '../../types';
import { ProjectCard } from './ProjectCard';

export const ProjectList = ({ projects, canEdit, onEdit, onDelete }: {
  projects: Project[];
  canEdit: (project: Project) => boolean;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}) => <div className="grid gap-4 md:grid-cols-2">{projects.map((project) => <ProjectCard key={project._id} project={project} canEdit={canEdit(project)} onEdit={() => onEdit(project)} onDelete={() => onDelete(project)} />)}</div>;
