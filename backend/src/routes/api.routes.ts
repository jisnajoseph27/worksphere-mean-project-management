import { Router } from 'express';
import { createHealthRouter } from './health.routes';
import { createProjectRouter } from './project.routes';
import { ProjectService } from '../services/project.service';

export function createApiRouter(
  checkDatabaseReadiness: () => Promise<void>,
  projectService: ProjectService
): Router {
  const router = Router();

  router.use(createHealthRouter(checkDatabaseReadiness));
  router.use('/projects', createProjectRouter(projectService));

  return router;
}
