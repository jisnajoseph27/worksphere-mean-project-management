import express from 'express';
import { createApiRouter } from './routes/api.routes';

export function createApp(checkDatabaseReadiness: () => Promise<void>) {
  const app = express();

  app.use('/api', createApiRouter(checkDatabaseReadiness));

  return app;
}
