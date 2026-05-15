import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { API_PREFIX } from './utils/constants.js';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { workspaceRouter } from './routes/workspace.routes.js';
import { projectRouter } from './routes/project.routes.js';
import { activityRouter } from './routes/activity.routes.js';
import { notFoundMiddleware } from './middlewares/notFound.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: false }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

  app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'DriftLedger API is running' });
  });

  app.use(`${API_PREFIX}/auth`, authRouter);
  app.use(`${API_PREFIX}/workspaces`, workspaceRouter);
  app.use(`${API_PREFIX}/projects`, projectRouter);
  app.use(`${API_PREFIX}/activities`, activityRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
