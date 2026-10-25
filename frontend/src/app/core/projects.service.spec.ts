import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Project, ProjectInput, ProjectPage } from './projects.models';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let projectsService: ProjectsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    projectsService = TestBed.inject(ProjectsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('requests and returns the paginated projects response', () => {
    const response: ProjectPage = {
      projects: [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'WorkSphere',
          description: 'Project management app',
          status: 'active',
          ownerId: '507f1f77bcf86cd799439012',
          memberIds: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z'
        },
        {
          _id: '507f1f77bcf86cd799439013',
          name: 'Website refresh',
          description: 'Update the company website',
          status: 'planning',
          ownerId: null,
          memberIds: [],
          createdAt: '2026-01-03T00:00:00.000Z',
          updatedAt: '2026-01-03T00:00:00.000Z',
          startDate: null,
          dueDate: '2026-02-01T00:00:00.000Z'
        }
      ],
      total: 2,
      limit: 20,
      skip: 0
    };
    let result: ProjectPage | undefined;

    projectsService.listProjects().subscribe((page) => (result = page));
    const request = httpTesting.expectOne('/api/projects');

    expect(request.request.method).toBe('GET');
    request.flush(response);

    expect(result).toEqual(response);
  });

  it('requests and returns a project by ID', () => {
    const projectId = '507f1f77bcf86cd799439011';
    const response: Project = {
      _id: projectId,
      name: 'WorkSphere',
      description: 'Project management app',
      status: 'active',
      ownerId: '507f1f77bcf86cd799439012',
      memberIds: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      startDate: '2026-01-01T00:00:00.000Z',
      dueDate: '2026-02-01T00:00:00.000Z'
    };
    let result: Project | undefined;

    projectsService.getProject(projectId).subscribe((project) => (result = project));
    const request = httpTesting.expectOne(`/api/projects/${projectId}`);

    expect(request.request.method).toBe('GET');
    expect(request.request.url).toBe(`/api/projects/${projectId}`);
    request.flush(response);

    expect(result).toEqual(response);
  });

  it('creates a project with the complete input and returns the created project', () => {
    const input: ProjectInput = {
      name: 'WorkSphere',
      description: 'Project management app',
      status: 'active',
      startDate: '2026-01-01T00:00:00.000Z',
      dueDate: '2026-02-01T00:00:00.000Z'
    };
    const createdProject: Project = {
      _id: '507f1f77bcf86cd799439011',
      ...input,
      ownerId: '507f1f77bcf86cd799439012',
      memberIds: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    };
    let result: Project | undefined;

    projectsService.createProject(input).subscribe((project) => (result = project));
    const request = httpTesting.expectOne('/api/projects');

    expect(request.request.method).toBe('POST');
    expect(request.request.url).toBe('/api/projects');
    expect(request.request.body).toEqual(input);
    request.flush(createdProject);

    expect(result).toEqual(createdProject);
  });

  it('updates a project with the complete input and returns the updated project', () => {
    const projectId = '507f1f77bcf86cd799439011';
    const input: ProjectInput = {
      name: 'WorkSphere update',
      description: 'Updated project management app',
      status: 'planning',
      startDate: '2026-02-01T00:00:00.000Z',
      dueDate: '2026-03-01T00:00:00.000Z'
    };
    const updatedProject: Project = {
      _id: projectId,
      ...input,
      ownerId: '507f1f77bcf86cd799439012',
      memberIds: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z'
    };
    let result: Project | undefined;

    projectsService.updateProject(projectId, input).subscribe((project) => (result = project));
    const request = httpTesting.expectOne(`/api/projects/${projectId}`);

    expect(request.request.method).toBe('PUT');
    expect(request.request.url).toBe(`/api/projects/${projectId}`);
    expect(request.request.body).toEqual(input);
    request.flush(updatedProject);

    expect(result).toEqual(updatedProject);
  });
});
