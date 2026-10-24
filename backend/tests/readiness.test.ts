import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';

describe('GET /api/ready', () => {
  it('returns ready when the database check succeeds', async () => {
    const checkDatabaseReadiness = vi.fn().mockResolvedValue(undefined);
    const response = await request(createApp(checkDatabaseReadiness)).get('/api/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ready',
      database: 'connected'
    });
    expect(checkDatabaseReadiness).toHaveBeenCalledOnce();
  });

  it('returns unavailable without exposing database errors', async () => {
    const checkDatabaseReadiness = vi
      .fn()
      .mockRejectedValue(new Error('Connection failed for mongodb://user:password@host'));
    const response = await request(createApp(checkDatabaseReadiness)).get('/api/ready');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'not_ready',
      message: 'MongoDB is unavailable'
    });
    expect(JSON.stringify(response.body)).not.toContain('password');
  });
});
