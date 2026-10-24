import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  let authService: AuthService;
  let router: Router;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('redirects when the in-memory auth state is empty', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/login');
  });

  it('allows navigation after successful authentication', () => {
    authService.login({ email: 'person@example.com', password: 'long-enough-password' }).subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'person@example.com',
        createdAt: '2026-10-24T00:00:00.000Z'
      },
      token: 'valid-token'
    });

    expect(TestBed.runInInjectionContext(() => authGuard({} as never, {} as never))).toBe(true);
  });
});
