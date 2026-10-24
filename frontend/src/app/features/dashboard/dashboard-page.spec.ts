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
