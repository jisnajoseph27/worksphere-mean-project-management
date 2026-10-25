import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login-page').then((module) => module.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register-page').then((module) => module.RegisterPage)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard-page').then((module) => module.DashboardPage)
  },
  {
    path: 'projects/:projectId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/projects/project-details-page').then((module) => module.ProjectDetailsPage)
  },
  { path: '**', redirectTo: 'login' }
];
