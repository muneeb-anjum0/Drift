import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';

let memoryServer: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.MONGO_URI);
    console.log(`MongoDB connected: ${env.MONGO_URI}`);
    return;
  } catch (error) {
    if (env.NODE_ENV !== 'development') {
      throw error;
    }

    console.warn('MongoDB connection failed. Falling back to in-memory MongoDB for development.');
    memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    await mongoose.connect(memoryUri);
    console.log(`MongoDB in-memory connected: ${memoryUri}`);
  }
};

export const stopInMemoryDB = async (): Promise<void> => {
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};
