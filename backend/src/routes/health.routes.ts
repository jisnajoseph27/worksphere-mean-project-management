import { Router } from 'express';
import { createHealthController } from '../controllers/health.controller';
import { createHealthService } from '../services/health.service';

export function createHealthRouter(checkDatabaseReadiness: () => Promise<void>): Router {
  const router = Router();
  const healthController = createHealthController(createHealthService(checkDatabaseReadiness));

  router.get('/health', healthController.getHealth);
  router.get('/ready', healthController.getReadiness);

  return router;
}
