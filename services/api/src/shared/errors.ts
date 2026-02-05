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

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR", 500);
    this.name = "ConfigurationError";
  }
}

export class ContainerError extends AppError {
  constructor(
    message: string,
    public readonly containerId?: string,
  ) {
    super(message, "CONTAINER_ERROR", 500);
    this.name = "ContainerError";
  }
}

export class NetworkError extends AppError {
  constructor(
    message: string,
    public readonly networkName?: string,
  ) {
    super(message, "NETWORK_ERROR", 500);
    this.name = "NetworkError";
  }
}

export function orThrow<T>(value: T | null | undefined, resource: string, id?: string): T {
  if (value == null) throw new NotFoundError(resource, id);
  return value;
}

/**
 * Safely extracts error message from an unknown value.
 */
export function getErrorMessage(error: unknown, fallback = "An error occurred"): string {
  return error instanceof Error ? error.message : fallback;
}
