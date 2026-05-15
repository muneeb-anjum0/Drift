import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export type WorkspaceDocument = InferSchemaType<typeof workspaceSchema>;
export const WorkspaceModel = mongoose.model('Workspace', workspaceSchema);
