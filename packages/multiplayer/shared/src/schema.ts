import type { z } from "zod";

export function defineChannel<
  TPath extends string,
  TSnapshot extends z.ZodType,
  TDelta extends z.ZodType = z.ZodNever,
  TEvent extends z.ZodType = z.ZodNever,
  TClientEvent extends z.ZodType = z.ZodNever,
>(config: {
  path: TPath;
  snapshot: TSnapshot;
  delta?: TDelta;
  event?: TEvent;
  clientEvent?: TClientEvent;
}): {
  path: TPath;
  snapshot: TSnapshot;
  delta: TDelta;
  event: TEvent;
  clientEvent: TClientEvent;
} {
  return config as {
    path: TPath;
    snapshot: TSnapshot;
    delta: TDelta;
    event: TEvent;
    clientEvent: TClientEvent;
  };
}

export function defineSchema<const T extends {}>(channels: T): { channels: T } {
  return { channels };
}
