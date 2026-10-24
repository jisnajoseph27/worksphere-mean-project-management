import express, { ErrorRequestHandler } from 'express';
import { createApiRouter } from './routes/api.routes';
import { ProjectService } from './services/project.service';

export function createApp(
  checkDatabaseReadiness: () => Promise<void>,
  projectService: ProjectService
) {
  const app = express();

  app.use(express.json());
  app.use('/api', createApiRouter(checkDatabaseReadiness, projectService));
  const handleRequestError: ErrorRequestHandler = (error, _request, response, _next) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      error.type === 'entity.parse.failed'
    ) {
      response.status(400).json({ error: 'Invalid JSON request body.' });
      return;
    }

    response.status(500).json({ error: 'Internal server error.' });
  };
  app.use(handleRequestError);

  return app;
}
