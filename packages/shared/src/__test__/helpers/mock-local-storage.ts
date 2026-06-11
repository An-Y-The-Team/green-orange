import { vi } from "vitest";

export const createMockLocalStorage = () => {
  let store: Record<string, string> = {};

  const getItem = vi.fn((key: string) => store[key] ?? null);
  const setItem = vi.fn((key: string, value: string) => {
    store[key] = String(value);
  });
  const removeItem = vi.fn((key: string) => {
    delete store[key];
  });
  const clear = vi.fn(() => {
    store = {};
  });
  const key = vi.fn((index: number) => Object.keys(store)[index] ?? null);

  const mock = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "getItem") return getItem;
        if (prop === "setItem") return setItem;
        if (prop === "removeItem") return removeItem;
        if (prop === "clear") return clear;
        if (prop === "key") return key;
        if (prop === "length") return Object.keys(store).length;
        if (prop === "_getStore") return () => store;
        if (prop === "_setStore")
          return (newStore: Record<string, string>) => {
            store = newStore;
          };
        return store[prop] ?? undefined;
      },
      ownKeys() {
        return Object.keys(store);
      },
      getOwnPropertyDescriptor(_target, prop: string) {
        if (prop in store) {
          return {
            enumerable: true,
            configurable: true,
            value: store[prop],
          };
        }
        return undefined;
      },
    }
  );

  return mock as {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    key: ReturnType<typeof vi.fn>;
    length: number;
    _getStore: () => Record<string, string>;
    _setStore: (newStore: Record<string, string>) => void;
  };
};
