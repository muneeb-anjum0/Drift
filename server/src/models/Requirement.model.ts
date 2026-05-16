import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const requirementSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
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
    sourceText: { type: String, default: '' },
    acceptanceCriteria: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    estimatedEffort: { type: Number },
    isBaseline: { type: Boolean, default: false },
    baselineVersion: { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

requirementSchema.index({ project: 1 });
requirementSchema.index({ workspace: 1 });
requirementSchema.index({ status: 1 });
requirementSchema.index({ priority: 1 });
requirementSchema.index({ type: 1 });

export type RequirementDocument = InferSchemaType<typeof requirementSchema>;
export const RequirementModel = mongoose.model('Requirement', requirementSchema);
