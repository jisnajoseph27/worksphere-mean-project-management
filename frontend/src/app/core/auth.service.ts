import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { AuthCredentials, AuthResponse, AuthUser } from './auth.models';

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userState = signal<AuthUser | null>(null);
  private token: string | null = null;

  readonly currentUser = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.userState() !== null && this.token !== null);

  register(credentials: AuthCredentials): Observable<AuthUser> {
    return this.http.post<unknown>('/api/auth/register', credentials).pipe(
      map(parseAuthResponse),
      tap((response) => this.acceptResponse(response)),
      map((response) => response.user),
      catchError((error: unknown) => throwError(() => toAuthApiError(error)))
    );
  }

  login(credentials: AuthCredentials): Observable<AuthUser> {
    return this.http.post<unknown>('/api/auth/login', credentials).pipe(
      map(parseAuthResponse),
      tap((response) => this.acceptResponse(response)),
      map((response) => response.user),
      catchError((error: unknown) => throwError(() => toAuthApiError(error)))
    );
  }

  logout(): void {
    this.token = null;
    this.userState.set(null);
  }

  tokenForProjectsRequest(): string | null {
    return this.token;
  }

  private acceptResponse(response: AuthResponse): void {
    this.token = response.token;
    this.userState.set(response.user);
  }
}

function parseAuthResponse(value: unknown): AuthResponse {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('token' in value) ||
    typeof value.token !== 'string' ||
    !value.token ||
    !('user' in value) ||
    typeof value.user !== 'object' ||
    value.user === null ||
    !('id' in value.user) ||
    typeof value.user.id !== 'string' ||
    !('email' in value.user) ||
    typeof value.user.email !== 'string' ||
    !('createdAt' in value.user) ||
    typeof value.user.createdAt !== 'string'
  ) {
    throw new AuthApiError('The server returned an unexpected response. Please try again.', 0);
  }

  return {
    token: value.token,
    user: {
      id: value.user.id,
      email: value.user.email,
      createdAt: value.user.createdAt
    }
  };
}

function toAuthApiError(error: unknown): AuthApiError {
  if (error instanceof AuthApiError) {
    return error;
  }

  if (!(error instanceof HttpErrorResponse)) {
    return new AuthApiError('Something went wrong. Please try again.', 0);
  }
  if (error.status === 0) {
    return new AuthApiError('Unable to reach WorkSphere. Check your connection and try again.', 0);
  }

  const backendMessage =
    typeof error.error === 'object' &&
    error.error !== null &&
    'error' in error.error &&
    typeof error.error.error === 'string'
      ? error.error.error
      : null;

  if (error.status === 401) {
    return new AuthApiError('Invalid email or password.', 401);
  }
  if (error.status === 409) {
    return new AuthApiError('An account with this email already exists.', 409);
  }
  if (error.status === 400 && backendMessage) {
    return new AuthApiError(backendMessage, 400);
  }

  return new AuthApiError('WorkSphere could not complete your request. Please try again.', error.status);
}
