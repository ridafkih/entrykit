"use client";

import type { ReactNode } from "react";
import { MultiplayerProvider } from "@/lib/multiplayer/client";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <MultiplayerProvider
      config={{
        url: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001/ws",
      }}
    >
      {children}
    </MultiplayerProvider>
  );
}
