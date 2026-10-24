import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthApiError, AuthService } from './auth.service';
import {
  backendEmailValidator,
  backendPasswordByteLimitValidator,
  backendPasswordLengthValidator
} from './auth.validators';

const user = {
  id: '507f1f77bcf86cd799439011',
  email: 'person@example.com',
  createdAt: '2026-10-24T00:00:00.000Z'
};

describe('AuthService', () => {
  let authService: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    authService = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('logs in and keeps the user and token in memory', () => {
    let loggedInUser: unknown;
    authService.login({ email: user.email, password: 'long-enough-password' }).subscribe((result) => {
      loggedInUser = result;
    });

    const request = httpTesting.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({
      email: user.email,
      password: 'long-enough-password'
    });
    request.flush({ user, token: 'signed-token' });

    expect(loggedInUser).toEqual(user);
    expect(authService.currentUser()).toEqual(user);
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.tokenForProjectsRequest()).toBe('signed-token');

    authService.logout();
    expect(authService.currentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.tokenForProjectsRequest()).toBeNull();
  });

  it('uses the registration response token without making a login request', () => {
    authService.register({ email: user.email, password: 'long-enough-password' }).subscribe();

    httpTesting.expectOne('/api/auth/register').flush({ user, token: 'registration-token' });

    expect(authService.currentUser()).toEqual(user);
    expect(authService.tokenForProjectsRequest()).toBe('registration-token');
    httpTesting.expectNone('/api/auth/login');
  });

  it('turns invalid credentials into a helpful message', () => {
    let failure: unknown;
    authService.login({ email: user.email, password: 'long-enough-password' }).subscribe({
      error: (error: unknown) => (failure = error)
    });
    httpTesting.expectOne('/api/auth/login').flush(
      { error: 'Invalid email or password.' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(failure).toBeInstanceOf(AuthApiError);
    expect(failure).toMatchObject({ status: 401, message: 'Invalid email or password.' });
  });

  it('maps duplicate email registration to a user-friendly message', () => {
    let failure: unknown;
    authService.register({ email: user.email, password: 'long-enough-password' }).subscribe({
      error: (error: unknown) => (failure = error)
    });
    httpTesting.expectOne('/api/auth/register').flush(
      { error: 'An account with this email already exists.' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(failure).toMatchObject({
      status: 409,
      message: 'An account with this email already exists.'
    });
  });

  it('reports network and server errors without exposing server details', () => {
    let networkFailure: unknown;
    authService.login({ email: user.email, password: 'long-enough-password' }).subscribe({
      error: (error: unknown) => (networkFailure = error)
    });
    httpTesting.expectOne('/api/auth/login').error(new ProgressEvent('error'));
    expect(networkFailure).toMatchObject({
      status: 0,
      message: 'Unable to reach WorkSphere. Check your connection and try again.'
    });

    let serverFailure: unknown;
    authService.login({ email: user.email, password: 'long-enough-password' }).subscribe({
      error: (error: unknown) => (serverFailure = error)
    });
    httpTesting.expectOne('/api/auth/login').flush(
      { error: 'Database password leaked in server details' },
      { status: 500, statusText: 'Server Error' }
    );
    expect(serverFailure).toMatchObject({
      status: 500,
      message: 'WorkSphere could not complete your request. Please try again.'
    });
    expect((serverFailure as AuthApiError).message).not.toContain('Database password');
  });

  it('matches backend email, character-count, and UTF-8-byte validation rules', () => {
    expect(backendEmailValidator({ value: ' Person@Example.com ' } as never)).toBeNull();
    expect(backendEmailValidator({ value: 'not-an-email' } as never)).toEqual({ email: true });
    expect(backendEmailValidator({ value: `${'a'.repeat(249)}@b.com` } as never)).toEqual({
      email: true
    });

    expect(backendPasswordLengthValidator({ value: '😀'.repeat(12) } as never)).toBeNull();
    expect(backendPasswordLengthValidator({ value: '😀'.repeat(11) } as never)).toEqual({
      minlength: { requiredLength: 12 }
    });
    expect(backendPasswordByteLimitValidator({ value: '😀'.repeat(18) } as never)).toBeNull();
    expect(backendPasswordByteLimitValidator({ value: '😀'.repeat(19) } as never)).toEqual({
      maxlength: { requiredLength: 72 }
    });
  });

  it('does not create authenticated state from a malformed success response', () => {
    let failure: unknown;
    authService.login({ email: user.email, password: 'long-enough-password' }).subscribe({
      error: (error: unknown) => (failure = error)
    });
    httpTesting.expectOne('/api/auth/login').flush({ user, token: 123 });

    expect(failure).toMatchObject({ status: 0 });
    expect(authService.currentUser()).toBeNull();
    expect(authService.tokenForProjectsRequest()).toBeNull();
  });
});
