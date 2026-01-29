import type { Server } from "bun";
import type {
  Schema,
  ChannelConfig,
  ParamsFromPath,
  SnapshotOf,
  DeltaOf,
  EventOf,
  ServerMessage,
} from "@lab/multiplayer-shared";
import { resolvePath, hasParams } from "@lab/multiplayer-shared";

type ChannelName<S extends Schema> = keyof S["channels"] & string;

type ChannelParams<S extends Schema, K extends ChannelName<S>> = ParamsFromPath<
  S["channels"][K]["path"]
>;

type HasDelta<C extends ChannelConfig> = C["delta"] extends undefined ? false : true;
type HasEvent<C extends ChannelConfig> = C["event"] extends undefined ? false : true;

export interface Publisher<S extends Schema> {
  publishSnapshot<K extends ChannelName<S>>(
    channelName: K,
    ...args: keyof ChannelParams<S, K> extends never
      ? [data: SnapshotOf<S["channels"][K]>]
      : [params: ChannelParams<S, K>, data: SnapshotOf<S["channels"][K]>]
  ): void;

  publishDelta<K extends ChannelName<S>>(
    channelName: K,
    ...args: HasDelta<S["channels"][K]> extends false
      ? never
      : keyof ChannelParams<S, K> extends never
        ? [data: DeltaOf<S["channels"][K]>]
        : [params: ChannelParams<S, K>, data: DeltaOf<S["channels"][K]>]
  ): void;

  publishEvent<K extends ChannelName<S>>(
    channelName: K,
    ...args: HasEvent<S["channels"][K]> extends false
      ? never
      : keyof ChannelParams<S, K> extends never
        ? [data: EventOf<S["channels"][K]>]
        : [params: ChannelParams<S, K>, data: EventOf<S["channels"][K]>]
  ): void;
}

export function createPublisher<S extends Schema>(
  schema: S,
  getServer: () => Server<unknown>,
): Publisher<S> {
  function getResolvedPath<K extends ChannelName<S>>(
    channelName: K,
    params?: ChannelParams<S, K>,
  ): string {
    const channel = schema.channels[channelName];
    if (hasParams(channel.path)) {
      return resolvePath(channel.path, params as ParamsFromPath<string>);
    }
    return channel.path;
  }

  function publish(channel: string, message: ServerMessage): void {
    const server = getServer();
    server.publish(channel, JSON.stringify(message));
  }

  return {
    publishSnapshot(channelName, ...args) {
      const channel = schema.channels[channelName];
      let params: ChannelParams<S, typeof channelName> | undefined;
      let data: SnapshotOf<S["channels"][typeof channelName]>;

      if (hasParams(channel.path)) {
        params = args[0] as ChannelParams<S, typeof channelName>;
        data = args[1] as SnapshotOf<S["channels"][typeof channelName]>;
      } else {
        data = args[0] as SnapshotOf<S["channels"][typeof channelName]>;
      }

      const resolvedPath = getResolvedPath(channelName, params);
      publish(resolvedPath, { type: "snapshot", channel: resolvedPath, data });
    },

    publishDelta(channelName, ...args) {
      const channel = schema.channels[channelName];
      let params: ChannelParams<S, typeof channelName> | undefined;
      let data: DeltaOf<S["channels"][typeof channelName]>;

      if (hasParams(channel.path)) {
        params = args[0] as ChannelParams<S, typeof channelName>;
        data = args[1] as DeltaOf<S["channels"][typeof channelName]>;
      } else {
        data = args[0] as DeltaOf<S["channels"][typeof channelName]>;
      }

      const resolvedPath = getResolvedPath(channelName, params);
      publish(resolvedPath, { type: "delta", channel: resolvedPath, data });
    },

    publishEvent(channelName, ...args) {
      const channel = schema.channels[channelName];
      let params: ChannelParams<S, typeof channelName> | undefined;
      let data: EventOf<S["channels"][typeof channelName]>;

      if (hasParams(channel.path)) {
        params = args[0] as ChannelParams<S, typeof channelName>;
        data = args[1] as EventOf<S["channels"][typeof channelName]>;
      } else {
        data = args[0] as EventOf<S["channels"][typeof channelName]>;
      }

      const resolvedPath = getResolvedPath(channelName, params);
      publish(resolvedPath, { type: "event", channel: resolvedPath, data });
    },
  } as Publisher<S>;
}
