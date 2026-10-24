import request from 'supertest';
import { ObjectId } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { ProjectDocument } from '../src/models/project';
import { ProjectService } from '../src/services/project.service';

const databaseCheck = async () => {};
const projectId = new ObjectId();
const project: ProjectDocument = {
  _id: projectId,
  name: 'WorkSphere',
  description: 'Project management app',
  status: 'planning',
  ownerId: null,
  memberIds: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z')
};

function createProjectService(overrides: Partial<ProjectService> = {}): ProjectService {
  return {
    create: vi.fn(async () => project),
    list: vi.fn(async ({ limit, skip }) => ({ projects: [project], total: 1, limit, skip })),
    findById: vi.fn(async () => project),
    update: vi.fn(async () => project),
    delete: vi.fn(async () => true),
    ...overrides
  };
}

function createTestApp(projectService: ProjectService) {
  return createApp(databaseCheck, projectService);
}

describe('Projects API', () => {
  it('creates a project and keeps ownership and membership server-controlled', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService))
      .post('/api/projects')
      .send({ name: '  WorkSphere  ', description: 'Project management app', status: 'planning' });

    expect(response.status).toBe(201);
    expect(projectService.create).toHaveBeenCalledWith({
      name: 'WorkSphere',
      description: 'Project management app',
      status: 'planning'
    });
  });

  it('rejects client-supplied ownership and member IDs', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService))
      .post('/api/projects')
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
    const response = await request(createTestApp(projectService)).get('/api/projects/');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ total: 1, limit: 20, skip: 0 });
    expect(projectService.list).toHaveBeenCalledWith({ limit: 20, skip: 0 });
  });

  it('gets one project by a valid ObjectId', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService)).get(
      `/api/projects/${projectId.toHexString()}`
    );

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('WorkSphere');
  });

  it('rejects malformed project IDs', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService)).get('/api/projects/not-an-id');

    expect(response.status).toBe(400);
    expect(projectService.findById).not.toHaveBeenCalled();
  });

  it('returns 400 with JSON for malformed JSON bodies', async () => {
    const response = await request(createTestApp(createProjectService()))
      .post('/api/projects')
      .set('Content-Type', 'application/json')
      .send('{"name":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid JSON request body.' });
  });

  it('updates a project using a complete valid body', async () => {
    const projectService = createProjectService();
    const response = await request(createTestApp(projectService))
      .put(`/api/projects/${projectId.toHexString()}`)
      .send({ name: 'WorkSphere 2', description: 'Updated description', status: 'active' });

    expect(response.status).toBe(200);
    expect(projectService.update).toHaveBeenCalledWith(projectId, {
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
      .send({ ...baseBody, startDate: '2026-02-30T12:00:00Z' });
    const reversedDates = await request(app)
      .post('/api/projects')
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
      .send(body);
    const deleteResponse = await request(app).delete(`/api/projects/${projectId.toHexString()}`);

    expect(updateResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
  });

  it('returns 204 when a project is deleted', async () => {
    const response = await request(createTestApp(createProjectService())).delete(
      `/api/projects/${projectId.toHexString()}`
    );

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
  });

  it('returns a safe error when the project service fails', async () => {
    const projectService = createProjectService({
      findById: vi.fn(async () => {
        throw new Error('Database details should not be returned.');
      })
    });
    const response = await request(createTestApp(projectService)).get(
      `/api/projects/${projectId.toHexString()}`
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error.' });
  });
});
