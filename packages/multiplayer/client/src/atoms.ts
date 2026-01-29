import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { ConnectionState } from "./connection";

export type ChannelState<T> =
  | { status: "connecting" }
  | { status: "connected"; data: T }
  | { status: "error"; error: string }
  | { status: "disconnected" };

export const connectionStateAtom = atom<ConnectionState>({
  status: "disconnected",
});

export const channelStateFamily = atomFamily(
  (_channel: string) => atom<ChannelState<unknown>>({ status: "connecting" }),
  (a, b) => a === b,
);

export const channelSubscriptionFamily = atomFamily(
  (_channel: string) => atom(0),
  (a, b) => a === b,
);
