import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  await connectDB();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`DriftLedger API listening on port ${env.PORT}`);
  });

  const shutdown = async () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

void startServer().catch((error) => {
  console.error('Failed to start DriftLedger API:', error);
  process.exit(1);
});
