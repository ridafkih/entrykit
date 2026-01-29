import type { z } from "zod";

export interface ChannelConfig<
  TPath extends string = string,
  TSnapshot extends z.ZodType = z.ZodType,
  TDelta extends z.ZodType | undefined = z.ZodType | undefined,
  TEvent extends z.ZodType | undefined = z.ZodType | undefined,
  TClientEvent extends z.ZodType | undefined = z.ZodType | undefined,
> {
  path: TPath;
  snapshot: TSnapshot;
  delta?: TDelta;
  event?: TEvent;
  clientEvent?: TClientEvent;
}

export interface Schema<T extends Record<string, ChannelConfig> = Record<string, ChannelConfig>> {
  channels: T;
}

export type SnapshotOf<T extends ChannelConfig> = z.infer<T["snapshot"]>;

export type DeltaOf<T extends ChannelConfig> = T["delta"] extends z.ZodType
  ? z.infer<T["delta"]>
  : never;

export type EventOf<T extends ChannelConfig> = T["event"] extends z.ZodType
  ? z.infer<T["event"]>
  : never;

export type ClientEventOf<T extends ChannelConfig> = T extends {
  clientEvent: infer CE;
}
  ? CE extends z.ZodType
    ? z.infer<CE>
    : never
  : never;

export type ClientMessage =
  | { type: "subscribe"; channel: string }
  | { type: "unsubscribe"; channel: string }
  | { type: "event"; channel: string; data: unknown }
  | { type: "ping" };

export type ServerMessage =
  | { type: "snapshot"; channel: string; data: unknown }
  | { type: "delta"; channel: string; data: unknown }
  | { type: "event"; channel: string; data: unknown }
  | { type: "error"; channel: string; error: string }
  | { type: "pong" };
