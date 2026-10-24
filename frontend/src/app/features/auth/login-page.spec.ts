import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<LoginPage>>;
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(LoginPage);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpTesting.verify());

  it('logs in and navigates to the dashboard after success', () => {
    fixture.componentInstance.form.setValue({
      email: 'person@example.com',
      password: 'correct horse battery staple'
    });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const request = httpTesting.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({
      email: 'person@example.com',
      password: 'correct horse battery staple'
    });
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    request.flush({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'person@example.com',
        createdAt: '2026-10-24T00:00:00.000Z'
      },
      token: 'login-token'
    });
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(false);
  });

  it('shows the backend invalid-credentials message in an alert', () => {
    fixture.componentInstance.form.setValue({
      email: 'person@example.com',
      password: 'correct horse battery staple'
    });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    httpTesting.expectOne('/api/auth/login').flush(
      { error: 'Invalid email or password.' },
      { status: 401, statusText: 'Unauthorized' }
    );
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Invalid email or password.');
  });
});
