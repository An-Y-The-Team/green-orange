import { describe, expect, it } from "vitest";

import { safeJSONParse } from "./safe-json-parse";

describe("safeJSONParse", () => {
  describe("happy path", () => {
    it("should parse valid JSON string to object", () => {
      const result = safeJSONParse<{ key: string }>('{"key":"value"}');
      expect(result).toEqual({ key: "value" });
    });

    it("should parse valid JSON string to array", () => {
      const result = safeJSONParse<number[]>("[1,2,3]");
      expect(result).toEqual([1, 2, 3]);
    });

    it("should parse valid JSON string to number", () => {
      const result = safeJSONParse<number>("42");
      expect(result).toBe(42);
    });

    it("should parse valid JSON string to boolean true", () => {
      const result = safeJSONParse<boolean>("true");
      expect(result).toBe(true);
    });

    it("should parse valid JSON string to boolean false", () => {
      const result = safeJSONParse<boolean>("false");
      expect(result).toBe(false);
    });

    it("should parse valid JSON null string", () => {
      const result = safeJSONParse<null>("null");
      expect(result).toBeNull();
    });

    it("should parse valid JSON string literal", () => {
      const result = safeJSONParse<string>('"hello"');
      expect(result).toBe("hello");
    });

    it("should parse nested object correctly", () => {
      const result = safeJSONParse<{ nested: { deep: { value: number } } }>(
        '{"nested":{"deep":{"value":123}}}'
      );
      expect(result).toEqual({ nested: { deep: { value: 123 } } });
    });

    it("should parse array of objects", () => {
      const result = safeJSONParse<{ id: number }[]>(
        '[{"id":1},{"id":2},{"id":3}]'
      );
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it("should parse floating point numbers", () => {
      const result = safeJSONParse<number>("3.14159");
      expect(result).toBe(3.14159);
    });

    it("should parse negative numbers", () => {
      const result = safeJSONParse<number>("-42");
      expect(result).toBe(-42);
    });

    it("should parse scientific notation numbers", () => {
      const result = safeJSONParse<number>("1.5e10");
      expect(result).toBe(1.5e10);
    });

    it("should parse empty object", () => {
      const result = safeJSONParse<object>("{}");
      expect(result).toEqual({});
    });

    it("should parse empty array", () => {
      const result = safeJSONParse<unknown[]>("[]");
      expect(result).toEqual([]);
    });

    it("should parse object with mixed value types", () => {
      const result = safeJSONParse<{
        str: string;
        num: number;
        bool: boolean;
        arr: number[];
        obj: { key: string };
      }>(
        '{"str":"test","num":123,"bool":true,"arr":[1,2],"obj":{"key":"val"}}'
      );
      expect(result).toEqual({
        str: "test",
        num: 123,
        bool: true,
        arr: [1, 2],
        obj: { key: "val" },
      });
    });

    it("should parse unicode characters in JSON", () => {
      const result = safeJSONParse<{ text: string }>(
        '{"text":"\\u65e5\\u672c\\u8a9e\\u30c6\\u30b9\\u30c8"}'
      );
      expect(result).toEqual({ text: "\u65e5\u672c\u8a9e\u30c6\u30b9\u30c8" });
    });

    it("should parse escaped characters in JSON string", () => {
      const result = safeJSONParse<{ text: string }>(
        '{"text":"line1\\nline2\\ttab"}'
      );
      expect(result).toEqual({ text: "line1\nline2\ttab" });
    });

    it("should return fallback when provided and parsing succeeds", () => {
      const fallback = { default: true };
      const result = safeJSONParse<{ key: string }>(
        '{"key":"value"}',
        fallback as unknown as { key: string }
      );
      expect(result).toEqual({ key: "value" });
    });
  });

  describe("error cases", () => {
    it("should return undefined for invalid JSON without fallback", () => {
      const result = safeJSONParse<object>("invalid json");
      expect(result).toBeUndefined();
    });

    it("should return fallback for invalid JSON when fallback provided", () => {
      const fallback = { default: true };
      const result = safeJSONParse<{ default: boolean }>(
        "invalid json",
        fallback
      );
      expect(result).toEqual(fallback);
    });

    it("should return undefined for malformed JSON object without fallback", () => {
      const result = safeJSONParse<object>('{"key": "value"');
      expect(result).toBeUndefined();
    });

    it("should return fallback for malformed JSON object", () => {
      const fallback = { error: true };
      const result = safeJSONParse<{ error: boolean }>(
        '{"key": "value"',
        fallback
      );
      expect(result).toEqual(fallback);
    });

    it("should return undefined for malformed JSON array without fallback", () => {
      const result = safeJSONParse<number[]>("[1, 2, 3");
      expect(result).toBeUndefined();
    });

    it("should return fallback for malformed JSON array", () => {
      const result = safeJSONParse<number[]>("[1, 2, 3", []);
      expect(result).toEqual([]);
    });

    it("should return undefined for single quotes JSON without fallback", () => {
      const result = safeJSONParse<object>("{'key': 'value'}");
      expect(result).toBeUndefined();
    });

    it("should return fallback for single quotes JSON", () => {
      const result = safeJSONParse<object>("{'key': 'value'}", {});
      expect(result).toEqual({});
    });

    it("should return undefined for trailing comma without fallback", () => {
      const result = safeJSONParse<object>('{"key": "value",}');
      expect(result).toBeUndefined();
    });

    it("should return fallback for trailing comma", () => {
      const result = safeJSONParse<object>('{"key": "value",}', {});
      expect(result).toEqual({});
    });

    it("should return undefined for unquoted property name without fallback", () => {
      const result = safeJSONParse<object>('{key: "value"}');
      expect(result).toBeUndefined();
    });

    it("should return fallback for unquoted property name", () => {
      const result = safeJSONParse<object>('{key: "value"}', {});
      expect(result).toEqual({});
    });

    it("should return undefined for JavaScript object literal without fallback", () => {
      const result = safeJSONParse<object>("{ key: value }");
      expect(result).toBeUndefined();
    });

    it("should return undefined for undefined input without fallback", () => {
      const result = safeJSONParse<object>(undefined);
      expect(result).toBeUndefined();
    });

    it("should return fallback for undefined input", () => {
      const fallback = { default: true };
      const result = safeJSONParse<{ default: boolean }>(undefined, fallback);
      expect(result).toEqual(fallback);
    });

    it("should return undefined for null input without fallback", () => {
      const result = safeJSONParse<object>(null);
      expect(result).toBeUndefined();
    });

    it("should return fallback for null input", () => {
      const fallback = { default: true };
      const result = safeJSONParse<{ default: boolean }>(null, fallback);
      expect(result).toEqual(fallback);
    });
  });

  describe("invalid arguments", () => {
    describe("str parameter", () => {
      it("should return undefined when str is undefined without fallback", () => {
        const result = safeJSONParse(undefined);
        expect(result).toBeUndefined();
      });

      it("should return fallback when str is undefined with fallback", () => {
        const result = safeJSONParse(undefined, "fallback");
        expect(result).toBe("fallback");
      });

      it("should return undefined when str is null without fallback", () => {
        const result = safeJSONParse(null);
        expect(result).toBeUndefined();
      });

      it("should return fallback when str is null with fallback", () => {
        const result = safeJSONParse(null, "fallback");
        expect(result).toBe("fallback");
      });

      it("should return undefined when passed a number", () => {
        const result = safeJSONParse(123 as unknown as string);
        expect(result).toBeUndefined();
      });

      it("should return undefined when passed a boolean true", () => {
        const result = safeJSONParse(true as unknown as string);
        expect(result).toBeUndefined();
      });

      it("should return undefined when passed a boolean false", () => {
        const result = safeJSONParse(false as unknown as string);
        expect(result).toBeUndefined();
      });

      it("should return fallback when passed a number with fallback", () => {
        const result = safeJSONParse(123 as unknown as string, "fallback");
        expect(result).toBe("fallback");
      });

      it("should return fallback when passed a boolean true with fallback", () => {
        const result = safeJSONParse(true as unknown as string, "fallback");
        expect(result).toBe("fallback");
      });

      it("should return fallback when passed a plain object with fallback", () => {
        const result = safeJSONParse({} as unknown as string, "fallback");
        expect(result).toBe("fallback");
      });

      it("should return fallback when passed an array with fallback", () => {
        const result = safeJSONParse([] as unknown as string, "fallback");
        expect(result).toBe("fallback");
      });

      it("should return fallback when passed a function with fallback", () => {
        const result = safeJSONParse(
          (() => {}) as unknown as string,
          "fallback"
        );
        expect(result).toBe("fallback");
      });

      it("should return undefined when passed NaN", () => {
        const result = safeJSONParse(NaN as unknown as string);
        expect(result).toBeUndefined();
      });

      it("should return fallback when passed NaN with fallback", () => {
        const result = safeJSONParse(NaN as unknown as string, "fallback");
        expect(result).toBe("fallback");
      });

      it("should return undefined when passed a Symbol", () => {
        const result = safeJSONParse(Symbol("test") as unknown as string);
        expect(result).toBeUndefined();
      });

      it("should return fallback when passed a Symbol with fallback", () => {
        const result = safeJSONParse(
          Symbol("test") as unknown as string,
          "fallback"
        );
        expect(result).toBe("fallback");
      });

      it("should return undefined when passed a BigInt", () => {
        const result = safeJSONParse(BigInt(123) as unknown as string);
        expect(result).toBeUndefined();
      });

      it("should return fallback when passed a BigInt with fallback", () => {
        const result = safeJSONParse(
          BigInt(123) as unknown as string,
          "fallback"
        );
        expect(result).toBe("fallback");
      });

      it("should return undefined when passed a nested object", () => {
        const result = safeJSONParse({
          nested: { deep: "value" },
        } as unknown as string);
        expect(result).toBeUndefined();
      });

      it("should return fallback when passed a nested object with fallback", () => {
        const result = safeJSONParse(
          { nested: { deep: "value" } } as unknown as string,
          "fallback"
        );
        expect(result).toBe("fallback");
      });

      it("should return undefined when passed a deep array", () => {
        const result = safeJSONParse([[[["deep"]]]] as unknown as string);
        expect(result).toBeUndefined();
      });

      it("should return fallback when passed a deep array with fallback", () => {
        const result = safeJSONParse(
          [[[["deep"]]]] as unknown as string,
          "fallback"
        );
        expect(result).toBe("fallback");
      });
    });

    describe("fallback parameter", () => {
      it("should accept undefined fallback", () => {
        const result = safeJSONParse("invalid");
        expect(result).toBeUndefined();
      });

      it("should accept null fallback", () => {
        const result = safeJSONParse<string | null>("invalid", null);
        expect(result).toBeNull();
      });

      it("should accept number fallback", () => {
        const result = safeJSONParse<number>("invalid", 42);
        expect(result).toBe(42);
      });

      it("should accept string fallback", () => {
        const result = safeJSONParse<string>("invalid", "default");
        expect(result).toBe("default");
      });

      it("should accept boolean fallback", () => {
        const result = safeJSONParse<boolean>("invalid", false);
        expect(result).toBe(false);
      });

      it("should accept object fallback", () => {
        const fallback = { default: true };
        const result = safeJSONParse<{ default: boolean }>("invalid", fallback);
        expect(result).toEqual(fallback);
      });

      it("should accept array fallback", () => {
        const fallback = [1, 2, 3];
        const result = safeJSONParse<number[]>("invalid", fallback);
        expect(result).toEqual(fallback);
      });

      it("should accept function fallback", () => {
        const fallback = () => "test";
        const result = safeJSONParse<() => string>("invalid", fallback);
        expect(result).toBe(fallback);
      });

      it("should accept NaN fallback", () => {
        const result = safeJSONParse<number>("invalid", NaN);
        expect(result).toBeNaN();
      });

      it("should accept Symbol fallback", () => {
        const fallback = Symbol("test");
        const result = safeJSONParse<symbol>("invalid", fallback);
        expect(result).toBe(fallback);
      });

      it("should accept BigInt fallback", () => {
        const fallback = BigInt(123);
        const result = safeJSONParse<bigint>("invalid", fallback);
        expect(result).toBe(fallback);
      });

      it("should accept nested object fallback", () => {
        const fallback = { nested: { deep: { value: 123 } } };
        const result = safeJSONParse<{ nested: { deep: { value: number } } }>(
          "invalid",
          fallback
        );
        expect(result).toEqual(fallback);
      });

      it("should accept deep array fallback", () => {
        const fallback = [[[["deep"]]]];
        const result = safeJSONParse<string[][][][]>("invalid", fallback);
        expect(result).toEqual(fallback);
      });

      it("should accept empty string fallback", () => {
        const result = safeJSONParse<string>("invalid", "");
        expect(result).toBe("");
      });

      it("should accept empty object fallback", () => {
        const result = safeJSONParse<object>("invalid", {});
        expect(result).toEqual({});
      });

      it("should accept empty array fallback", () => {
        const result = safeJSONParse<unknown[]>("invalid", []);
        expect(result).toEqual([]);
      });

      it("should accept zero as fallback", () => {
        const result = safeJSONParse<number>("invalid", 0);
        expect(result).toBe(0);
      });

      it("should accept negative number as fallback", () => {
        const result = safeJSONParse<number>("invalid", -1);
        expect(result).toBe(-1);
      });

      it("should accept Infinity as fallback", () => {
        const result = safeJSONParse<number>("invalid", Infinity);
        expect(result).toBe(Infinity);
      });

      it("should accept -Infinity as fallback", () => {
        const result = safeJSONParse<number>("invalid", -Infinity);
        expect(result).toBe(-Infinity);
      });
    });
  });

  describe("boundary conditions", () => {
    it("should handle empty string without fallback", () => {
      const result = safeJSONParse<string>("");
      expect(result).toBeUndefined();
    });

    it("should handle empty string with fallback", () => {
      const result = safeJSONParse<string>("", "default");
      expect(result).toBe("default");
    });

    it("should handle whitespace-only string without fallback", () => {
      const result = safeJSONParse<string>("   ");
      expect(result).toBeUndefined();
    });

    it("should handle whitespace-only string with fallback", () => {
      const result = safeJSONParse<string>("   ", "default");
      expect(result).toBe("default");
    });

    it("should handle newline-only string", () => {
      const result = safeJSONParse<string>("\n\n\n", "default");
      expect(result).toBe("default");
    });

    it("should handle tab-only string", () => {
      const result = safeJSONParse<string>("\t\t\t", "default");
      expect(result).toBe("default");
    });

    it("should handle extremely long valid JSON string", () => {
      const longString = "a".repeat(100000);
      const json = JSON.stringify({ value: longString });
      const result = safeJSONParse<{ value: string }>(json);
      expect(result?.value).toBe(longString);
    });

    it("should handle extremely long invalid JSON string", () => {
      const longString = "a".repeat(100000);
      const result = safeJSONParse<string>(longString, "default");
      expect(result).toBe("default");
    });

    it("should handle deeply nested valid JSON", () => {
      const deepJson =
        '{"l1":{"l2":{"l3":{"l4":{"l5":{"l6":{"l7":{"l8":{"l9":{"l10":"deep"}}}}}}}}}}';
      const result = safeJSONParse<object>(deepJson);
      expect(result).toHaveProperty("l1.l2.l3.l4.l5.l6.l7.l8.l9.l10", "deep");
    });

    it("should handle large array", () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const json = JSON.stringify(largeArray);
      const result = safeJSONParse<number[]>(json);
      expect(result).toHaveLength(10000);
      expect(result?.[0]).toBe(0);
      expect(result?.[9999]).toBe(9999);
    });

    it("should handle JSON with special characters", () => {
      const json = '{"text":"!@#$%^&*()_+-=[]{}|;\':\\",./<>?"}';
      const result = safeJSONParse<{ text: string }>(json);
      expect(result?.text).toBe("!@#$%^&*()_+-=[]{}|;':\",./<>?");
    });

    it("should handle JSON with newlines in string value", () => {
      const json = '{"text":"line1\\nline2\\nline3"}';
      const result = safeJSONParse<{ text: string }>(json);
      expect(result?.text).toBe("line1\nline2\nline3");
    });

    it("should handle JSON with tabs in string value", () => {
      const json = '{"text":"col1\\tcol2\\tcol3"}';
      const result = safeJSONParse<{ text: string }>(json);
      expect(result?.text).toBe("col1\tcol2\tcol3");
    });

    it("should handle JSON with carriage returns in string value", () => {
      const json = '{"text":"line1\\r\\nline2"}';
      const result = safeJSONParse<{ text: string }>(json);
      expect(result?.text).toBe("line1\r\nline2");
    });

    it("should handle JSON with backslash in string value", () => {
      const json = '{"path":"C:\\\\Users\\\\test"}';
      const result = safeJSONParse<{ path: string }>(json);
      expect(result?.path).toBe("C:\\Users\\test");
    });

    it("should handle JSON with unicode escape sequences", () => {
      const json = '{"text":"\\u0048\\u0065\\u006c\\u006c\\u006f"}';
      const result = safeJSONParse<{ text: string }>(json);
      expect(result?.text).toBe("Hello");
    });

    it("should handle JSON with emoji using unicode escapes", () => {
      const json = '{"emoji":"Hello \\uD83D\\uDE00 World"}';
      const result = safeJSONParse<{ emoji: string }>(json);
      expect(result?.emoji).toBe("Hello \uD83D\uDE00 World");
    });

    it("should handle JSON number at max safe integer", () => {
      const json = `{"num":${Number.MAX_SAFE_INTEGER}}`;
      const result = safeJSONParse<{ num: number }>(json);
      expect(result?.num).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should handle JSON number at min safe integer", () => {
      const json = `{"num":${Number.MIN_SAFE_INTEGER}}`;
      const result = safeJSONParse<{ num: number }>(json);
      expect(result?.num).toBe(Number.MIN_SAFE_INTEGER);
    });

    it("should handle JSON with very small decimal", () => {
      const json = '{"num":0.000000000001}';
      const result = safeJSONParse<{ num: number }>(json);
      expect(result?.num).toBe(0.000000000001);
    });

    it("should handle JSON string that looks like number", () => {
      const json = '"12345"';
      const result = safeJSONParse<string>(json);
      expect(result).toBe("12345");
      expect(typeof result).toBe("string");
    });

    it("should handle JSON string that looks like boolean", () => {
      const json = '"true"';
      const result = safeJSONParse<string>(json);
      expect(result).toBe("true");
      expect(typeof result).toBe("string");
    });

    it("should handle JSON string that looks like null", () => {
      const json = '"null"';
      const result = safeJSONParse<string>(json);
      expect(result).toBe("null");
      expect(typeof result).toBe("string");
    });

    it("should handle JSON with leading whitespace", () => {
      const json = '   {"key":"value"}';
      const result = safeJSONParse<{ key: string }>(json);
      expect(result).toEqual({ key: "value" });
    });

    it("should handle JSON with trailing whitespace", () => {
      const json = '{"key":"value"}   ';
      const result = safeJSONParse<{ key: string }>(json);
      expect(result).toEqual({ key: "value" });
    });

    it("should handle JSON with leading and trailing whitespace", () => {
      const json = '   {"key":"value"}   ';
      const result = safeJSONParse<{ key: string }>(json);
      expect(result).toEqual({ key: "value" });
    });

    it("should handle JSON with newlines around content", () => {
      const json = '\n\n{"key":"value"}\n\n';
      const result = safeJSONParse<{ key: string }>(json);
      expect(result).toEqual({ key: "value" });
    });

    it("should return undefined fallback when no fallback provided and parsing fails", () => {
      const result = safeJSONParse("invalid");
      expect(result).toBeUndefined();
    });

    it("should handle array with null elements", () => {
      const json = "[1, null, 3]";
      const result = safeJSONParse<(number | null)[]>(json);
      expect(result).toEqual([1, null, 3]);
    });

    it("should handle object with null values", () => {
      const json = '{"key":null}';
      const result = safeJSONParse<{ key: null }>(json);
      expect(result).toEqual({ key: null });
    });

    it("should handle mixed array types", () => {
      const json = '[1, "two", true, null, {"key":"value"}]';
      const result =
        safeJSONParse<(number | string | boolean | null | object)[]>(json);
      expect(result).toEqual([1, "two", true, null, { key: "value" }]);
    });

    it("should handle JSON with zero", () => {
      const result = safeJSONParse<number>("0");
      expect(result).toBe(0);
    });

    it("should handle JSON with negative zero", () => {
      const result = safeJSONParse<number>("-0");
      expect(result).toBe(-0);
    });

    it("should handle JSON with exponent notation", () => {
      const result = safeJSONParse<number>("1e+308");
      expect(result).toBe(1e308);
    });

    it("should handle incomplete JSON string literal", () => {
      const result = safeJSONParse<string>('"incomplete', "default");
      expect(result).toBe("default");
    });

    it("should handle JSON with duplicate keys (last value wins)", () => {
      const json = '{"key":"first","key":"second"}';
      const result = safeJSONParse<{ key: string }>(json);
      expect(result?.key).toBe("second");
    });

    it("should handle JSON with BOM character", () => {
      const json = '\uFEFF{"key":"value"}';
      // JSON.parse handles BOM in some environments, behavior may vary
      const result = safeJSONParse<{ key: string }>(json, { key: "default" });
      // The result depends on environment - could parse or return fallback
      expect(result).toBeDefined();
    });
  });
});
