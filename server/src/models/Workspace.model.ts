import mongoose, { Schema } from 'mongoose';

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const WorkspaceModel = mongoose.model('Workspace', workspaceSchema);
