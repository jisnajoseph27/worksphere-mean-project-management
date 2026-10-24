import { Collection, ObjectId, UpdateFilter } from 'mongodb';
import {
  ProjectDocument,
  ProjectInput,
  ProjectPage,
  ProjectPagination
} from '../models/project';

export interface ProjectService {
  create(input: ProjectInput, ownerId: ObjectId): Promise<ProjectDocument>;
  list(ownerId: ObjectId, pagination: ProjectPagination): Promise<ProjectPage>;
  findById(id: ObjectId, ownerId: ObjectId): Promise<ProjectDocument | null>;
  update(id: ObjectId, ownerId: ObjectId, input: ProjectInput): Promise<ProjectDocument | null>;
  delete(id: ObjectId, ownerId: ObjectId): Promise<boolean>;
}

export function createMongoProjectService(
  collection: Collection<ProjectDocument>
): ProjectService {
  return {
    async create(input, ownerId) {
      const now = new Date();
      const project: ProjectDocument = {
        ...input,
        _id: new ObjectId(),
        ownerId,
        memberIds: [],
        createdAt: now,
        updatedAt: now
      };

      await collection.insertOne(project);
      return project;
    },

    async list(ownerId, { limit, skip }) {
      const [projects, total] = await Promise.all([
        collection.find({ ownerId }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        collection.countDocuments({ ownerId })
      ]);

      return { projects, total, limit, skip };
    },

    findById(id, ownerId) {
      return collection.findOne({ _id: id, ownerId });
    },

    async update(id, ownerId, input) {
      const update: UpdateFilter<ProjectDocument> = {
        $set: { ...input, updatedAt: new Date() }
      };
      const fieldsToUnset: { startDate?: ''; dueDate?: '' } = {};

      if (input.startDate === undefined) {
        fieldsToUnset.startDate = '';
      }
      if (input.dueDate === undefined) {
        fieldsToUnset.dueDate = '';
      }
      if (Object.keys(fieldsToUnset).length > 0) {
        update.$unset = fieldsToUnset;
      }

      const result = await collection.updateOne({ _id: id, ownerId }, update);

      if (result.matchedCount === 0) {
        return null;
      }

      return collection.findOne({ _id: id, ownerId });
    },

    async delete(id, ownerId) {
      const result = await collection.deleteOne({ _id: id, ownerId });
      return result.deletedCount === 1;
    }
  };
}
