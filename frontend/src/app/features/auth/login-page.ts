import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApiError, AuthService } from '../../core/auth.service';
import {
  backendEmailValidator,
  backendPasswordByteLimitValidator,
  backendPasswordLengthValidator
} from '../../core/auth.validators';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-layout">
      <div class="intro">
        <span class="section-tag">WELCOME BACK</span>
        <h1>Good work starts with a clear plan.</h1>
        <p>Bring your projects, people, and next steps together in one calm workspace.</p>
        <div class="feature-note"><span aria-hidden="true">✦</span> A little more focus, every day.</div>
      </div>
      <div class="form-card">
        <span class="section-tag">YOUR WORKSPACE</span>
        <h2>Sign in</h2>
        <p class="helper">Your WorkSphere account is waiting.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="login-email">Email address</label>
            <input id="login-email" type="email" formControlName="email" autocomplete="email"
              [attr.aria-invalid]="showEmailError" aria-describedby="login-email-error">
            @if (showEmailError) {
              <span class="field-error" id="login-email-error" role="alert">Enter a valid email address.</span>
            }
          </div>
          <div class="field">
            <label for="login-password">Password</label>
            <input id="login-password" type="password" formControlName="password"
              autocomplete="current-password" [attr.aria-invalid]="showPasswordError"
              aria-describedby="login-password-error">
            @if (showPasswordError) {
              <span class="field-error" id="login-password-error">{{ passwordError }}</span>
            }
          </div>
          @if (serverError()) {
            <p class="server-error" role="alert">{{ serverError() }}</p>
          }
          <button class="submit-button" type="submit" [disabled]="loading()">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
        <p class="switch-link">New to WorkSphere? <a routerLink="/register">Create an account</a></p>
      </div>
    </section>
  `,
  styles: `
    .auth-layout { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(300px, .85fr); gap: clamp(32px, 7vw, 96px); align-items: center; min-height: 540px; }
    .intro { max-width: 510px; }
    .section-tag { color: var(--brand); font-size: 10px; font-weight: 750; letter-spacing: .14em; }
    h1 { margin: 18px 0; color: var(--ink); font-size: clamp(38px, 5vw, 62px); line-height: 1.06; letter-spacing: -.055em; }
    .intro > p, .helper { color: var(--muted); font-size: 15px; line-height: 1.75; }
    .feature-note { display: inline-flex; align-items: center; gap: 9px; margin-top: 30px; color: #59647d; font-size: 13px; font-weight: 600; }
    .feature-note span { color: #e4a83b; }
    .form-card { padding: clamp(24px, 4vw, 38px); border: 1px solid var(--line); border-radius: 18px; background: var(--surface); box-shadow: 0 18px 55px rgb(34 48 92 / 5%); }
    h2 { margin: 12px 0 4px; font-size: 27px; letter-spacing: -.04em; }
    .helper { margin: 0 0 22px; font-size: 13px; }
    form { display: grid; gap: 16px; }
    .field { display: grid; gap: 7px; }
    label { color: #48516a; font-size: 12px; font-weight: 650; }
    input { width: 100%; min-height: 43px; padding: 10px 12px; border: 1px solid #dfe3ec; border-radius: 8px; outline: none; background: #fff; color: var(--ink); font-size: 13px; }
    input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgb(68 95 229 / 12%); }
    input[aria-invalid="true"] { border-color: #cf4e5b; }
    .field-error, .server-error { color: #b83d4b; font-size: 11px; line-height: 1.5; }
    .server-error { margin: 0; padding: 10px 12px; border-radius: 8px; background: #fff1f2; }
    .submit-button { min-height: 44px; margin-top: 2px; border: 0; border-radius: 8px; background: var(--brand); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
    .submit-button:hover:not(:disabled) { background: var(--brand-dark); }
    .submit-button:disabled { cursor: wait; opacity: .65; }
    .switch-link { margin: 22px 0 0; color: var(--muted); font-size: 12px; text-align: center; }
    .switch-link a { color: var(--brand); font-weight: 700; text-decoration: none; }
    .switch-link a:hover { text-decoration: underline; }
    @media (max-width: 760px) { .auth-layout { grid-template-columns: 1fr; gap: 28px; min-height: auto; } .intro { max-width: 580px; } h1 { max-width: 540px; font-size: clamp(38px, 10vw, 54px); } }
  `
})
export class LoginPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly serverError = signal('');
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, backendEmailValidator]],
    password: [
      '',
      [
        Validators.required,
        backendPasswordLengthValidator,
        backendPasswordByteLimitValidator
      ]
    ]
  });

  get showEmailError(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.touched || control.dirty);
  }

  get showPasswordError(): boolean {
    const control = this.form.controls.password;
    return control.invalid && (control.touched || control.dirty);
  }

  get passwordError(): string {
    const errors = this.form.controls.password.errors;
    if (errors?.['minlength']) return 'Password must be at least 12 characters.';
    if (errors?.['maxlength']) return 'Password must not exceed 72 UTF-8 bytes.';
    return 'Enter your password.';
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.serverError.set('');
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.authService
      .login({ ...this.form.getRawValue(), email: this.form.controls.email.value.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigate(['/dashboard']);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.serverError.set(
            error instanceof AuthApiError
              ? error.message
              : 'Unable to sign in right now. Please try again.'
          );
        }
      });
  }
}
