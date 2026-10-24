import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { ObjectId, MongoServerError } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { UserDocument } from '../src/models/user';
import {
  createAuthService,
  jwtAudience,
  jwtIssuer,
  validateJwtSecret
} from '../src/services/auth.service';
import {
  createMongoUserService,
  EmailAlreadyRegisteredError,
  UserService
} from '../src/services/user.service';
import { ProjectService } from '../src/services/project.service';

const testSecret = 'test-secret-at-least-32-bytes-long';
const credentials = { email: 'person@example.com', password: 'correct horse battery staple' };
const user: UserDocument = {
  _id: new ObjectId('507f1f77bcf86cd799439011'),
  email: credentials.email,
  passwordHash: '$2a$12$not-a-real-hash',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z')
};

function createUserService(overrides: Partial<UserService> = {}): UserService {
  return {
    findByEmail: vi.fn(async () => user),
    create: vi.fn(async () => user),
    ensureIndexes: vi.fn(async () => {}),
    ...overrides
  };
}

const projectService: ProjectService = {
  create: async () => {
    throw new Error('Not used in authentication tests.');
  },
  list: async (_ownerId, { limit, skip }) => ({ projects: [], total: 0, limit, skip }),
  findById: async () => null,
  update: async () => null,
  delete: async () => false
};

describe('Authentication API and services', () => {
  it('requires a sufficiently long JWT secret', () => {
    expect(() => validateJwtSecret(undefined)).toThrow(
      'JWT_SECRET must be set to a random value of at least 32 bytes.'
    );
    expect(() => validateJwtSecret('too-short')).toThrow();
    expect(() => validateJwtSecret(testSecret)).not.toThrow();
  });

  it('registers a normalized email and never returns the password hash', async () => {
    const userService = createUserService();
    const authService = createAuthService(userService, testSecret);
    const response = await request(
      createApp(async () => {}, projectService, authService, testSecret)
    )
      .post('/api/auth/register')
      .send({ email: ' Person@Example.com ', password: credentials.password });

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual({
      id: user._id.toHexString(),
      email: user.email,
      createdAt: user.createdAt.toISOString()
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(await bcrypt.compare(credentials.password, userService.create.mock.calls[0][1])).toBe(
      true
    );
    expect(jwt.verify(response.body.token, testSecret, {
      algorithms: ['HS256'],
      audience: jwtAudience,
      issuer: jwtIssuer
    })).toMatchObject({ sub: user._id.toHexString() });
  });

  it('rejects invalid registration input before accessing the user store', async () => {
    const userService = createUserService();
    const response = await request(
      createApp(async () => {}, projectService, createAuthService(userService, testSecret), testSecret)
    )
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' });

    expect(response.status).toBe(400);
    expect(userService.create).not.toHaveBeenCalled();
  });

  it('returns the same login error for an unknown email and a wrong password', async () => {
    const unknownUser = createAuthService(
      createUserService({ findByEmail: vi.fn(async () => null) }),
      testSecret
    );
    const wrongPasswordUser = createAuthService(
      createUserService({
        findByEmail: vi.fn(async () => ({
          ...user,
          passwordHash: await bcrypt.hash('a different valid password', 4)
        }))
      }),
      testSecret
    );
    const appFor = (authService: ReturnType<typeof createAuthService>) =>
      createApp(async () => {}, projectService, authService, testSecret);

    const unknownResponse = await request(appFor(unknownUser))
      .post('/api/auth/login')
      .send(credentials);
    const wrongPasswordResponse = await request(appFor(wrongPasswordUser))
      .post('/api/auth/login')
      .send(credentials);

    expect(unknownResponse.status).toBe(401);
    expect(wrongPasswordResponse.status).toBe(401);
    expect(unknownResponse.body).toEqual({ error: 'Invalid email or password.' });
    expect(wrongPasswordResponse.body).toEqual(unknownResponse.body);
  });

  it('returns conflict when a concurrent registration hits the unique email index', async () => {
    const userService = createUserService({
      create: vi.fn(async () => {
        throw new EmailAlreadyRegisteredError('An account with this email already exists.');
      })
    });
    const response = await request(
      createApp(async () => {}, projectService, createAuthService(userService, testSecret), testSecret)
    )
      .post('/api/auth/register')
      .send(credentials);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'An account with this email already exists.' });
  });

  it('maps MongoDB duplicate-key errors to the registration conflict error', async () => {
    const duplicateKeyError = new MongoServerError({
      message: 'Duplicate email index',
      code: 11000
    });
    const collection = {
      insertOne: vi.fn(async () => {
        throw duplicateKeyError;
      })
    };
    const userService = createMongoUserService(collection as never);

    await expect(userService.create(credentials.email, 'hash')).rejects.toBeInstanceOf(
      EmailAlreadyRegisteredError
    );
  });
});
