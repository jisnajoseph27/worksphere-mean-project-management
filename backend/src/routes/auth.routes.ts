import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const authController = createAuthController(authService);

  router.post('/register', authController.register);
  router.post('/login', authController.login);

  return router;
}
