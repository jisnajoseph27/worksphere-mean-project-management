import { ObjectId } from 'mongodb';

export interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  createdAt: Date;
}

export interface UserCredentials {
  email: string;
  password: string;
}
