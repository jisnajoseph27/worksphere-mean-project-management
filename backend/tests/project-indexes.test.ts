import { MongoClient } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';
import { ProjectDocument } from '../src/models/project';
import { createMongoProjectService } from '../src/services/project.service';

describe('Mongo project service indexes', () => {
  it('creates the owner and creation-date compound index', async () => {
    const client = new MongoClient('mongodb://127.0.0.1:27017');
    const collection = client.db('worksphere-test').collection<ProjectDocument>('projects');
    const createIndex = vi
      .spyOn(collection, 'createIndex')
      .mockResolvedValue('ownerId_1_createdAt_-1');
    const projectService = createMongoProjectService(collection);

    await expect(projectService.ensureIndexes()).resolves.toBeUndefined();
    expect(createIndex).toHaveBeenCalledExactlyOnceWith({ ownerId: 1, createdAt: -1 });

    await client.close();
  });

  it('propagates index initialization failures', async () => {
    const client = new MongoClient('mongodb://127.0.0.1:27017');
    const collection = client.db('worksphere-test').collection<ProjectDocument>('projects');
    vi.spyOn(collection, 'createIndex').mockRejectedValue(new Error('index creation failed'));
    const projectService = createMongoProjectService(collection);

    await expect(projectService.ensureIndexes()).rejects.toThrow('index creation failed');

    await client.close();
  });
});
