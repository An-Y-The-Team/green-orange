import { describe, expect, it } from "vitest";

import { escapeRegex } from "./regex";

describe("escapeRegex", () => {
  describe("happy path", () => {
    it("should return empty string for empty input", () => {
      expect(escapeRegex("")).toBe("");
    });

    it("should return unchanged string when no special characters", () => {
      expect(escapeRegex("hello world")).toBe("hello world");
    });

    it("should escape period character", () => {
      expect(escapeRegex("user.name")).toBe("user\\.name");
    });

    it("should escape asterisk character", () => {
      expect(escapeRegex("test*pattern")).toBe("test\\*pattern");
    });

    it("should escape plus character", () => {
      expect(escapeRegex("a+b")).toBe("a\\+b");
    });

    it("should escape question mark character", () => {
      expect(escapeRegex("a?b")).toBe("a\\?b");
    });

    it("should escape caret character", () => {
      expect(escapeRegex("^start")).toBe("\\^start");
    });

    it("should escape dollar sign character", () => {
      expect(escapeRegex("end$")).toBe("end\\$");
    });

    it("should escape curly braces", () => {
      expect(escapeRegex("a{2,3}")).toBe("a\\{2,3\\}");
    });

    it("should escape parentheses", () => {
      expect(escapeRegex("(group)")).toBe("\\(group\\)");
    });

    it("should escape pipe character", () => {
      expect(escapeRegex("a|b")).toBe("a\\|b");
    });

    it("should escape square brackets", () => {
      expect(escapeRegex("[abc]")).toBe("\\[abc\\]");
    });

    it("should escape backslash", () => {
      expect(escapeRegex("path\\to\\file")).toBe("path\\\\to\\\\file");
    });

    it("should escape multiple special characters in sequence", () => {
      expect(escapeRegex(".*+?^${}()|[]\\")).toBe(
        "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\"
      );
    });

    it("should escape mixed special and regular characters", () => {
      expect(escapeRegex("user.name+test@email.com")).toBe(
        "user\\.name\\+test@email\\.com"
      );
    });

    it("should handle realistic search query with special chars", () => {
      const input = "john.doe (admin)";
      const escaped = escapeRegex(input);
      expect(escaped).toBe("john\\.doe \\(admin\\)");
    });

    it("should preserve whitespace characters", () => {
      expect(escapeRegex("hello\tworld\n")).toBe("hello\tworld\n");
    });

    it("should preserve unicode characters", () => {
      expect(escapeRegex("héllo wörld 你好")).toBe("héllo wörld 你好");
    });

    it("should preserve emoji characters", () => {
      expect(escapeRegex("test🎬emoji")).toBe("test🎬emoji");
    });

    it("should handle string with only special characters", () => {
      expect(escapeRegex("...")).toBe("\\.\\.\\.");
    });

    it("should work correctly when result is used in RegExp", () => {
      const input = "user.name+test";
      const escaped = escapeRegex(input);
      const regex = new RegExp(escaped, "i");
      expect(regex.test("user.name+test")).toBe(true);
      expect(regex.test("usernametest")).toBe(false);
      expect(regex.test("user-name+test")).toBe(false);
    });
  });

  describe("error cases", () => {
    it("should return empty string when called with undefined", () => {
      expect(escapeRegex(undefined as unknown as string)).toBe("");
    });

    it("should return empty string when called with null", () => {
      expect(escapeRegex(null as unknown as string)).toBe("");
    });
  });

  describe("invalid arguments", () => {
    it("should return empty string when called with number", () => {
      expect(escapeRegex(123 as unknown as string)).toBe("");
    });

    it("should return empty string when called with boolean true", () => {
      expect(escapeRegex(true as unknown as string)).toBe("");
    });

    it("should return empty string when called with boolean false", () => {
      expect(escapeRegex(false as unknown as string)).toBe("");
    });

    it("should return empty string when called with object", () => {
      expect(escapeRegex({} as unknown as string)).toBe("");
    });

    it("should return empty string when called with object with toString", () => {
      const obj = { toString: () => "test.value" };
      expect(escapeRegex(obj as unknown as string)).toBe("");
    });

    it("should return empty string when called with array", () => {
      expect(escapeRegex([] as unknown as string)).toBe("");
    });

    it("should return empty string when called with array of strings", () => {
      expect(escapeRegex(["a", "b"] as unknown as string)).toBe("");
    });

    it("should return empty string when called with function", () => {
      const fn = () => "test";
      expect(escapeRegex(fn as unknown as string)).toBe("");
    });

    it("should return empty string when called with NaN", () => {
      expect(escapeRegex(NaN as unknown as string)).toBe("");
    });

    it("should return empty string when called with Symbol", () => {
      expect(escapeRegex(Symbol("test") as unknown as string)).toBe("");
    });

    it("should return empty string when called with BigInt", () => {
      expect(escapeRegex(BigInt(123) as unknown as string)).toBe("");
    });

    it("should return empty string when called with Date object", () => {
      expect(escapeRegex(new Date() as unknown as string)).toBe("");
    });

    it("should return empty string when called with RegExp", () => {
      expect(escapeRegex(/test/ as unknown as string)).toBe("");
    });

    it("should return empty string when called with Map", () => {
      expect(escapeRegex(new Map() as unknown as string)).toBe("");
    });

    it("should return empty string when called with Set", () => {
      expect(escapeRegex(new Set() as unknown as string)).toBe("");
    });

    it("should return empty string when called with nested object", () => {
      const nested = { a: { b: { c: "test" } } };
      expect(escapeRegex(nested as unknown as string)).toBe("");
    });

    it("should return empty string when called with deep array", () => {
      const deepArray = [[["test"]]];
      expect(escapeRegex(deepArray as unknown as string)).toBe("");
    });
  });

  describe("boundary conditions", () => {
    it("should handle single character input", () => {
      expect(escapeRegex("a")).toBe("a");
    });

    it("should handle single special character input", () => {
      expect(escapeRegex(".")).toBe("\\.");
    });

    it("should handle very long string", () => {
      const longString = "a".repeat(10000);
      expect(escapeRegex(longString)).toBe(longString);
    });

    it("should handle very long string with special characters", () => {
      const longString = ".".repeat(10000);
      const expected = "\\.".repeat(10000);
      expect(escapeRegex(longString)).toBe(expected);
    });

    it("should handle string with all printable ASCII characters", () => {
      // All printable ASCII from space (32) to tilde (126)
      let input = "";
      for (let i = 32; i <= 126; i++) {
        input += String.fromCharCode(i);
      }
      const result = escapeRegex(input);
      // Should have escaped the special characters
      expect(result.length).toBeGreaterThan(input.length);
    });

    it("should handle string with control characters", () => {
      const input = "test\x00\x01\x02end";
      expect(escapeRegex(input)).toBe("test\x00\x01\x02end");
    });

    it("should handle string with null character", () => {
      const input = "test\0end";
      expect(escapeRegex(input)).toBe("test\0end");
    });

    it("should handle string with newlines and tabs", () => {
      const input = "line1\nline2\ttab";
      expect(escapeRegex(input)).toBe("line1\nline2\ttab");
    });

    it("should handle string with carriage return", () => {
      const input = "line1\r\nline2";
      expect(escapeRegex(input)).toBe("line1\r\nline2");
    });

    it("should handle surrogate pairs (emoji)", () => {
      const input = "test🎬🎥🎞️end";
      expect(escapeRegex(input)).toBe("test🎬🎥🎞️end");
    });

    it("should handle zero-width characters", () => {
      const input = "test\u200B\u200Cend"; // zero-width space, zero-width non-joiner
      expect(escapeRegex(input)).toBe("test\u200B\u200Cend");
    });

    it("should handle right-to-left characters", () => {
      const input = "שלום עולם"; // Hebrew
      expect(escapeRegex(input)).toBe("שלום עולם");
    });

    it("should handle mixed script directions", () => {
      const input = "Hello שלום World";
      expect(escapeRegex(input)).toBe("Hello שלום World");
    });

    it("should handle string consisting only of whitespace", () => {
      expect(escapeRegex("   ")).toBe("   ");
    });

    it("should handle string with multiple consecutive special characters", () => {
      expect(escapeRegex("a.*?+b")).toBe("a\\.\\*\\?\\+b");
    });

    it("should handle alternating special and regular characters", () => {
      expect(escapeRegex("a.b*c+d")).toBe("a\\.b\\*c\\+d");
    });
  });
});
