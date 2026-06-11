import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockLocalStorage } from "../../__test__";
import { LocalStorageWithExpiration } from "./local-storage-with-expiration";

const NAMESPACE = "test-ns";
const DEFAULT_TTL_MS = 5000;
const FIXED_NOW = new Date("2024-01-01T00:00:00.000Z");

let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;
let storage: LocalStorageWithExpiration<unknown>;

const buildKey = (...segments: string[]) =>
  `${NAMESPACE}:${segments.join(":")}`;

const makeEnvelope = (
  data: unknown,
  expiresAt: Date,
  createdAt: Date = FIXED_NOW
) =>
  JSON.stringify({
    data,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

const futureDate = (offsetMs: number) =>
  new Date(FIXED_NOW.getTime() + offsetMs);

const pastDate = (offsetMs: number) => new Date(FIXED_NOW.getTime() - offsetMs);

describe("LocalStorageWithExpiration", () => {
  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
    vi.stubGlobal("window", { localStorage: mockLocalStorage });
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    storage = new LocalStorageWithExpiration({
      namespace: NAMESPACE,
      defaultTtlMs: DEFAULT_TTL_MS,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("get", () => {
    describe("happy path", () => {
      it("should return data for a valid non-expired entry", () => {
        mockLocalStorage._setStore({
          [buildKey("user1")]: makeEnvelope("hello", futureDate(10000)),
        });
        const result = storage.get(["user1"]);
        expect(result).toBe("hello");
      });

      it("should return object data", () => {
        const data = { id: "abc", count: 42 };
        mockLocalStorage._setStore({
          [buildKey("entry")]: makeEnvelope(data, futureDate(10000)),
        });
        const result = storage.get(["entry"]);
        expect(result).toEqual(data);
      });

      it("should return array data", () => {
        const data = [1, 2, 3];
        mockLocalStorage._setStore({
          [buildKey("list")]: makeEnvelope(data, futureDate(10000)),
        });
        const result = storage.get(["list"]);
        expect(result).toEqual(data);
      });

      it("should return null data stored as null", () => {
        mockLocalStorage._setStore({
          [buildKey("nullval")]: makeEnvelope(null, futureDate(10000)),
        });
        const result = storage.get(["nullval"]);
        expect(result).toBeNull();
      });

      it("should build key from multiple segments", () => {
        mockLocalStorage._setStore({
          [buildKey("user1", "session1", "abc")]: makeEnvelope(
            "data",
            futureDate(10000)
          ),
        });
        const result = storage.get(["user1", "session1", "abc"]);
        expect(result).toBe("data");
      });

      it("should return data for entry expiring exactly 1ms in the future", () => {
        mockLocalStorage._setStore({
          [buildKey("near-expiry")]: makeEnvelope("data", futureDate(1)),
        });
        const result = storage.get(["near-expiry"]);
        expect(result).toBe("data");
      });
    });

    describe("error cases", () => {
      describe("SSR environment", () => {
        it("should return null when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          const result = storage.get(["key1"]);
          expect(result).toBeNull();
        });

        it("should not throw when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          expect(() => storage.get(["key1"])).not.toThrow();
        });
      });

      it("should return null for a non-existent key", () => {
        const result = storage.get(["does-not-exist"]);
        expect(result).toBeNull();
      });

      it("should return null for an expired entry", () => {
        mockLocalStorage._setStore({
          [buildKey("expired")]: makeEnvelope("data", pastDate(1)),
        });
        const result = storage.get(["expired"]);
        expect(result).toBeNull();
      });

      it("should remove expired entry from storage", () => {
        const key = buildKey("expired");
        mockLocalStorage._setStore({
          [key]: makeEnvelope("data", pastDate(1)),
        });
        storage.get(["expired"]);
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(key);
      });

      it("should return null for entry expiring exactly at current time", () => {
        mockLocalStorage._setStore({
          [buildKey("at-expiry")]: makeEnvelope("data", FIXED_NOW),
        });
        const result = storage.get(["at-expiry"]);
        expect(result).toBeNull();
      });

      it("should return null for malformed envelope missing data field", () => {
        mockLocalStorage._setStore({
          [buildKey("bad")]: JSON.stringify({
            createdAt: FIXED_NOW.toISOString(),
            expiresAt: futureDate(10000).toISOString(),
          }),
        });
        const result = storage.get(["bad"]);
        expect(result).toBeNull();
      });

      it("should return null for malformed envelope missing createdAt", () => {
        mockLocalStorage._setStore({
          [buildKey("bad")]: JSON.stringify({
            data: "value",
            expiresAt: futureDate(10000).toISOString(),
          }),
        });
        const result = storage.get(["bad"]);
        expect(result).toBeNull();
      });

      it("should return null for malformed envelope missing expiresAt", () => {
        mockLocalStorage._setStore({
          [buildKey("bad")]: JSON.stringify({
            data: "value",
            createdAt: FIXED_NOW.toISOString(),
          }),
        });
        const result = storage.get(["bad"]);
        expect(result).toBeNull();
      });

      it("should return null for corrupted JSON", () => {
        mockLocalStorage._setStore({
          [buildKey("corrupt")]: "not-valid-json{{{",
        });
        const result = storage.get(["corrupt"]);
        expect(result).toBeNull();
      });

      it("should return null when localStorage.getItem throws", () => {
        mockLocalStorage.getItem.mockImplementationOnce(() => {
          throw new Error("Storage error");
        });
        const result = storage.get(["key1"]);
        expect(result).toBeNull();
      });
    });

    describe("boundary conditions", () => {
      it("should handle single-character segment", () => {
        mockLocalStorage._setStore({
          [buildKey("a")]: makeEnvelope(1, futureDate(10000)),
        });
        const result = storage.get(["a"]);
        expect(result).toBe(1);
      });

      it("should handle segment with special characters", () => {
        mockLocalStorage._setStore({
          [`${NAMESPACE}:user/123?foo=bar`]: makeEnvelope(
            "data",
            futureDate(10000)
          ),
        });
        const result = storage.get(["user/123?foo=bar"]);
        expect(result).toBe("data");
      });

      it("should not return entry from a different namespace", () => {
        mockLocalStorage._setStore({
          [`other-ns:key1`]: makeEnvelope("data", futureDate(10000)),
        });
        const result = storage.get(["key1"]);
        expect(result).toBeNull();
      });
    });
  });

  describe("getAll", () => {
    describe("happy path", () => {
      it("should return all valid entries", () => {
        mockLocalStorage._setStore({
          [buildKey("a")]: makeEnvelope("val-a", futureDate(10000)),
          [buildKey("b")]: makeEnvelope("val-b", futureDate(10000)),
        });
        const results = storage.getAll();
        expect(results).toHaveLength(2);
      });

      it("should return entries with correct shape (key, data, createdAt, expiresAt)", () => {
        const createdAt = FIXED_NOW;
        const expiresAt = futureDate(10000);
        mockLocalStorage._setStore({
          [buildKey("entry1")]: makeEnvelope("hello", expiresAt, createdAt),
        });
        const results = storage.getAll();
        expect(results[0]).toEqual({
          key: buildKey("entry1"),
          data: "hello",
          createdAt: createdAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
        });
      });

      it("should return empty array when namespace has no entries", () => {
        const results = storage.getAll();
        expect(results).toEqual([]);
      });

      it("should only return entries belonging to this namespace", () => {
        mockLocalStorage._setStore({
          [buildKey("mine")]: makeEnvelope("mine", futureDate(10000)),
          ["other-ns:theirs"]: makeEnvelope("theirs", futureDate(10000)),
        });
        const results = storage.getAll();
        expect(results).toHaveLength(1);
        expect(results[0]?.data).toBe("mine");
      });
    });

    describe("error cases", () => {
      describe("SSR environment", () => {
        it("should return empty array when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          const results = storage.getAll();
          expect(results).toEqual([]);
        });

        it("should not throw when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          expect(() => storage.getAll()).not.toThrow();
        });
      });

      it("should skip and remove expired entries", () => {
        const expiredKey = buildKey("old");
        mockLocalStorage._setStore({
          [expiredKey]: makeEnvelope("stale", pastDate(1)),
          [buildKey("fresh")]: makeEnvelope("fresh", futureDate(10000)),
        });
        const results = storage.getAll();
        expect(results).toHaveLength(1);
        expect(results[0]?.data).toBe("fresh");
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(expiredKey);
      });

      it("should skip and remove malformed entries", () => {
        const badKey = buildKey("bad");
        mockLocalStorage._setStore({
          [badKey]: "not-valid-json",
          [buildKey("good")]: makeEnvelope("good", futureDate(10000)),
        });
        const results = storage.getAll();
        expect(results).toHaveLength(1);
        expect(results[0]?.data).toBe("good");
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(badKey);
      });
    });

    describe("boundary conditions", () => {
      it("should return empty array when all entries are expired", () => {
        mockLocalStorage._setStore({
          [buildKey("a")]: makeEnvelope("x", pastDate(100)),
          [buildKey("b")]: makeEnvelope("y", pastDate(50)),
        });
        const results = storage.getAll();
        expect(results).toEqual([]);
      });

      it("should handle many valid entries", () => {
        const store: Record<string, string> = {};
        for (let i = 0; i < 50; i++) {
          store[buildKey(`key${i}`)] = makeEnvelope(i, futureDate(10000));
        }
        mockLocalStorage._setStore(store);
        const results = storage.getAll();
        expect(results).toHaveLength(50);
      });
    });
  });

  describe("set", () => {
    describe("happy path", () => {
      it("should store entry with correct envelope structure", () => {
        storage.set(["key1"], "value1");
        const stored = mockLocalStorage._getStore()[buildKey("key1")];
        expect(stored).toBeDefined();
        const envelope = JSON.parse(stored!);
        expect(envelope.data).toBe("value1");
        expect(envelope.createdAt).toBe(FIXED_NOW.toISOString());
        expect(envelope.expiresAt).toBeDefined();
      });

      it("should use defaultTtl when no ttl is provided", () => {
        storage.set(["key1"], "value1");
        const stored = mockLocalStorage._getStore()[buildKey("key1")];
        const envelope = JSON.parse(stored!);
        expect(envelope.expiresAt).toBe(
          futureDate(DEFAULT_TTL_MS).toISOString()
        );
      });

      it("should use custom ttl when provided", () => {
        const customTtl = 60000;
        storage.set(["key1"], "value1", customTtl);
        const stored = mockLocalStorage._getStore()[buildKey("key1")];
        const envelope = JSON.parse(stored!);
        expect(envelope.expiresAt).toBe(futureDate(customTtl).toISOString());
      });

      it("should store object data", () => {
        const data = { id: "abc", count: 42 };
        storage.set(["obj"], data);
        const stored = mockLocalStorage._getStore()[buildKey("obj")];
        const envelope = JSON.parse(stored!);
        expect(envelope.data).toEqual(data);
      });

      it("should store array data", () => {
        const data = ["x", "y", "z"];
        storage.set(["arr"], data);
        const stored = mockLocalStorage._getStore()[buildKey("arr")];
        const envelope = JSON.parse(stored!);
        expect(envelope.data).toEqual(data);
      });

      it("should store boolean data", () => {
        storage.set(["bool"], false);
        const stored = mockLocalStorage._getStore()[buildKey("bool")];
        const envelope = JSON.parse(stored!);
        expect(envelope.data).toBe(false);
      });

      it("should store numeric data", () => {
        storage.set(["num"], 99);
        const stored = mockLocalStorage._getStore()[buildKey("num")];
        const envelope = JSON.parse(stored!);
        expect(envelope.data).toBe(99);
      });

      it("should overwrite an existing entry", () => {
        storage.set(["key1"], "first");
        storage.set(["key1"], "second");
        const stored = mockLocalStorage._getStore()[buildKey("key1")];
        const envelope = JSON.parse(stored!);
        expect(envelope.data).toBe("second");
      });

      it("should build key from multiple segments", () => {
        storage.set(["user1", "session1"], "data");
        const key = buildKey("user1", "session1");
        expect(mockLocalStorage._getStore()[key]).toBeDefined();
      });
    });

    describe("error cases", () => {
      describe("SSR environment", () => {
        it("should not throw when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          expect(() => storage.set(["key1"], "value")).not.toThrow();
        });

        it("should not write when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          storage.set(["key1"], "value");
          expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
        });
      });

      it("should not throw when localStorage.setItem throws a non-quota error", () => {
        mockLocalStorage.setItem.mockImplementationOnce(() => {
          throw new Error("Generic storage error");
        });
        expect(() => storage.set(["key1"], "value")).not.toThrow();
      });

      it("should prune expired entries and retry when quota is exceeded", () => {
        const expiredKey = buildKey("old");
        mockLocalStorage._setStore({
          [expiredKey]: makeEnvelope("old-data", pastDate(1)),
        });

        const quotaError = new DOMException(
          "Quota exceeded",
          "QuotaExceededError"
        );
        mockLocalStorage.setItem.mockImplementationOnce(() => {
          throw quotaError;
        });

        expect(() => storage.set(["new-key"], "new-data")).not.toThrow();
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(expiredKey);
      });

      it("should not throw when quota is exceeded and retry also fails", () => {
        const quotaError = new DOMException(
          "Quota exceeded",
          "QuotaExceededError"
        );
        mockLocalStorage.setItem.mockImplementation(() => {
          throw quotaError;
        });
        expect(() => storage.set(["key1"], "value")).not.toThrow();
      });
    });

    describe("maxEntries enforcement", () => {
      it("should remove the oldest entry when maxEntries is exceeded", () => {
        const storageWithLimit = new LocalStorageWithExpiration<string>({
          namespace: NAMESPACE,
          defaultTtlMs: DEFAULT_TTL_MS,
          maxEntries: 2,
        });

        const olderDate = new Date(FIXED_NOW.getTime() - 2000);
        const middleDate = new Date(FIXED_NOW.getTime() - 1000);

        mockLocalStorage._setStore({
          [buildKey("oldest")]: makeEnvelope("a", futureDate(10000), olderDate),
          [buildKey("middle")]: makeEnvelope(
            "b",
            futureDate(10000),
            middleDate
          ),
        });

        storageWithLimit.set(["newest"], "c");

        const store = mockLocalStorage._getStore();
        expect(store[buildKey("oldest")]).toBeUndefined();
        expect(store[buildKey("middle")]).toBeDefined();
        expect(store[buildKey("newest")]).toBeDefined();
      });

      it("should not remove entries when under maxEntries limit", () => {
        const storageWithLimit = new LocalStorageWithExpiration<string>({
          namespace: NAMESPACE,
          defaultTtlMs: DEFAULT_TTL_MS,
          maxEntries: 3,
        });

        mockLocalStorage._setStore({
          [buildKey("a")]: makeEnvelope("a", futureDate(10000)),
          [buildKey("b")]: makeEnvelope("b", futureDate(10000)),
        });

        storageWithLimit.set(["c"], "c");

        const store = mockLocalStorage._getStore();
        expect(store[buildKey("a")]).toBeDefined();
        expect(store[buildKey("b")]).toBeDefined();
        expect(store[buildKey("c")]).toBeDefined();
      });

      it("should prefer removing expired over valid entries on maxEntries exceeded", () => {
        const storageWithLimit = new LocalStorageWithExpiration<string>({
          namespace: NAMESPACE,
          defaultTtlMs: DEFAULT_TTL_MS,
          maxEntries: 2,
        });

        mockLocalStorage._setStore({
          [buildKey("expired")]: makeEnvelope("exp", pastDate(1)),
          [buildKey("valid")]: makeEnvelope("val", futureDate(10000)),
        });

        storageWithLimit.set(["new"], "new");

        const store = mockLocalStorage._getStore();
        expect(store[buildKey("expired")]).toBeUndefined();
        expect(store[buildKey("valid")]).toBeDefined();
        expect(store[buildKey("new")]).toBeDefined();
      });

      it("should not enforce limit when maxEntries is not set", () => {
        const store: Record<string, string> = {};
        for (let i = 0; i < 10; i++) {
          store[buildKey(`key${i}`)] = makeEnvelope(i, futureDate(10000));
        }
        mockLocalStorage._setStore(store);

        storage.set(["extra"], "data");

        const updatedStore = mockLocalStorage._getStore();
        expect(
          Object.keys(updatedStore).filter((k) => k.startsWith(`${NAMESPACE}:`))
        ).toHaveLength(11);
      });
    });

    describe("boundary conditions", () => {
      it("should store entry with 0ms TTL (immediately expired)", () => {
        storage.set(["zero-ttl"], "data", 0);
        const stored = mockLocalStorage._getStore()[buildKey("zero-ttl")];
        const envelope = JSON.parse(stored!);
        expect(envelope.expiresAt).toBe(FIXED_NOW.toISOString());
      });

      it("should store entry with very large TTL", () => {
        const largeTtl = 365 * 24 * 60 * 60 * 1000;
        storage.set(["long-lived"], "data", largeTtl);
        const stored = mockLocalStorage._getStore()[buildKey("long-lived")];
        const envelope = JSON.parse(stored!);
        expect(new Date(envelope.expiresAt).getTime()).toBe(
          FIXED_NOW.getTime() + largeTtl
        );
      });
    });
  });

  describe("remove", () => {
    describe("happy path", () => {
      it("should remove an existing entry", () => {
        mockLocalStorage._setStore({
          [buildKey("key1")]: makeEnvelope("data", futureDate(10000)),
        });
        storage.remove(["key1"]);
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
          buildKey("key1")
        );
      });

      it("should not throw when removing a non-existent key", () => {
        expect(() => storage.remove(["does-not-exist"])).not.toThrow();
      });

      it("should build key from multiple segments before removing", () => {
        const key = buildKey("user1", "session1");
        mockLocalStorage._setStore({
          [key]: makeEnvelope("data", futureDate(10000)),
        });
        storage.remove(["user1", "session1"]);
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(key);
      });

      it("should only remove the targeted entry", () => {
        mockLocalStorage._setStore({
          [buildKey("target")]: makeEnvelope("data", futureDate(10000)),
          [buildKey("other")]: makeEnvelope("data", futureDate(10000)),
        });
        storage.remove(["target"]);
        expect(mockLocalStorage._getStore()[buildKey("other")]).toBeDefined();
      });
    });

    describe("error cases", () => {
      describe("SSR environment", () => {
        it("should not throw when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          expect(() => storage.remove(["key1"])).not.toThrow();
        });

        it("should not call removeItem when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          storage.remove(["key1"]);
          expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe("pruneExpired", () => {
    describe("happy path", () => {
      it("should return 0 when there are no entries", () => {
        const result = storage.pruneExpired();
        expect(result).toBe(0);
      });

      it("should return 0 when all entries are valid", () => {
        mockLocalStorage._setStore({
          [buildKey("a")]: makeEnvelope("data", futureDate(10000)),
          [buildKey("b")]: makeEnvelope("data", futureDate(20000)),
        });
        const result = storage.pruneExpired();
        expect(result).toBe(0);
      });

      it("should remove expired entries and return count", () => {
        mockLocalStorage._setStore({
          [buildKey("expired1")]: makeEnvelope("x", pastDate(1)),
          [buildKey("expired2")]: makeEnvelope("y", pastDate(100)),
          [buildKey("valid")]: makeEnvelope("z", futureDate(10000)),
        });
        const result = storage.pruneExpired();
        expect(result).toBe(2);
      });

      it("should keep valid entries in storage", () => {
        const validKey = buildKey("valid");
        mockLocalStorage._setStore({
          [buildKey("expired")]: makeEnvelope("x", pastDate(1)),
          [validKey]: makeEnvelope("z", futureDate(10000)),
        });
        storage.pruneExpired();
        expect(mockLocalStorage._getStore()[validKey]).toBeDefined();
      });

      it("should remove all expired entries from storage", () => {
        const expiredKey1 = buildKey("expired1");
        const expiredKey2 = buildKey("expired2");
        mockLocalStorage._setStore({
          [expiredKey1]: makeEnvelope("x", pastDate(1)),
          [expiredKey2]: makeEnvelope("y", pastDate(100)),
        });
        storage.pruneExpired();
        expect(mockLocalStorage._getStore()[expiredKey1]).toBeUndefined();
        expect(mockLocalStorage._getStore()[expiredKey2]).toBeUndefined();
      });

      it("should count and remove malformed entries", () => {
        const badKey = buildKey("bad");
        mockLocalStorage._setStore({
          [badKey]: "not-valid-json",
        });
        const result = storage.pruneExpired();
        expect(result).toBe(1);
        expect(mockLocalStorage._getStore()[badKey]).toBeUndefined();
      });

      it("should not affect entries from other namespaces", () => {
        const otherKey = "other-ns:key";
        mockLocalStorage._setStore({
          [buildKey("expired")]: makeEnvelope("x", pastDate(1)),
          [otherKey]: makeEnvelope("y", pastDate(1)),
        });
        storage.pruneExpired();
        expect(mockLocalStorage._getStore()[otherKey]).toBeDefined();
      });
    });

    describe("error cases", () => {
      describe("SSR environment", () => {
        it("should return 0 when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          const result = storage.pruneExpired();
          expect(result).toBe(0);
        });

        it("should not throw when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          expect(() => storage.pruneExpired()).not.toThrow();
        });
      });
    });

    describe("boundary conditions", () => {
      it("should handle entries expiring exactly at current time as expired", () => {
        mockLocalStorage._setStore({
          [buildKey("at-limit")]: makeEnvelope("data", FIXED_NOW),
        });
        const result = storage.pruneExpired();
        expect(result).toBe(1);
      });

      it("should handle entries expiring 1ms in the future as valid", () => {
        mockLocalStorage._setStore({
          [buildKey("just-valid")]: makeEnvelope("data", futureDate(1)),
        });
        const result = storage.pruneExpired();
        expect(result).toBe(0);
      });

      it("should handle many expired entries", () => {
        const store: Record<string, string> = {};
        for (let i = 0; i < 50; i++) {
          store[buildKey(`key${i}`)] = makeEnvelope(i, pastDate(i + 1));
        }
        mockLocalStorage._setStore(store);
        const result = storage.pruneExpired();
        expect(result).toBe(50);
      });
    });
  });

  describe("clear", () => {
    describe("happy path", () => {
      it("should remove all entries in this namespace", () => {
        mockLocalStorage._setStore({
          [buildKey("a")]: makeEnvelope("x", futureDate(10000)),
          [buildKey("b")]: makeEnvelope("y", futureDate(10000)),
          [buildKey("c")]: makeEnvelope("z", futureDate(10000)),
        });
        storage.clear();
        const remaining = Object.keys(mockLocalStorage._getStore()).filter(
          (k) => k.startsWith(`${NAMESPACE}:`)
        );
        expect(remaining).toHaveLength(0);
      });

      it("should not throw when namespace is already empty", () => {
        expect(() => storage.clear()).not.toThrow();
      });

      it("should not remove entries from other namespaces", () => {
        const otherKey = "other-ns:preserved";
        mockLocalStorage._setStore({
          [buildKey("mine")]: makeEnvelope("x", futureDate(10000)),
          [otherKey]: makeEnvelope("y", futureDate(10000)),
        });
        storage.clear();
        expect(mockLocalStorage._getStore()[otherKey]).toBeDefined();
      });

      it("should remove both expired and valid entries", () => {
        mockLocalStorage._setStore({
          [buildKey("valid")]: makeEnvelope("x", futureDate(10000)),
          [buildKey("expired")]: makeEnvelope("y", pastDate(1)),
        });
        storage.clear();
        const store = mockLocalStorage._getStore();
        expect(store[buildKey("valid")]).toBeUndefined();
        expect(store[buildKey("expired")]).toBeUndefined();
      });
    });

    describe("error cases", () => {
      describe("SSR environment", () => {
        it("should not throw when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          expect(() => storage.clear()).not.toThrow();
        });

        it("should not call removeItem when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          storage.clear();
          expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
        });
      });
    });

    describe("boundary conditions", () => {
      it("should handle clearing many entries", () => {
        const store: Record<string, string> = {};
        for (let i = 0; i < 100; i++) {
          store[buildKey(`key${i}`)] = makeEnvelope(i, futureDate(10000));
        }
        mockLocalStorage._setStore(store);
        storage.clear();
        const remaining = Object.keys(mockLocalStorage._getStore()).filter(
          (k) => k.startsWith(`${NAMESPACE}:`)
        );
        expect(remaining).toHaveLength(0);
      });
    });
  });
});
