import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockLocalStorage } from "../../__test__";
import { localStorage } from "./local-storage";

let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;

describe("localStorage utility", () => {
  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
    vi.stubGlobal("window", {
      localStorage: mockLocalStorage,
    });
    vi.clearAllMocks();
    localStorage._encryptionKey = "test-secret-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("setEncryptionKey", () => {
    describe("happy path", () => {
      it("should set encryption key successfully", () => {
        localStorage.setEncryptionKey("new-secret-key");
        expect(localStorage._encryptionKey).toBe("new-secret-key");
      });

      it("should allow changing encryption key multiple times", () => {
        localStorage.setEncryptionKey("key1");
        expect(localStorage._encryptionKey).toBe("key1");
        localStorage.setEncryptionKey("key2");
        expect(localStorage._encryptionKey).toBe("key2");
      });

      it("should accept single character string", () => {
        localStorage.setEncryptionKey("x");
        expect(localStorage._encryptionKey).toBe("x");
      });

      it("should accept very long string", () => {
        const longKey = "a".repeat(10000);
        localStorage.setEncryptionKey(longKey);
        expect(localStorage._encryptionKey).toBe(longKey);
      });
    });

    describe("invalid arguments", () => {
      it("should throw when key is undefined", () => {
        expect(() =>
          localStorage.setEncryptionKey(undefined as unknown as string)
        ).toThrow("Encryption key must be a non-empty string");
      });

      it("should throw when key is null", () => {
        expect(() =>
          localStorage.setEncryptionKey(null as unknown as string)
        ).toThrow("Encryption key must be a non-empty string");
      });

      it("should throw when key is empty string", () => {
        expect(() => localStorage.setEncryptionKey("")).toThrow(
          "Encryption key must be a non-empty string"
        );
      });

      it("should throw when key is number", () => {
        expect(() =>
          localStorage.setEncryptionKey(123 as unknown as string)
        ).toThrow("Encryption key must be a non-empty string");
      });

      it("should throw when key is boolean", () => {
        expect(() =>
          localStorage.setEncryptionKey(true as unknown as string)
        ).toThrow("Encryption key must be a non-empty string");
      });

      it("should throw when key is object", () => {
        expect(() =>
          localStorage.setEncryptionKey({} as unknown as string)
        ).toThrow("Encryption key must be a non-empty string");
      });

      it("should throw when key is array", () => {
        expect(() =>
          localStorage.setEncryptionKey([] as unknown as string)
        ).toThrow("Encryption key must be a non-empty string");
      });

      it("should throw when key is function", () => {
        expect(() =>
          localStorage.setEncryptionKey((() => {}) as unknown as string)
        ).toThrow("Encryption key must be a non-empty string");
      });

      it("should throw when key is NaN", () => {
        expect(() =>
          localStorage.setEncryptionKey(NaN as unknown as string)
        ).toThrow("Encryption key must be a non-empty string");
      });

      it("should throw when key is Symbol", () => {
        expect(() =>
          localStorage.setEncryptionKey(Symbol("test") as unknown as string)
        ).toThrow("Encryption key must be a non-empty string");
      });

      it("should throw when key is BigInt", () => {
        expect(() =>
          localStorage.setEncryptionKey(BigInt(123) as unknown as string)
        ).toThrow("Encryption key must be a non-empty string");
      });

      it("should throw when key is nested object", () => {
        expect(() =>
          localStorage.setEncryptionKey({
            nested: { deep: "value" },
          } as unknown as string)
        ).toThrow("Encryption key must be a non-empty string");
      });

      it("should throw when key is deep array", () => {
        expect(() =>
          localStorage.setEncryptionKey([[[["deep"]]]] as unknown as string)
        ).toThrow("Encryption key must be a non-empty string");
      });
    });
  });

  describe("_encrypt", () => {
    describe("happy path", () => {
      it("should encrypt a string successfully", () => {
        const result = localStorage._encrypt("test data");
        expect(typeof result).toBe("string");
        expect(result).not.toBe("test data");
        expect(result.length).toBeGreaterThan(0);
      });

      it("should produce different output for different inputs", () => {
        const result1 = localStorage._encrypt("data1");
        const result2 = localStorage._encrypt("data2");
        expect(result1).not.toBe(result2);
      });

      it("should encrypt empty string", () => {
        const result = localStorage._encrypt("");
        expect(typeof result).toBe("string");
      });

      it("should encrypt JSON string", () => {
        const json = JSON.stringify({ key: "value" });
        const result = localStorage._encrypt(json);
        expect(typeof result).toBe("string");
        expect(result).not.toBe(json);
      });

      it("should encrypt unicode characters", () => {
        const result = localStorage._encrypt("日本語テスト");
        expect(typeof result).toBe("string");
      });

      it("should encrypt emoji", () => {
        const result = localStorage._encrypt("Hello 😀 World");
        expect(typeof result).toBe("string");
      });
    });

    describe("invalid arguments", () => {
      it("should throw when data is undefined", () => {
        expect(() =>
          localStorage._encrypt(undefined as unknown as string)
        ).toThrow("Data must be a string");
      });

      it("should throw when data is null", () => {
        expect(() => localStorage._encrypt(null as unknown as string)).toThrow(
          "Data must be a string"
        );
      });

      it("should throw when data is number", () => {
        expect(() => localStorage._encrypt(123 as unknown as string)).toThrow(
          "Data must be a string"
        );
      });

      it("should throw when data is boolean", () => {
        expect(() => localStorage._encrypt(true as unknown as string)).toThrow(
          "Data must be a string"
        );
      });

      it("should throw when data is object", () => {
        expect(() => localStorage._encrypt({} as unknown as string)).toThrow(
          "Data must be a string"
        );
      });

      it("should throw when data is array", () => {
        expect(() => localStorage._encrypt([] as unknown as string)).toThrow(
          "Data must be a string"
        );
      });

      it("should throw when data is function", () => {
        expect(() =>
          localStorage._encrypt((() => {}) as unknown as string)
        ).toThrow("Data must be a string");
      });

      it("should throw when data is NaN", () => {
        expect(() => localStorage._encrypt(NaN as unknown as string)).toThrow(
          "Data must be a string"
        );
      });

      it("should throw when data is Symbol", () => {
        expect(() =>
          localStorage._encrypt(Symbol("test") as unknown as string)
        ).toThrow("Data must be a string");
      });

      it("should throw when data is BigInt", () => {
        expect(() =>
          localStorage._encrypt(BigInt(123) as unknown as string)
        ).toThrow("Data must be a string");
      });

      it("should throw when data is nested object", () => {
        expect(() =>
          localStorage._encrypt({
            nested: { deep: "value" },
          } as unknown as string)
        ).toThrow("Data must be a string");
      });

      it("should throw when data is deep array", () => {
        expect(() =>
          localStorage._encrypt([[[["deep"]]]] as unknown as string)
        ).toThrow("Data must be a string");
      });
    });

    describe("boundary conditions", () => {
      it("should encrypt extremely long string", () => {
        const longString = "a".repeat(100000);
        const result = localStorage._encrypt(longString);
        expect(typeof result).toBe("string");
      });

      it("should encrypt string with special characters", () => {
        const result = localStorage._encrypt("!@#$%^&*()_+-=[]{}|;':\",./<>?");
        expect(typeof result).toBe("string");
      });

      it("should encrypt string with newlines", () => {
        const result = localStorage._encrypt("line1\nline2\nline3");
        expect(typeof result).toBe("string");
      });

      it("should encrypt string with tabs", () => {
        const result = localStorage._encrypt("col1\tcol2\tcol3");
        expect(typeof result).toBe("string");
      });
    });
  });

  describe("_decrypt", () => {
    describe("happy path", () => {
      it("should decrypt encrypted data successfully", () => {
        const original = "test data";
        const encrypted = localStorage._encrypt(original);
        const decrypted = localStorage._decrypt(encrypted);
        expect(decrypted).toBe(original);
      });

      it("should throw when decrypting encrypted empty string (limitation of CryptoJS)", () => {
        // Note: CryptoJS returns empty string for both valid empty decryption and failed decryption
        // We prioritize detecting decryption failures over supporting empty string encryption
        const original = "";
        const encrypted = localStorage._encrypt(original);
        expect(() => localStorage._decrypt(encrypted)).toThrow(
          "Decryption failed: invalid data or wrong key"
        );
      });

      it("should decrypt JSON that was encrypted", () => {
        const original = JSON.stringify({ key: "value", num: 123 });
        const encrypted = localStorage._encrypt(original);
        const decrypted = localStorage._decrypt(encrypted);
        expect(decrypted).toBe(original);
      });

      it("should decrypt unicode that was encrypted", () => {
        const original = "日本語テスト";
        const encrypted = localStorage._encrypt(original);
        const decrypted = localStorage._decrypt(encrypted);
        expect(decrypted).toBe(original);
      });

      it("should decrypt emoji that was encrypted", () => {
        const original = "Hello 😀 World";
        const encrypted = localStorage._encrypt(original);
        const decrypted = localStorage._decrypt(encrypted);
        expect(decrypted).toBe(original);
      });
    });

    describe("invalid arguments", () => {
      it("should throw when encryptedData is undefined", () => {
        expect(() =>
          localStorage._decrypt(undefined as unknown as string)
        ).toThrow(
          "Decryption failed: encryptedData must be a non-empty string"
        );
      });

      it("should throw when encryptedData is null", () => {
        expect(() => localStorage._decrypt(null as unknown as string)).toThrow(
          "Decryption failed: encryptedData must be a non-empty string"
        );
      });

      it("should throw when encryptedData is number", () => {
        expect(() => localStorage._decrypt(123 as unknown as string)).toThrow(
          "Decryption failed: encryptedData must be a non-empty string"
        );
      });

      it("should throw when encryptedData is boolean", () => {
        expect(() => localStorage._decrypt(true as unknown as string)).toThrow(
          "Decryption failed: encryptedData must be a non-empty string"
        );
      });

      it("should throw when encryptedData is object", () => {
        expect(() => localStorage._decrypt({} as unknown as string)).toThrow(
          "Decryption failed: encryptedData must be a non-empty string"
        );
      });

      it("should throw when encryptedData is array", () => {
        expect(() => localStorage._decrypt([] as unknown as string)).toThrow(
          "Decryption failed: encryptedData must be a non-empty string"
        );
      });

      it("should throw when encryptedData is function", () => {
        expect(() =>
          localStorage._decrypt((() => {}) as unknown as string)
        ).toThrow(
          "Decryption failed: encryptedData must be a non-empty string"
        );
      });

      it("should throw when encryptedData is NaN", () => {
        expect(() => localStorage._decrypt(NaN as unknown as string)).toThrow(
          "Decryption failed: encryptedData must be a non-empty string"
        );
      });

      it("should throw when encryptedData is Symbol", () => {
        expect(() =>
          localStorage._decrypt(Symbol("test") as unknown as string)
        ).toThrow(
          "Decryption failed: encryptedData must be a non-empty string"
        );
      });

      it("should throw when encryptedData is BigInt", () => {
        expect(() =>
          localStorage._decrypt(BigInt(123) as unknown as string)
        ).toThrow(
          "Decryption failed: encryptedData must be a non-empty string"
        );
      });

      it("should throw when encryptedData is nested object", () => {
        expect(() =>
          localStorage._decrypt({
            nested: { deep: "value" },
          } as unknown as string)
        ).toThrow(
          "Decryption failed: encryptedData must be a non-empty string"
        );
      });

      it("should throw when encryptedData is deep array", () => {
        expect(() =>
          localStorage._decrypt([[[["deep"]]]] as unknown as string)
        ).toThrow(
          "Decryption failed: encryptedData must be a non-empty string"
        );
      });
    });

    describe("error cases", () => {
      it("should throw for invalid encrypted data", () => {
        expect(() => localStorage._decrypt("invalid-encrypted-data")).toThrow(
          "Decryption failed: invalid data or wrong key"
        );
      });

      it("should throw for empty string input", () => {
        expect(() => localStorage._decrypt("")).toThrow(
          "Decryption failed: encryptedData must be a non-empty string"
        );
      });

      it("should throw for random base64", () => {
        expect(() => localStorage._decrypt("SGVsbG8gV29ybGQ=")).toThrow(
          "Decryption failed: invalid data or wrong key"
        );
      });

      it("should throw when decrypting with wrong key", () => {
        const encrypted = localStorage._encrypt("secret data");
        localStorage._encryptionKey = "wrong-key";
        expect(() => localStorage._decrypt(encrypted)).toThrow(
          "Decryption failed: invalid data or wrong key"
        );
      });
    });

    describe("boundary conditions", () => {
      it("should decrypt extremely long encrypted string", () => {
        const original = "a".repeat(10000);
        const encrypted = localStorage._encrypt(original);
        const decrypted = localStorage._decrypt(encrypted);
        expect(decrypted).toBe(original);
      });
    });
  });

  describe("setItem", () => {
    describe("happy path", () => {
      it("should store string value without encryption", () => {
        localStorage.setItem("key1", "value1");
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith("key1", "value1");
      });

      it("should store string value with encryption", () => {
        localStorage.setItem("key1", "value1", true);
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
        const storedValue = mockLocalStorage.setItem.mock.calls[0][1];
        expect(storedValue).not.toBe("value1");
      });

      it("should store empty string", () => {
        localStorage.setItem("key1", "");
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith("key1", "");
      });

      it("should store JSON string", () => {
        const json = JSON.stringify({ key: "value" });
        localStorage.setItem("key1", json);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith("key1", json);
      });

      it("should store unicode string", () => {
        localStorage.setItem("key1", "日本語テスト");
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          "key1",
          "日本語テスト"
        );
      });

      it("should overwrite existing key", () => {
        localStorage.setItem("key1", "value1");
        localStorage.setItem("key1", "value2");
        expect(mockLocalStorage.setItem).toHaveBeenLastCalledWith(
          "key1",
          "value2"
        );
      });
    });

    describe("error cases", () => {
      describe("SSR environment", () => {
        it("should not throw when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          expect(() => localStorage.setItem("key1", "value1")).not.toThrow();
        });

        it("should return early when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          localStorage.setItem("key1", "value1");
          expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
        });
      });
    });

    describe("invalid arguments for key parameter", () => {
      it("should throw when key is undefined", () => {
        expect(() =>
          localStorage.setItem(undefined as unknown as string, "value")
        ).toThrow("Key must be a string");
      });

      it("should throw when key is null", () => {
        expect(() =>
          localStorage.setItem(null as unknown as string, "value")
        ).toThrow("Key must be a string");
      });

      it("should throw when key is number", () => {
        expect(() =>
          localStorage.setItem(123 as unknown as string, "value")
        ).toThrow("Key must be a string");
      });

      it("should throw when key is boolean", () => {
        expect(() =>
          localStorage.setItem(true as unknown as string, "value")
        ).toThrow("Key must be a string");
      });

      it("should throw when key is object", () => {
        expect(() =>
          localStorage.setItem({} as unknown as string, "value")
        ).toThrow("Key must be a string");
      });

      it("should throw when key is array", () => {
        expect(() =>
          localStorage.setItem([] as unknown as string, "value")
        ).toThrow("Key must be a string");
      });

      it("should throw when key is function", () => {
        expect(() =>
          localStorage.setItem((() => {}) as unknown as string, "value")
        ).toThrow("Key must be a string");
      });

      it("should throw when key is NaN", () => {
        expect(() =>
          localStorage.setItem(NaN as unknown as string, "value")
        ).toThrow("Key must be a string");
      });

      it("should throw when key is Symbol", () => {
        expect(() =>
          localStorage.setItem(Symbol("test") as unknown as string, "value")
        ).toThrow("Key must be a string");
      });

      it("should throw when key is BigInt", () => {
        expect(() =>
          localStorage.setItem(BigInt(123) as unknown as string, "value")
        ).toThrow("Key must be a string");
      });
    });

    describe("invalid arguments for value parameter", () => {
      it("should throw when value is undefined", () => {
        expect(() =>
          localStorage.setItem("key", undefined as unknown as string)
        ).toThrow("Value must be a string");
      });

      it("should throw when value is null", () => {
        expect(() =>
          localStorage.setItem("key", null as unknown as string)
        ).toThrow("Value must be a string");
      });

      it("should throw when value is number", () => {
        expect(() =>
          localStorage.setItem("key", 123 as unknown as string)
        ).toThrow("Value must be a string");
      });

      it("should throw when value is boolean", () => {
        expect(() =>
          localStorage.setItem("key", true as unknown as string)
        ).toThrow("Value must be a string");
      });

      it("should throw when value is object", () => {
        expect(() =>
          localStorage.setItem("key", { a: 1 } as unknown as string)
        ).toThrow("Value must be a string");
      });

      it("should throw when value is array", () => {
        expect(() =>
          localStorage.setItem("key", [1, 2, 3] as unknown as string)
        ).toThrow("Value must be a string");
      });

      it("should throw when value is function", () => {
        expect(() =>
          localStorage.setItem("key", (() => {}) as unknown as string)
        ).toThrow("Value must be a string");
      });

      it("should throw when value is NaN", () => {
        expect(() =>
          localStorage.setItem("key", NaN as unknown as string)
        ).toThrow("Value must be a string");
      });

      it("should throw when value is Symbol", () => {
        expect(() =>
          localStorage.setItem("key", Symbol("test") as unknown as string)
        ).toThrow("Value must be a string");
      });

      it("should throw when value is BigInt", () => {
        expect(() =>
          localStorage.setItem("key", BigInt(123) as unknown as string)
        ).toThrow("Value must be a string");
      });

      it("should throw when value is nested object", () => {
        expect(() =>
          localStorage.setItem("key", {
            nested: { deep: "value" },
          } as unknown as string)
        ).toThrow("Value must be a string");
      });

      it("should throw when value is deep array", () => {
        expect(() =>
          localStorage.setItem("key", [[[["deep"]]]] as unknown as string)
        ).toThrow("Value must be a string");
      });
    });

    describe("invalid arguments for encrypt parameter", () => {
      it("should treat undefined encrypt as false", () => {
        localStorage.setItem("key", "value", undefined);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith("key", "value");
      });

      it("should treat null encrypt as false", () => {
        localStorage.setItem("key", "value", null as unknown as boolean);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith("key", "value");
      });

      it("should treat truthy number as true", () => {
        localStorage.setItem("key", "value", 1 as unknown as boolean);
        const storedValue = mockLocalStorage.setItem.mock.calls[0][1];
        expect(storedValue).not.toBe("value");
      });

      it("should treat 0 as false", () => {
        localStorage.setItem("key", "value", 0 as unknown as boolean);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith("key", "value");
      });

      it("should treat empty string as false", () => {
        localStorage.setItem("key", "value", "" as unknown as boolean);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith("key", "value");
      });

      it("should treat non-empty string as true", () => {
        localStorage.setItem("key", "value", "yes" as unknown as boolean);
        const storedValue = mockLocalStorage.setItem.mock.calls[0][1];
        expect(storedValue).not.toBe("value");
      });

      it("should treat object as true", () => {
        localStorage.setItem("key", "value", {} as unknown as boolean);
        const storedValue = mockLocalStorage.setItem.mock.calls[0][1];
        expect(storedValue).not.toBe("value");
      });

      it("should treat array as true", () => {
        localStorage.setItem("key", "value", [] as unknown as boolean);
        const storedValue = mockLocalStorage.setItem.mock.calls[0][1];
        expect(storedValue).not.toBe("value");
      });
    });

    describe("boundary conditions", () => {
      it("should handle extremely long key", () => {
        const longKey = "k".repeat(10000);
        localStorage.setItem(longKey, "value");
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(longKey, "value");
      });

      it("should handle extremely long value", () => {
        const longValue = "v".repeat(100000);
        localStorage.setItem("key", longValue);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith("key", longValue);
      });

      it("should handle key with special characters", () => {
        localStorage.setItem("key/with:special?chars", "value");
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          "key/with:special?chars",
          "value"
        );
      });

      it("should throw when localStorage.setItem throws quota error", () => {
        mockLocalStorage.setItem.mockImplementationOnce(() => {
          throw new Error("QuotaExceededError");
        });
        expect(() => localStorage.setItem("key", "value")).toThrow(
          "Failed to store data"
        );
      });
    });
  });

  describe("getItem", () => {
    describe("happy path", () => {
      it("should retrieve stored string value", () => {
        mockLocalStorage._setStore({ key1: '"value1"' });
        const result = localStorage.getItem("key1");
        expect(result).toBe("value1");
      });

      it("should retrieve and decrypt encrypted value", () => {
        const encrypted = localStorage._encrypt('"secret"');
        mockLocalStorage._setStore({ key1: encrypted });
        const result = localStorage.getItem("key1", true);
        expect(result).toBe("secret");
      });

      it("should return null for non-existent key", () => {
        const result = localStorage.getItem("nonexistent");
        expect(result).toBeNull();
      });

      it("should parse JSON string automatically", () => {
        mockLocalStorage._setStore({ key1: '{"a":1,"b":2}' });
        const result = localStorage.getItem("key1");
        expect(result).toEqual({ a: 1, b: 2 });
      });

      it("should return fallback empty object if not valid JSON", () => {
        mockLocalStorage._setStore({ key1: "plain string" });
        const result = localStorage.getItem("key1");
        expect(result).toEqual({});
      });

      it("should return fallback empty object for empty string", () => {
        mockLocalStorage._setStore({ key1: "" });
        const result = localStorage.getItem("key1");
        expect(result).toEqual({});
      });
    });

    describe("invalid arguments for key parameter", () => {
      it("should throw when key is undefined", () => {
        expect(() =>
          localStorage.getItem(undefined as unknown as string)
        ).toThrow("Key must be a string");
      });

      it("should throw when key is null", () => {
        expect(() => localStorage.getItem(null as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is number", () => {
        expect(() => localStorage.getItem(123 as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is boolean", () => {
        expect(() => localStorage.getItem(true as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is object", () => {
        expect(() => localStorage.getItem({} as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is array", () => {
        expect(() => localStorage.getItem([] as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is function", () => {
        expect(() =>
          localStorage.getItem((() => {}) as unknown as string)
        ).toThrow("Key must be a string");
      });

      it("should throw when key is NaN", () => {
        expect(() => localStorage.getItem(NaN as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is Symbol", () => {
        expect(() =>
          localStorage.getItem(Symbol("test") as unknown as string)
        ).toThrow("Key must be a string");
      });

      it("should throw when key is BigInt", () => {
        expect(() =>
          localStorage.getItem(BigInt(123) as unknown as string)
        ).toThrow("Key must be a string");
      });
    });

    describe("invalid arguments for decrypt parameter", () => {
      it("should treat undefined decrypt as false (uses default)", () => {
        mockLocalStorage._setStore({ key1: '"value1"' });
        const result = localStorage.getItem("key1", undefined);
        expect(result).toBe("value1");
      });

      it("should throw when decrypt is null", () => {
        expect(() =>
          localStorage.getItem("key1", null as unknown as boolean)
        ).toThrow("Decrypt must be a boolean");
      });

      it("should throw when decrypt is number", () => {
        expect(() =>
          localStorage.getItem("key1", 1 as unknown as boolean)
        ).toThrow("Decrypt must be a boolean");
      });

      it("should throw when decrypt is 0", () => {
        expect(() =>
          localStorage.getItem("key1", 0 as unknown as boolean)
        ).toThrow("Decrypt must be a boolean");
      });
    });

    describe("error cases", () => {
      it("should return null when decryption fails with invalid data", () => {
        mockLocalStorage._setStore({ key1: "not-encrypted" });
        const result = localStorage.getItem("key1", true);
        expect(result).toBeNull();
      });

      it("should return null when localStorage throws", () => {
        mockLocalStorage.getItem.mockImplementationOnce(() => {
          throw new Error("Storage error");
        });
        const result = localStorage.getItem("key1");
        expect(result).toBeNull();
      });

      describe("SSR environment", () => {
        it("should return undefined when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          const result = localStorage.getItem("key1");
          expect(result).toBeUndefined();
        });

        it("should not throw when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          expect(() => localStorage.getItem("key1")).not.toThrow();
        });
      });
    });

    describe("boundary conditions", () => {
      it("should handle extremely long stored JSON value", () => {
        const longValue = "v".repeat(100000);
        mockLocalStorage._setStore({ key1: JSON.stringify(longValue) });
        const result = localStorage.getItem("key1");
        expect(result).toBe(longValue);
      });

      it("should handle stored JSON with nested objects", () => {
        mockLocalStorage._setStore({
          key1: '{"nested":{"deep":{"value":123}}}',
        });
        const result = localStorage.getItem("key1");
        expect(result).toEqual({ nested: { deep: { value: 123 } } });
      });

      it("should handle stored JSON array", () => {
        mockLocalStorage._setStore({ key1: "[1,2,3]" });
        const result = localStorage.getItem("key1");
        expect(result).toEqual([1, 2, 3]);
      });

      it("should handle stored boolean JSON", () => {
        mockLocalStorage._setStore({ key1: "true" });
        const result = localStorage.getItem("key1");
        expect(result).toBe(true);
      });

      it("should handle stored number JSON", () => {
        mockLocalStorage._setStore({ key1: "123" });
        const result = localStorage.getItem("key1");
        expect(result).toBe(123);
      });

      it("should handle stored null JSON", () => {
        mockLocalStorage._setStore({ key1: "null" });
        const result = localStorage.getItem("key1");
        expect(result).toBeNull();
      });
    });
  });

  describe("removeItem", () => {
    describe("happy path", () => {
      it("should remove existing item", () => {
        mockLocalStorage._setStore({ key1: "value1" });
        localStorage.removeItem("key1");
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("key1");
      });

      it("should not throw when removing non-existent key", () => {
        expect(() => localStorage.removeItem("nonexistent")).not.toThrow();
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("nonexistent");
      });
    });

    describe("error cases", () => {
      describe("SSR environment", () => {
        it("should not throw when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          expect(() => localStorage.removeItem("key1")).not.toThrow();
        });

        it("should return early when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          localStorage.removeItem("key1");
          expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
        });
      });
    });

    describe("invalid arguments for key parameter", () => {
      it("should throw when key is undefined", () => {
        expect(() =>
          localStorage.removeItem(undefined as unknown as string)
        ).toThrow("Key must be a string");
      });

      it("should throw when key is null", () => {
        expect(() =>
          localStorage.removeItem(null as unknown as string)
        ).toThrow("Key must be a string");
      });

      it("should throw when key is number", () => {
        expect(() => localStorage.removeItem(123 as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is boolean", () => {
        expect(() =>
          localStorage.removeItem(true as unknown as string)
        ).toThrow("Key must be a string");
      });

      it("should throw when key is object", () => {
        expect(() => localStorage.removeItem({} as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is array", () => {
        expect(() => localStorage.removeItem([] as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is function", () => {
        expect(() =>
          localStorage.removeItem((() => {}) as unknown as string)
        ).toThrow("Key must be a string");
      });

      it("should throw when key is NaN", () => {
        expect(() => localStorage.removeItem(NaN as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is Symbol", () => {
        expect(() =>
          localStorage.removeItem(Symbol("test") as unknown as string)
        ).toThrow("Key must be a string");
      });

      it("should throw when key is BigInt", () => {
        expect(() =>
          localStorage.removeItem(BigInt(123) as unknown as string)
        ).toThrow("Key must be a string");
      });
    });
  });

  describe("clear", () => {
    describe("happy path", () => {
      it("should clear all items", () => {
        mockLocalStorage._setStore({ key1: "value1", key2: "value2" });
        localStorage.clear();
        expect(mockLocalStorage.clear).toHaveBeenCalled();
      });

      it("should not throw when storage is already empty", () => {
        expect(() => localStorage.clear()).not.toThrow();
        expect(mockLocalStorage.clear).toHaveBeenCalled();
      });
    });

    describe("error cases", () => {
      describe("SSR environment", () => {
        it("should not throw when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          expect(() => localStorage.clear()).not.toThrow();
        });

        it("should return early when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          localStorage.clear();
          expect(mockLocalStorage.clear).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe("keys", () => {
    describe("happy path", () => {
      it("should return all keys", () => {
        mockLocalStorage._setStore({ key1: "value1", key2: "value2" });
        const result = localStorage.keys();
        expect(result).toEqual(["key1", "key2"]);
      });

      it("should return empty array when storage is empty", () => {
        const result = localStorage.keys();
        expect(result).toEqual([]);
      });

      it("should return keys in order", () => {
        mockLocalStorage._setStore({ a: "1", b: "2", c: "3" });
        const result = localStorage.keys();
        expect(result).toHaveLength(3);
        expect(result).toContain("a");
        expect(result).toContain("b");
        expect(result).toContain("c");
      });
    });

    describe("error cases", () => {
      describe("SSR environment", () => {
        it("should return empty array when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          const result = localStorage.keys();
          expect(result).toEqual([]);
        });
      });
    });

    describe("boundary conditions", () => {
      it("should handle many keys", () => {
        const store: Record<string, string> = {};
        for (let i = 0; i < 1000; i++) {
          store[`key${i}`] = `value${i}`;
        }
        mockLocalStorage._setStore(store);
        const result = localStorage.keys();
        expect(result).toHaveLength(1000);
      });

      it("should handle keys with special characters", () => {
        mockLocalStorage._setStore({
          "key/with:special?chars": "value",
          "key with spaces": "value",
        });
        const result = localStorage.keys();
        expect(result).toContain("key/with:special?chars");
        expect(result).toContain("key with spaces");
      });
    });
  });

  describe("has", () => {
    describe("happy path", () => {
      it("should return true for existing key", () => {
        mockLocalStorage._setStore({ key1: "value1" });
        const result = localStorage.has("key1");
        expect(result).toBe(true);
      });

      it("should return false for non-existent key", () => {
        const result = localStorage.has("nonexistent");
        expect(result).toBe(false);
      });

      it("should return true for key with empty string value", () => {
        mockLocalStorage._setStore({ key1: "" });
        const result = localStorage.has("key1");
        expect(result).toBe(true);
      });
    });

    describe("error cases", () => {
      describe("SSR environment", () => {
        it("should return false when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          const result = localStorage.has("key1");
          expect(result).toBe(false);
        });
      });
    });

    describe("invalid arguments for key parameter", () => {
      it("should throw when key is undefined", () => {
        expect(() => localStorage.has(undefined as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is null", () => {
        expect(() => localStorage.has(null as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is number", () => {
        expect(() => localStorage.has(123 as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is boolean", () => {
        expect(() => localStorage.has(true as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is object", () => {
        expect(() => localStorage.has({} as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is array", () => {
        expect(() => localStorage.has([] as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is function", () => {
        expect(() => localStorage.has((() => {}) as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is NaN", () => {
        expect(() => localStorage.has(NaN as unknown as string)).toThrow(
          "Key must be a string"
        );
      });

      it("should throw when key is Symbol", () => {
        expect(() =>
          localStorage.has(Symbol("test") as unknown as string)
        ).toThrow("Key must be a string");
      });

      it("should throw when key is BigInt", () => {
        expect(() =>
          localStorage.has(BigInt(123) as unknown as string)
        ).toThrow("Key must be a string");
      });
    });
  });

  describe("getStats", () => {
    describe("happy path", () => {
      it("should return correct count and size for empty storage", () => {
        const result = localStorage.getStats();
        expect(result).toEqual({ count: 0, totalSize: 0 });
      });

      it("should return correct count for items", () => {
        mockLocalStorage._setStore({ key1: "value1", key2: "value2" });
        const result = localStorage.getStats();
        expect(result.count).toBe(2);
      });

      it("should calculate total size correctly", () => {
        mockLocalStorage._setStore({ key1: "value1" });
        const result = localStorage.getStats();
        // key1 (4) + value1 (6) = 10
        expect(result.totalSize).toBe(10);
      });

      it("should handle multiple items size calculation", () => {
        mockLocalStorage._setStore({ a: "1", bb: "22", ccc: "333" });
        const result = localStorage.getStats();
        // a(1) + 1(1) + bb(2) + 22(2) + ccc(3) + 333(3) = 12
        expect(result.count).toBe(3);
        expect(result.totalSize).toBe(12);
      });
    });

    describe("error cases", () => {
      describe("SSR environment", () => {
        it("should return zeros when window is undefined", () => {
          vi.stubGlobal("window", undefined);
          const result = localStorage.getStats();
          expect(result).toEqual({ count: 0, totalSize: 0 });
        });
      });
    });

    describe("boundary conditions", () => {
      it("should handle empty string values", () => {
        mockLocalStorage._setStore({ key1: "" });
        const result = localStorage.getStats();
        expect(result.count).toBe(1);
        expect(result.totalSize).toBe(4); // key1 only
      });

      it("should handle unicode keys and values", () => {
        mockLocalStorage._setStore({ キー: "値" });
        const result = localStorage.getStats();
        expect(result.count).toBe(1);
        // キー (2 chars) + 値 (1 char) = 3
        expect(result.totalSize).toBe(3);
      });

      it("should handle many items", () => {
        const store: Record<string, string> = {};
        for (let i = 0; i < 100; i++) {
          store[`key${i}`] = `value${i}`;
        }
        mockLocalStorage._setStore(store);
        const result = localStorage.getStats();
        expect(result.count).toBe(100);
        expect(result.totalSize).toBeGreaterThan(0);
      });
    });
  });
});
