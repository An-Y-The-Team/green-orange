import { describe, expect, it, vi } from "vitest";

import {
  addFormDataFields,
  appendDirtyFields,
  parseFormDataArray,
  parseFormDataBoolean,
  parseFormDataNumber,
} from "./form-data";

vi.mock("../safe-json-parse/safe-json-parse", () => ({
  safeJSONParse: vi.fn((str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return undefined;
    }
  }),
}));

describe("parseFormDataArray", () => {
  describe("happy path", () => {
    it("should parse a valid JSON array from FormData", () => {
      const formData = new FormData();
      formData.append("tags", '["a", "b", "c"]');
      const result = parseFormDataArray("tags", formData);
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("should parse an empty JSON array from FormData", () => {
      const formData = new FormData();
      formData.append("tags", "[]");
      const result = parseFormDataArray("tags", formData);
      expect(result).toEqual([]);
    });

    it("should parse a single-element JSON array", () => {
      const formData = new FormData();
      formData.append("items", '["single"]');
      const result = parseFormDataArray("items", formData);
      expect(result).toEqual(["single"]);
    });

    it("should parse a JSON array with numbers as strings", () => {
      const formData = new FormData();
      formData.append("nums", '["1", "2", "3"]');
      const result = parseFormDataArray("nums", formData);
      expect(result).toEqual(["1", "2", "3"]);
    });
  });

  describe("error cases", () => {
    it("should return undefined when field does not exist", () => {
      const formData = new FormData();
      const result = parseFormDataArray("nonexistent", formData);
      expect(result).toBeUndefined();
    });

    it("should return undefined for invalid JSON string", () => {
      const formData = new FormData();
      formData.append("broken", "not valid json");
      const result = parseFormDataArray("broken", formData);
      expect(result).toBeUndefined();
    });

    it("should return undefined for malformed JSON array", () => {
      const formData = new FormData();
      formData.append("malformed", "[a, b, c]");
      const result = parseFormDataArray("malformed", formData);
      expect(result).toBeUndefined();
    });

    it("should return undefined for incomplete JSON array", () => {
      const formData = new FormData();
      formData.append("incomplete", '["a", "b"');
      const result = parseFormDataArray("incomplete", formData);
      expect(result).toBeUndefined();
    });
  });

  describe("invalid arguments", () => {
    it("should throw TypeError for undefined fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataArray(undefined as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for null fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataArray(null as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for number as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataArray(123 as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for boolean as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataArray(true as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for object as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataArray({} as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for array as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataArray([] as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for function as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataArray((() => {}) as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for NaN as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataArray(NaN as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw for Symbol as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataArray(Symbol("test") as unknown as string, formData)
      ).toThrow();
    });

    it("should throw TypeError for BigInt as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataArray(BigInt(123) as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for undefined formData", () => {
      expect(() =>
        parseFormDataArray("field", undefined as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for null formData", () => {
      expect(() =>
        parseFormDataArray("field", null as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for string as formData", () => {
      expect(() =>
        parseFormDataArray("field", "not formdata" as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for number as formData", () => {
      expect(() =>
        parseFormDataArray("field", 123 as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for plain object as formData", () => {
      expect(() =>
        parseFormDataArray("field", {} as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for array as formData", () => {
      expect(() =>
        parseFormDataArray("field", [] as unknown as FormData)
      ).toThrow(TypeError);
    });
  });

  describe("boundary conditions", () => {
    it("should handle empty string fieldName", () => {
      const formData = new FormData();
      formData.append("", '["test"]');
      const result = parseFormDataArray("", formData);
      expect(result).toEqual(["test"]);
    });

    it("should handle extremely long string in array", () => {
      const formData = new FormData();
      const longString = "a".repeat(100000);
      formData.append("long", JSON.stringify([longString]));
      const result = parseFormDataArray("long", formData);
      expect(result).toEqual([longString]);
    });

    it("should handle array with many elements", () => {
      const formData = new FormData();
      const largeArray = Array.from({ length: 10000 }, (_, i) => `item${i}`);
      formData.append("large", JSON.stringify(largeArray));
      const result = parseFormDataArray("large", formData);
      expect(result).toEqual(largeArray);
    });

    it("should handle nested arrays (returns parsed structure)", () => {
      const formData = new FormData();
      formData.append("nested", '[["a", "b"], ["c", "d"]]');
      const result = parseFormDataArray("nested", formData);
      expect(result).toEqual([
        ["a", "b"],
        ["c", "d"],
      ]);
    });

    it("should handle array with special characters", () => {
      const formData = new FormData();
      formData.append("special", '["<script>", "\\n\\t", "emoji🎉"]');
      const result = parseFormDataArray("special", formData);
      expect(result).toEqual(["<script>", "\n\t", "emoji🎉"]);
    });

    it("should handle array with unicode characters", () => {
      const formData = new FormData();
      formData.append("unicode", '["日本語", "中文", "한국어"]');
      const result = parseFormDataArray("unicode", formData);
      expect(result).toEqual(["日本語", "中文", "한국어"]);
    });

    it("should handle array with null values", () => {
      const formData = new FormData();
      formData.append("nulls", '["a", null, "b"]');
      const result = parseFormDataArray("nulls", formData);
      expect(result).toEqual(["a", null, "b"]);
    });

    it("should handle field with whitespace-only value", () => {
      const formData = new FormData();
      formData.append("whitespace", "   ");
      const result = parseFormDataArray("whitespace", formData);
      expect(result).toBeUndefined();
    });
  });
});

describe("parseFormDataBoolean", () => {
  describe("happy path", () => {
    it('should return true when value is "true"', () => {
      const formData = new FormData();
      formData.append("enabled", "true");
      const result = parseFormDataBoolean("enabled", formData);
      expect(result).toBe(true);
    });

    it("should return undefined when field does not exist", () => {
      const formData = new FormData();
      const result = parseFormDataBoolean("nonexistent", formData);
      expect(result).toBeUndefined();
    });
  });

  describe("error cases", () => {
    it('should return undefined when value is "false"', () => {
      const formData = new FormData();
      formData.append("enabled", "false");
      const result = parseFormDataBoolean("enabled", formData);
      expect(result).toBeUndefined();
    });

    it('should return undefined when value is "TRUE" (case sensitive)', () => {
      const formData = new FormData();
      formData.append("enabled", "TRUE");
      const result = parseFormDataBoolean("enabled", formData);
      expect(result).toBeUndefined();
    });

    it('should return undefined when value is "True"', () => {
      const formData = new FormData();
      formData.append("enabled", "True");
      const result = parseFormDataBoolean("enabled", formData);
      expect(result).toBeUndefined();
    });

    it("should return undefined when value is empty string", () => {
      const formData = new FormData();
      formData.append("enabled", "");
      const result = parseFormDataBoolean("enabled", formData);
      expect(result).toBeUndefined();
    });

    it('should return undefined when value is "1"', () => {
      const formData = new FormData();
      formData.append("enabled", "1");
      const result = parseFormDataBoolean("enabled", formData);
      expect(result).toBeUndefined();
    });

    it('should return undefined when value is "yes"', () => {
      const formData = new FormData();
      formData.append("enabled", "yes");
      const result = parseFormDataBoolean("enabled", formData);
      expect(result).toBeUndefined();
    });

    it('should return undefined when value is "on"', () => {
      const formData = new FormData();
      formData.append("enabled", "on");
      const result = parseFormDataBoolean("enabled", formData);
      expect(result).toBeUndefined();
    });
  });

  describe("invalid arguments", () => {
    it("should throw TypeError for undefined fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataBoolean(undefined as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for null fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataBoolean(null as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for number as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataBoolean(123 as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for boolean as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataBoolean(true as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for object as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataBoolean({} as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for array as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataBoolean([] as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for function as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataBoolean((() => {}) as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for NaN as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataBoolean(NaN as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw for Symbol as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataBoolean(Symbol("test") as unknown as string, formData)
      ).toThrow();
    });

    it("should throw TypeError for BigInt as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataBoolean(BigInt(123) as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for undefined formData", () => {
      expect(() =>
        parseFormDataBoolean("field", undefined as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for null formData", () => {
      expect(() =>
        parseFormDataBoolean("field", null as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for string as formData", () => {
      expect(() =>
        parseFormDataBoolean("field", "not formdata" as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for number as formData", () => {
      expect(() =>
        parseFormDataBoolean("field", 123 as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for plain object as formData", () => {
      expect(() =>
        parseFormDataBoolean("field", {} as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for array as formData", () => {
      expect(() =>
        parseFormDataBoolean("field", [] as unknown as FormData)
      ).toThrow(TypeError);
    });
  });

  describe("boundary conditions", () => {
    it("should handle empty string fieldName", () => {
      const formData = new FormData();
      formData.append("", "true");
      const result = parseFormDataBoolean("", formData);
      expect(result).toBe(true);
    });

    it('should handle whitespace around "true"', () => {
      const formData = new FormData();
      formData.append("enabled", " true ");
      const result = parseFormDataBoolean("enabled", formData);
      expect(result).toBeUndefined();
    });

    it("should handle multiple values for same field (uses first)", () => {
      const formData = new FormData();
      formData.append("enabled", "true");
      formData.append("enabled", "false");
      const result = parseFormDataBoolean("enabled", formData);
      expect(result).toBe(true);
    });

    it("should handle field name with special characters", () => {
      const formData = new FormData();
      formData.append("is-enabled?", "true");
      const result = parseFormDataBoolean("is-enabled?", formData);
      expect(result).toBe(true);
    });
  });
});

describe("parseFormDataNumber", () => {
  describe("happy path", () => {
    it("should parse a positive integer", () => {
      const formData = new FormData();
      formData.append("count", "42");
      const result = parseFormDataNumber("count", formData);
      expect(result).toBe(42);
    });

    it("should parse a negative integer", () => {
      const formData = new FormData();
      formData.append("count", "-42");
      const result = parseFormDataNumber("count", formData);
      expect(result).toBe(-42);
    });

    it("should parse zero", () => {
      const formData = new FormData();
      formData.append("count", "0");
      const result = parseFormDataNumber("count", formData);
      expect(result).toBe(0);
    });

    it("should parse a floating point number", () => {
      const formData = new FormData();
      formData.append("price", "19.99");
      const result = parseFormDataNumber("price", formData);
      expect(result).toBe(19.99);
    });

    it("should parse a negative floating point number", () => {
      const formData = new FormData();
      formData.append("temp", "-273.15");
      const result = parseFormDataNumber("temp", formData);
      expect(result).toBe(-273.15);
    });

    it("should parse scientific notation", () => {
      const formData = new FormData();
      formData.append("big", "1e10");
      const result = parseFormDataNumber("big", formData);
      expect(result).toBe(1e10);
    });
  });

  describe("error cases", () => {
    it("should return undefined when field does not exist", () => {
      const formData = new FormData();
      const result = parseFormDataNumber("nonexistent", formData);
      expect(result).toBeUndefined();
    });

    it("should return NaN for non-numeric string", () => {
      const formData = new FormData();
      formData.append("count", "not a number");
      const result = parseFormDataNumber("count", formData);
      expect(result).toBeNaN();
    });

    it("should return NaN for empty string", () => {
      const formData = new FormData();
      formData.append("count", "");
      const result = parseFormDataNumber("count", formData);
      expect(result).toBeNaN();
    });

    it("should return NaN for whitespace only", () => {
      const formData = new FormData();
      formData.append("count", "   ");
      const result = parseFormDataNumber("count", formData);
      expect(result).toBeNaN();
    });

    it("should return NaN for mixed string with leading number", () => {
      const formData = new FormData();
      formData.append("count", "42abc");
      const result = parseFormDataNumber("count", formData);
      expect(result).toBeNaN();
    });
  });

  describe("invalid arguments", () => {
    it("should throw TypeError for undefined fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataNumber(undefined as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for null fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataNumber(null as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for number as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataNumber(123 as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for boolean as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataNumber(true as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for object as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataNumber({} as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for array as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataNumber([] as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for function as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataNumber((() => {}) as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for NaN as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataNumber(NaN as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw for Symbol as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataNumber(Symbol("test") as unknown as string, formData)
      ).toThrow();
    });

    it("should throw TypeError for BigInt as fieldName", () => {
      const formData = new FormData();
      expect(() =>
        parseFormDataNumber(BigInt(123) as unknown as string, formData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for undefined formData", () => {
      expect(() =>
        parseFormDataNumber("field", undefined as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for null formData", () => {
      expect(() =>
        parseFormDataNumber("field", null as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for string as formData", () => {
      expect(() =>
        parseFormDataNumber("field", "not formdata" as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for number as formData", () => {
      expect(() =>
        parseFormDataNumber("field", 123 as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for plain object as formData", () => {
      expect(() =>
        parseFormDataNumber("field", {} as unknown as FormData)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for array as formData", () => {
      expect(() =>
        parseFormDataNumber("field", [] as unknown as FormData)
      ).toThrow(TypeError);
    });
  });

  describe("boundary conditions", () => {
    it("should handle empty string fieldName", () => {
      const formData = new FormData();
      formData.append("", "123");
      const result = parseFormDataNumber("", formData);
      expect(result).toBe(123);
    });

    it("should handle Number.MAX_VALUE", () => {
      const formData = new FormData();
      formData.append("max", String(Number.MAX_VALUE));
      const result = parseFormDataNumber("max", formData);
      expect(result).toBe(Number.MAX_VALUE);
    });

    it("should handle Number.MIN_VALUE", () => {
      const formData = new FormData();
      formData.append("min", String(Number.MIN_VALUE));
      const result = parseFormDataNumber("min", formData);
      expect(result).toBe(Number.MIN_VALUE);
    });

    it("should handle Infinity", () => {
      const formData = new FormData();
      formData.append("inf", "Infinity");
      const result = parseFormDataNumber("inf", formData);
      expect(result).toBe(Infinity);
    });

    it("should handle -Infinity", () => {
      const formData = new FormData();
      formData.append("ninf", "-Infinity");
      const result = parseFormDataNumber("ninf", formData);
      expect(result).toBe(-Infinity);
    });

    it("should handle leading zeros", () => {
      const formData = new FormData();
      formData.append("num", "007");
      const result = parseFormDataNumber("num", formData);
      expect(result).toBe(7);
    });

    it("should handle decimal without leading zero", () => {
      const formData = new FormData();
      formData.append("num", ".5");
      const result = parseFormDataNumber("num", formData);
      expect(result).toBe(0.5);
    });

    it("should handle multiple decimal points (NaN)", () => {
      const formData = new FormData();
      formData.append("num", "1.2.3");
      const result = parseFormDataNumber("num", formData);
      expect(result).toBeNaN();
    });

    it("should handle hex notation", () => {
      const formData = new FormData();
      formData.append("hex", "0xFF");
      const result = parseFormDataNumber("hex", formData);
      expect(result).toBe(255);
    });

    it("should handle binary notation", () => {
      const formData = new FormData();
      formData.append("bin", "0b1010");
      const result = parseFormDataNumber("bin", formData);
      expect(result).toBe(10);
    });

    it("should handle octal notation", () => {
      const formData = new FormData();
      formData.append("oct", "0o17");
      const result = parseFormDataNumber("oct", formData);
      expect(result).toBe(15);
    });
  });
});

describe("addFormDataFields", () => {
  describe("happy path", () => {
    it("should add string field to target object", () => {
      const formData = new FormData();
      formData.append("name", "John");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, { name: "name" });
      expect(result).toEqual({ name: "John" });
    });

    it("should add multiple fields to target object", () => {
      const formData = new FormData();
      formData.append("name", "John");
      formData.append("email", "john@example.com");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, {
        name: "name",
        email: "email",
      });
      expect(result).toEqual({ name: "John", email: "john@example.com" });
    });

    it("should use different field name when specified", () => {
      const formData = new FormData();
      formData.append("user_name", "John");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, {
        userName: "user_name",
      });
      expect(result).toEqual({ userName: "John" });
    });

    it("should use function callback for custom processing", () => {
      const formData = new FormData();
      formData.append("count", "42");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, {
        count: () => 42,
      });
      expect(result).toEqual({ count: 42 });
    });

    it("should preserve existing target properties", () => {
      const formData = new FormData();
      formData.append("name", "John");
      const target = { existing: "value" };
      const result = addFormDataFields(formData, target, {
        name: "name",
      } as unknown as Partial<Record<"existing", string | (() => unknown)>>);
      expect(result).toEqual({ existing: "value", name: "John" });
    });

    it("should return same target object reference", () => {
      const formData = new FormData();
      formData.append("name", "John");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, { name: "name" });
      expect(result).toBe(target);
    });
  });

  describe("error cases", () => {
    it("should not add field if it does not exist in FormData", () => {
      const formData = new FormData();
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, {
        missing: "missing",
      });
      expect(result).toEqual({});
    });

    it("should set undefined for empty string value", () => {
      const formData = new FormData();
      formData.append("name", "");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, { name: "name" });
      expect(result).toEqual({ name: undefined });
    });

    it("should use key as field name when string config matches key", () => {
      const formData = new FormData();
      formData.append("name", "John");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, { name: "name" });
      expect(result).toEqual({ name: "John" });
    });
  });

  describe("invalid arguments", () => {
    it("should throw TypeError for undefined formData", () => {
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(undefined as unknown as FormData, target, {})
      ).toThrow(TypeError);
    });

    it("should throw TypeError for null formData", () => {
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(null as unknown as FormData, target, {})
      ).toThrow(TypeError);
    });

    it("should throw TypeError for string as formData", () => {
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields("not formdata" as unknown as FormData, target, {})
      ).toThrow(TypeError);
    });

    it("should throw TypeError for object as formData", () => {
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields({} as unknown as FormData, target, {})
      ).toThrow(TypeError);
    });

    it("should throw TypeError for array as formData", () => {
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields([] as unknown as FormData, target, {})
      ).toThrow(TypeError);
    });

    it("should throw TypeError for function as formData", () => {
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields((() => {}) as unknown as FormData, target, {})
      ).toThrow(TypeError);
    });

    it("should throw TypeError for Symbol as formData", () => {
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(Symbol("test") as unknown as FormData, target, {})
      ).toThrow(TypeError);
    });

    it("should throw TypeError for BigInt as formData", () => {
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(BigInt(123) as unknown as FormData, target, {})
      ).toThrow(TypeError);
    });

    it("should throw TypeError for number as formData", () => {
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(123 as unknown as FormData, target, {})
      ).toThrow(TypeError);
    });

    it("should throw TypeError for undefined target", () => {
      const formData = new FormData();
      expect(() =>
        addFormDataFields(
          formData,
          undefined as unknown as Record<string, unknown>,
          {}
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for null target", () => {
      const formData = new FormData();
      expect(() =>
        addFormDataFields(
          formData,
          null as unknown as Record<string, unknown>,
          {}
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for string as target", () => {
      const formData = new FormData();
      expect(() =>
        addFormDataFields(
          formData,
          "not object" as unknown as Record<string, unknown>,
          {}
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for number as target", () => {
      const formData = new FormData();
      expect(() =>
        addFormDataFields(
          formData,
          123 as unknown as Record<string, unknown>,
          {}
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for array as target", () => {
      const formData = new FormData();
      expect(() =>
        addFormDataFields(
          formData,
          [] as unknown as Record<string, unknown>,
          {}
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for function as target", () => {
      const formData = new FormData();
      expect(() =>
        addFormDataFields(
          formData,
          (() => {}) as unknown as Record<string, unknown>,
          {}
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError of BigInt as target", () => {
      const formData = new FormData();
      expect(() =>
        addFormDataFields(
          formData,
          BigInt(123) as unknown as Record<string, unknown>,
          {}
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for Symbol as target", () => {
      const formData = new FormData();
      expect(() =>
        addFormDataFields(
          formData,
          Symbol("test") as unknown as Record<string, unknown>,
          {}
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for undefined fieldMap", () => {
      const formData = new FormData();
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(
          formData,
          target,
          undefined as unknown as Partial<
            Record<string, string | (() => unknown)>
          >
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for null fieldMap", () => {
      const formData = new FormData();
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(
          formData,
          target,
          null as unknown as Partial<Record<string, string | (() => unknown)>>
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for string as fieldMap", () => {
      const formData = new FormData();
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(
          formData,
          target,
          "not object" as unknown as Partial<
            Record<string, string | (() => unknown)>
          >
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for number as fieldMap", () => {
      const formData = new FormData();
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(
          formData,
          target,
          123 as unknown as Partial<Record<string, string | (() => unknown)>>
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for function as fieldMap", () => {
      const formData = new FormData();
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(formData, target, (() => {}) as unknown as Partial<
          Record<string, string | (() => unknown)>
        >)
      ).toThrow(TypeError);
    });

    it("should throw TypeError for Symbol as fieldMap", () => {
      const formData = new FormData();
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(
          formData,
          target,
          Symbol("test") as unknown as Partial<
            Record<string, string | (() => unknown)>
          >
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for BigInt as fieldMap", () => {
      const formData = new FormData();
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(
          formData,
          target,
          BigInt(123) as unknown as Partial<
            Record<string, string | (() => unknown)>
          >
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for boolean as fieldMap", () => {
      const formData = new FormData();
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(
          formData,
          target,
          true as unknown as Partial<Record<string, string | (() => unknown)>>
        )
      ).toThrow(TypeError);
    });
  });

  describe("boundary conditions", () => {
    it("should handle empty fieldMap", () => {
      const formData = new FormData();
      formData.append("name", "John");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, {});
      expect(result).toEqual({});
    });

    it("should handle empty FormData", () => {
      const formData = new FormData();
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, { name: "name" });
      expect(result).toEqual({});
    });

    it("should handle empty target", () => {
      const formData = new FormData();
      formData.append("name", "John");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, { name: "name" });
      expect(result).toEqual({ name: "John" });
    });

    it("should handle very long string values", () => {
      const formData = new FormData();
      const longString = "a".repeat(100000);
      formData.append("content", longString);
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, {
        content: "content",
      });
      expect(result.content).toBe(longString);
    });

    it("should handle many fields", () => {
      const formData = new FormData();
      const fieldMap: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        formData.append(`field${i}`, `value${i}`);
        fieldMap[`field${i}`] = `field${i}`;
      }
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, fieldMap);
      expect(Object.keys(result)).toHaveLength(100);
    });

    it("should handle special characters in field names", () => {
      const formData = new FormData();
      formData.append("field-with-dashes", "value1");
      formData.append("field.with.dots", "value2");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, {
        "field-with-dashes": "field-with-dashes",
        "field.with.dots": "field.with.dots",
      });
      expect(result).toEqual({
        "field-with-dashes": "value1",
        "field.with.dots": "value2",
      });
    });

    it("should handle unicode field names", () => {
      const formData = new FormData();
      formData.append("名前", "値");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, { 名前: "名前" });
      expect(result).toEqual({ 名前: "値" });
    });

    it("should handle callback that returns undefined", () => {
      const formData = new FormData();
      formData.append("field", "value");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, {
        field: () => undefined,
      });
      expect(result).toEqual({ field: undefined });
    });

    it("should handle callback that returns object", () => {
      const formData = new FormData();
      formData.append("field", "value");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, {
        field: () => ({ nested: "object" }),
      });
      expect(result).toEqual({ field: { nested: "object" } });
    });

    it("should handle callback that returns array", () => {
      const formData = new FormData();
      formData.append("field", "value");
      const target: Record<string, unknown> = {};
      const result = addFormDataFields(formData, target, {
        field: () => [1, 2, 3],
      });
      expect(result).toEqual({ field: [1, 2, 3] });
    });

    it("should propagate callback errors", () => {
      const formData = new FormData();
      formData.append("field", "value");
      const target: Record<string, unknown> = {};
      expect(() =>
        addFormDataFields(formData, target, {
          field: () => {
            throw new Error("callback error");
          },
        })
      ).toThrow("callback error");
    });
  });
});

describe("appendDirtyFields", () => {
  describe("happy path", () => {
    it("should append string field when dirty is true", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = { name: true };
      appendDirtyFields(formData, data, dirtyFields, { name: "name" });
      expect(formData.get("name")).toBe("John");
    });

    it("should append multiple dirty fields", () => {
      const formData = new FormData();
      const data = { name: "John", email: "john@example.com" };
      const dirtyFields = { name: true, email: true };
      appendDirtyFields(formData, data, dirtyFields, {
        name: "name",
        email: "email",
      });
      expect(formData.get("name")).toBe("John");
      expect(formData.get("email")).toBe("john@example.com");
    });

    it("should use custom field name when specified", () => {
      const formData = new FormData();
      const data = { userName: "John" };
      const dirtyFields = { userName: true };
      appendDirtyFields(formData, data, dirtyFields, { userName: "user_name" });
      expect(formData.get("user_name")).toBe("John");
    });

    it("should stringify object values", () => {
      const formData = new FormData();
      const data = { config: { key: "value" } };
      const dirtyFields = { config: true };
      appendDirtyFields(formData, data, dirtyFields, { config: "config" });
      expect(formData.get("config")).toBe('{"key":"value"}');
    });

    it("should stringify array values", () => {
      const formData = new FormData();
      const data = { tags: ["a", "b", "c"] };
      const dirtyFields = { tags: true };
      appendDirtyFields(formData, data, dirtyFields, { tags: "tags" });
      expect(formData.get("tags")).toBe('["a","b","c"]');
    });

    it("should use callback function for custom processing", () => {
      const formData = new FormData();
      const data = { count: 42 };
      const dirtyFields = { count: true };
      appendDirtyFields(formData, data, dirtyFields, {
        count: (value) => formData.append("count", String(value)),
      });
      expect(formData.get("count")).toBe("42");
    });

    it("should handle dirty array with some true values", () => {
      const formData = new FormData();
      const data = { items: ["a", "b"] };
      const dirtyFields = { items: [true, false] };
      appendDirtyFields(formData, data, dirtyFields, { items: "items" });
      expect(formData.get("items")).toBe('["a","b"]');
    });

    it("should handle dirty object (nested dirty fields)", () => {
      const formData = new FormData();
      const data = { user: { name: "John" } };
      const dirtyFields = { user: { name: true } };
      appendDirtyFields(formData, data, dirtyFields, { user: "user" });
      expect(formData.get("user")).toBe('{"name":"John"}');
    });

    it("should handle dirty array with multiple true values (3+ items)", () => {
      const formData = new FormData();
      const data = { genre: ["Fantasy", "Romance", "Adventure"] };
      const dirtyFields = { genre: [true, true, true] };
      appendDirtyFields(formData, data, dirtyFields, { genre: "genre" });
      expect(formData.get("genre")).toBe('["Fantasy","Romance","Adventure"]');
    });

    it("should handle multiple fields where some are dirty and some are not", () => {
      const formData = new FormData();
      const data = {
        title: "My Story",
        description: "A great story",
        genre: ["Fantasy", "Romance"],
        target_audience: "Young Adults",
      };
      const dirtyFields = {
        title: true,
        description: false,
        genre: [true, true],
        target_audience: true,
      };
      appendDirtyFields(formData, data, dirtyFields, {
        title: "title",
        description: "description",
        genre: "genre",
        target_audience: "target_audience",
      });
      expect(formData.get("title")).toBe("My Story");
      expect(formData.has("description")).toBe(false);
      expect(formData.get("genre")).toBe('["Fantasy","Romance"]');
      expect(formData.get("target_audience")).toBe("Young Adults");
    });

    it("should handle array with multiple items where only some are dirty", () => {
      const formData = new FormData();
      const data = { tags: ["tag1", "tag2", "tag3", "tag4", "tag5"] };
      const dirtyFields = { tags: [false, true, false, true, false] };
      appendDirtyFields(formData, data, dirtyFields, { tags: "tags" });
      expect(formData.get("tags")).toBe('["tag1","tag2","tag3","tag4","tag5"]');
    });

    it("should handle callback with array data having multiple items", () => {
      const formData = new FormData();
      const data = { genre: ["Fantasy", "Romance", "Sci-Fi"] };
      const dirtyFields = { genre: true };
      appendDirtyFields(formData, data, dirtyFields, {
        genre: (value) => {
          const genreValue = value as string[];
          if (genreValue?.length) {
            genreValue.forEach((g) => formData.append("genre", g));
          }
        },
      });
      expect(formData.getAll("genre")).toEqual([
        "Fantasy",
        "Romance",
        "Sci-Fi",
      ]);
    });
  });

  describe("error cases", () => {
    it("should not append field when dirty is false", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = { name: false };
      appendDirtyFields(formData, data, dirtyFields, { name: "name" });
      expect(formData.has("name")).toBe(false);
    });

    it("should not append field when not in dirtyFields", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = {};
      appendDirtyFields(formData, data, dirtyFields, { name: "name" });
      expect(formData.has("name")).toBe(false);
    });

    it("should not append when dirty array is all false", () => {
      const formData = new FormData();
      const data = { items: ["a", "b"] };
      const dirtyFields = { items: [false, false] };
      appendDirtyFields(formData, data, dirtyFields, { items: "items" });
      expect(formData.has("items")).toBe(false);
    });

    it("should not append when dirty array with multiple items is all false", () => {
      const formData = new FormData();
      const data = { tags: ["tag1", "tag2", "tag3", "tag4", "tag5"] };
      const dirtyFields = { tags: [false, false, false, false, false] };
      appendDirtyFields(formData, data, dirtyFields, { tags: "tags" });
      expect(formData.has("tags")).toBe(false);
    });

    it("should append empty string for undefined value", () => {
      const formData = new FormData();
      const data = { name: undefined };
      const dirtyFields = { name: true };
      appendDirtyFields(formData, data, dirtyFields, { name: "name" });
      expect(formData.get("name")).toBe("");
    });

    it("should become empty string not 'null'", () => {
      const formData = new FormData();
      const data = { name: null };
      const dirtyFields = { name: true };
      appendDirtyFields(formData, data, dirtyFields, { name: "name" });
      expect(formData.get("name")).toBe("");
    });
  });

  describe("invalid arguments", () => {
    it("should throw TypeError for undefined formData", () => {
      const data = { name: "John" };
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(undefined as unknown as FormData, data, dirtyFields, {
          name: "name",
        })
      ).toThrow(TypeError);
    });

    it("should throw TypeError for null formData", () => {
      const data = { name: "John" };
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(null as unknown as FormData, data, dirtyFields, {
          name: "name",
        })
      ).toThrow(TypeError);
    });

    it("should throw TypeError for string as formData", () => {
      const data = { name: "John" };
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(
          "not formdata" as unknown as FormData,
          data,
          dirtyFields,
          { name: "name" }
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for number as formData", () => {
      const data = { name: "John" };
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(123 as unknown as FormData, data, dirtyFields, {
          name: "name",
        })
      ).toThrow(TypeError);
    });

    it("should throw TypeError for undefined data", () => {
      const formData = new FormData();
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(
          formData,
          undefined as unknown as Record<string, unknown>,
          dirtyFields,
          { name: "name" }
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for null data", () => {
      const formData = new FormData();
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(
          formData,
          null as unknown as Record<string, unknown>,
          dirtyFields,
          { name: "name" }
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for string as data", () => {
      const formData = new FormData();
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(
          formData,
          "not object" as unknown as Record<string, unknown>,
          dirtyFields,
          { name: "name" }
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for number as data", () => {
      const formData = new FormData();
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(
          formData,
          123 as unknown as Record<string, unknown>,
          dirtyFields,
          { name: "name" }
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for undefined dirtyFields", () => {
      const formData = new FormData();
      const data = { name: "John" };
      expect(() =>
        appendDirtyFields(
          formData,
          data,
          undefined as unknown as Record<string, unknown>,
          { name: "name" }
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for null dirtyFields", () => {
      const formData = new FormData();
      const data = { name: "John" };
      expect(() =>
        appendDirtyFields(
          formData,
          data,
          null as unknown as Record<string, unknown>,
          { name: "name" }
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for string as dirtyFields", () => {
      const formData = new FormData();
      const data = { name: "John" };
      expect(() =>
        appendDirtyFields(
          formData,
          data,
          "not object" as unknown as Record<string, unknown>,
          { name: "name" }
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for undefined fieldMap", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(
          formData,
          data,
          dirtyFields,
          undefined as unknown as Partial<
            Record<string, string | (() => unknown)>
          >
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for null fieldMap", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(
          formData,
          data,
          dirtyFields,
          null as unknown as Partial<
            Record<"name", string | ((value: unknown) => void)>
          >
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for string as fieldMap", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(
          formData,
          data,
          dirtyFields,
          "not object" as unknown as Partial<
            Record<"name", string | ((value: unknown) => void)>
          >
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for Symbol as fieldMap", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(
          formData,
          data,
          dirtyFields,
          Symbol("test") as unknown as Partial<
            Record<"name", string | ((value: unknown) => void)>
          >
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for BigInt as fieldMap", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(
          formData,
          data,
          dirtyFields,
          BigInt(123) as unknown as Partial<
            Record<"name", string | ((value: unknown) => void)>
          >
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for NaN as fieldMap", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(
          formData,
          data,
          dirtyFields,
          NaN as unknown as Partial<
            Record<"name", string | ((value: unknown) => void)>
          >
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for boolean as fieldMap", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(
          formData,
          data,
          dirtyFields,
          true as unknown as Partial<
            Record<"name", string | ((value: unknown) => void)>
          >
        )
      ).toThrow(TypeError);
    });

    it("should throw TypeError for function as fieldMap", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(
          formData,
          data,
          dirtyFields,
          (() => {}) as unknown as Partial<
            Record<"name", string | ((value: unknown) => void)>
          >
        )
      ).toThrow(TypeError);
    });
  });

  describe("boundary conditions", () => {
    it("should handle empty fieldMap", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = { name: true };
      appendDirtyFields(formData, data, dirtyFields, {});
      expect(formData.has("name")).toBe(false);
    });

    it("should handle empty data", () => {
      const formData = new FormData();
      const data = {};
      const dirtyFields = { name: true };
      appendDirtyFields(formData, data, dirtyFields, { name: "name" });
      expect(formData.get("name")).toBe("");
    });

    it("should handle empty dirtyFields", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = {};
      appendDirtyFields(formData, data, dirtyFields, { name: "name" });
      expect(formData.has("name")).toBe(false);
    });

    it("should handle very long string value", () => {
      const formData = new FormData();
      const longString = "a".repeat(100000);
      const data = { content: longString };
      const dirtyFields = { content: true };
      appendDirtyFields(formData, data, dirtyFields, { content: "content" });
      expect(formData.get("content")).toBe(longString);
    });

    it("should handle deeply nested object", () => {
      const formData = new FormData();
      const deepObject = {
        level1: { level2: { level3: { level4: { value: "deep" } } } },
      };
      const data = { config: deepObject };
      const dirtyFields = { config: true };
      appendDirtyFields(formData, data, dirtyFields, { config: "config" });
      expect(formData.get("config")).toBe(JSON.stringify(deepObject));
    });

    it("should handle many fields", () => {
      const formData = new FormData();
      const data: Record<string, string> = {};
      const dirtyFields: Record<string, boolean> = {};
      const fieldMap: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        data[`field${i}`] = `value${i}`;
        dirtyFields[`field${i}`] = true;
        fieldMap[`field${i}`] = `field${i}`;
      }
      appendDirtyFields(formData, data, dirtyFields, fieldMap);
      for (let i = 0; i < 100; i++) {
        expect(formData.get(`field${i}`)).toBe(`value${i}`);
      }
    });

    it("should handle special characters in values", () => {
      const formData = new FormData();
      const data = { content: '<script>alert("xss")</script>' };
      const dirtyFields = { content: true };
      appendDirtyFields(formData, data, dirtyFields, { content: "content" });
      expect(formData.get("content")).toBe('<script>alert("xss")</script>');
    });

    it("should handle unicode in values", () => {
      const formData = new FormData();
      const data = { content: "日本語テスト 🎉" };
      const dirtyFields = { content: true };
      appendDirtyFields(formData, data, dirtyFields, { content: "content" });
      expect(formData.get("content")).toBe("日本語テスト 🎉");
    });

    it("should handle number value", () => {
      const formData = new FormData();
      const data = { count: 42 };
      const dirtyFields = { count: true };
      appendDirtyFields(formData, data, dirtyFields, { count: "count" });
      expect(formData.get("count")).toBe("42");
    });

    it("should handle boolean value", () => {
      const formData = new FormData();
      const data = { enabled: true };
      const dirtyFields = { enabled: true };
      appendDirtyFields(formData, data, dirtyFields, { enabled: "enabled" });
      expect(formData.get("enabled")).toBe("true");
    });

    it("should handle false boolean value", () => {
      const formData = new FormData();
      const data = { enabled: false };
      const dirtyFields = { enabled: true };
      appendDirtyFields(formData, data, dirtyFields, { enabled: "enabled" });
      expect(formData.get("enabled")).toBe("false");
    });

    it("should handle zero number value", () => {
      const formData = new FormData();
      const data = { count: 0 };
      const dirtyFields = { count: true };
      appendDirtyFields(formData, data, dirtyFields, { count: "count" });
      expect(formData.get("count")).toBe("0");
    });

    it("should handle NaN number value", () => {
      const formData = new FormData();
      const data = { count: NaN };
      const dirtyFields = { count: true };
      appendDirtyFields(formData, data, dirtyFields, { count: "count" });
      expect(formData.get("count")).toBe("NaN");
    });

    it("should handle Infinity value", () => {
      const formData = new FormData();
      const data = { count: Infinity };
      const dirtyFields = { count: true };
      appendDirtyFields(formData, data, dirtyFields, { count: "count" });
      expect(formData.get("count")).toBe("Infinity");
    });

    it("should propagate callback errors", () => {
      const formData = new FormData();
      const data = { name: "John" };
      const dirtyFields = { name: true };
      expect(() =>
        appendDirtyFields(formData, data, dirtyFields, {
          name: () => {
            throw new Error("callback error");
          },
        })
      ).toThrow("callback error");
    });

    it("should handle empty array as dirty field (not dirty)", () => {
      const formData = new FormData();
      const data = { items: ["a", "b"] };
      const dirtyFields = { items: [] };
      appendDirtyFields(formData, data, dirtyFields, { items: "items" });
      expect(formData.has("items")).toBe(false);
    });

    it("should handle empty array as dirty field with multiple data items", () => {
      const formData = new FormData();
      const data = { tags: ["tag1", "tag2", "tag3", "tag4", "tag5"] };
      const dirtyFields = { tags: [] };
      appendDirtyFields(formData, data, dirtyFields, { tags: "tags" });
      expect(formData.has("tags")).toBe(false);
    });

    it("should handle empty object as dirty field", () => {
      const formData = new FormData();
      const data = { user: { name: "John" } };
      const dirtyFields = { user: {} };
      appendDirtyFields(formData, data, dirtyFields, { user: "user" });
      expect(formData.has("user")).toBe(false);
    });

    it("should handle array value when not dirty", () => {
      const formData = new FormData();
      const data = { items: ["a", "b"] };
      const dirtyFields = { items: false };
      appendDirtyFields(formData, data, dirtyFields, { items: "items" });
      expect(formData.has("items")).toBe(false);
    });

    it("should throw for circular reference in object value", () => {
      const formData = new FormData();
      const circularObj: Record<string, unknown> = { name: "test" };
      circularObj.self = circularObj;
      const data = { config: circularObj };
      const dirtyFields = { config: true };
      expect(() =>
        appendDirtyFields(formData, data, dirtyFields, { config: "config" })
      ).toThrow();
    });
  });
});
