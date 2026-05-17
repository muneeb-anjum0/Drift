import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const changeRequestItemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    changeType: { type: String, enum: ['added', 'modified', 'removed', 'ambiguous', 'contradiction'], required: true },
    impact: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    estimatedEffort: { type: Number, default: 0 },
  },
  { _id: false }
);

const changeRequestSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    driftAnalysis: { type: Schema.Types.ObjectId, ref: 'DriftAnalysis', required: true },
    title: { type: String, required: true, trim: true },
    clientName: { type: String, default: '' },
    summary: { type: String, required: true, trim: true },
    changesRequested: { type: [changeRequestItemSchema], default: [] },
    businessReason: { type: String, default: '' },
    timelineImpact: { type: String, default: '' },
    costImpact: { type: String, default: '' },
    recommendedAction: { type: String, default: '' },
    approvalNote: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'sent', 'approved', 'rejected', 'archived'], default: 'draft' },
    generatedBy: { type: String, enum: ['rule_based', 'ollama', 'hybrid'], default: 'rule_based' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

changeRequestSchema.index({ project: 1 });
changeRequestSchema.index({ workspace: 1 });
changeRequestSchema.index({ driftAnalysis: 1 });
changeRequestSchema.index({ status: 1 });
changeRequestSchema.index({ createdAt: -1 });

export type ChangeRequestDocument = InferSchemaType<typeof changeRequestSchema>;
export const ChangeRequestModel = mongoose.model('ChangeRequest', changeRequestSchema);
