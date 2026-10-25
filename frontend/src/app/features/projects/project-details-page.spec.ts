import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { authInterceptor } from '../../core/auth.interceptor';
import { Project } from '../../core/projects.models';
import { ProjectDetailsPage } from './project-details-page';

@Component({ template: '<p>Dashboard page</p>' })
class DashboardTestPage {}

const projectId = '507f1f77bcf86cd799439011';
const project: Project = {
  _id: projectId,
  name: 'WorkSphere',
  description: 'Project management app',
  status: 'active',
  ownerId: '507f1f77bcf86cd799439012',
  memberIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  startDate: '2026-01-05T00:00:00.000Z',
  dueDate: '2026-02-01T00:00:00.000Z'
};

describe('ProjectDetailsPage', () => {
  let authService: AuthService;
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'projects', component: ProjectDetailsPage },
          { path: 'projects/:projectId', component: ProjectDetailsPage },
          { path: 'dashboard', component: DashboardTestPage }
        ])
      ]
    });
    authService = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    authService.login({ email: 'person@example.com', password: 'long-enough-password' }).subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      user: {
        id: '507f1f77bcf86cd799439012',
        email: 'person@example.com',
        createdAt: '2026-10-25T00:00:00.000Z'
      },
      token: 'details-token'
    });
  });

  afterEach(() => httpTesting.verify());

  it('shows a loading state while requesting the project', async () => {
    const harness = await RouterTestingHarness.create(`/projects/${projectId}`);

    expect(harness.routeNativeElement?.querySelector('[role="status"]')?.textContent)
      .toContain('Loading project details');
    const request = httpTesting.expectOne(`/api/projects/${projectId}`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer details-token');
    request.flush(project);
  });

  it('loads and displays the project details with readable dates', async () => {
    const harness = await RouterTestingHarness.create(`/projects/${projectId}`);
    httpTesting.expectOne(`/api/projects/${projectId}`).flush(project);
    harness.detectChanges();

    const content = harness.routeNativeElement?.textContent ?? '';
    expect(content).toContain('WorkSphere');
    expect(content).toContain('Project management app');
    expect(content).toContain('active');
    expect(content).toContain('Start date');
    expect(content).toContain('Due date');
    expect(content).toContain('Created');
    expect(content).toContain('Last updated');
    const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
    expect(content).toContain(dateFormatter.format(new Date(project.startDate ?? '')));
    expect(content).toContain(dateFormatter.format(new Date(project.dueDate ?? '')));
    expect(content).toContain(dateFormatter.format(new Date(project.createdAt)));
    expect(content).toContain(dateFormatter.format(new Date(project.updatedAt)));
  });

  it('shows a friendly error and makes no request when the project ID is missing', async () => {
    const harness = await RouterTestingHarness.create('/projects');

    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent)
      .toContain('This project link is invalid.');
    httpTesting.expectNone((request) => request.url.startsWith('/api/projects'));
  });

  it('shows a friendly error and makes no request when the project ID is invalid', async () => {
    const harness = await RouterTestingHarness.create('/projects/not-a-project-id');

    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent)
      .toContain('This project link is invalid.');
    httpTesting.expectNone((request) => request.url.startsWith('/api/projects'));
  });

  it('shows a safe error if the project request fails', async () => {
    const harness = await RouterTestingHarness.create(`/projects/${projectId}`);
    httpTesting.expectOne(`/api/projects/${projectId}`).flush(
      { error: 'Sensitive database details' },
      { status: 404, statusText: 'Not Found' }
    );
    harness.detectChanges();

    const alert = harness.routeNativeElement?.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('We could not load this project.');
    expect(alert?.textContent).not.toContain('Sensitive database details');
  });

  it('shows fallbacks for empty descriptions and invalid or missing dates', async () => {
    const harness = await RouterTestingHarness.create(`/projects/${projectId}`);
    httpTesting.expectOne(`/api/projects/${projectId}`).flush({
      ...project,
      description: '  ',
      startDate: 'not-a-date',
      dueDate: null,
      createdAt: 'also-not-a-date'
    });
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Not provided');
    expect(harness.routeNativeElement?.textContent).not.toContain('Invalid Date');
  });

  it('navigates back to the dashboard', async () => {
    const harness = await RouterTestingHarness.create(`/projects/${projectId}`);
    httpTesting.expectOne(`/api/projects/${projectId}`).flush(project);
    harness.detectChanges();

    harness.routeNativeElement?.querySelector<HTMLAnchorElement>('a.back-link')?.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/dashboard');
    expect(harness.routeNativeElement?.textContent).toContain('Dashboard page');
  });
});
