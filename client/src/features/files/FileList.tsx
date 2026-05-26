import { ExternalLink, FileText, Trash2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatDate';
import type { ProjectFile } from './file.types';

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const FileList = ({
  files,
  isDeleting,
  onDelete,
}: {
  files: ProjectFile[];
  isDeleting: boolean;
  onDelete: (file: ProjectFile) => void;
}) => {
  if (files.length === 0) {
    return <EmptyState title="No project documents yet." description="Upload scope documents, briefs, contracts, screenshots, or meeting notes." icon={<FileText className="h-5 w-5" />} />;
  }

  return (
    <div className="divide-y divide-white/10">
      {files.map((file) => (
        <div key={file._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{file.originalName}</p>
            <p className="mt-1 text-xs text-gray-500">
              {file.documentType.replace(/_/g, ' ')} · {formatBytes(file.size)} · {formatDate(file.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {file.publicUrl ? (
              <a href={file.publicUrl} target="_blank" rel="noreferrer">
                <Button type="button" variant="secondary" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            ) : null}
            <Button type="button" variant="danger" size="sm" onClick={() => onDelete(file)} disabled={isDeleting}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
