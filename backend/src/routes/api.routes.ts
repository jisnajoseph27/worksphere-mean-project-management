import { Router } from 'express';
import { createHealthRouter } from './health.routes';
import { createProjectRouter } from './project.routes';
import { ProjectService } from '../services/project.service';
import { AuthService } from '../services/auth.service';
import { createAuthRouter } from './auth.routes';
import { createAuthenticationMiddleware } from '../middleware/authenticate';

export function createApiRouter(
  checkDatabaseReadiness: () => Promise<void>,
  projectService: ProjectService,
  authService: AuthService,
  jwtSecret: string
): Router {
  const router = Router();

  router.use(createHealthRouter(checkDatabaseReadiness));
  router.use('/auth', createAuthRouter(authService));
  router.use(
    '/projects',
    createAuthenticationMiddleware(jwtSecret),
    createProjectRouter(projectService)
  );

  return router;
}
