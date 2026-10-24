import request from 'supertest';
import { ObjectId } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { ProjectDocument } from '../src/models/project';
import { ProjectService } from '../src/services/project.service';
import { AuthService, jwtAudience, jwtIssuer } from '../src/services/auth.service';
import jwt from 'jsonwebtoken';

const databaseCheck = async () => {};
const testSecret = 'test-secret-at-least-32-bytes-long';
const testUserId = new ObjectId('507f1f77bcf86cd799439012');
const testToken = jwt.sign({}, testSecret, {
  algorithm: 'HS256',
  audience: jwtAudience,
  expiresIn: '15m',
  issuer: jwtIssuer,
  subject: testUserId.toHexString()
});
const authService: AuthService = {
  register: async () => {
    throw new Error('Not used in project tests.');
  },
  login: async () => {
    throw new Error('Not used in project tests.');
  }
};
const projectId = new ObjectId();
const project: ProjectDocument = {
  _id: projectId,
  name: 'WorkSphere',
  description: 'Project management app',
  status: 'planning',
  ownerId: testUserId,
  memberIds: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z')
};

function createProjectService(overrides: Partial<ProjectService> = {}): ProjectService {
  return {
    ensureIndexes: vi.fn(async () => {}),
    create: vi.fn(async () => project),
    list: vi.fn(async (_ownerId, { limit, skip }) => ({
      projects: [project],
      total: 1,
      limit,
      skip
    })),
    findById: vi.fn(async () => project),
    update: vi.fn(async () => project),
    delete: vi.fn(async () => true),
    ...overrides
  };
}

function createTestApp(projectService: ProjectService) {
  return createApp(databaseCheck, projectService, authService, testSecret);
}

describe('Projects API', () => {
  it('creates a project and keeps ownership and membership server-controlled', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService))
      .post('/api/projects')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ name: '  WorkSphere  ', description: 'Project management app', status: 'planning' });

    expect(response.status).toBe(201);
    expect(projectService.create).toHaveBeenCalledWith({
      name: 'WorkSphere',
      description: 'Project management app',
      status: 'planning'
    }, testUserId);
  });

  it('rejects client-supplied ownership and member IDs', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService))
      .post('/api/projects')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'WorkSphere',
        description: 'Project management app',
        status: 'planning',
        ownerId: projectId.toHexString(),
        memberIds: [projectId.toHexString()]
      });

    expect(response.status).toBe(400);
    expect(projectService.create).not.toHaveBeenCalled();
  });

  it('lists projects with default pagination', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService))
      .get('/api/projects/')
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ total: 1, limit: 10, skip: 0 });
    expect(projectService.list).toHaveBeenCalledWith(testUserId, { limit: 10, skip: 0 });
  });

  it('preserves explicitly requested pagination values', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService))
      .get('/api/projects?limit=25&skip=10')
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ total: 1, limit: 25, skip: 10 });
    expect(projectService.list).toHaveBeenCalledWith(testUserId, { limit: 25, skip: 10 });
  });

  it('gets one project by a valid ObjectId', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService)).get(
      `/api/projects/${projectId.toHexString()}`
    ).set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('WorkSphere');
    expect(projectService.findById).toHaveBeenCalledWith(projectId, testUserId);
  });

  it('rejects malformed project IDs', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService))
      .get('/api/projects/not-an-id')
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(400);
    expect(projectService.findById).not.toHaveBeenCalled();
  });

  it('returns 400 with JSON for malformed JSON bodies', async () => {
    const response = await request(createTestApp(createProjectService()))
      .post('/api/projects')
      .set('Authorization', `Bearer ${testToken}`)
      .set('Content-Type', 'application/json')
      .send('{"name":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid JSON request body.' });
  });

  it('updates a project using a complete valid body', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService))
      .put(`/api/projects/${projectId.toHexString()}`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({ name: 'WorkSphere 2', description: 'Updated description', status: 'active' });

    expect(response.status).toBe(200);
    expect(projectService.update).toHaveBeenCalledWith(projectId, testUserId, {
      name: 'WorkSphere 2',
      description: 'Updated description',
      status: 'active'
    });
  });

  it('rejects invalid ISO dates and a due date before the start date', async () => {
    const projectService = createProjectService();
    const app = createTestApp(projectService);
    const baseBody = { name: 'WorkSphere', description: 'Dates', status: 'planning' };

    const invalidDate = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ ...baseBody, startDate: '2026-02-30T12:00:00Z' });
    const reversedDates = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        ...baseBody,
        startDate: '2026-05-02T00:00:00Z',
        dueDate: '2026-05-01T00:00:00Z'
      });

    expect(invalidDate.status).toBe(400);
    expect(reversedDates.status).toBe(400);
    expect(projectService.create).not.toHaveBeenCalled();
  });

  it('returns 404 when an update or delete target does not exist', async () => {
    const projectService = createProjectService({
      update: vi.fn(async () => null),
      delete: vi.fn(async () => false)
    });
    const app = createTestApp(projectService);
    const body = { name: 'WorkSphere', description: 'Project', status: 'planning' };

    const updateResponse = await request(app)
      .put(`/api/projects/${projectId.toHexString()}`)
      .set('Authorization', `Bearer ${testToken}`)
      .send(body);
    const deleteResponse = await request(app)
      .delete(`/api/projects/${projectId.toHexString()}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(updateResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
    expect(projectService.update).toHaveBeenCalledWith(projectId, testUserId, expect.any(Object));
    expect(projectService.delete).toHaveBeenCalledWith(projectId, testUserId);
  });

  it('returns 204 when a project is deleted', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService)).delete(
      `/api/projects/${projectId.toHexString()}`
    ).set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(projectService.delete).toHaveBeenCalledWith(projectId, testUserId);
  });

  it('returns a safe error when the project service fails', async () => {
    const projectService = createProjectService({
      findById: vi.fn(async () => {
        throw new Error('Database details should not be returned.');
      })
    });
    const response = await request(createTestApp(projectService)).get(
      `/api/projects/${projectId.toHexString()}`
    ).set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error.' });
  });

  it('rejects project requests without a bearer token', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService)).get('/api/projects');

    expect(response.status).toBe(401);
    expect(projectService.list).not.toHaveBeenCalled();
  });

  it('rejects invalid and expired bearer tokens', async () => {
    const expiredToken = jwt.sign({}, testSecret, {
      algorithm: 'HS256',
      audience: jwtAudience,
      expiresIn: -1,
      issuer: jwtIssuer,
      subject: testUserId.toHexString()
    });
    const projectService = createProjectService();
    const app = createTestApp(projectService);

    const invalidResponse = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer invalid-token');
    const expiredResponse = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(invalidResponse.status).toBe(401);
    expect(expiredResponse.status).toBe(401);
    expect(projectService.list).not.toHaveBeenCalled();
  });
});
