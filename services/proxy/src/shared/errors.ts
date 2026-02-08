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

export class BadGatewayError extends AppError {
  constructor(message = "Bad Gateway") {
    super(message, "BAD_GATEWAY", 502);
    this.name = "BadGatewayError";
  }
}

export function getErrorMessage(error: unknown, fallback = "An error occurred"): string {
  return error instanceof Error ? error.message : fallback;
}
