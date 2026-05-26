import mongoose, { Schema } from 'mongoose';

const requirementSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, default: 'functional' },
    priority: { type: String, default: 'medium' },
    status: { type: String, default: 'proposed' },
    source: { type: String, default: 'manual' },
    sourceText: { type: String, default: '' },
    acceptanceCriteria: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    estimatedEffort: { type: Number },
    isBaseline: { type: Boolean, default: false },
    baselineVersion: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const RequirementModel = mongoose.model('Requirement', requirementSchema);
