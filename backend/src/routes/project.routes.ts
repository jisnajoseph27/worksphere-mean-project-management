import { Router } from 'express';
import { createProjectController } from '../controllers/project.controller';
import { ProjectService } from '../services/project.service';

export function createProjectRouter(projectService: ProjectService): Router {
  const router = Router();
  const projectController = createProjectController(projectService);

  router.post('/', projectController.create);
  router.get('/', projectController.list);
  router.get('/:projectId', projectController.getById);
  router.put('/:projectId', projectController.update);
  router.delete('/:projectId', projectController.remove);

  return router;
}
