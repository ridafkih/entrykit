export function getString(input: unknown, key: string): string | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

export function getBoolean(input: unknown, key: string): boolean | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : undefined;
}

export function getNumber(input: unknown, key: string): number | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

export function getArray<T>(input: unknown, key: string): T[] | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const value = (input as Record<string, unknown>)[key];
  return Array.isArray(value) ? value : undefined;
}
