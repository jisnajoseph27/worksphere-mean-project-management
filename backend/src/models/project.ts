import { ObjectId } from 'mongodb';

export const projectStatuses = ['planning', 'active', 'on-hold', 'completed'] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export interface ProjectInput {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate?: Date;
  dueDate?: Date;
}

export interface ProjectDocument extends ProjectInput {
  _id: ObjectId;
  ownerId: ObjectId | null;
  memberIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectPage {
  projects: ProjectDocument[];
  total: number;
  limit: number;
  skip: number;
}

export interface ProjectPagination {
  limit: number;
  skip: number;
}
