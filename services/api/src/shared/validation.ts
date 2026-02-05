import type { ZodSchema, ZodError } from "zod";
import { ValidationError } from "./errors";

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
 * Parses and validates URL query parameters against a Zod schema.
 * Converts searchParams into a plain object before validation.
 */
export function parseQueryParams<T>(url: URL, schema: ZodSchema<T>): T {
  const params: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    params[key] = value;
  }
  const result = schema.safeParse(params);
  if (!result.success) throw new ValidationError(formatZodError(result.error));
  return result.data;
}

/**
 * Validates pre-extracted path parameters against a Zod schema.
 */
export function parsePathParams<T>(params: Record<string, string>, schema: ZodSchema<T>): T {
  const result = schema.safeParse(params);
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
