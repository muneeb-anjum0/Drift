import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../../components/common/Button';
import type { DocumentType, ProjectFile } from './file.types';
import { FileList } from './FileList';

const documentTypes: Array<{ value: DocumentType; label: string }> = [
  { value: 'scope_document', label: 'Scope document' },
  { value: 'client_brief', label: 'Client brief' },
  { value: 'contract', label: 'Contract' },
  { value: 'meeting_note', label: 'Meeting note' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'other', label: 'Other' },
];

export const FileUploadPanel = ({
  files,
  isUploading,
  isDeleting,
  errorMessage,
  onUpload,
  onDelete,
}: {
  files: ProjectFile[];
  isUploading: boolean;
  isDeleting: boolean;
  errorMessage?: string;
  onUpload: (payload: { file: File; documentType: DocumentType }) => Promise<void>;
  onDelete: (file: ProjectFile) => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('scope_document');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    await onUpload({ file, documentType });
    setFile(null);
    event.currentTarget.reset();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[1fr_180px_auto]">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="min-h-10 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text)]"
        />
        <select value={documentType} onChange={(event) => setDocumentType(event.target.value as DocumentType)} className="h-10 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text)]">
          {documentTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={!file || isUploading}>
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </form>
      {errorMessage ? <p className="rounded-2xl border border-lime-400/20 bg-lime-400/10 px-4 py-3 text-sm text-lime-100">{errorMessage}</p> : null}
      <FileList files={files} isDeleting={isDeleting} onDelete={onDelete} />
    </div>
  );
};
