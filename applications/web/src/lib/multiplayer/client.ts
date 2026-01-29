"use client";

import { createMultiplayerProvider } from "@lab/multiplayer-client";
import { schema } from "./schema";

export const {
  MultiplayerProvider,
  useMultiplayer,
  useConnectionState,
  useMultiplayerState,
  useMultiplayerSend,
  useMultiplayerEvent,
} = createMultiplayerProvider(schema);
