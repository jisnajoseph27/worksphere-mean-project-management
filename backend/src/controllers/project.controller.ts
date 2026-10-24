import { RequestHandler } from 'express';
import { ProjectService } from '../services/project.service';
import {
  parseProjectId,
  parseProjectInput,
  parseProjectPagination,
  ProjectValidationError
} from '../validation/project.validation';

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
      const input = parseProjectInput(request.body);
      const project = await projectService.create(input);
      response.status(201).json(project);
    } catch (error) {
      sendError(response, error);
    }
  };

  const list: RequestHandler = async (request, response) => {
    try {
      const pagination = parseProjectPagination(request.query);
      const page = await projectService.list(pagination);
      response.status(200).json(page);
    } catch (error) {
      sendError(response, error);
    }
  };

  const getById: RequestHandler = async (request, response) => {
    try {
      const id = parseProjectId(request.params.projectId);
      const project = await projectService.findById(id);
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
      const id = parseProjectId(request.params.projectId);
      const input = parseProjectInput(request.body);
      const project = await projectService.update(id, input);
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
      const id = parseProjectId(request.params.projectId);
      const deleted = await projectService.delete(id);
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
