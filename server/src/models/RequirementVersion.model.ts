import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const requirementSnapshotSchema = new Schema(
  {
    requirementId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['functional', 'non_functional', 'business', 'technical', 'ui_ux', 'security', 'performance', 'integration', 'other'],
      default: 'functional',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['proposed', 'approved', 'in_progress', 'completed', 'rejected', 'changed'],
      default: 'proposed',
    },
    source: {
      type: String,
      enum: ['original_scope', 'manual', 'client_message', 'meeting_note', 'document', 'ai_extracted'],
      default: 'manual',
    },
    acceptanceCriteria: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    estimatedEffort: { type: Number },
  },
  { _id: false }
);

const requirementVersionSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    versionNumber: { type: Number, required: true },
    label: { type: String, default: '' },
    description: { type: String, default: '' },
    requirementsSnapshot: { type: [requirementSnapshotSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

requirementVersionSchema.index({ project: 1 });
requirementVersionSchema.index({ workspace: 1 });
requirementVersionSchema.index({ versionNumber: 1 });

export type RequirementVersionDocument = InferSchemaType<typeof requirementVersionSchema>;
export const RequirementVersionModel = mongoose.model('RequirementVersion', requirementVersionSchema);
