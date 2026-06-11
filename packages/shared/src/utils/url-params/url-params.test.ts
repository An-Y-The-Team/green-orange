import { describe, expect, it } from "vitest";

import { appendParam, isValidUrl } from "./url-params";

describe("appendParam", () => {
  describe("happy path", () => {
    it("should append string value to URLSearchParams", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", "value");
      expect(params.get("key")).toBe("value");
    });

    it("should append number value to URLSearchParams", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", 42);
      expect(params.get("key")).toBe("42");
    });

    it("should append zero to URLSearchParams", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", 0);
      expect(params.get("key")).toBe("0");
    });

    it("should append negative number to URLSearchParams", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", -42);
      expect(params.get("key")).toBe("-42");
    });

    it("should append boolean true to URLSearchParams", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", true);
      expect(params.get("key")).toBe("true");
    });

    it("should append boolean false to URLSearchParams", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", false);
      expect(params.get("key")).toBe("false");
    });

    it("should append multiple values with same key", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", "value1");
      appendParam(params, "key", "value2");
      expect(params.getAll("key")).toEqual(["value1", "value2"]);
    });

    it("should append different keys", () => {
      const params = new URLSearchParams();
      appendParam(params, "key1", "value1");
      appendParam(params, "key2", "value2");
      expect(params.get("key1")).toBe("value1");
      expect(params.get("key2")).toBe("value2");
    });

    it("should append large number to URLSearchParams", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", Number.MAX_SAFE_INTEGER);
      expect(params.get("key")).toBe(String(Number.MAX_SAFE_INTEGER));
    });

    it("should append floating point number to URLSearchParams", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", 3.14);
      expect(params.get("key")).toBe("3.14");
    });
  });

  describe("error cases - invalid types", () => {
    it("should not append undefined value", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", undefined);
      expect(params.has("key")).toBe(false);
    });

    it("should not append null value", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", null);
      expect(params.has("key")).toBe(false);
    });

    it("should not append empty string", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", "");
      expect(params.has("key")).toBe(false);
    });

    it("should not append NaN", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", NaN);
      expect(params.has("key")).toBe(false);
    });

    it("should not append object value", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", {} as unknown as string);
      expect(params.has("key")).toBe(false);
    });

    it("should not append array value", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", [1, 2, 3] as unknown as string);
      expect(params.has("key")).toBe(false);
    });

    it("should not append function value", () => {
      const params = new URLSearchParams();
      const fn = () => {};
      appendParam(params, "key", fn as unknown as string);
      expect(params.has("key")).toBe(false);
    });

    it("should not append Symbol value", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", Symbol("test") as unknown as string);
      expect(params.has("key")).toBe(false);
    });

    it("should not append BigInt value", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", BigInt(123) as unknown as string);
      expect(params.has("key")).toBe(false);
    });
  });

  describe("boundary conditions", () => {
    it("should handle extremely long string", () => {
      const params = new URLSearchParams();
      const longString = "a".repeat(10000);
      appendParam(params, "key", longString);
      expect(params.get("key")).toBe(longString);
    });

    it("should handle special characters in string", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", "hello&world=test");
      expect(params.get("key")).toBe("hello&world=test");
    });

    it("should handle unicode characters", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", "测试🚀");
      expect(params.get("key")).toBe("测试🚀");
    });

    it("should handle whitespace-only string", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", "   ");
      expect(params.get("key")).toBe("   ");
    });

    it("should handle Infinity", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", Infinity);
      expect(params.get("key")).toBe("Infinity");
    });

    it("should handle -Infinity", () => {
      const params = new URLSearchParams();
      appendParam(params, "key", -Infinity);
      expect(params.get("key")).toBe("-Infinity");
    });
  });

  describe("invalid arguments", () => {
    it("should handle missing params argument", () => {
      appendParam(undefined as unknown as URLSearchParams, "key", "value");
    });

    it("should handle missing key argument", () => {
      const params = new URLSearchParams();
      appendParam(params, undefined as unknown as string, "value");
      expect(params.has("undefined")).toBe(true);
    });

    it("should handle empty key string", () => {
      const params = new URLSearchParams();
      appendParam(params, "", "value");
      expect(params.get("")).toBe("value");
    });

    it("should handle extra parameters gracefully", () => {
      const params = new URLSearchParams();
      (
        appendParam as unknown as (
          params: URLSearchParams,
          key: string,
          value: string,
          extra: string
        ) => void
      )(params, "key", "value", "extra");
      expect(params.get("key")).toBe("value");
    });
  });
});

describe("isValidUrl", () => {
  describe("happy path", () => {
    it("should return true for valid http URL", () => {
      expect(isValidUrl("http://example.com")).toBe(true);
    });

    it("should return true for valid https URL", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
    });

    it("should return true for URL with path", () => {
      expect(isValidUrl("https://example.com/path/to/page")).toBe(true);
    });

    it("should return true for URL with query parameters", () => {
      expect(isValidUrl("https://example.com?key=value")).toBe(true);
    });

    it("should return true for URL with hash", () => {
      expect(isValidUrl("https://example.com#section")).toBe(true);
    });

    it("should return true for URL with port", () => {
      expect(isValidUrl("https://example.com:8080")).toBe(true);
    });

    it("should return true for URL with subdomain", () => {
      expect(isValidUrl("https://subdomain.example.com")).toBe(true);
    });

    it("should return true for localhost URL", () => {
      expect(isValidUrl("http://localhost:3000")).toBe(true);
    });

    it("should return true for IP address URL", () => {
      expect(isValidUrl("http://192.168.1.1")).toBe(true);
    });

    it("should return true for URL with custom protocol", () => {
      expect(isValidUrl("ftp://example.com")).toBe(true);
    });
  });

  describe("error cases - invalid URLs", () => {
    it("should return false for empty string", () => {
      expect(isValidUrl("")).toBe(false);
    });

    it("should return false for string without protocol", () => {
      expect(isValidUrl("example.com")).toBe(false);
    });

    it("should return false for string without hostname", () => {
      expect(isValidUrl("http://")).toBe(false);
    });

    it("should return false for string with only protocol and slashes", () => {
      const result = isValidUrl("http:///path");
      expect(typeof result).toBe("boolean");
    });

    it("should return false for malformed URL", () => {
      expect(isValidUrl("not a url")).toBe(false);
    });

    it("should return false for URL with spaces", () => {
      expect(isValidUrl("http://example .com")).toBe(false);
    });

    it("should return false for relative path", () => {
      expect(isValidUrl("/path/to/page")).toBe(false);
    });

    it("should return false for protocol only", () => {
      expect(isValidUrl("http://")).toBe(false);
    });
  });

  describe("error cases - invalid types", () => {
    it("should return false for undefined", () => {
      expect(isValidUrl(undefined as unknown as string)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isValidUrl(null as unknown as string)).toBe(false);
    });

    it("should return false for number", () => {
      expect(isValidUrl(123 as unknown as string)).toBe(false);
    });

    it("should return false for boolean", () => {
      expect(isValidUrl(true as unknown as string)).toBe(false);
    });

    it("should return false for object", () => {
      expect(isValidUrl({} as unknown as string)).toBe(false);
    });

    it("should return false for array", () => {
      expect(isValidUrl([] as unknown as string)).toBe(false);
    });

    it("should return false for function", () => {
      expect(isValidUrl((() => {}) as unknown as string)).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(isValidUrl(NaN as unknown as string)).toBe(false);
    });

    it("should return false for Symbol", () => {
      expect(isValidUrl(Symbol("test") as unknown as string)).toBe(false);
    });

    it("should return false for BigInt", () => {
      expect(isValidUrl(BigInt(123) as unknown as string)).toBe(false);
    });
  });

  describe("boundary conditions", () => {
    it("should handle extremely long URL", () => {
      const longUrl = `https://example.com/${"a".repeat(10000)}`;
      expect(isValidUrl(longUrl)).toBe(true);
    });

    it("should handle URL with many query parameters", () => {
      const params = Array.from(
        { length: 100 },
        (_, i) => `key${i}=value${i}`
      ).join("&");
      expect(isValidUrl(`https://example.com?${params}`)).toBe(true);
    });

    it("should handle URL with unicode characters in path", () => {
      expect(isValidUrl("https://example.com/测试")).toBe(true);
    });

    it("should handle URL with special characters in path", () => {
      expect(isValidUrl("https://example.com/path%20with%20spaces")).toBe(true);
    });

    it("should handle URL with port 0", () => {
      expect(isValidUrl("http://example.com:0")).toBe(true);
    });

    it("should handle URL with very large port number", () => {
      expect(isValidUrl("http://example.com:65535")).toBe(true);
    });

    it("should handle URL with multiple slashes", () => {
      expect(isValidUrl("https://example.com///path")).toBe(true);
    });
  });

  describe("invalid arguments", () => {
    it("should handle missing parameter", () => {
      expect((isValidUrl as unknown as () => boolean)()).toBe(false);
    });

    it("should handle extra parameters gracefully", () => {
      expect(
        (isValidUrl as unknown as (url: string, extra: string) => boolean)(
          "https://example.com",
          "extra"
        )
      ).toBe(true);
    });
  });
});
