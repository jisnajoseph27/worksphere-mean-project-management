import { Collection, ObjectId, UpdateFilter } from 'mongodb';
import {
  ProjectDocument,
  ProjectInput,
  ProjectPage,
  ProjectPagination
} from '../models/project';

export interface ProjectService {
  create(input: ProjectInput): Promise<ProjectDocument>;
  list(pagination: ProjectPagination): Promise<ProjectPage>;
  findById(id: ObjectId): Promise<ProjectDocument | null>;
  update(id: ObjectId, input: ProjectInput): Promise<ProjectDocument | null>;
  delete(id: ObjectId): Promise<boolean>;
}

export function createMongoProjectService(
  collection: Collection<ProjectDocument>
): ProjectService {
  return {
    async create(input) {
      const now = new Date();
      const project: ProjectDocument = {
        ...input,
        _id: new ObjectId(),
        ownerId: null,
        memberIds: [],
        createdAt: now,
        updatedAt: now
      };

      await collection.insertOne(project);
      return project;
    },

    async list({ limit, skip }) {
      const [projects, total] = await Promise.all([
        collection.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        collection.countDocuments({})
      ]);

      return { projects, total, limit, skip };
    },

    findById(id) {
      return collection.findOne({ _id: id });
    },

    async update(id, input) {
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

      const result = await collection.updateOne({ _id: id }, update);

      if (result.matchedCount === 0) {
        return null;
      }

      return collection.findOne({ _id: id });
    },

    async delete(id) {
      const result = await collection.deleteOne({ _id: id });
      return result.deletedCount === 1;
    }
  };
}
