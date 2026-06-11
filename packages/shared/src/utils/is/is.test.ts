import { describe, expect, it } from "vitest";

import {
  isArray,
  isBoolean,
  isFunction,
  isNilOrEmptyString,
  isNull,
  isNumber,
  isObject,
  isString,
  isUndefined,
} from "./is";

describe("isString", () => {
  describe("happy path", () => {
    it("should return true for string literal", () => {
      expect(isString("hello")).toBe(true);
    });

    it("should return true for empty string", () => {
      expect(isString("")).toBe(true);
    });

    it("should return true for string with whitespace", () => {
      expect(isString("   ")).toBe(true);
    });

    it("should return true for string with special characters", () => {
      expect(isString("test@#$%")).toBe(true);
    });

    it("should return true for unicode string", () => {
      expect(isString("测试🚀")).toBe(true);
    });

    it("should return true for template literal", () => {
      const str = `test ${123}`;
      expect(isString(str)).toBe(true);
    });

    it("should return false for String object", () => {
      expect(isString(new String("test"))).toBe(false);
    });

    it("should return true for very long string", () => {
      const longStr = "a".repeat(10000);
      expect(isString(longStr)).toBe(true);
    });
  });

  describe("error cases - invalid types", () => {
    it("should return false for undefined", () => {
      expect(isString(undefined)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isString(null)).toBe(false);
    });

    it("should return false for number", () => {
      expect(isString(123)).toBe(false);
    });

    it("should return false for zero", () => {
      expect(isString(0)).toBe(false);
    });

    it("should return false for negative number", () => {
      expect(isString(-42)).toBe(false);
    });

    it("should return false for floating point number", () => {
      expect(isString(3.14)).toBe(false);
    });

    it("should return false for boolean true", () => {
      expect(isString(true)).toBe(false);
    });

    it("should return false for boolean false", () => {
      expect(isString(false)).toBe(false);
    });

    it("should return false for object", () => {
      expect(isString({})).toBe(false);
    });

    it("should return false for array", () => {
      expect(isString([])).toBe(false);
    });

    it("should return false for function", () => {
      expect(isString(() => {})).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(isString(NaN)).toBe(false);
    });

    it("should return false for Infinity", () => {
      expect(isString(Infinity)).toBe(false);
    });

    it("should return false for Symbol", () => {
      expect(isString(Symbol("test"))).toBe(false);
    });

    it("should return false for BigInt", () => {
      expect(isString(BigInt(123))).toBe(false);
    });

    it("should return false for Date", () => {
      expect(isString(new Date())).toBe(false);
    });

    it("should return false for RegExp", () => {
      expect(isString(/test/)).toBe(false);
    });
  });

  describe("boundary conditions", () => {
    it("should handle string with null character", () => {
      expect(isString("test\0test")).toBe(true);
    });

    it("should handle string with newline", () => {
      expect(isString("test\ntest")).toBe(true);
    });

    it("should handle string with tab", () => {
      expect(isString("test\ttest")).toBe(true);
    });
  });
});

describe("isNull", () => {
  describe("happy path", () => {
    it("should return true for null", () => {
      expect(isNull(null)).toBe(true);
    });
  });

  describe("error cases - invalid types", () => {
    it("should return false for undefined", () => {
      expect(isNull(undefined)).toBe(false);
    });

    it("should return false for string", () => {
      expect(isNull("null")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isNull("")).toBe(false);
    });

    it("should return false for number", () => {
      expect(isNull(0)).toBe(false);
    });

    it("should return false for boolean", () => {
      expect(isNull(false)).toBe(false);
    });

    it("should return false for object", () => {
      expect(isNull({})).toBe(false);
    });

    it("should return false for array", () => {
      expect(isNull([])).toBe(false);
    });

    it("should return false for function", () => {
      expect(isNull(() => {})).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(isNull(NaN)).toBe(false);
    });

    it("should return false for Symbol", () => {
      expect(isNull(Symbol("test"))).toBe(false);
    });

    it("should return false for BigInt", () => {
      expect(isNull(BigInt(123))).toBe(false);
    });
  });
});

describe("isUndefined", () => {
  describe("happy path", () => {
    it("should return true for undefined", () => {
      expect(isUndefined(undefined)).toBe(true);
    });

    it("should return true for variable without value", () => {
      let x: unknown;
      expect(isUndefined(x)).toBe(true);
    });
  });

  describe("error cases - invalid types", () => {
    it("should return false for null", () => {
      expect(isUndefined(null)).toBe(false);
    });

    it("should return false for string", () => {
      expect(isUndefined("undefined")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isUndefined("")).toBe(false);
    });

    it("should return false for number", () => {
      expect(isUndefined(0)).toBe(false);
    });

    it("should return false for boolean", () => {
      expect(isUndefined(false)).toBe(false);
    });

    it("should return false for object", () => {
      expect(isUndefined({})).toBe(false);
    });

    it("should return false for array", () => {
      expect(isUndefined([])).toBe(false);
    });

    it("should return false for function", () => {
      expect(isUndefined(() => {})).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(isUndefined(NaN)).toBe(false);
    });

    it("should return false for Symbol", () => {
      expect(isUndefined(Symbol("test"))).toBe(false);
    });

    it("should return false for BigInt", () => {
      expect(isUndefined(BigInt(123))).toBe(false);
    });
  });
});

describe("isNumber", () => {
  describe("happy path", () => {
    it("should return true for positive integer", () => {
      expect(isNumber(42)).toBe(true);
    });

    it("should return true for negative integer", () => {
      expect(isNumber(-42)).toBe(true);
    });

    it("should return true for zero", () => {
      expect(isNumber(0)).toBe(true);
    });

    it("should return true for floating point number", () => {
      expect(isNumber(3.14)).toBe(true);
    });

    it("should return true for very large number", () => {
      expect(isNumber(Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    it("should return true for very small number", () => {
      expect(isNumber(Number.MIN_SAFE_INTEGER)).toBe(true);
    });

    it("should return true for Infinity", () => {
      expect(isNumber(Infinity)).toBe(true);
    });

    it("should return true for negative Infinity", () => {
      expect(isNumber(-Infinity)).toBe(true);
    });

    it("should return false for Number object", () => {
      expect(isNumber(new Number(42))).toBe(false);
    });
  });

  describe("error cases - invalid types", () => {
    it("should return false for NaN", () => {
      expect(isNumber(NaN)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isNumber(undefined)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isNumber(null)).toBe(false);
    });

    it("should return false for string", () => {
      expect(isNumber("123")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isNumber("")).toBe(false);
    });

    it("should return false for numeric string", () => {
      expect(isNumber("42")).toBe(false);
    });

    it("should return false for boolean true", () => {
      expect(isNumber(true)).toBe(false);
    });

    it("should return false for boolean false", () => {
      expect(isNumber(false)).toBe(false);
    });

    it("should return false for object", () => {
      expect(isNumber({})).toBe(false);
    });

    it("should return false for array", () => {
      expect(isNumber([])).toBe(false);
    });

    it("should return false for function", () => {
      expect(isNumber(() => {})).toBe(false);
    });

    it("should return false for Symbol", () => {
      expect(isNumber(Symbol("test"))).toBe(false);
    });

    it("should return false for BigInt", () => {
      expect(isNumber(BigInt(123))).toBe(false);
    });

    it("should return false for Date", () => {
      expect(isNumber(new Date())).toBe(false);
    });
  });

  describe("boundary conditions", () => {
    it("should handle Number.MAX_VALUE", () => {
      expect(isNumber(Number.MAX_VALUE)).toBe(true);
    });

    it("should handle Number.MIN_VALUE", () => {
      expect(isNumber(Number.MIN_VALUE)).toBe(true);
    });

    it("should handle Number.EPSILON", () => {
      expect(isNumber(Number.EPSILON)).toBe(true);
    });
  });
});

describe("isBoolean", () => {
  describe("happy path", () => {
    it("should return true for boolean true", () => {
      expect(isBoolean(true)).toBe(true);
    });

    it("should return true for boolean false", () => {
      expect(isBoolean(false)).toBe(true);
    });

    it("should return false for Boolean object true", () => {
      expect(isBoolean(new Boolean(true))).toBe(false);
    });

    it("should return false for Boolean object false", () => {
      expect(isBoolean(new Boolean(false))).toBe(false);
    });
  });

  describe("error cases - invalid types", () => {
    it("should return false for undefined", () => {
      expect(isBoolean(undefined)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isBoolean(null)).toBe(false);
    });

    it("should return false for string", () => {
      expect(isBoolean("true")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isBoolean("")).toBe(false);
    });

    it("should return false for number", () => {
      expect(isBoolean(1)).toBe(false);
    });

    it("should return false for zero", () => {
      expect(isBoolean(0)).toBe(false);
    });

    it("should return false for object", () => {
      expect(isBoolean({})).toBe(false);
    });

    it("should return false for array", () => {
      expect(isBoolean([])).toBe(false);
    });

    it("should return false for function", () => {
      expect(isBoolean(() => {})).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(isBoolean(NaN)).toBe(false);
    });

    it("should return false for Symbol", () => {
      expect(isBoolean(Symbol("test"))).toBe(false);
    });

    it("should return false for BigInt", () => {
      expect(isBoolean(BigInt(123))).toBe(false);
    });
  });
});

describe("isArray", () => {
  describe("happy path", () => {
    it("should return true for empty array", () => {
      expect(isArray([])).toBe(true);
    });

    it("should return true for array with elements", () => {
      expect(isArray([1, 2, 3])).toBe(true);
    });

    it("should return true for array with mixed types", () => {
      expect(isArray([1, "test", true, {}])).toBe(true);
    });

    it("should return true for nested arrays", () => {
      expect(
        isArray([
          [1, 2],
          [3, 4],
        ])
      ).toBe(true);
    });

    it("should return true for sparse array", () => {
      const arr = new Array(5);
      expect(isArray(arr)).toBe(true);
    });

    it("should return true for array-like object created with Array.from", () => {
      const arr = Array.from({ length: 3 }, (_, i) => i);
      expect(isArray(arr)).toBe(true);
    });
  });

  describe("error cases - invalid types", () => {
    it("should return false for undefined", () => {
      expect(isArray(undefined)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isArray(null)).toBe(false);
    });

    it("should return false for string", () => {
      expect(isArray("test")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isArray("")).toBe(false);
    });

    it("should return false for number", () => {
      expect(isArray(123)).toBe(false);
    });

    it("should return false for boolean", () => {
      expect(isArray(true)).toBe(false);
    });

    it("should return false for object", () => {
      expect(isArray({})).toBe(false);
    });

    it("should return false for object with numeric keys", () => {
      expect(isArray({ 0: "a", 1: "b", length: 2 })).toBe(false);
    });

    it("should return false for function", () => {
      expect(isArray(() => {})).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(isArray(NaN)).toBe(false);
    });

    it("should return false for Symbol", () => {
      expect(isArray(Symbol("test"))).toBe(false);
    });

    it("should return false for BigInt", () => {
      expect(isArray(BigInt(123))).toBe(false);
    });

    it("should return false for Date", () => {
      expect(isArray(new Date())).toBe(false);
    });

    it("should return false for RegExp", () => {
      expect(isArray(/test/)).toBe(false);
    });

    it("should return false for Set", () => {
      expect(isArray(new Set())).toBe(false);
    });

    it("should return false for Map", () => {
      expect(isArray(new Map())).toBe(false);
    });
  });

  describe("boundary conditions", () => {
    it("should handle very large array", () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      expect(isArray(largeArray)).toBe(true);
    });

    it("should handle array with null elements", () => {
      expect(isArray([null, null])).toBe(true);
    });

    it("should handle array with undefined elements", () => {
      expect(isArray([undefined, undefined])).toBe(true);
    });
  });
});

describe("isObject", () => {
  describe("happy path", () => {
    it("should return true for empty object", () => {
      expect(isObject({})).toBe(true);
    });

    it("should return true for object with properties", () => {
      expect(isObject({ key: "value" })).toBe(true);
    });

    it("should return true for object with nested properties", () => {
      expect(isObject({ a: { b: { c: 1 } } })).toBe(true);
    });

    it("should return true for object created with Object.create", () => {
      const obj = Object.create(null);
      expect(isObject(obj)).toBe(true);
    });

    it("should return true for object with prototype", () => {
      class TestClass {}
      const obj = new TestClass();
      expect(isObject(obj)).toBe(true);
    });
  });

  describe("error cases - invalid types", () => {
    it("should return false for null", () => {
      expect(isObject(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isObject(undefined)).toBe(false);
    });

    it("should return false for array", () => {
      expect(isObject([])).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(isObject([])).toBe(false);
    });

    it("should return false for string", () => {
      expect(isObject("test")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isObject("")).toBe(false);
    });

    it("should return false for number", () => {
      expect(isObject(123)).toBe(false);
    });

    it("should return false for boolean", () => {
      expect(isObject(true)).toBe(false);
    });

    it("should return false for function", () => {
      expect(isObject(() => {})).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(isObject(NaN)).toBe(false);
    });

    it("should return false for Symbol", () => {
      expect(isObject(Symbol("test"))).toBe(false);
    });

    it("should return false for BigInt", () => {
      expect(isObject(BigInt(123))).toBe(false);
    });

    it("should return false for Date", () => {
      expect(isObject(new Date())).toBe(false);
    });

    it("should return true for RegExp", () => {
      expect(isObject(/test/)).toBe(true);
    });

    it("should return true for Set", () => {
      expect(isObject(new Set())).toBe(true);
    });

    it("should return true for Map", () => {
      expect(isObject(new Map())).toBe(true);
    });
  });

  describe("boundary conditions", () => {
    it("should handle object with circular reference", () => {
      const obj: Record<string, unknown> = {};
      obj.self = obj;
      expect(isObject(obj)).toBe(true);
    });

    it("should handle object with many properties", () => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        obj[`key${i}`] = i;
      }
      expect(isObject(obj)).toBe(true);
    });

    it("should handle object with null values", () => {
      expect(isObject({ a: null, b: null })).toBe(true);
    });

    it("should handle object with undefined values", () => {
      expect(isObject({ a: undefined, b: undefined })).toBe(true);
    });
  });
});

describe("isFunction", () => {
  describe("happy path", () => {
    it("should return true for function declaration", () => {
      function test() {}
      expect(isFunction(test)).toBe(true);
    });

    it("should return true for arrow function", () => {
      const fn = () => {};
      expect(isFunction(fn)).toBe(true);
    });

    it("should return true for function expression", () => {
      const fn = function () {};
      expect(isFunction(fn)).toBe(true);
    });

    it("should return true for async function", () => {
      const fn = async () => {};
      expect(isFunction(fn)).toBe(true);
    });

    it("should return true for generator function", () => {
      function* gen() {
        yield 1;
      }
      expect(isFunction(gen)).toBe(true);
    });

    it("should return true for class constructor", () => {
      class TestClass {}
      expect(isFunction(TestClass)).toBe(true);
    });

    it("should return true for Function object", () => {
      const fn = new Function("return 1");
      expect(isFunction(fn)).toBe(true);
    });

    it("should return true for method", () => {
      const obj = {
        method() {},
      };
      expect(isFunction(obj.method)).toBe(true);
    });
  });

  describe("error cases - invalid types", () => {
    it("should return false for undefined", () => {
      expect(isFunction(undefined)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isFunction(null)).toBe(false);
    });

    it("should return false for string", () => {
      expect(isFunction("function")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isFunction("")).toBe(false);
    });

    it("should return false for number", () => {
      expect(isFunction(123)).toBe(false);
    });

    it("should return false for boolean", () => {
      expect(isFunction(true)).toBe(false);
    });

    it("should return false for object", () => {
      expect(isFunction({})).toBe(false);
    });

    it("should return false for array", () => {
      expect(isFunction([])).toBe(false);
    });

    it("should return false for object with call property", () => {
      const obj = {
        call: () => {},
      };
      expect(isFunction(obj)).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(isFunction(NaN)).toBe(false);
    });

    it("should return false for Symbol", () => {
      expect(isFunction(Symbol("test"))).toBe(false);
    });

    it("should return false for BigInt", () => {
      expect(isFunction(BigInt(123))).toBe(false);
    });

    it("should return false for Date", () => {
      expect(isFunction(new Date())).toBe(false);
    });

    it("should return false for RegExp", () => {
      expect(isFunction(/test/)).toBe(false);
    });
  });

  describe("boundary conditions", () => {
    it("should handle function with many parameters", () => {
      const fn = (
        _a: unknown,
        _b: unknown,
        _c: unknown,
        _d: unknown,
        _e: unknown
      ) => {};
      expect(isFunction(fn)).toBe(true);
    });

    it("should handle function that returns function", () => {
      const fn = () => () => {};
      expect(isFunction(fn)).toBe(true);
    });

    it("should handle bound function", () => {
      function test(this: Record<string, unknown>) {
        return this;
      }
      const bound = test.bind({});
      expect(isFunction(bound)).toBe(true);
    });
  });
});

describe("isNilOrEmptyString", () => {
  describe("happy path", () => {
    it("should return true for empty string", () => {
      expect(isNilOrEmptyString("")).toBe(true);
    });

    it("should return true for null", () => {
      expect(isNilOrEmptyString(null)).toBe(true);
    });

    it("should return true for undefined", () => {
      expect(isNilOrEmptyString(undefined)).toBe(true);
    });

    it("should return true for variable without value", () => {
      let x: unknown;
      expect(isNilOrEmptyString(x)).toBe(true);
    });
  });

  describe("error cases - invalid types", () => {
    it("should return false for non-empty string", () => {
      expect(isNilOrEmptyString("test")).toBe(false);
    });

    it("should return false for string with whitespace", () => {
      expect(isNilOrEmptyString("   ")).toBe(false);
    });

    it("should return false for string with single space", () => {
      expect(isNilOrEmptyString(" ")).toBe(false);
    });

    it("should return false for string literal 'null'", () => {
      expect(isNilOrEmptyString("null")).toBe(false);
    });

    it("should return false for string literal 'undefined'", () => {
      expect(isNilOrEmptyString("undefined")).toBe(false);
    });

    it("should return false for number zero", () => {
      expect(isNilOrEmptyString(0)).toBe(false);
    });

    it("should return false for positive number", () => {
      expect(isNilOrEmptyString(123)).toBe(false);
    });

    it("should return false for negative number", () => {
      expect(isNilOrEmptyString(-42)).toBe(false);
    });

    it("should return false for floating point number", () => {
      expect(isNilOrEmptyString(3.14)).toBe(false);
    });

    it("should return false for boolean true", () => {
      expect(isNilOrEmptyString(true)).toBe(false);
    });

    it("should return false for boolean false", () => {
      expect(isNilOrEmptyString(false)).toBe(false);
    });

    it("should return false for empty object", () => {
      expect(isNilOrEmptyString({})).toBe(false);
    });

    it("should return false for object with properties", () => {
      expect(isNilOrEmptyString({ key: "value" })).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(isNilOrEmptyString([])).toBe(false);
    });

    it("should return false for array with elements", () => {
      expect(isNilOrEmptyString([1, 2, 3])).toBe(false);
    });

    it("should return false for function", () => {
      expect(isNilOrEmptyString(() => {})).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(isNilOrEmptyString(NaN)).toBe(false);
    });

    it("should return false for Infinity", () => {
      expect(isNilOrEmptyString(Infinity)).toBe(false);
    });

    it("should return false for Symbol", () => {
      expect(isNilOrEmptyString(Symbol("test"))).toBe(false);
    });

    it("should return false for BigInt", () => {
      expect(isNilOrEmptyString(BigInt(123))).toBe(false);
    });

    it("should return false for Date", () => {
      expect(isNilOrEmptyString(new Date())).toBe(false);
    });

    it("should return false for RegExp", () => {
      expect(isNilOrEmptyString(/test/)).toBe(false);
    });

    it("should return false for Set", () => {
      expect(isNilOrEmptyString(new Set())).toBe(false);
    });

    it("should return false for Map", () => {
      expect(isNilOrEmptyString(new Map())).toBe(false);
    });
  });

  describe("boundary conditions", () => {
    it("should handle string with newline", () => {
      expect(isNilOrEmptyString("\n")).toBe(false);
    });

    it("should handle string with tab", () => {
      expect(isNilOrEmptyString("\t")).toBe(false);
    });

    it("should handle string with null character", () => {
      expect(isNilOrEmptyString("\0")).toBe(false);
    });

    it("should handle unicode string", () => {
      expect(isNilOrEmptyString("测试🚀")).toBe(false);
    });

    it("should handle very long string", () => {
      const longStr = "a".repeat(10000);
      expect(isNilOrEmptyString(longStr)).toBe(false);
    });

    it("should handle String object with empty string", () => {
      expect(isNilOrEmptyString(new String(""))).toBe(false);
    });

    it("should handle Number object zero", () => {
      expect(isNilOrEmptyString(new Number(0))).toBe(false);
    });

    it("should handle Boolean object false", () => {
      expect(isNilOrEmptyString(new Boolean(false))).toBe(false);
    });
  });
});
