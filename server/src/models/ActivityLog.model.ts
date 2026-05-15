import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const activityLogSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type ActivityLogDocument = InferSchemaType<typeof activityLogSchema>;
export const ActivityLogModel = mongoose.model('ActivityLog', activityLogSchema);
