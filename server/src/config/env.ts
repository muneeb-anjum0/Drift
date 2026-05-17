import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGO_URI: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  OLLAMA_ENABLED: z
    .preprocess((value) => {
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }

      return value;
    }, z.boolean())
    .default(false),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().min(1).default('llama3.1:8b'),
  OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
});

const resolvedEnv = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  MONGO_URI: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/driftledger',
  JWT_SECRET: process.env.JWT_SECRET ?? 'driftledger-dev-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  CLIENT_URL: process.env.CLIENT_URL,
  OLLAMA_ENABLED: process.env.OLLAMA_ENABLED,
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
  OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  OLLAMA_TIMEOUT_MS: process.env.OLLAMA_TIMEOUT_MS,
};

export const env = envSchema.parse(resolvedEnv);
