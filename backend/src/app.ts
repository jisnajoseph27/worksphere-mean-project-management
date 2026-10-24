import express from 'express';

export function createApp(checkDatabaseReadiness: () => Promise<void>) {
  const app = express();

  app.get('/api/health', (_request, response) => {
    response.status(200).json({
      status: 'ok',
      message: 'WorkSphere API is running'
    });
  });

  app.get('/api/ready', async (_request, response) => {
    try {
      await checkDatabaseReadiness();
      response.status(200).json({
        status: 'ready',
        database: 'connected'
      });
    } catch {
      response.status(503).json({
        status: 'not_ready',
        message: 'MongoDB is unavailable'
      });
    }
  });

  return app;
}
