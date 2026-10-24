import { Collection, MongoServerError, ObjectId } from 'mongodb';
import { UserDocument } from '../models/user';

export class EmailAlreadyRegisteredError extends Error {}

export interface UserService {
  findByEmail(email: string): Promise<UserDocument | null>;
  create(email: string, passwordHash: string): Promise<UserDocument>;
  ensureIndexes(): Promise<void>;
}

export function createMongoUserService(collection: Collection<UserDocument>): UserService {
  return {
    findByEmail(email) {
      return collection.findOne({ email });
    },

    async create(email, passwordHash) {
      const now = new Date();
      const user: UserDocument = {
        _id: new ObjectId(),
        email,
        passwordHash,
        createdAt: now,
        updatedAt: now
      };

      try {
        await collection.insertOne(user);
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000) {
          throw new EmailAlreadyRegisteredError('An account with this email already exists.');
        }
        throw error;
      }

      return user;
    },

    async ensureIndexes() {
      await collection.createIndex({ email: 1 }, { unique: true });
    }
  };
}
