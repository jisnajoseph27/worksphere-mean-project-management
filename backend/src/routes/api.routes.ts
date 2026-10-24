import { Router } from 'express';
import { createHealthRouter } from './health.routes';

export function createApiRouter(checkDatabaseReadiness: () => Promise<void>): Router {
  const router = Router();

  router.use(createHealthRouter(checkDatabaseReadiness));

  return router;
}
