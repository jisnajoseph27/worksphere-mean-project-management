import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ProjectService } from '../src/services/project.service';
import { createApp } from '../src/app';
import { AuthService } from '../src/services/auth.service';

const authService: AuthService = {
  register: async () => {
    throw new Error('Not used in health tests.');
  },
  login: async () => {
    throw new Error('Not used in health tests.');
  }
};

describe('GET /api/health', () => {
  it('returns a successful JSON health response', async () => {
    const projectService: ProjectService = {
      create: async () => {
        throw new Error('Not used in health tests.');
      },
      list: async (_ownerId, { limit, skip }) => ({ projects: [], total: 0, limit, skip }),
      findById: async () => null,
      update: async () => null,
      delete: async () => false
    };
    const app = createApp(async () => {}, projectService, authService, 'test-secret-at-least-32-bytes-long');
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      message: 'WorkSphere API is running'
    });
  });
});
