import { motion } from 'framer-motion';
import type { Project } from '../../types';
import { ProjectCard } from './ProjectCard';

export const ProjectList = ({
  projects,
  projectOrderById,
  onEdit,
  onDelete,
  onOpen,
}: {
  projects: Project[];
  projectOrderById: Record<string, number>;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onOpen: (project: Project) => void;
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.05 }}
      className="grid items-stretch gap-5 lg:grid-cols-2"
    >
      {projects.map((project, i) => (
        <motion.div
          key={project._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="h-full"
        >
          <ProjectCard
            project={project}
            projectNumber={projectOrderById[project._id] ?? i + 1}
            onEdit={() => onEdit(project)}
            onDelete={() => onDelete(project)}
            onOpen={() => onOpen(project)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};
