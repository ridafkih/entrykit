import type { schema } from "@lab/multiplayer-channels";

export interface Auth {
  userId: string;
}

export type Schema = typeof schema;
