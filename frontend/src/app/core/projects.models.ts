export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed';

export interface ProjectInput {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate?: string;
  dueDate?: string;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  ownerId: string | null;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
  startDate?: string | null;
  dueDate?: string | null;
}

export interface ProjectPage {
  projects: Project[];
  total: number;
  limit: number;
  skip: number;
}
