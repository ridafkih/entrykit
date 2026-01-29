import { useEffect, useCallback, useContext, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import type {
  ChannelConfig,
  ParamsFromPath,
  SnapshotOf,
  DeltaOf,
  ClientEventOf,
} from "@lab/multiplayer-shared";
import { resolvePath, hasParams } from "@lab/multiplayer-shared";
import type { ConnectionManager, ConnectionState } from "./connection";
import { connectionStateAtom, channelStateFamily, type ChannelState } from "./atoms";
import { MultiplayerContext } from "./provider";

type AnySchema = { channels: Record<string, ChannelConfig> };

type ChannelName<S extends AnySchema> = keyof S["channels"] & string;

type PathOf<C> = C extends { path: infer P } ? P : string;

type ChannelParams<S extends AnySchema, K extends ChannelName<S>> = ParamsFromPath<
  PathOf<S["channels"][K]> & string
>;

type HasRequiredParams<S extends AnySchema, K extends ChannelName<S>> = keyof ChannelParams<
  S,
  K
> extends never
  ? false
  : true;

type UseMultiplayerStateResult<T> = ChannelState<T>;

type UseMultiplayerSendFn<S extends AnySchema, K extends ChannelName<S>> =
  ClientEventOf<S["channels"][K]> extends never
    ? never
    : (event: ClientEventOf<S["channels"][K]>) => void;

export function createHooks<S extends AnySchema>(schema: S) {
  type Channels = S["channels"];

  function useConnection(): ConnectionManager {
    const ctx = useContext(MultiplayerContext);
    if (!ctx) {
      throw new Error("useConnection must be used within MultiplayerProvider");
    }
    return ctx.connection;
  }

  function useConnectionState(): ConnectionState {
    return useAtomValue(connectionStateAtom);
  }

  function useMultiplayerState<K extends ChannelName<S>>(
    channelName: K,
    ...args: HasRequiredParams<S, K> extends true ? [params: ChannelParams<S, K>] : []
  ): UseMultiplayerStateResult<SnapshotOf<Channels[K]>> {
    const connection = useConnection();
    const channel = schema.channels[channelName] as ChannelConfig;
    const params = (args[0] ?? {}) as ChannelParams<S, K>;

    const resolvedPath = useMemo(() => {
      if (hasParams(channel.path)) {
        return resolvePath(channel.path, params as ParamsFromPath<string>);
      }
      return channel.path;
    }, [channel.path, params]);

    const stateAtom = useMemo(() => channelStateFamily(resolvedPath), [resolvedPath]);
    const [state, setState] = useAtom(stateAtom);

    useEffect(() => {
      setState({ status: "connecting" });

      const unsubscribe = connection.subscribe(resolvedPath, (message) => {
        if (message.type === "snapshot") {
          setState({ status: "connected", data: message.data });
        } else if (message.type === "delta") {
          setState((prev) => {
            if (prev.status !== "connected") return prev;
            const delta = message.data as DeltaOf<Channels[K]>;
            return {
              status: "connected",
              data: applyDelta(prev.data, delta, channel),
            };
          });
        } else if (message.type === "event") {
          setState((prev) => {
            if (prev.status !== "connected") return prev;
            return prev;
          });
        } else if (message.type === "error") {
          setState({ status: "error", error: message.error });
        }
      });

      return () => {
        unsubscribe();
      };
    }, [connection, resolvedPath, setState, channel]);

    return state as UseMultiplayerStateResult<SnapshotOf<Channels[K]>>;
  }

  function useMultiplayerSend<K extends ChannelName<S>>(
    channelName: K,
    ...args: HasRequiredParams<S, K> extends true ? [params: ChannelParams<S, K>] : []
  ): UseMultiplayerSendFn<S, K> {
    const connection = useConnection();
    const channel = schema.channels[channelName] as ChannelConfig;
    const params = (args[0] ?? {}) as ChannelParams<S, K>;

    const resolvedPath = useMemo(() => {
      if (hasParams(channel.path)) {
        return resolvePath(channel.path, params as ParamsFromPath<string>);
      }
      return channel.path;
    }, [channel.path, params]);

    const send = useCallback(
      (event: ClientEventOf<Channels[K]>) => {
        connection.sendEvent(resolvedPath, event);
      },
      [connection, resolvedPath],
    );

    return send as UseMultiplayerSendFn<S, K>;
  }

  function useMultiplayerEvent<K extends ChannelName<S>>(
    channelName: K,
    callback: (event: import("@lab/multiplayer-shared").EventOf<Channels[K]>) => void,
    ...args: HasRequiredParams<S, K> extends true ? [params: ChannelParams<S, K>] : []
  ): void {
    const connection = useConnection();
    const channel = schema.channels[channelName] as ChannelConfig;
    const params = (args[0] ?? {}) as ChannelParams<S, K>;

    const resolvedPath = useMemo(() => {
      if (hasParams(channel.path)) {
        return resolvePath(channel.path, params as ParamsFromPath<string>);
      }
      return channel.path;
    }, [channel.path, params]);

    useEffect(() => {
      const unsubscribe = connection.subscribe(resolvedPath, (message) => {
        if (message.type === "event") {
          callback(message.data as import("@lab/multiplayer-shared").EventOf<Channels[K]>);
        }
      });

      return () => {
        unsubscribe();
      };
    }, [connection, resolvedPath, callback]);
  }

  return {
    useConnection,
    useConnectionState,
    useMultiplayerState,
    useMultiplayerSend,
    useMultiplayerEvent,
  };
}

function applyDelta<T>(current: T, delta: unknown, channel: ChannelConfig): T {
  if (!channel.delta) return current;

  if (Array.isArray(current) && delta && typeof delta === "object") {
    const d = delta as { type?: string; [key: string]: unknown };

    if (d.type === "append" && "message" in d) {
      return [...current, d.message] as T;
    }

    if (d.type === "add") {
      const item = d.project ?? d.file ?? d.message;
      if (item) return [...current, item] as T;
    }

    if (d.type === "remove") {
      const item = d.project ?? d.file ?? d.message;
      if (item && typeof item === "object" && "id" in item) {
        return current.filter(
          (c: unknown) => typeof c === "object" && c !== null && "id" in c && c.id !== item.id,
        ) as T;
      }
    }

    if (d.type === "update") {
      const item = d.project ?? d.file ?? d.message;
      if (item && typeof item === "object" && "id" in item) {
        return current.map((c: unknown) =>
          typeof c === "object" && c !== null && "id" in c && c.id === item.id
            ? { ...c, ...item }
            : c,
        ) as T;
      }
    }
  }

  if (
    typeof current === "object" &&
    current !== null &&
    typeof delta === "object" &&
    delta !== null
  ) {
    return { ...current, ...delta } as T;
  }

  return current;
}
