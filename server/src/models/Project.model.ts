import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const projectSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['planning', 'active', 'paused', 'completed', 'archived'],
      default: 'planning',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    originalScope: { type: String, default: '' },
    deadline: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export type ProjectDocument = InferSchemaType<typeof projectSchema>;
export const ProjectModel = mongoose.model('Project', projectSchema);
