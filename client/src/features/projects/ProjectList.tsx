import { motion } from 'framer-motion';
import type { Project } from '../../types';
import { ProjectCard } from './ProjectCard';

export const ProjectList = ({
  projects,
  onEdit,
  onDelete,
  onOpen,
}: {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onOpen: (project: Project) => void;
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.05 }}
      className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3"
    >
      {projects.map((project, i) => (
        <motion.div
          key={project._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <ProjectCard
            project={project}
            onEdit={() => onEdit(project)}
            onDelete={() => onDelete(project)}
            onOpen={() => onOpen(project)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};
