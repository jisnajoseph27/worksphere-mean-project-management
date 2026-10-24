import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProjectPage } from './projects.models';
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
});
