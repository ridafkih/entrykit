export interface StoreOptions<T> {
  defaultValue?: T;
  shouldSet?: (value: T) => boolean;
}

export interface Store<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(key: string): void;
}

export function createStore<T>(options: StoreOptions<T> = {}): Store<T> {
  const map = new Map<string, T>();
  const { defaultValue, shouldSet = () => true } = options;

  return {
    get: (key) => map.get(key) ?? defaultValue,
    set: (key, value) => {
      if (shouldSet(value)) map.set(key, value);
    },
    clear: (key) => {
      map.delete(key);
    },
  };
}
