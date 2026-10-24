import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const requestPath = request.url.split(/[?#]/, 1)[0];
  const targetsProjects =
    requestPath === '/api/projects' || requestPath.startsWith('/api/projects/');

  if (!targetsProjects) {
    return next(request);
  }

  const authService = inject(AuthService);
  const token = authService.tokenForProjectsRequest();
  if (!token) {
    return next(request);
  }

  const router = inject(Router);
  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    })
  ).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        authService.tokenForProjectsRequest() === token
      ) {
        authService.logout();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
