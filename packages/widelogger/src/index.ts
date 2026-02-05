import { AsyncLocalStorage } from "node:async_hooks";
import { flush as flushContext } from "./flush";
import type { MaybePromise } from "bun";
import type { Context, DottedKey, FieldValue } from "./types";

export type Transport = (event: Record<string, unknown>) => void;

export interface WideloggerOptions {
  transport: Transport;
}

export const widelogger = (options: WideloggerOptions) => {
  const storage = new AsyncLocalStorage<Context>();
  const { transport } = options;

  const getContext = (): Context | undefined => storage.getStore();

  const widelog = {
    set: <K extends string>(key: DottedKey<K>, value: FieldValue) => {
      getContext()?.operations.push({ operation: "set", key, value });
    },
    count: <K extends string>(key: DottedKey<K>, amount = 1) => {
      getContext()?.operations.push({ operation: "count", key, amount });
    },
    append: <K extends string>(key: DottedKey<K>, value: FieldValue) => {
      getContext()?.operations.push({ operation: "append", key, value });
    },
    max: <K extends string>(key: DottedKey<K>, value: number) => {
      getContext()?.operations.push({ operation: "max", key, value });
    },
    min: <K extends string>(key: DottedKey<K>, value: number) => {
      getContext()?.operations.push({ operation: "min", key, value });
    },
    time: {
      start: <K extends string>(key: DottedKey<K>) => {
        getContext()?.operations.push({ operation: "time.start", key, time: performance.now() });
      },
      stop: <K extends string>(key: DottedKey<K>) => {
        getContext()?.operations.push({ operation: "time.stop", key, time: performance.now() });
      },
    },
    flush: () => {
      const event = flushContext(getContext());
      transport(event);
    },
    context: <T>(callback: () => MaybePromise<T>): MaybePromise<T> => {
      return storage.run({ operations: [] }, callback);
    },
  };

  return { widelog };
};
