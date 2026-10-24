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
import { authGuard } from '../../core/auth.guard';
import { AuthService } from '../../core/auth.service';
import { authInterceptor } from '../../core/auth.interceptor';
import { ProjectPage } from '../../core/projects.models';
import { DashboardPage } from './dashboard-page';

@Component({ template: '<p>Login page</p>' })
class LoginTestPage {}

const projectPage = (projects: ProjectPage['projects']): ProjectPage => ({
  projects,
  total: projects.length,
  limit: 20,
  skip: 0
});

const activeProject: ProjectPage['projects'][number] = {
  _id: '507f1f77bcf86cd799439011',
  name: 'WorkSphere',
  description: 'Project management app',
  status: 'active',
  ownerId: '507f1f77bcf86cd799439012',
  memberIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  dueDate: '2026-02-01T00:00:00.000Z'
};

describe('DashboardPage', () => {
  let authService: AuthService;
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: LoginTestPage },
          { path: 'dashboard', canActivate: [authGuard], component: DashboardPage }
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
        createdAt: '2026-10-24T00:00:00.000Z'
      },
      token: 'dashboard-token'
    });
  });

  afterEach(() => httpTesting.verify());

  it('shows an accessible loading state while requesting the projects', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    const status = harness.routeNativeElement?.querySelector('[role="status"]');
    const request = httpTesting.expectOne('/api/projects');

    expect(status?.textContent).toContain('Loading your projects');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer dashboard-token');
    request.flush(projectPage([]));
  });

  it('renders the successful results and API total', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    httpTesting.expectOne('/api/projects').flush({
      ...projectPage([activeProject]),
      total: 3
    });
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('WorkSphere');
    expect(harness.routeNativeElement?.textContent).toContain('Project management app');
    expect(harness.routeNativeElement?.textContent).toContain('3 projects');
    expect(harness.routeNativeElement?.textContent).toContain('active');
    expect(harness.routeNativeElement?.textContent).toContain('Feb 1, 2026');
  });

  it('shows the empty state when there are no projects', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    httpTesting.expectOne('/api/projects').flush(projectPage([]));
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Your project space is ready');
    expect(harness.routeNativeElement?.textContent).toContain('0 projects');
  });

  it('shows a safe error message when loading projects fails', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    httpTesting.expectOne('/api/projects').flush(
      { error: 'Sensitive database details' },
      { status: 500, statusText: 'Server Error' }
    );
    harness.detectChanges();

    const alert = harness.routeNativeElement?.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('We could not load your projects. Please try again.');
    expect(alert?.textContent).not.toContain('Sensitive database details');
    expect(harness.routeNativeElement?.querySelector('button.retry-button')).not.toBeNull();
  });

  it('retries after an error and renders the subsequent result', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    httpTesting.expectOne('/api/projects').flush(
      { error: 'Unavailable.' },
      { status: 503, statusText: 'Service Unavailable' }
    );
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector('button.retry-button')
      ?.dispatchEvent(new Event('click'));
    harness.detectChanges();
    const retryRequest = httpTesting.expectOne('/api/projects');
    expect(retryRequest.request.method).toBe('GET');
    retryRequest.flush(projectPage([activeProject]));
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('WorkSphere');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();
  });

  it('opens the create form from the New Project button', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    httpTesting.expectOne('/api/projects').flush(projectPage([]));
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button.new-project-button')
      ?.click();
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('#project-form-title')?.textContent)
      .toContain('Create project');
    expect(harness.routeNativeElement?.querySelector('#project-name')).not.toBeNull();
  });

  it('shows required name validation for blank and whitespace-only names', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    httpTesting.expectOne('/api/projects').flush(projectPage([]));
    harness.detectChanges();
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('button.new-project-button')?.click();
    harness.detectChanges();

    const form = harness.routeNativeElement?.querySelector('form');
    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('#project-name-error')?.textContent)
      .toContain('Enter a project name.');

    const nameInput = harness.routeNativeElement?.querySelector<HTMLInputElement>('#project-name');
    if (!nameInput) throw new Error('Project name input was not rendered.');
    nameInput.value = '   ';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('#project-name-error')?.textContent)
      .toContain('Enter a project name.');
    httpTesting.expectNone((request) => request.url === '/api/projects' && request.method !== 'GET');
  });

  it('shows due date validation when it is earlier than the start date', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    httpTesting.expectOne('/api/projects').flush(projectPage([]));
    harness.detectChanges();
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('button.new-project-button')?.click();
    harness.detectChanges();

    const root = harness.routeNativeElement;
    const nameInput = root?.querySelector<HTMLInputElement>('#project-name');
    const startDateInput = root?.querySelector<HTMLInputElement>('#project-start-date');
    const dueDateInput = root?.querySelector<HTMLInputElement>('#project-due-date');
    if (!nameInput || !startDateInput || !dueDateInput) {
      throw new Error('Project form fields were not rendered.');
    }

    nameInput.value = 'Date validation test';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    startDateInput.value = '2026-05-10';
    startDateInput.dispatchEvent(new Event('input', { bubbles: true }));
    dueDateInput.value = '2026-05-09';
    dueDateInput.dispatchEvent(new Event('input', { bubbles: true }));
    harness.routeNativeElement
      ?.querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('#project-date-error')?.textContent)
      .toContain('Due date must be on or after the start date.');
    httpTesting.expectNone((request) => request.url === '/api/projects' && request.method !== 'GET');
  });

  it('creates a project and refreshes the project list', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    httpTesting.expectOne('/api/projects').flush(projectPage([]));
    harness.detectChanges();
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('button.new-project-button')?.click();
    harness.detectChanges();

    const root = harness.routeNativeElement;
    const nameInput = root?.querySelector<HTMLInputElement>('#project-name');
    const startDateInput = root?.querySelector<HTMLInputElement>('#project-start-date');
    const dueDateInput = root?.querySelector<HTMLInputElement>('#project-due-date');
    if (!nameInput || !startDateInput || !dueDateInput) {
      throw new Error('Project form fields were not rendered.');
    }

    nameInput.value = 'New WorkSphere project';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    startDateInput.value = '2026-06-01';
    startDateInput.dispatchEvent(new Event('input', { bubbles: true }));
    dueDateInput.value = '2026-07-01';
    dueDateInput.dispatchEvent(new Event('input', { bubbles: true }));
    root?.querySelector('form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    const createRequest = httpTesting.expectOne('/api/projects');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.headers.get('Authorization')).toBe('Bearer dashboard-token');
    expect(createRequest.request.body).toEqual({
      name: 'New WorkSphere project',
      description: '',
      status: 'planning',
      startDate: '2026-06-01T00:00:00.000Z',
      dueDate: '2026-07-01T00:00:00.000Z'
    });
    createRequest.flush({
      ...activeProject,
      _id: '507f1f77bcf86cd799439013',
      name: 'New WorkSphere project',
      description: '',
      status: 'planning',
      startDate: '2026-06-01T00:00:00.000Z',
      dueDate: '2026-07-01T00:00:00.000Z'
    });
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('#project-form-title')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('[role="status"]')?.textContent)
      .toContain('Project created successfully.');
    const refreshRequest = httpTesting.expectOne('/api/projects');
    expect(refreshRequest.request.method).toBe('GET');
    refreshRequest.flush(projectPage([
      {
        ...activeProject,
        _id: '507f1f77bcf86cd799439013',
        name: 'New WorkSphere project',
        description: ''
      }
    ]));
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('New WorkSphere project');
  });

  it('prefills the project fields when Edit is opened', async () => {
    const project = {
      ...activeProject,
      startDate: '2026-01-15T00:00:00.000Z'
    };
    const harness = await RouterTestingHarness.create('/dashboard');
    httpTesting.expectOne('/api/projects').flush(projectPage([project]));
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[aria-label="Edit WorkSphere"]')
      ?.click();
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('#project-form-title')?.textContent)
      .toContain('Edit project');
    expect(harness.routeNativeElement?.querySelector<HTMLInputElement>('#project-name')?.value)
      .toBe('WorkSphere');
    expect(harness.routeNativeElement?.querySelector<HTMLTextAreaElement>('#project-description')?.value)
      .toBe('Project management app');
    expect(harness.routeNativeElement?.querySelector<HTMLSelectElement>('#project-status')?.value)
      .toBe('active');
    expect(harness.routeNativeElement?.querySelector<HTMLInputElement>('#project-start-date')?.value)
      .toBe('2026-01-15');
    expect(harness.routeNativeElement?.querySelector<HTMLInputElement>('#project-due-date')?.value)
      .toBe('2026-02-01');
  });

  it('updates a project and refreshes the project list', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    httpTesting.expectOne('/api/projects').flush(projectPage([activeProject]));
    harness.detectChanges();
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[aria-label="Edit WorkSphere"]')
      ?.click();
    harness.detectChanges();

    const nameInput = harness.routeNativeElement?.querySelector<HTMLInputElement>('#project-name');
    if (!nameInput) throw new Error('Project name input was not rendered.');
    nameInput.value = 'Updated WorkSphere';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    harness.routeNativeElement?.querySelector('form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    const updateRequest = httpTesting.expectOne(`/api/projects/${activeProject._id}`);
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.headers.get('Authorization')).toBe('Bearer dashboard-token');
    expect(updateRequest.request.body).toEqual({
      name: 'Updated WorkSphere',
      description: 'Project management app',
      status: 'active',
      dueDate: '2026-02-01T00:00:00.000Z'
    });
    updateRequest.flush({
      ...activeProject,
      name: 'Updated WorkSphere'
    });
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('[role="status"]')?.textContent)
      .toContain('Project updated successfully.');
    const refreshRequest = httpTesting.expectOne('/api/projects');
    expect(refreshRequest.request.method).toBe('GET');
    refreshRequest.flush(projectPage([{ ...activeProject, name: 'Updated WorkSphere' }]));
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Updated WorkSphere');
  });

  it('shows a save error when creating a project fails', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    httpTesting.expectOne('/api/projects').flush(projectPage([]));
    harness.detectChanges();
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('button.new-project-button')?.click();
    harness.detectChanges();

    const nameInput = harness.routeNativeElement?.querySelector<HTMLInputElement>('#project-name');
    if (!nameInput) throw new Error('Project name input was not rendered.');
    nameInput.value = 'Project that fails';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    harness.routeNativeElement?.querySelector('form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    httpTesting.expectOne('/api/projects').flush(
      { error: 'Sensitive server details' },
      { status: 500, statusText: 'Server Error' }
    );
    harness.detectChanges();

    const alert = harness.routeNativeElement?.querySelector('.save-error[role="alert"]');
    expect(alert?.textContent).toContain('We could not save your project.');
    expect(alert?.textContent).not.toContain('Sensitive server details');
    expect(harness.routeNativeElement?.querySelector('#project-form-title')).not.toBeNull();
  });

  it('closes the form on Cancel without creating or updating a project', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    httpTesting.expectOne('/api/projects').flush(projectPage([activeProject]));
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('button[aria-label="Edit WorkSphere"]')
      ?.click();
    harness.detectChanges();
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('button.cancel-button')?.click();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('#project-form-title')).toBeNull();

    harness.routeNativeElement?.querySelector<HTMLButtonElement>('button.new-project-button')?.click();
    harness.detectChanges();
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('button.cancel-button')?.click();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('#project-form-title')).toBeNull();
    httpTesting.expectNone((request) => request.url === '/api/projects' && request.method !== 'GET');
  });

  it('logs out and blocks subsequent dashboard navigation', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    httpTesting.expectOne('/api/projects').flush(projectPage([]));
    harness.detectChanges();
    const logoutButton = harness.routeNativeElement?.querySelector(
      'button[aria-label="Log out"]'
    ) as HTMLButtonElement | null;

    expect(logoutButton?.textContent).toContain('Log out');
    logoutButton?.click();
    await harness.fixture.whenStable();

    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.tokenForProjectsRequest()).toBeNull();
    expect(router.url).toBe('/login');

    await router.navigateByUrl('/dashboard');
    expect(router.url).toBe('/login');
  });
});
