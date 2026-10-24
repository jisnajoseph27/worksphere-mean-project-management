import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApiError, AuthService } from '../../core/auth.service';
import {
  backendEmailValidator,
  backendPasswordByteLimitValidator,
  backendPasswordLengthValidator
} from '../../core/auth.validators';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmation = control.get('confirmPassword')?.value;
  return password === confirmation ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="register-layout">
      <div class="form-card">
        <span class="section-tag">GET STARTED</span>
        <h1>Create your account</h1>
        <p class="helper">Set up your workspace and bring your next project to life.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="register-email">Email address</label>
            <input id="register-email" type="email" formControlName="email" autocomplete="email"
              [attr.aria-invalid]="showEmailError" aria-describedby="register-email-error">
            @if (showEmailError) {
              <span class="field-error" id="register-email-error" role="alert">Enter a valid email address.</span>
            }
          </div>
          <div class="field">
            <label for="register-password">Password</label>
            <input id="register-password" type="password" formControlName="password"
              autocomplete="new-password" [attr.aria-invalid]="showPasswordError"
              aria-describedby="register-password-help register-password-error">
            <span class="field-hint" id="register-password-help">
              At least 12 characters and no more than 72 UTF-8 bytes.
            </span>
            @if (showPasswordError) {
              <span class="field-error" id="register-password-error">{{ passwordError }}</span>
            }
          </div>
          <div class="field">
            <label for="register-confirm-password">Confirm password</label>
            <input id="register-confirm-password" type="password" formControlName="confirmPassword"
              autocomplete="new-password" [attr.aria-invalid]="showConfirmError"
              aria-describedby="register-confirm-error">
            @if (showConfirmError) {
              <span class="field-error" id="register-confirm-error">
                {{ form.controls.confirmPassword.hasError('required') ? 'Confirm your password.' : 'Passwords do not match.' }}
              </span>
            }
          </div>
          @if (serverError()) {
            <p class="server-error" role="alert">{{ serverError() }}</p>
          }
          <button class="submit-button" type="submit" [disabled]="loading()">
            {{ loading() ? 'Creating account…' : 'Create account' }}
          </button>
        </form>
        <p class="switch-link">Already have an account? <a routerLink="/login">Sign in</a></p>
      </div>
      <aside class="side-note">
        <span class="note-mark" aria-hidden="true">W</span>
        <h2>Make room for meaningful progress.</h2>
        <p>WorkSphere keeps the moving pieces visible, so your team can focus on what matters next.</p>
      </aside>
    </section>
  `,
  styles: `
    .register-layout { display: grid; grid-template-columns: minmax(320px, .9fr) minmax(0, 1.1fr); gap: clamp(32px, 7vw, 96px); align-items: center; min-height: 540px; }
    .form-card { padding: clamp(25px, 4vw, 40px); border: 1px solid var(--line); border-radius: 18px; background: var(--surface); box-shadow: 0 18px 55px rgb(34 48 92 / 5%); }
    .section-tag { color: var(--brand); font-size: 10px; font-weight: 750; letter-spacing: .14em; }
    h1 { margin: 14px 0 6px; color: var(--ink); font-size: clamp(28px, 4vw, 38px); letter-spacing: -.05em; }
    .helper, .side-note p { color: var(--muted); font-size: 14px; line-height: 1.75; }
    .helper { margin: 0 0 22px; }
    form { display: grid; gap: 15px; }
    .field { display: grid; gap: 6px; }
    label { color: #48516a; font-size: 12px; font-weight: 650; }
    input { width: 100%; min-height: 41px; padding: 9px 11px; border: 1px solid #dfe3ec; border-radius: 8px; outline: none; background: #fff; color: var(--ink); font-size: 13px; }
    input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgb(68 95 229 / 12%); }
    input[aria-invalid="true"] { border-color: #cf4e5b; }
    .field-hint { color: var(--muted); font-size: 10px; line-height: 1.5; }
    .field-error, .server-error { color: #b83d4b; font-size: 11px; line-height: 1.5; }
    .server-error { margin: 0; padding: 10px 12px; border-radius: 8px; background: #fff1f2; }
    .submit-button { min-height: 44px; margin-top: 2px; border: 0; border-radius: 8px; background: var(--brand); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
    .submit-button:hover:not(:disabled) { background: var(--brand-dark); }
    .submit-button:disabled { cursor: wait; opacity: .65; }
    .switch-link { margin: 20px 0 0; color: var(--muted); font-size: 12px; text-align: center; }
    .switch-link a { color: var(--brand); font-weight: 700; text-decoration: none; }
    .switch-link a:hover { text-decoration: underline; }
    .side-note { max-width: 440px; padding: 20px; }
    .note-mark { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 15px; background: var(--brand-soft); color: var(--brand); font-size: 20px; font-weight: 800; }
    h2 { margin: 24px 0 10px; font-size: clamp(30px, 4vw, 46px); line-height: 1.12; letter-spacing: -.05em; }
    @media (max-width: 760px) { .register-layout { grid-template-columns: 1fr; gap: 20px; min-height: auto; } .side-note { order: -1; padding: 0 4px 10px; } .side-note h2 { max-width: 520px; margin-top: 14px; font-size: 32px; } }
  `
})
export class RegisterPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly serverError = signal('');
  readonly form = this.formBuilder.nonNullable.group(
    {
      email: ['', [Validators.required, backendEmailValidator]],
      password: [
        '',
        [
          Validators.required,
          backendPasswordLengthValidator,
          backendPasswordByteLimitValidator
        ]
      ],
      confirmPassword: ['', Validators.required]
    },
    { validators: passwordsMatch }
  );

  get showEmailError(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.touched || control.dirty);
  }

  get showPasswordError(): boolean {
    const control = this.form.controls.password;
    return control.invalid && (control.touched || control.dirty);
  }

  get showConfirmError(): boolean {
    const control = this.form.controls.confirmPassword;
    return (
      (control.invalid || this.form.hasError('passwordMismatch')) &&
      (control.touched || control.dirty)
    );
  }

  get passwordError(): string {
    const errors = this.form.controls.password.errors;
    if (errors?.['minlength']) return 'Password must be at least 12 characters.';
    if (errors?.['maxlength']) return 'Password must not exceed 72 UTF-8 bytes.';
    return 'Enter a password.';
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.serverError.set('');
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    const { email, password } = this.form.getRawValue();
    this.authService
      .register({ email: email.trim(), password })
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
              : 'Unable to create your account right now. Please try again.'
          );
        }
      });
  }
}
