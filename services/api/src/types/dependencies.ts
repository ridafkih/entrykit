import type { createOpencodeClient } from "@opencode-ai/sdk/v2/client";
import type { AppSchema } from "@lab/multiplayer-sdk";
import type { Publisher as PublisherBase } from "@lab/multiplayer-server";
import type { widelogger } from "@lab/widelogger";

export type { Sandbox } from "@lab/sandbox-sdk";
export type OpencodeClient = ReturnType<typeof createOpencodeClient>;
export type Publisher = PublisherBase<AppSchema>;
export type Widelog = ReturnType<typeof widelogger>["widelog"];
