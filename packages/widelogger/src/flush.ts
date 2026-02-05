import type { Context, FieldValue } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const setNested = (target: Record<string, unknown>, key: string, value: unknown) => {
  const parts = key.split(".");
  const lastPart = parts.pop();
  if (lastPart === undefined) return;

  let current = target;

  for (const part of parts) {
    const existing = current[part];
    if (Object.hasOwn(current, part) && isRecord(existing)) {
      current = existing;
    } else {
      const next: Record<string, unknown> = Object.create(null);
      current[part] = next;
      current = next;
    }
  }

  current[lastPart] = value;
};

export const flush = (context: Context | undefined): Record<string, unknown> => {
  if (!context) return {};

  const fields: Record<string, FieldValue> = {};
  const counters: Record<string, number> = {};
  const arrays: Record<string, FieldValue[]> = {};
  const maxValues: Record<string, number> = {};
  const minValues: Record<string, number> = {};
  const timers: Record<string, { start: number; accumulated: number }> = {};

  for (const entry of context.operations) {
    switch (entry.operation) {
      case "set":
        fields[entry.key] = entry.value;
        break;
      case "count":
        counters[entry.key] = (counters[entry.key] ?? 0) + entry.amount;
        break;
      case "append":
        (arrays[entry.key] ??= []).push(entry.value);
        break;
      case "max":
        if (maxValues[entry.key] === undefined || entry.value > maxValues[entry.key]!) {
          maxValues[entry.key] = entry.value;
        }
        break;
      case "min":
        if (minValues[entry.key] === undefined || entry.value < minValues[entry.key]!) {
          minValues[entry.key] = entry.value;
        }
        break;
      case "time.start":
        timers[entry.key] ??= { start: 0, accumulated: 0 };
        timers[entry.key]!.start = entry.time;
        break;
      case "time.stop": {
        const timer = timers[entry.key];
        if (timer && timer.start > 0) {
          timer.accumulated += entry.time - timer.start;
          timer.start = 0;
        }
        break;
      }
    }
  }

  const event: Record<string, unknown> = Object.create(null);

  for (const [key, value] of Object.entries(fields)) {
    setNested(event, key, value);
  }
  for (const [key, value] of Object.entries(counters)) {
    setNested(event, key, value);
  }
  for (const [key, value] of Object.entries(arrays)) {
    setNested(event, key, value);
  }
  for (const [key, value] of Object.entries(maxValues)) {
    setNested(event, key, value);
  }
  for (const [key, value] of Object.entries(minValues)) {
    setNested(event, key, value);
  }
  for (const [key, timer] of Object.entries(timers)) {
    setNested(event, key, Math.round(timer.accumulated * 100) / 100);
  }

  context.operations.length = 0;
  return event;
};
