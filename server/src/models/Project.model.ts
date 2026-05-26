import mongoose, { Schema } from 'mongoose';

const projectSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true },
    clientName: { type: String, default: '' },
    description: { type: String, default: '' },
    status: { type: String, default: 'planning' },
    priority: { type: String, default: 'medium' },
    originalScope: { type: String, default: '' },
    deadline: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const ProjectModel = mongoose.model('Project', projectSchema);
