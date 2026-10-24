import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const startupMocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
  checkDatabaseReadiness: vi.fn(),
  createApp: vi.fn(),
  createMongoProjectService: vi.fn(),
  createMongoUserService: vi.fn(),
  createAuthService: vi.fn(),
  validateJwtSecret: vi.fn(),
  userEnsureIndexes: vi.fn(),
  projectEnsureIndexes: vi.fn(),
  close: vi.fn(),
  listen: vi.fn()
}));

vi.mock('../src/config/database', () => ({
  connectToDatabase: startupMocks.connectToDatabase,
  checkDatabaseReadiness: startupMocks.checkDatabaseReadiness
}));
vi.mock('../src/app', () => ({ createApp: startupMocks.createApp }));
vi.mock('../src/services/project.service', () => ({
  createMongoProjectService: startupMocks.createMongoProjectService
}));
vi.mock('../src/services/user.service', () => ({
  createMongoUserService: startupMocks.createMongoUserService
}));
vi.mock('../src/services/auth.service', () => ({
  createAuthService: startupMocks.createAuthService,
  validateJwtSecret: startupMocks.validateJwtSecret
}));

describe('server startup index initialization', () => {
  const originalMongoUri = process.env.MONGODB_URI;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalExitCode = process.exitCode;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    startupMocks.connectToDatabase.mockReset();
    startupMocks.checkDatabaseReadiness.mockReset();
    startupMocks.createApp.mockReset();
    startupMocks.createMongoProjectService.mockReset();
    startupMocks.createMongoUserService.mockReset();
    startupMocks.createAuthService.mockReset();
    startupMocks.validateJwtSecret.mockReset();
    startupMocks.userEnsureIndexes.mockReset();
    startupMocks.projectEnsureIndexes.mockReset();
    startupMocks.close.mockReset();
    startupMocks.listen.mockReset();

    const client = {
      db: vi.fn(() => ({ collection: vi.fn(() => ({})) })),
      close: startupMocks.close
    };
    startupMocks.connectToDatabase.mockResolvedValue(client);
    startupMocks.createMongoUserService.mockReturnValue({
      ensureIndexes: startupMocks.userEnsureIndexes
    });
    startupMocks.createMongoProjectService.mockReturnValue({
      ensureIndexes: startupMocks.projectEnsureIndexes
    });
    startupMocks.createApp.mockReturnValue({ listen: startupMocks.listen });
    startupMocks.userEnsureIndexes.mockResolvedValue(undefined);
    startupMocks.projectEnsureIndexes.mockResolvedValue(undefined);
    startupMocks.close.mockResolvedValue(undefined);
    startupMocks.listen.mockReturnValue(undefined);

    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/worksphere-test';
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-startup';
    process.exitCode = 0;
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    if (originalMongoUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalMongoUri;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
    process.exitCode = originalExitCode;
  });

  it.each([
    ['user', 'Unable to initialize the users collection email index.'],
    ['project', 'Unable to initialize the projects collection owner/date index.']
  ])('closes MongoDB and does not listen when %s indexes fail', async (index, message) => {
    const failure = new Error(`${index} index failed`);
    if (index === 'user') startupMocks.userEnsureIndexes.mockRejectedValue(failure);
    else startupMocks.projectEnsureIndexes.mockRejectedValue(failure);

    await import('../src/server');
    await vi.waitFor(() => expect(process.exitCode).toBe(1));

    expect(startupMocks.close).toHaveBeenCalledOnce();
    expect(startupMocks.listen).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(message);
  });

  it('preserves the index failure when closing the MongoDB client also fails', async () => {
    startupMocks.projectEnsureIndexes.mockRejectedValue(new Error('project index failed'));
    startupMocks.close.mockRejectedValue(new Error('client close failed'));

    await import('../src/server');
    await vi.waitFor(() => expect(process.exitCode).toBe(1));

    expect(startupMocks.listen).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      'Unable to close MongoDB after index initialization failed.'
    );
    expect(consoleError).toHaveBeenCalledWith(
      'Unable to initialize the projects collection owner/date index.'
    );
  });
});
