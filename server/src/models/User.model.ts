import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    provider: { type: String, default: 'local' },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model('User', userSchema);
