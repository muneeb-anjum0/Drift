import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const workspaceMemberSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member',
      required: true,
    },
  },
  { timestamps: true }
);

workspaceMemberSchema.index({ workspace: 1, user: 1 }, { unique: true });

export type WorkspaceMemberDocument = InferSchemaType<typeof workspaceMemberSchema>;
export const WorkspaceMemberModel = mongoose.model('WorkspaceMember', workspaceMemberSchema);
