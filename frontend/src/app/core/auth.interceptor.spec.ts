import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

@Component({ template: '' })
class LoginTestPage {}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: LoginTestPage }])
      ]
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpTesting.verify());

  it('attaches the token to project endpoints only', () => {
    authService.login({ email: 'person@example.com', password: 'long-enough-password' }).subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'person@example.com',
        createdAt: '2026-10-24T00:00:00.000Z'
      },
      token: 'projects-token'
    });

    http.get('/api/projects').subscribe();
    http.get('/api/projects?limit=20&skip=0').subscribe();
    http.get('/api/projects/507f1f77bcf86cd799439011').subscribe();
    http.get('/api/auth/login').subscribe();
    http.get('/api/auth/register').subscribe();
    http.get('/api/health').subscribe();
    http.get('/api/projects-extra').subscribe();
    http.get('https://example.test/api/projects').subscribe();

    expect(httpTesting.expectOne('/api/projects').request.headers.get('Authorization')).toBe(
      'Bearer projects-token'
    );
    expect(
      httpTesting.expectOne('/api/projects?limit=20&skip=0').request.headers.get('Authorization')
    ).toBe('Bearer projects-token');
    expect(
      httpTesting.expectOne('/api/projects/507f1f77bcf86cd799439011').request.headers.get(
        'Authorization'
      )
    ).toBe('Bearer projects-token');
    for (const url of [
      '/api/auth/login',
      '/api/auth/register',
      '/api/health',
      '/api/projects-extra',
      'https://example.test/api/projects'
    ]) {
      expect(httpTesting.expectOne(url).request.headers.has('Authorization')).toBe(false);
    }
  });

  it('clears in-memory auth and redirects to login after a projects API 401', () => {
    authService.login({ email: 'person@example.com', password: 'long-enough-password' }).subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'person@example.com',
        createdAt: '2026-10-24T00:00:00.000Z'
      },
      token: 'expired-token'
    });
    const navigation = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    http.get('/api/projects').subscribe({ error: () => {} });
    httpTesting.expectOne('/api/projects').flush(
      { error: 'Unauthorized.' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.tokenForProjectsRequest()).toBeNull();
    expect(navigation).toHaveBeenCalledWith(['/login']);
  });
});
