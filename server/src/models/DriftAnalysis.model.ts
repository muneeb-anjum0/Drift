import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const detectedChangeSchema = new Schema(
  {
    changeType: {
      type: String,
      enum: ['added', 'modified', 'removed', 'ambiguous', 'contradiction', 'unchanged'],
      required: true,
    },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    baselineRequirementId: { type: String },
    baselineRequirementTitle: { type: String },
    newText: { type: String },
    oldText: { type: String },
    impact: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true, default: 'medium' },
    estimatedEffort: { type: Number },
    confidence: { type: Number, required: true, min: 0, max: 100, default: 0 },
    recommendation: { type: String, default: '' },
  },
  { _id: false }
);

const driftAnalysisSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    baselineVersion: { type: Schema.Types.ObjectId, ref: 'RequirementVersion', required: true },
    baselineVersionNumber: { type: Number, required: true },
    inputType: {
      type: String,
      enum: ['client_message', 'meeting_note', 'scope_update', 'document_text', 'other'],
      default: 'client_message',
    },
    inputText: { type: String, required: true, trim: true },
    driftScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    summary: { type: String, required: true, trim: true },
    detectedChanges: { type: [detectedChangeSchema], default: [] },
    addedCount: { type: Number, default: 0 },
    modifiedCount: { type: Number, default: 0 },
    removedCount: { type: Number, default: 0 },
    ambiguousCount: { type: Number, default: 0 },
    contradictionCount: { type: Number, default: 0 },
    estimatedExtraHours: { type: Number, default: 0 },
    analysisEngine: { type: String, enum: ['rule_based', 'ollama', 'hybrid'], default: 'rule_based' },
    ollamaUsed: { type: Boolean, default: false },
    ollamaModel: { type: String },
    status: { type: String, enum: ['draft', 'saved', 'reviewed'], default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

driftAnalysisSchema.index({ project: 1 });
driftAnalysisSchema.index({ workspace: 1 });
driftAnalysisSchema.index({ baselineVersion: 1 });
driftAnalysisSchema.index({ riskLevel: 1 });
driftAnalysisSchema.index({ createdAt: -1 });

export type DriftAnalysisDocument = InferSchemaType<typeof driftAnalysisSchema>;
export const DriftAnalysisModel = mongoose.model('DriftAnalysis', driftAnalysisSchema);
