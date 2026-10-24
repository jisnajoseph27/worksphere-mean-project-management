import { RequestHandler } from 'express';
import { ProjectService } from '../services/project.service';
import {
  parseProjectId,
  parseProjectInput,
  parseProjectPagination,
  ProjectValidationError
} from '../validation/project.validation';
import { ObjectId } from 'mongodb';

function getUserId(
  request: Parameters<RequestHandler>[0],
  response: Parameters<RequestHandler>[1]
): ObjectId | null {
  if (!request.userId) {
    response.status(401).json({ error: 'Unauthorized.' });
    return null;
  }
  return request.userId;
}

function sendError(response: Parameters<RequestHandler>[1], error: unknown): void {
  if (error instanceof ProjectValidationError) {
    response.status(400).json({ error: error.message });
    return;
  }

  response.status(500).json({ error: 'Internal server error.' });
}

export function createProjectController(projectService: ProjectService) {
  const create: RequestHandler = async (request, response) => {
    try {
      const ownerId = getUserId(request, response);
      if (!ownerId) return;
      const input = parseProjectInput(request.body);
      const project = await projectService.create(input, ownerId);
      response.status(201).json(project);
    } catch (error) {
      sendError(response, error);
    }
  };

  const list: RequestHandler = async (request, response) => {
    try {
      const ownerId = getUserId(request, response);
      if (!ownerId) return;
      const pagination = parseProjectPagination(request.query);
      const page = await projectService.list(ownerId, pagination);
      response.status(200).json(page);
    } catch (error) {
      sendError(response, error);
    }
  };

  const getById: RequestHandler = async (request, response) => {
    try {
      const ownerId = getUserId(request, response);
      if (!ownerId) return;
      const id = parseProjectId(request.params.projectId);
      const project = await projectService.findById(id, ownerId);
      if (!project) {
        response.status(404).json({ error: 'Project not found.' });
        return;
      }

      response.status(200).json(project);
    } catch (error) {
      sendError(response, error);
    }
  };

  const update: RequestHandler = async (request, response) => {
    try {
      const ownerId = getUserId(request, response);
      if (!ownerId) return;
      const id = parseProjectId(request.params.projectId);
      const input = parseProjectInput(request.body);
      const project = await projectService.update(id, ownerId, input);
      if (!project) {
        response.status(404).json({ error: 'Project not found.' });
        return;
      }

      response.status(200).json(project);
    } catch (error) {
      sendError(response, error);
    }
  };

  const remove: RequestHandler = async (request, response) => {
    try {
      const ownerId = getUserId(request, response);
      if (!ownerId) return;
      const id = parseProjectId(request.params.projectId);
      const deleted = await projectService.delete(id, ownerId);
      if (!deleted) {
        response.status(404).json({ error: 'Project not found.' });
        return;
      }

      response.status(204).end();
    } catch (error) {
      sendError(response, error);
    }
  };

  return { create, list, getById, update, remove };
}
