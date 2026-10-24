import { UserCredentials } from '../models/user';

export class AuthValidationError extends Error {}

export function parseCredentials(value: unknown): UserCredentials {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new AuthValidationError('Request body must be a JSON object.');
  }

  const fields = value as Record<string, unknown>;
  const unexpectedField = Object.keys(fields).find(
    (field) => field !== 'email' && field !== 'password'
  );
  if (unexpectedField) {
    throw new AuthValidationError(`Field "${unexpectedField}" is not allowed.`);
  }

  if (typeof fields.email !== 'string') {
    throw new AuthValidationError('email must be a valid email address.');
  }
  const email = fields.email.trim().toLowerCase();
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new AuthValidationError('email must be a valid email address.');
  }

  if (typeof fields.password !== 'string') {
    throw new AuthValidationError('password must be a string.');
  }
  const passwordLength = Array.from(fields.password).length;
  if (passwordLength < 12) {
    throw new AuthValidationError('password must be at least 12 characters.');
  }
  if (Buffer.byteLength(fields.password, 'utf8') > 72) {
    throw new AuthValidationError('password must not exceed 72 UTF-8 bytes.');
  }

  return { email, password: fields.password };
}
