import type { ZodSchema, ZodError } from "zod";
import { badRequestResponse } from "@lab/http-utilities";
import { ValidationError } from "./errors";

type ValidationSuccess<T> = { success: true; data: T };
type ValidationFailure = { success: false; response: Response };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validates a request body against a Zod schema.
 * Returns the parsed data on success, or a 400 Bad Request Response on failure.
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        response: badRequestResponse(formatZodError(result.error)),
      };
    }

    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      response: badRequestResponse("Invalid JSON body"),
    };
  }
}

/**
 * Type guard to check if validation failed.
 */
export function isValidationFailure<T>(result: ValidationResult<T>): result is ValidationFailure {
  return !result.success;
}

/**
 * Parses and validates a request body against a Zod schema.
 * Throws ValidationError on invalid JSON or failed validation.
 */
export async function parseRequestBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new ValidationError(formatZodError(result.error));
  return result.data;
}

/**
 * Formats a Zod error into a human-readable message.
 */
export function formatZodError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
  return `Validation failed: ${issues.join(", ")}`;
}
