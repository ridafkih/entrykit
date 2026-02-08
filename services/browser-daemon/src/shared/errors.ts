export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with id ${id} not found` : `${resource} not found`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable", code = "SERVICE_UNAVAILABLE") {
    super(message, code, 503);
    this.name = "ServiceUnavailableError";
  }
}

export class DaemonError extends AppError {
  constructor(
    message: string,
    public readonly sessionId?: string,
  ) {
    super(message, "DAEMON_ERROR", 500);
    this.name = "DaemonError";
  }
}

export function orThrow<T>(value: T | null | undefined, resource: string, id?: string): T {
  if (value == null) throw new NotFoundError(resource, id);
  return value;
}

export function getErrorMessage(error: unknown, fallback = "An error occurred"): string {
  return error instanceof Error ? error.message : fallback;
}
