import type { Server, ServerWebSocket } from "bun";
import type {
  Schema,
  ChannelConfig,
  ClientMessage,
  ServerMessage,
  ParamsFromPath,
  SnapshotOf,
  ClientEventOf,
} from "@lab/multiplayer-shared";
import { parsePath } from "@lab/multiplayer-shared";

export interface WebSocketData<TAuth = unknown> {
  auth: TAuth;
  subscriptions: Set<string>;
}

export interface ChannelContext<TAuth, TParams> {
  auth: TAuth;
  params: TParams;
  ws: ServerWebSocket<WebSocketData<TAuth>>;
}

export type ChannelHandlers<TChannel extends ChannelConfig, TAuth> = {
  authorize?: (
    ctx: ChannelContext<TAuth, ParamsFromPath<TChannel["path"]>>,
  ) => boolean | Promise<boolean>;

  getSnapshot: (
    ctx: ChannelContext<TAuth, ParamsFromPath<TChannel["path"]>>,
  ) => SnapshotOf<TChannel> | Promise<SnapshotOf<TChannel>>;

  onEvent?: TChannel["clientEvent"] extends undefined
    ? never
    : (
        ctx: ChannelContext<TAuth, ParamsFromPath<TChannel["path"]>>,
        event: ClientEventOf<TChannel>,
      ) => void | Promise<void>;
};

export type SchemaHandlers<S extends Schema, TAuth> = {
  [K in keyof S["channels"]]?: ChannelHandlers<S["channels"][K], TAuth>;
};

export interface HandlerOptions<TAuth> {
  authenticate?: (token: string | null) => TAuth | Promise<TAuth>;
}

export function createWebSocketHandler<S extends Schema, TAuth = unknown>(
  schema: S,
  handlers: SchemaHandlers<S, TAuth>,
  options: HandlerOptions<TAuth> = {},
) {
  type WS = ServerWebSocket<WebSocketData<TAuth>>;

  function findChannelMatch(
    resolvedPath: string,
  ): { name: string; config: ChannelConfig; params: Record<string, string> } | null {
    for (const [name, config] of Object.entries(schema.channels)) {
      const params = parsePath(config.path, resolvedPath);
      if (params !== null) {
        return { name, config, params };
      }
    }
    return null;
  }

  async function handleSubscribe(ws: WS, channel: string): Promise<void> {
    const match = findChannelMatch(channel);
    if (!match) {
      sendMessage(ws, { type: "error", channel, error: "Unknown channel" });
      return;
    }

    const handler = handlers[match.name as keyof typeof handlers];
    if (!handler) {
      sendMessage(ws, { type: "error", channel, error: "No handler for channel" });
      return;
    }

    const ctx: ChannelContext<TAuth, Record<string, string>> = {
      auth: ws.data.auth,
      params: match.params,
      ws,
    };

    if (handler.authorize) {
      const authorized = await handler.authorize(ctx as never);
      if (!authorized) {
        sendMessage(ws, { type: "error", channel, error: "Unauthorized" });
        return;
      }
    }

    ws.data.subscriptions.add(channel);
    ws.subscribe(channel);

    try {
      const snapshot = await handler.getSnapshot(ctx as never);
      sendMessage(ws, { type: "snapshot", channel, data: snapshot });
    } catch (err) {
      sendMessage(ws, {
        type: "error",
        channel,
        error: err instanceof Error ? err.message : "Failed to get snapshot",
      });
    }
  }

  function handleUnsubscribe(ws: WS, channel: string): void {
    ws.data.subscriptions.delete(channel);
    ws.unsubscribe(channel);
  }

  async function handleEvent(ws: WS, channel: string, data: unknown): Promise<void> {
    const match = findChannelMatch(channel);
    if (!match) return;

    const handler = handlers[match.name as keyof typeof handlers];
    if (!handler?.onEvent) return;

    if (!ws.data.subscriptions.has(channel)) {
      sendMessage(ws, { type: "error", channel, error: "Not subscribed" });
      return;
    }

    const ctx: ChannelContext<TAuth, Record<string, string>> = {
      auth: ws.data.auth,
      params: match.params,
      ws,
    };

    try {
      await (handler.onEvent as (ctx: unknown, event: unknown) => Promise<void>)(ctx, data);
    } catch (err) {
      sendMessage(ws, {
        type: "error",
        channel,
        error: err instanceof Error ? err.message : "Event handling failed",
      });
    }
  }

  function sendMessage(ws: WS, message: ServerMessage): void {
    ws.send(JSON.stringify(message));
  }

  const websocketHandler = {
    async open(ws: WS) {
      // Connection opened
    },

    async message(ws: WS, message: string | Buffer) {
      try {
        const data = JSON.parse(
          typeof message === "string" ? message : message.toString(),
        ) as ClientMessage;

        switch (data.type) {
          case "subscribe":
            await handleSubscribe(ws, data.channel);
            break;
          case "unsubscribe":
            handleUnsubscribe(ws, data.channel);
            break;
          case "event":
            await handleEvent(ws, data.channel, data.data);
            break;
          case "ping":
            sendMessage(ws, { type: "pong" });
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    },

    close(ws: WS) {
      for (const channel of ws.data.subscriptions) {
        ws.unsubscribe(channel);
      }
      ws.data.subscriptions.clear();
    },
  };

  async function upgrade(
    req: Request,
    server: Server<WebSocketData<TAuth>>,
  ): Promise<Response | undefined> {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    let auth: TAuth;
    if (options.authenticate) {
      try {
        auth = await options.authenticate(token);
      } catch {
        return new Response("Unauthorized", { status: 401 });
      }
    } else {
      auth = null as TAuth;
    }

    const success = server.upgrade(req, {
      data: {
        auth,
        subscriptions: new Set<string>(),
      } satisfies WebSocketData<TAuth>,
    });

    if (success) {
      return undefined;
    }

    return new Response("Upgrade failed", { status: 500 });
  }

  return { websocketHandler, upgrade };
}
