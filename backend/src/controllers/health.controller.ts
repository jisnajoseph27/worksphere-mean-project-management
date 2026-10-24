import { RequestHandler } from 'express';
import { HealthService } from '../services/health.service';

export function createHealthController(healthService: HealthService) {
  const getHealth: RequestHandler = (_request, response) => {
    response.status(200).json({
      status: 'ok',
      message: 'WorkSphere API is running'
    });
  };

  const getReadiness: RequestHandler = async (_request, response) => {
    try {
      await healthService.checkReadiness();
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
  };

  return { getHealth, getReadiness };
}
