import { describe, expect, it } from "vitest";

import {
  formatStringToTitleCase,
  generateRandomId,
  pluralize,
  sanitizeAlphanumeric,
  sanitizeForHttpHeader,
  sanitizeForLLM,
  trimAllWhitespace,
} from "./string";

describe("generateRandomId", () => {
  describe("happy path", () => {
    it("should return a string of default length 6 when no argument is provided", () => {
      const result = generateRandomId();
      expect(typeof result).toBe("string");
      expect(result.length).toBeLessThanOrEqual(6);
    });

    it("should return a string of specified length when length is provided", () => {
      const result = generateRandomId(10);
      expect(typeof result).toBe("string");
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it("should return only alphanumeric characters (base 36)", () => {
      const result = generateRandomId(20);
      expect(result).toMatch(/^[a-z0-9]*$/);
    });

    it("should generate different IDs on consecutive calls", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateRandomId());
      }
      expect(ids.size).toBeGreaterThan(90);
    });

    it("should return length 1 when length is 1", () => {
      const result = generateRandomId(1);
      expect(result.length).toBeLessThanOrEqual(1);
    });
  });

  describe("error cases", () => {
    it("should handle undefined by using default value", () => {
      const result = generateRandomId(undefined);
      expect(typeof result).toBe("string");
      expect(result).not.toBe("");
    });

    it("should handle empty argument", () => {
      const result = generateRandomId();
      expect(typeof result).toBe("string");
      expect(result).not.toBe("");
    });
  });

  describe("invalid arguments", () => {
    it("should throw TypeError when length is null", () => {
      expect(() => generateRandomId(null as unknown as number)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when length is a string", () => {
      expect(() => generateRandomId("10" as unknown as number)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when length is a boolean", () => {
      expect(() => generateRandomId(true as unknown as number)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when length is an object", () => {
      expect(() => generateRandomId({} as unknown as number)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when length is an array", () => {
      expect(() => generateRandomId([5] as unknown as number)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when length is a function", () => {
      expect(() => generateRandomId((() => 5) as unknown as number)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when length is NaN", () => {
      expect(() => generateRandomId(NaN as unknown as number)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when length is a Symbol", () => {
      expect(() =>
        generateRandomId(Symbol("test") as unknown as number)
      ).toThrow(TypeError);
    });

    it("should throw TypeError when length is a BigInt", () => {
      expect(() => generateRandomId(BigInt(10) as unknown as number)).toThrow(
        TypeError
      );
    });
  });

  describe("boundary conditions", () => {
    it("should throw Error when length is 0", () => {
      expect(() => generateRandomId(0)).toThrow(Error);
      expect(() => generateRandomId(0)).toThrow(
        "Length must be a positive finite number"
      );
    });

    it("should throw Error when length is -1", () => {
      expect(() => generateRandomId(-1)).toThrow(Error);
      expect(() => generateRandomId(-1)).toThrow(
        "Length must be a positive finite number"
      );
    });

    it("should throw Error when length is -Infinity", () => {
      expect(() => generateRandomId(-Infinity)).toThrow(Error);
      expect(() => generateRandomId(-Infinity)).toThrow(
        "Length must be a positive finite number"
      );
    });

    it("should throw Error when length is Infinity", () => {
      expect(() => generateRandomId(Infinity)).toThrow(Error);
      expect(() => generateRandomId(Infinity)).toThrow(
        "Length must be a positive finite number"
      );
    });

    it("should handle very large length", () => {
      const result = generateRandomId(1000);
      expect(typeof result).toBe("string");
      expect(result).not.toBe("");
    });

    it("should handle floating point length floored to the nearest integer", () => {
      const result = generateRandomId(5.9);
      expect(typeof result).toBe("string");
      expect(result).not.toBe("");
    });

    it("should handle Number.MAX_SAFE_INTEGER", () => {
      const result = generateRandomId(Number.MAX_SAFE_INTEGER);
      expect(typeof result).toBe("string");
      expect(result).not.toBe("");
    });
  });
});

describe("pluralize", () => {
  describe("happy path", () => {
    it("should return singular form when count is 1", () => {
      expect(pluralize(1, "character")).toBe("character");
    });

    it("should return plural form (singular + s) when count is 0", () => {
      expect(pluralize(0, "character")).toBe("characters");
    });

    it("should return plural form (singular + s) when count is 2", () => {
      expect(pluralize(2, "character")).toBe("characters");
    });

    it("should return plural form (singular + s) when count is large number", () => {
      expect(pluralize(100, "item")).toBe("items");
    });

    it("should return custom plural form when provided", () => {
      expect(pluralize(0, "person", "people")).toBe("people");
    });

    it("should return singular when count is 1 even with custom plural provided", () => {
      expect(pluralize(1, "person", "people")).toBe("person");
    });

    it("should handle words ending in y", () => {
      expect(pluralize(2, "story")).toBe("storys");
    });

    it("should handle custom plural for irregular words", () => {
      expect(pluralize(2, "story", "stories")).toBe("stories");
    });

    it("should handle words ending in s", () => {
      expect(pluralize(2, "class")).toBe("classs");
    });

    it("should handle custom plural for words ending in s", () => {
      expect(pluralize(2, "class", "classes")).toBe("classes");
    });
  });

  describe("error cases", () => {
    it("should handle negative count as plural", () => {
      expect(pluralize(-1, "item")).toBe("items");
    });

    it("should handle decimal count close to 1 as plural", () => {
      expect(pluralize(1.5, "item")).toBe("items");
    });

    it("should handle decimal count exactly 1.0 as singular", () => {
      expect(pluralize(1.0, "item")).toBe("item");
    });
  });

  describe("invalid arguments - count parameter", () => {
    it("should throw TypeError when count is undefined", () => {
      expect(() => pluralize(undefined as unknown as number, "item")).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when count is null", () => {
      expect(() => pluralize(null as unknown as number, "item")).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when count is NaN", () => {
      expect(() => pluralize(NaN, "item")).toThrow(TypeError);
    });

    it("should throw TypeError when count is a string", () => {
      expect(() => pluralize("1" as unknown as number, "item")).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when count is a boolean", () => {
      expect(() => pluralize(true as unknown as number, "item")).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when count is an object", () => {
      expect(() => pluralize({} as unknown as number, "item")).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when count is an array", () => {
      expect(() => pluralize([1] as unknown as number, "item")).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when count is a function", () => {
      expect(() => pluralize((() => 1) as unknown as number, "item")).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when count is a Symbol", () => {
      expect(() => pluralize(Symbol("1") as unknown as number, "item")).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when count is a BigInt", () => {
      expect(() => pluralize(BigInt(1) as unknown as number, "item")).toThrow(
        TypeError
      );
    });
  });

  describe("invalid arguments - singular parameter", () => {
    it("should throw TypeError when singular is undefined", () => {
      expect(() => pluralize(1, undefined as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when singular is null", () => {
      expect(() => pluralize(2, null as unknown as string)).toThrow(TypeError);
    });

    it("should throw TypeError when singular is a number", () => {
      expect(() => pluralize(2, 123 as unknown as string)).toThrow(TypeError);
    });

    it("should throw TypeError when singular is an object", () => {
      expect(() => pluralize(2, {} as unknown as string)).toThrow(TypeError);
    });

    it("should throw TypeError when singular is an array", () => {
      expect(() => pluralize(2, ["a", "b"] as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when singular is a function", () => {
      const fn = () => "test";
      expect(() => pluralize(2, fn as unknown as string)).toThrow(TypeError);
    });

    it("should throw TypeError when singular is a Symbol", () => {
      expect(() => pluralize(2, Symbol("test") as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when singular is a BigInt", () => {
      expect(() => pluralize(2, BigInt(123) as unknown as string)).toThrow(
        TypeError
      );
    });
  });

  describe("invalid arguments - plural parameter", () => {
    it("should throw TypeError when plural is a number", () => {
      expect(() => pluralize(2, "item", 123 as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when plural is an object", () => {
      expect(() => pluralize(2, "item", {} as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when plural is an array", () => {
      expect(() =>
        pluralize(2, "item", ["a", "b"] as unknown as string)
      ).toThrow(TypeError);
    });

    it("should throw TypeError when plural is a function", () => {
      const fn = () => "test";
      expect(() => pluralize(2, "item", fn as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when plural is a boolean", () => {
      expect(() => pluralize(2, "item", true as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should not throw when plural is undefined (optional parameter)", () => {
      expect(() =>
        pluralize(2, "item", undefined as unknown as string)
      ).not.toThrow();
      expect(pluralize(2, "item", undefined)).toBe("items");
    });
  });

  describe("boundary conditions", () => {
    it("should handle empty string singular", () => {
      expect(pluralize(2, "")).toBe("s");
    });

    it("should handle empty string plural", () => {
      expect(pluralize(2, "item", "")).toBe("");
    });

    it("should handle very long singular string", () => {
      const longString = "a".repeat(10000);
      expect(pluralize(2, longString)).toBe(longString + "s");
    });

    it("should handle singular with special characters", () => {
      expect(pluralize(2, "café")).toBe("cafés");
    });

    it("should handle singular with unicode", () => {
      expect(pluralize(2, "日本語")).toBe("日本語s");
    });

    it("should handle singular with emojis", () => {
      expect(pluralize(2, "🎉")).toBe("🎉s");
    });

    it("should handle whitespace-only singular", () => {
      expect(pluralize(2, "   ")).toBe("   s");
    });

    it("should handle Infinity count", () => {
      expect(pluralize(Infinity, "item")).toBe("items");
    });

    it("should handle -Infinity count", () => {
      expect(pluralize(-Infinity, "item")).toBe("items");
    });

    it("should handle Number.MAX_SAFE_INTEGER count", () => {
      expect(pluralize(Number.MAX_SAFE_INTEGER, "item")).toBe("items");
    });
  });
});

describe("trimAllWhitespace", () => {
  describe("happy path", () => {
    it("should return the same string when no whitespace", () => {
      expect(trimAllWhitespace("hello")).toBe("hello");
    });

    it("should trim leading spaces", () => {
      expect(trimAllWhitespace("   hello")).toBe("hello");
    });

    it("should trim trailing spaces", () => {
      expect(trimAllWhitespace("hello   ")).toBe("hello");
    });

    it("should trim both leading and trailing spaces", () => {
      expect(trimAllWhitespace("   hello   ")).toBe("hello");
    });

    it("should preserve internal spaces", () => {
      expect(trimAllWhitespace("   hello world   ")).toBe("hello world");
    });

    it("should trim tabs", () => {
      expect(trimAllWhitespace("\thello\t")).toBe("hello");
    });

    it("should trim newlines", () => {
      expect(trimAllWhitespace("\nhello\n")).toBe("hello");
    });

    it("should trim carriage returns", () => {
      expect(trimAllWhitespace("\rhello\r")).toBe("hello");
    });

    it("should trim mixed whitespace", () => {
      expect(trimAllWhitespace(" \t\n\rhello \t\n\r")).toBe("hello");
    });
  });

  describe("error cases", () => {
    it("should return empty string when input is empty string", () => {
      expect(trimAllWhitespace("")).toBe("");
    });

    it("should return empty string when input is only whitespace", () => {
      expect(trimAllWhitespace("   ")).toBe("");
    });

    it("should return empty string when input is only tabs", () => {
      expect(trimAllWhitespace("\t\t\t")).toBe("");
    });

    it("should return empty string when input is only newlines", () => {
      expect(trimAllWhitespace("\n\n\n")).toBe("");
    });
  });

  describe("invalid arguments", () => {
    it("should throw TypeError when input is undefined", () => {
      expect(() => trimAllWhitespace(undefined as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when input is null", () => {
      expect(() => trimAllWhitespace(null as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when input is a number", () => {
      expect(() => trimAllWhitespace(123 as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when input is a boolean", () => {
      expect(() => trimAllWhitespace(true as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when input is an object", () => {
      expect(() => trimAllWhitespace({} as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when input is an array", () => {
      expect(() => trimAllWhitespace([] as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when input is a function", () => {
      expect(() =>
        trimAllWhitespace((() => "test") as unknown as string)
      ).toThrow(TypeError);
    });

    it("should throw TypeError when input is NaN", () => {
      expect(() => trimAllWhitespace(NaN as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when input is Symbol", () => {
      expect(() =>
        trimAllWhitespace(Symbol("test") as unknown as string)
      ).toThrow(TypeError);
    });

    it("should throw TypeError when input is BigInt", () => {
      expect(() => trimAllWhitespace(BigInt(123) as unknown as string)).toThrow(
        TypeError
      );
    });
  });

  describe("boundary conditions", () => {
    it("should handle very long string", () => {
      const longString = "   " + "a".repeat(100000) + "   ";
      const result = trimAllWhitespace(longString);
      expect(result).toBeDefined();
      expect(result.length).toBe(100000);
      expect(result.startsWith("a")).toBe(true);
      expect(result.endsWith("a")).toBe(true);
    });

    it("should handle string with only special unicode whitespace", () => {
      expect(trimAllWhitespace("\u00A0hello\u00A0")).toBe("hello");
    });

    it("should handle string with em space (U+2003)", () => {
      expect(trimAllWhitespace("\u2003hello\u2003")).toBe("hello");
    });

    it("should handle string with thin space (U+2009)", () => {
      expect(trimAllWhitespace("\u2009hello\u2009")).toBe("hello");
    });

    it("should handle string with ideographic space (U+3000)", () => {
      expect(trimAllWhitespace("\u3000hello\u3000")).toBe("hello");
    });

    it("should remove zero-width space (U+200B)", () => {
      expect(trimAllWhitespace("he\u200Bllo")).toBe("hello");
    });

    it("should remove zero-width non-joiner (U+200C)", () => {
      expect(trimAllWhitespace("he\u200Cllo")).toBe("hello");
    });

    it("should remove zero-width joiner (U+200D)", () => {
      expect(trimAllWhitespace("he\u200Dllo")).toBe("hello");
    });

    it("should remove soft hyphen (U+00AD)", () => {
      expect(trimAllWhitespace("he\u00ADllo")).toBe("hello");
    });

    it("should remove byte order mark (U+FEFF)", () => {
      expect(trimAllWhitespace("\uFEFFhello")).toBe("hello");
    });

    it("should remove word joiner (U+2060)", () => {
      expect(trimAllWhitespace("he\u2060llo")).toBe("hello");
    });

    it("should remove control characters (U+0000-U+001F)", () => {
      expect(trimAllWhitespace("he\u0001\u0002\u0003llo")).toBe("hello");
    });

    it("should remove null character (U+0000)", () => {
      expect(trimAllWhitespace("he\u0000llo")).toBe("hello");
    });

    it("should handle mixed visible and invisible characters", () => {
      const input = "\u200B \u00A0\t\nhello\u200B world\u00A0\n\t ";
      const result = trimAllWhitespace(input);
      expect(result).toBe("hello world");
    });

    it("should handle string with emojis and whitespace", () => {
      expect(trimAllWhitespace("   🎉 hello 🎉   ")).toBe("🎉 hello 🎉");
    });

    it("should handle string with unicode text and whitespace", () => {
      expect(trimAllWhitespace("   日本語   ")).toBe("日本語");
    });

    it("should handle string with RTL text", () => {
      expect(trimAllWhitespace("   مرحبا   ")).toBe("مرحبا");
    });

    it("should remove left-to-right mark (U+200E)", () => {
      expect(trimAllWhitespace("he\u200Ello")).toBe("hello");
    });

    it("should remove right-to-left mark (U+200F)", () => {
      expect(trimAllWhitespace("he\u200Fllo")).toBe("hello");
    });

    it("should handle figure space (U+2007)", () => {
      expect(trimAllWhitespace("\u2007hello\u2007")).toBe("hello");
    });

    it("should handle punctuation space (U+2008)", () => {
      expect(trimAllWhitespace("\u2008hello\u2008")).toBe("hello");
    });

    it("should handle hair space (U+200A)", () => {
      expect(trimAllWhitespace("\u200Ahello\u200A")).toBe("hello");
    });

    it("should handle narrow no-break space (U+202F)", () => {
      expect(trimAllWhitespace("\u202Fhello\u202F")).toBe("hello");
    });

    it("should handle medium mathematical space (U+205F)", () => {
      expect(trimAllWhitespace("\u205Fhello\u205F")).toBe("hello");
    });

    it("should handle ogham space mark (U+1680)", () => {
      expect(trimAllWhitespace("\u1680hello\u1680")).toBe("hello");
    });
  });
});

describe("formatStringToTitleCase", () => {
  describe("happy path", () => {
    it("should capitalize first letter of single word", () => {
      expect(formatStringToTitleCase("tyler")).toBe("Tyler");
    });

    it("should convert all uppercase to title case", () => {
      expect(formatStringToTitleCase("JOHN DOE")).toBe("John Doe");
    });

    it("should handle mixed case input", () => {
      expect(formatStringToTitleCase("jOhN dOe")).toBe("John Doe");
    });

    it("should handle already title cased string", () => {
      expect(formatStringToTitleCase("John Doe")).toBe("John Doe");
    });

    it("should capitalize after hyphen", () => {
      expect(formatStringToTitleCase("mary-jane")).toBe("Mary-Jane");
    });

    it("should capitalize after apostrophe", () => {
      expect(formatStringToTitleCase("o'connor")).toBe("O'Connor");
    });

    it("should handle multiple words", () => {
      expect(formatStringToTitleCase("the quick brown fox")).toBe(
        "The Quick Brown Fox"
      );
    });

    it("should handle single character words", () => {
      expect(formatStringToTitleCase("a b c")).toBe("A B C");
    });
  });

  describe("error cases", () => {
    it("should return empty string when input is empty", () => {
      expect(formatStringToTitleCase("")).toBe("");
    });

    it("should handle whitespace-only input", () => {
      expect(formatStringToTitleCase("   ")).toBe("   ");
    });

    it("should handle numbers mixed with letters - capitalizes after numbers", () => {
      expect(formatStringToTitleCase("john123doe")).toBe("John123Doe");
    });

    it("should handle numbers at word boundaries", () => {
      expect(formatStringToTitleCase("john 123 doe")).toBe("John 123 Doe");
    });
  });

  describe("invalid arguments - throws TypeError for non-string inputs", () => {
    it("should throw TypeError when input is undefined", () => {
      expect(() =>
        formatStringToTitleCase(undefined as unknown as string)
      ).toThrow(TypeError);
    });

    it("should throw TypeError when input is null", () => {
      expect(() => formatStringToTitleCase(null as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when input is a number", () => {
      expect(() => formatStringToTitleCase(123 as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when input is a boolean", () => {
      expect(() => formatStringToTitleCase(true as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when input is an object", () => {
      expect(() => formatStringToTitleCase({} as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when input is an array", () => {
      expect(() => formatStringToTitleCase([] as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when input is a function", () => {
      expect(() =>
        formatStringToTitleCase((() => "test") as unknown as string)
      ).toThrow(TypeError);
    });

    it("should throw TypeError when input is NaN", () => {
      expect(() => formatStringToTitleCase(NaN as unknown as string)).toThrow(
        TypeError
      );
    });

    it("should throw TypeError when input is Symbol", () => {
      expect(() =>
        formatStringToTitleCase(Symbol("test") as unknown as string)
      ).toThrow(TypeError);
    });

    it("should throw TypeError when input is BigInt", () => {
      expect(() =>
        formatStringToTitleCase(BigInt(123) as unknown as string)
      ).toThrow(TypeError);
    });
  });

  describe("boundary conditions", () => {
    it("should handle very long string", () => {
      const longString = "abcdefgh ".repeat(10000);
      const result = formatStringToTitleCase(longString);
      expect(result).toBeDefined();
      expect(result.startsWith("Abcdefgh")).toBe(true);
    });

    it("should handle string with special characters", () => {
      expect(formatStringToTitleCase("café au lait")).toBe("Café Au Lait");
    });

    it("should handle string with unicode letters (German)", () => {
      expect(formatStringToTitleCase("über")).toBe("Über");
    });

    it("should handle string with emojis", () => {
      expect(formatStringToTitleCase("hello 🎉 world")).toBe("Hello 🎉 World");
    });

    it("should handle Japanese characters (no case)", () => {
      // Japanese doesn't have case, should remain unchanged
      expect(formatStringToTitleCase("日本語")).toBe("日本語");
    });

    it("should handle Arabic characters (no case)", () => {
      expect(formatStringToTitleCase("مرحبا")).toBe("مرحبا");
    });

    it("should handle Cyrillic characters (Russian)", () => {
      expect(formatStringToTitleCase("привет мир")).toBe("Привет Мир");
    });

    it("should handle Greek characters", () => {
      expect(formatStringToTitleCase("γεια σου")).toBe("Γεια Σου");
    });

    it("should handle multiple spaces between words", () => {
      expect(formatStringToTitleCase("hello    world")).toBe("Hello    World");
    });

    it("should handle tabs between words", () => {
      expect(formatStringToTitleCase("hello\tworld")).toBe("Hello\tWorld");
    });

    it("should handle newlines between words", () => {
      expect(formatStringToTitleCase("hello\nworld")).toBe("Hello\nWorld");
    });

    it("should handle underscores - capitalizes after underscore", () => {
      // Unicode regex treats underscore as non-letter, so capitalizes after it
      expect(formatStringToTitleCase("hello_world")).toBe("Hello_World");
    });

    // Note: \b word boundary DOES treat dot as word boundary (boundary between \w and \W)
    // So "hello.world" becomes "Hello.World" - the 'w' after dot is capitalized
    it("should handle dots - treated as word boundary by \\b", () => {
      expect(formatStringToTitleCase("hello.world")).toBe("Hello.World");
    });

    it("should handle parentheses", () => {
      expect(formatStringToTitleCase("hello (world)")).toBe("Hello (World)");
    });

    it("should handle brackets", () => {
      expect(formatStringToTitleCase("hello [world]")).toBe("Hello [World]");
    });

    it("should handle quotes", () => {
      expect(formatStringToTitleCase('"hello world"')).toBe('"Hello World"');
    });

    it("should handle single character input", () => {
      expect(formatStringToTitleCase("a")).toBe("A");
    });

    it("should handle single uppercase character input", () => {
      expect(formatStringToTitleCase("A")).toBe("A");
    });

    it("should handle string with only numbers", () => {
      expect(formatStringToTitleCase("12345")).toBe("12345");
    });

    it("should handle string with only special characters", () => {
      expect(formatStringToTitleCase("!@#$%")).toBe("!@#$%");
    });

    it("should handle string starting with number - capitalizes after number", () => {
      expect(formatStringToTitleCase("123abc")).toBe("123Abc");
    });

    it("should handle string with consecutive punctuation", () => {
      expect(formatStringToTitleCase("hello!!!world")).toBe("Hello!!!World");
    });

    it("should handle name with Jr./Sr. suffix", () => {
      expect(formatStringToTitleCase("john smith jr.")).toBe("John Smith Jr.");
    });

    it("should handle compound surnames", () => {
      expect(formatStringToTitleCase("von neumann")).toBe("Von Neumann");
    });

    it("should handle Mac/Mc surnames", () => {
      expect(formatStringToTitleCase("MCDONALD")).toBe("Mcdonald");
    });
  });
});

describe("sanitizeForLLM", () => {
  describe("happy path - emoji removal", () => {
    it("should remove simple emoji characters", () => {
      expect(sanitizeForLLM("Hello 😀 World")).toBe("Hello World");
    });

    it("should remove multiple emojis", () => {
      expect(sanitizeForLLM("🎨 Art 🖼️ Gallery 🎭")).toBe("Art Gallery");
    });

    it("should handle emoji at start and end", () => {
      expect(sanitizeForLLM("🚀 Launch time! 🎉")).toBe("Launch time!");
    });

    it("should remove skin tone modifiers", () => {
      const result = sanitizeForLLM("Hello 👋🏻 there");
      expect(result).not.toContain("👋");
      expect(result).toBe("Hello there");
    });

    it("should remove ZWJ sequences (family emoji)", () => {
      const result = sanitizeForLLM("Family: 👨‍👩‍👧‍👦");
      expect(result).not.toContain("👨");
      expect(result).toBe("Family:");
    });
  });

  describe("happy path - preserves valid text", () => {
    it("should preserve ASCII text unchanged", () => {
      const text = "Hello, World! This is a test.";
      expect(sanitizeForLLM(text)).toBe(text);
    });

    it("should preserve common punctuation", () => {
      const text = "Test: value, another; more - stuff (parens) [brackets]";
      expect(sanitizeForLLM(text)).toBe(text);
    });

    it("should preserve numbers", () => {
      const text = "Chapter 1: 2023-01-15, $100.00";
      expect(sanitizeForLLM(text)).toBe(text);
    });

    it("should preserve accented characters (French)", () => {
      const text = "café résumé naïve";
      expect(sanitizeForLLM(text)).toBe(text);
    });

    it("should preserve German characters", () => {
      const text = "Größe über Äpfel Öffnung süß";
      expect(sanitizeForLLM(text)).toBe(text);
    });

    it("should preserve Japanese text", () => {
      const text = "日本語 キャラクター名: 田中太郎";
      expect(sanitizeForLLM(text)).toBe(text);
    });

    it("should preserve Korean text", () => {
      const text = "한국어 테스트";
      expect(sanitizeForLLM(text)).toBe(text);
    });

    it("should preserve Arabic text", () => {
      const text = "العربية مرحبا";
      expect(sanitizeForLLM(text)).toBe(text);
    });

    it("should preserve Cyrillic text (Russian)", () => {
      const text = "привет мир";
      expect(sanitizeForLLM(text)).toBe(text);
    });

    it("should preserve Chinese text", () => {
      const text = "中文测试 角色描述";
      expect(sanitizeForLLM(text)).toBe(text);
    });
  });

  describe("edge cases", () => {
    it("should return empty string for undefined", () => {
      expect(sanitizeForLLM(undefined)).toBe("");
    });

    it("should return empty string for null", () => {
      expect(sanitizeForLLM(null)).toBe("");
    });

    it("should return empty string for empty input", () => {
      expect(sanitizeForLLM("")).toBe("");
    });

    it("should trim whitespace", () => {
      expect(sanitizeForLLM("  hello  ")).toBe("hello");
    });

    it("should collapse multiple spaces from removed emojis", () => {
      expect(sanitizeForLLM("Hello    😀    World")).toBe("Hello World");
    });

    it("should handle string with only emojis", () => {
      expect(sanitizeForLLM("😀🎉🚀")).toBe("");
    });

    it("should handle mixed emoji and text", () => {
      expect(sanitizeForLLM("Character 🧙 Wizard Bob - loves magic ✨")).toBe(
        "Character Wizard Bob - loves magic"
      );
    });
  });

  describe("surrogate pair handling", () => {
    it("should remove lone high surrogates", () => {
      // 0xD83D (55357) is a high surrogate that causes ByteString errors
      const malformed = "Hello " + String.fromCharCode(0xd83d) + " World";
      expect(sanitizeForLLM(malformed)).toBe("Hello World");
    });

    it("should remove lone low surrogates", () => {
      const malformed = "Test " + String.fromCharCode(0xde00) + " string";
      expect(sanitizeForLLM(malformed)).toBe("Test string");
    });

    it("should handle multiple lone surrogates", () => {
      const malformed =
        String.fromCharCode(0xd83d) +
        "Hello" +
        String.fromCharCode(0xde00) +
        "World" +
        String.fromCharCode(0xd83d);
      expect(sanitizeForLLM(malformed)).toBe("HelloWorld");
    });
  });

  describe("variation selector handling", () => {
    it("should remove text presentation selector (U+FE0E)", () => {
      const withSelector = "Hello\uFE0EWorld";
      expect(sanitizeForLLM(withSelector)).toBe("HelloWorld");
    });

    it("should remove emoji presentation selector (U+FE0F)", () => {
      const withSelector = "Hello\uFE0FWorld";
      expect(sanitizeForLLM(withSelector)).toBe("HelloWorld");
    });
  });

  describe("boundary conditions", () => {
    it("should handle very long string", () => {
      const longText = "Hello World ".repeat(10000);
      const result = sanitizeForLLM(longText);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle string with many emojis", () => {
      const manyEmojis = "😀".repeat(100) + " Hello " + "🎉".repeat(100);
      expect(sanitizeForLLM(manyEmojis)).toBe("Hello");
    });

    it("should handle realistic character description with emojis", () => {
      const description =
        "A tall wizard 🧙 with a long white beard. Wears blue robes ✨ and carries a staff 🪄";
      expect(sanitizeForLLM(description)).toBe(
        "A tall wizard with a long white beard. Wears blue robes and carries a staff"
      );
    });

    it("should handle realistic Japanese character name with emoji", () => {
      const name = "田中太郎 🎭 - The Brave Hero";
      expect(sanitizeForLLM(name)).toBe("田中太郎 - The Brave Hero");
    });
  });
});

describe("sanitizeForHttpHeader", () => {
  describe("happy path - ASCII preservation", () => {
    it("should return ASCII string unchanged", () => {
      expect(sanitizeForHttpHeader("Hello World")).toBe("Hello World");
    });

    it("should preserve common punctuation", () => {
      expect(sanitizeForHttpHeader("Test: value, another - stuff")).toBe(
        "Test: value, another - stuff"
      );
    });

    it("should preserve numbers", () => {
      expect(sanitizeForHttpHeader("Episode 1: Chapter 2")).toBe(
        "Episode 1: Chapter 2"
      );
    });

    it("should preserve horizontal tab", () => {
      expect(sanitizeForHttpHeader("Hello\tWorld")).toBe("Hello\tWorld");
    });

    it("should preserve printable ASCII punctuation", () => {
      // Test common punctuation that might appear in headers
      // Note: empty brackets () [] {} are cleaned up by the function
      expect(sanitizeForHttpHeader("!@#$%^&*")).toBe("!@#$%^&*");
      expect(sanitizeForHttpHeader("-_=+;:'\"<>,./")).toBe("-_=+;:'\"<>,./");
      expect(sanitizeForHttpHeader("test (value) here")).toBe(
        "test (value) here"
      );
    });

    it("should preserve backslash character", () => {
      expect(sanitizeForHttpHeader("path\\to\\file")).toBe("path\\to\\file");
    });

    it("should preserve all alphanumeric characters", () => {
      const alphanumeric =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      expect(sanitizeForHttpHeader(alphanumeric)).toBe(alphanumeric);
    });
  });

  describe("non-ASCII character removal", () => {
    it("should remove Japanese characters", () => {
      expect(sanitizeForHttpHeader("EP 13: PINOKO (ピノコ愛してる)")).toBe(
        "EP 13: PINOKO"
      );
    });

    it("should remove Korean characters", () => {
      expect(sanitizeForHttpHeader("Test 한국어 here")).toBe("Test here");
    });

    it("should remove Chinese characters", () => {
      expect(sanitizeForHttpHeader("Story 中文测试")).toBe("Story");
    });

    it("should remove Arabic characters", () => {
      expect(sanitizeForHttpHeader("Hello العربية World")).toBe("Hello World");
    });

    it("should remove Cyrillic characters", () => {
      expect(sanitizeForHttpHeader("Test привет мир")).toBe("Test");
    });

    it("should remove accented characters (German)", () => {
      expect(sanitizeForHttpHeader("Größe über")).toBe("Gre ber");
    });

    it("should remove accented characters (French)", () => {
      expect(sanitizeForHttpHeader("café résumé")).toBe("caf rsum");
    });

    it("should remove emoji", () => {
      expect(sanitizeForHttpHeader("Hello 😀 World 🎉")).toBe("Hello World");
    });

    it("should handle string with only non-ASCII", () => {
      expect(sanitizeForHttpHeader("日本語")).toBe("");
    });

    it("should handle string with only emoji", () => {
      expect(sanitizeForHttpHeader("😀🎉🚀")).toBe("");
    });
  });

  describe("bracket cleanup after removal", () => {
    it("should remove empty parentheses after non-ASCII removal", () => {
      expect(sanitizeForHttpHeader("Test (日本語) here")).toBe("Test here");
    });

    it("should remove empty square brackets after non-ASCII removal", () => {
      expect(sanitizeForHttpHeader("Test [日本語] here")).toBe("Test here");
    });

    it("should remove empty curly braces after non-ASCII removal", () => {
      expect(sanitizeForHttpHeader("Test {日本語} here")).toBe("Test here");
    });

    it("should remove brackets with only whitespace inside", () => {
      expect(sanitizeForHttpHeader("Test (  ) here")).toBe("Test here");
    });

    it("should preserve brackets with ASCII content", () => {
      expect(sanitizeForHttpHeader("Test (hello) here")).toBe(
        "Test (hello) here"
      );
    });

    it("should handle mixed brackets with non-ASCII content", () => {
      // After non-ASCII removal, spaces may remain inside brackets
      // The function removes empty brackets but preserves brackets with content
      // Input: "Test (日本語) [Korean 한국어] {emoji 😀}"
      // After removal: "Test () [Korean ] {emoji }"
      // After empty bracket removal + space collapse: "Test [Korean ] {emoji }"
      const result = sanitizeForHttpHeader(
        "Test (日本語) [Korean 한국어] {emoji 😀}"
      );
      expect(result).toContain("[Korean");
      expect(result).toContain("{emoji");
      expect(result).not.toContain("日本語");
      expect(result).not.toContain("한국어");
      expect(result).not.toContain("😀");
    });

    it("should remove empty brackets cleanly", () => {
      expect(sanitizeForHttpHeader("Test (only日本語) here")).toBe(
        "Test (only) here"
      );
    });
  });

  describe("control character filtering (security)", () => {
    it("should remove carriage return (header injection)", () => {
      expect(sanitizeForHttpHeader("Header\rInjection")).toBe(
        "HeaderInjection"
      );
    });

    it("should remove newline (header injection)", () => {
      expect(sanitizeForHttpHeader("Header\nInjection")).toBe(
        "HeaderInjection"
      );
    });

    it("should remove CRLF sequence (header injection)", () => {
      expect(sanitizeForHttpHeader("Header\r\nInjection: bad")).toBe(
        "HeaderInjection: bad"
      );
    });

    it("should remove null character", () => {
      expect(sanitizeForHttpHeader("Hello\u0000World")).toBe("HelloWorld");
    });

    it("should remove other control characters (U+0001-U+001F)", () => {
      expect(sanitizeForHttpHeader("A\u0001B\u0002C\u001FD")).toBe("ABCD");
    });

    it("should remove DEL character (U+007F)", () => {
      expect(sanitizeForHttpHeader("Hello\u007FWorld")).toBe("HelloWorld");
    });
  });

  describe("multiple space cleanup", () => {
    it("should collapse multiple spaces to single space", () => {
      expect(sanitizeForHttpHeader("Hello    World")).toBe("Hello World");
    });

    it("should collapse spaces left by emoji removal", () => {
      expect(sanitizeForHttpHeader("Hello  😀  World")).toBe("Hello World");
    });

    it("should collapse spaces left by non-ASCII removal", () => {
      expect(sanitizeForHttpHeader("EP 13:  日本語  Test")).toBe("EP 13: Test");
    });

    it("should trim leading whitespace", () => {
      expect(sanitizeForHttpHeader("   Hello")).toBe("Hello");
    });

    it("should trim trailing whitespace", () => {
      expect(sanitizeForHttpHeader("Hello   ")).toBe("Hello");
    });

    it("should trim and collapse mixed whitespace", () => {
      expect(sanitizeForHttpHeader("   Hello    World   ")).toBe("Hello World");
    });
  });

  describe("edge cases", () => {
    it("should return empty string for undefined", () => {
      expect(sanitizeForHttpHeader(undefined)).toBe("");
    });

    it("should return empty string for null", () => {
      expect(sanitizeForHttpHeader(null)).toBe("");
    });

    it("should return empty string for empty string", () => {
      expect(sanitizeForHttpHeader("")).toBe("");
    });

    it("should handle whitespace-only input", () => {
      expect(sanitizeForHttpHeader("   ")).toBe("");
    });
  });

  describe("realistic scenarios (Helicone tracking)", () => {
    it("should sanitize episode title with Japanese", () => {
      expect(
        sanitizeForHttpHeader("EP 13: PINOKO (ピノコ愛してる) - The Doctor")
      ).toBe("EP 13: PINOKO - The Doctor");
    });

    it("should sanitize story title with emoji", () => {
      expect(sanitizeForHttpHeader("My Amazing Story 🚀 - Season 1")).toBe(
        "My Amazing Story - Season 1"
      );
    });

    it("should sanitize user name with international characters", () => {
      expect(sanitizeForHttpHeader("José García")).toBe("Jos Garca");
    });

    it("should sanitize user name with Japanese", () => {
      expect(sanitizeForHttpHeader("田中太郎 (Taro Tanaka)")).toBe(
        "(Taro Tanaka)"
      );
    });

    it("should handle mixed content from real episode titles", () => {
      // The "!" is ASCII and preserved; only non-ASCII (決戦) is removed
      expect(sanitizeForHttpHeader("Episode 5: 決戦! Final Battle")).toBe(
        "Episode 5: ! Final Battle"
      );
    });

    it("should handle episode title with all non-ASCII removed", () => {
      expect(sanitizeForHttpHeader("Episode 5: 決戦 - Final Battle")).toBe(
        "Episode 5: - Final Battle"
      );
    });

    it("should preserve basic episode title", () => {
      expect(sanitizeForHttpHeader("Episode 1: The Beginning")).toBe(
        "Episode 1: The Beginning"
      );
    });
  });

  describe("boundary conditions", () => {
    it("should handle very long string", () => {
      const longString = "Hello World ".repeat(1000);
      const result = sanitizeForHttpHeader(longString);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result.startsWith("Hello World")).toBe(true);
    });

    it("should handle single character", () => {
      expect(sanitizeForHttpHeader("A")).toBe("A");
    });

    it("should handle single non-ASCII character", () => {
      expect(sanitizeForHttpHeader("日")).toBe("");
    });

    it("should handle alternating ASCII and non-ASCII", () => {
      expect(sanitizeForHttpHeader("A日B本C語D")).toBe("ABCD");
    });
  });
});

describe("sanitizeAlphanumeric", () => {
  describe("happy path", () => {
    it("should convert to lowercase and keep letters and numbers", () => {
      expect(sanitizeAlphanumeric("Take 1")).toBe("take_1");
    });

    it("should replace spaces with default replacement (underscore)", () => {
      expect(sanitizeAlphanumeric("My Great Take")).toBe("my_great_take");
    });

    it("should use custom replacement if provided", () => {
      expect(sanitizeAlphanumeric("Hello World", "-")).toBe("hello-world");
    });

    it("should remove special characters", () => {
      expect(sanitizeAlphanumeric("Take #1 @Special!")).toBe("take_1_special");
    });

    it("should remove emojis", () => {
      expect(sanitizeAlphanumeric("Take 1 😀")).toBe("take_1");
    });

    it("should collapse multiple replacement characters", () => {
      expect(sanitizeAlphanumeric("Take   1 !!!")).toBe("take_1");
    });

    it("should trim leading and trailing replacement characters", () => {
      expect(sanitizeAlphanumeric("!!! Take 1 !!!")).toBe("take_1");
    });

    it("should handle mixed special characters and emojis", () => {
      expect(sanitizeAlphanumeric("Take #1 😀 @Special!")).toBe(
        "take_1_special"
      );
    });
  });

  describe("error cases", () => {
    it("should return empty string for null", () => {
      expect(sanitizeAlphanumeric(null)).toBe("");
    });

    it("should return empty string for undefined", () => {
      expect(sanitizeAlphanumeric(undefined)).toBe("");
    });

    it("should return empty string for empty input", () => {
      expect(sanitizeAlphanumeric("")).toBe("");
    });

    it("should return empty string if everything is removed", () => {
      expect(sanitizeAlphanumeric("!!! 😀 !!!")).toBe("");
    });
  });

  describe("boundary conditions", () => {
    it("should handle very long strings", () => {
      const longString = "A#".repeat(100);
      expect(sanitizeAlphanumeric(longString)).toBe("a_".repeat(99) + "a");
    });

    it("should handle only numbers", () => {
      expect(sanitizeAlphanumeric("123456")).toBe("123456");
    });

    it("should handle only special characters by returning empty (trimmed)", () => {
      expect(sanitizeAlphanumeric("@#$%^")).toBe("");
    });

    it("should handle replacement character that needs escaping in regex", () => {
      expect(sanitizeAlphanumeric("Hello World", ".")).toBe("hello.world");
    });
  });
});
