import { RequestHandler } from 'express';
import { AuthService, InvalidCredentialsError } from '../services/auth.service';
import { EmailAlreadyRegisteredError } from '../services/user.service';
import { AuthValidationError, parseCredentials } from '../validation/auth.validation';

function sendError(response: Parameters<RequestHandler>[1], error: unknown): void {
  if (error instanceof AuthValidationError) {
    response.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof EmailAlreadyRegisteredError) {
    response.status(409).json({ error: error.message });
    return;
  }
  if (error instanceof InvalidCredentialsError) {
    response.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  response.status(500).json({ error: 'Internal server error.' });
}

export function createAuthController(authService: AuthService) {
  const register: RequestHandler = async (request, response) => {
    try {
      const result = await authService.register(parseCredentials(request.body));
      response.status(201).json(result);
    } catch (error) {
      sendError(response, error);
    }
  };

  const login: RequestHandler = async (request, response) => {
    try {
      const result = await authService.login(parseCredentials(request.body));
      response.status(200).json(result);
    } catch (error) {
      sendError(response, error);
    }
  };

  return { register, login };
}
