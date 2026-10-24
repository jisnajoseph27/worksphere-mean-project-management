import { ObjectId } from 'mongodb';
import { ProjectInput, ProjectPagination, projectStatuses } from '../models/project';

export class ProjectValidationError extends Error {}

const projectFields = new Set(['name', 'description', 'status', 'startDate', 'dueDate']);
const isoDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDate(value: unknown, fieldName: string): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new ProjectValidationError(`${fieldName} must be an ISO date-time string.`);
  }

  const match = isoDateTimePattern.exec(value);
  if (!match) {
    throw new ProjectValidationError(`${fieldName} must be an ISO date-time string with a timezone.`);
  }

  const [, year, month, day, hour, minute, second, timezone] = match;
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const daysInMonth = [
    31,
    yearNumber % 4 === 0 && (yearNumber % 100 !== 0 || yearNumber % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ][monthNumber - 1];
  const date = new Date(value);
  const dateIsValid =
    Number.isFinite(date.getTime()) &&
    daysInMonth !== undefined &&
    dayNumber >= 1 &&
    dayNumber <= daysInMonth &&
    Number(hour) <= 23 &&
    Number(minute) <= 59 &&
    Number(second) <= 59;

  if (!dateIsValid) {
    throw new ProjectValidationError(`${fieldName} is not a valid date.`);
  }

  if (timezone !== 'Z') {
    const offset = /[+-](\d{2}):(\d{2})$/.exec(timezone);
    if (offset && (Number(offset[1]) > 23 || Number(offset[2]) > 59)) {
      throw new ProjectValidationError(`${fieldName} has an invalid timezone offset.`);
    }
  }

  return date;
}

export function parseProjectInput(value: unknown): ProjectInput {
  if (!isRecord(value)) {
    throw new ProjectValidationError('Request body must be a JSON object.');
  }

  const unexpectedField = Object.keys(value).find((field) => !projectFields.has(field));
  if (unexpectedField) {
    throw new ProjectValidationError(`Field "${unexpectedField}" is not allowed.`);
  }

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (name.length < 1 || name.length > 100) {
    throw new ProjectValidationError('name must be between 1 and 100 characters.');
  }

  if (typeof value.description !== 'string' || value.description.length > 2000) {
    throw new ProjectValidationError('description must be a string of at most 2000 characters.');
  }

  if (
    typeof value.status !== 'string' ||
    !projectStatuses.includes(value.status as (typeof projectStatuses)[number])
  ) {
    throw new ProjectValidationError(`status must be one of: ${projectStatuses.join(', ')}.`);
  }

  const startDate = parseDate(value.startDate, 'startDate');
  const dueDate = parseDate(value.dueDate, 'dueDate');
  if (startDate && dueDate && dueDate < startDate) {
    throw new ProjectValidationError('dueDate must be on or after startDate.');
  }

  return {
    name,
    description: value.description,
    status: value.status as ProjectInput['status'],
    ...(startDate ? { startDate } : {}),
    ...(dueDate ? { dueDate } : {})
  };
}

export function parseProjectId(value: unknown): ObjectId {
  if (typeof value !== 'string' || !/^[\da-f]{24}$/i.test(value)) {
    throw new ProjectValidationError('projectId must be a valid MongoDB ObjectId.');
  }

  return new ObjectId(value);
}

export function parseProjectPagination(query: {
  limit?: unknown;
  skip?: unknown;
}): ProjectPagination {
  const limit = parseQueryInteger(query.limit, 20, 'limit');
  const skip = parseQueryInteger(query.skip, 0, 'skip');

  if (limit < 1 || limit > 100) {
    throw new ProjectValidationError('limit must be between 1 and 100.');
  }

  return { limit, skip };
}

function parseQueryInteger(value: unknown, defaultValue: number, fieldName: string): number {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new ProjectValidationError(`${fieldName} must be a non-negative integer.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new ProjectValidationError(`${fieldName} must be a safe integer.`);
  }

  return parsed;
}
