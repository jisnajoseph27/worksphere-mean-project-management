import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const backendEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const backendEmailValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const value: unknown = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return { email: true };
  }

  const email = value.trim().toLowerCase();
  return email.length <= 254 && backendEmailPattern.test(email) ? null : { email: true };
};

export const backendPasswordLengthValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const value: unknown = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return typeof value === 'string' && Array.from(value).length >= 12
    ? null
    : { minlength: { requiredLength: 12 } };
};

export const backendPasswordByteLimitValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const value: unknown = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return typeof value === 'string' && new TextEncoder().encode(value).length <= 72
    ? null
    : { maxlength: { requiredLength: 72 } };
};
