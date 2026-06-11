import { describe, expect, it } from "vitest";

import {
  IsoDateStringSchema,
  LimitSchema,
  MonthSchema,
  ObjectIdsArraySchema,
  PageSchema,
  SelectAllSchema,
  SelectedPagesArraySchema,
  SortOrderSchema,
  createCustomLimitSchema,
  createPaginationConfig,
  createPaginationConfigWithSearch,
  createPaginationSchema,
  createPaginationSchemaWithSearch,
  createSortBySchema,
} from "./validate-params";

describe("PageSchema", () => {
  describe("happy path", () => {
    it("should accept valid page number 1", () => {
      expect(PageSchema.parse(1)).toBe(1);
    });

    it("should accept page number 5", () => {
      expect(PageSchema.parse(5)).toBe(5);
    });

    it("should accept large page number", () => {
      expect(PageSchema.parse(9999)).toBe(9999);
    });

    it("should coerce numeric string to number", () => {
      expect(PageSchema.parse("3")).toBe(3);
    });

    it("should coerce string '1' to number 1", () => {
      expect(PageSchema.parse("1")).toBe(1);
    });
  });

  describe("error cases - falls back to default", () => {
    it("should return default 1 for undefined", () => {
      expect(PageSchema.parse(undefined)).toBe(1);
    });

    it("should return default 1 for null", () => {
      expect(PageSchema.parse(null)).toBe(1);
    });

    it("should return default 1 for non-numeric string", () => {
      expect(PageSchema.parse("abc")).toBe(1);
    });

    it("should return default 1 for empty string", () => {
      expect(PageSchema.parse("")).toBe(1);
    });

    it("should return default 1 for empty object", () => {
      expect(PageSchema.parse({})).toBe(1);
    });

    it("should return default 1 for array", () => {
      expect(PageSchema.parse([])).toBe(1);
    });

    it("should return default 1 for NaN", () => {
      expect(PageSchema.parse(NaN)).toBe(1);
    });

    it("should return default 1 for boolean true", () => {
      // coerces true -> 1, which is valid (>= 1)
      expect(PageSchema.parse(true)).toBe(1);
    });

    it("should return default 1 for boolean false", () => {
      // false -> 0, which is < 1, so falls back to default
      expect(PageSchema.parse(false)).toBe(1);
    });

    it("should return default 1 for function", () => {
      expect(PageSchema.parse((() => {}) as unknown as number)).toBe(1);
    });
  });

  describe("boundary conditions", () => {
    it("should accept exactly page 1 (minimum)", () => {
      expect(PageSchema.parse(1)).toBe(1);
    });

    it("should fall back to default for page 0", () => {
      expect(PageSchema.parse(0)).toBe(1);
    });

    it("should fall back to default for page -1", () => {
      expect(PageSchema.parse(-1)).toBe(1);
    });

    it("should fall back to default for float (non-integer)", () => {
      expect(PageSchema.parse(1.5)).toBe(1);
    });

    it("should fall back to default for float '1.5' string", () => {
      expect(PageSchema.parse("1.5")).toBe(1);
    });
  });
});

describe("LimitSchema", () => {
  describe("happy path", () => {
    it("should accept valid limit 10", () => {
      expect(LimitSchema.parse(10)).toBe(10);
    });

    it("should accept valid limit 20", () => {
      expect(LimitSchema.parse(20)).toBe(20);
    });

    it("should accept valid limit 50", () => {
      expect(LimitSchema.parse(50)).toBe(50);
    });

    it("should accept valid limit 100", () => {
      expect(LimitSchema.parse(100)).toBe(100);
    });

    it("should coerce string '10' to number 10", () => {
      expect(LimitSchema.parse("10")).toBe(10);
    });

    it("should coerce string '100' to number 100", () => {
      expect(LimitSchema.parse("100")).toBe(100);
    });
  });

  describe("error cases - falls back to default (10)", () => {
    it("should return default 10 for undefined", () => {
      expect(LimitSchema.parse(undefined)).toBe(10);
    });

    it("should return default 10 for null", () => {
      expect(LimitSchema.parse(null)).toBe(10);
    });

    it("should return default 10 for non-allowed value 15", () => {
      expect(LimitSchema.parse(15)).toBe(10);
    });

    it("should return default 10 for non-allowed value 25", () => {
      expect(LimitSchema.parse(25)).toBe(10);
    });

    it("should return default 10 for 0", () => {
      expect(LimitSchema.parse(0)).toBe(10);
    });

    it("should return default 10 for negative number", () => {
      expect(LimitSchema.parse(-10)).toBe(10);
    });

    it("should return default 10 for non-numeric string", () => {
      expect(LimitSchema.parse("invalid")).toBe(10);
    });

    it("should return default 10 for empty string", () => {
      expect(LimitSchema.parse("")).toBe(10);
    });

    it("should return default 10 for NaN", () => {
      expect(LimitSchema.parse(NaN)).toBe(10);
    });

    it("should return default 10 for object", () => {
      expect(LimitSchema.parse({})).toBe(10);
    });

    it("should return default 10 for array", () => {
      expect(LimitSchema.parse([])).toBe(10);
    });

    it("should return default 10 for float", () => {
      expect(LimitSchema.parse(10.5)).toBe(10);
    });
  });
});

describe("SortOrderSchema", () => {
  describe("happy path", () => {
    it("should accept 'asc'", () => {
      expect(SortOrderSchema.parse("asc")).toBe("asc");
    });

    it("should accept 'desc'", () => {
      expect(SortOrderSchema.parse("desc")).toBe("desc");
    });
  });

  describe("error cases - falls back to 'asc'", () => {
    it("should return 'asc' for undefined", () => {
      expect(SortOrderSchema.parse(undefined)).toBe("asc");
    });

    it("should return 'asc' for null", () => {
      expect(SortOrderSchema.parse(null)).toBe("asc");
    });

    it("should return 'asc' for 'ASC' (wrong case)", () => {
      expect(SortOrderSchema.parse("ASC")).toBe("asc");
    });

    it("should return 'asc' for 'DESC' (wrong case)", () => {
      expect(SortOrderSchema.parse("DESC")).toBe("asc");
    });

    it("should return 'asc' for invalid string", () => {
      expect(SortOrderSchema.parse("invalid")).toBe("asc");
    });

    it("should return 'asc' for empty string", () => {
      expect(SortOrderSchema.parse("")).toBe("asc");
    });

    it("should return 'asc' for number", () => {
      expect(SortOrderSchema.parse(1)).toBe("asc");
    });

    it("should return 'asc' for boolean", () => {
      expect(SortOrderSchema.parse(true)).toBe("asc");
    });

    it("should return 'asc' for object", () => {
      expect(SortOrderSchema.parse({})).toBe("asc");
    });

    it("should return 'asc' for array", () => {
      expect(SortOrderSchema.parse([])).toBe("asc");
    });
  });
});

describe("createSortBySchema", () => {
  const allowedValues = ["name", "createdAt", "updatedAt"] as const;
  const defaultValue = "name";

  describe("happy path", () => {
    it("should accept a valid allowed value 'name'", () => {
      const schema = createSortBySchema(allowedValues, defaultValue);
      expect(schema.parse("name")).toBe("name");
    });

    it("should accept a valid allowed value 'createdAt'", () => {
      const schema = createSortBySchema(allowedValues, defaultValue);
      expect(schema.parse("createdAt")).toBe("createdAt");
    });

    it("should accept a valid allowed value 'updatedAt'", () => {
      const schema = createSortBySchema(allowedValues, defaultValue);
      expect(schema.parse("updatedAt")).toBe("updatedAt");
    });
  });

  describe("error cases - falls back to default", () => {
    it("should return default for invalid sort field", () => {
      const schema = createSortBySchema(allowedValues, defaultValue);
      expect(schema.parse("invalidField")).toBe(defaultValue);
    });

    it("should return default for undefined", () => {
      const schema = createSortBySchema(allowedValues, defaultValue);
      expect(schema.parse(undefined)).toBe(defaultValue);
    });

    it("should return default for null", () => {
      const schema = createSortBySchema(allowedValues, defaultValue);
      expect(schema.parse(null)).toBe(defaultValue);
    });

    it("should return default for empty string", () => {
      const schema = createSortBySchema(allowedValues, defaultValue);
      expect(schema.parse("")).toBe(defaultValue);
    });

    it("should return default for number", () => {
      const schema = createSortBySchema(allowedValues, defaultValue);
      expect(schema.parse(1 as unknown as string)).toBe(defaultValue);
    });

    it("should return default for object", () => {
      const schema = createSortBySchema(allowedValues, defaultValue);
      expect(schema.parse({} as unknown as string)).toBe(defaultValue);
    });
  });

  describe("boundary conditions", () => {
    it("should work with a single allowed value", () => {
      const schema = createSortBySchema(["only"] as const, "only");
      expect(schema.parse("only")).toBe("only");
      expect(schema.parse("other")).toBe("only");
    });

    it("should be case-sensitive", () => {
      const schema = createSortBySchema(allowedValues, defaultValue);
      // 'Name' is not the same as 'name'
      expect(schema.parse("Name")).toBe(defaultValue);
    });
  });
});

describe("createCustomLimitSchema", () => {
  const customPageSizes = [5, 10, 25, 50];

  describe("happy path", () => {
    it("should accept a valid custom limit from customPageSizes", () => {
      const schema = createCustomLimitSchema(5, customPageSizes);
      expect(schema.parse(5)).toBe(5);
    });

    it("should accept custom limit 25", () => {
      const schema = createCustomLimitSchema(25, customPageSizes);
      expect(schema.parse(25)).toBe(25);
    });

    it("should accept value in customPageSizes even above default MAX_LIMIT", () => {
      const largeSizes = [10, 50, 200];
      const schema = createCustomLimitSchema(10, largeSizes);
      expect(schema.parse(200)).toBe(200);
    });

    it("should coerce string '10' to number 10", () => {
      const schema = createCustomLimitSchema(10, customPageSizes);
      expect(schema.parse("10")).toBe(10);
    });

    it("should use PAGE_SIZES when customPageSizes is empty array", () => {
      // When customPageSizes is empty, it falls back to PAGE_SIZES [10, 20, 50, 100]
      const schema = createCustomLimitSchema(10, []);
      expect(schema.parse(10)).toBe(10);
      expect(schema.parse(20)).toBe(20);
    });
  });

  describe("error cases - falls back to customLimit default", () => {
    it("should fall back to customLimit default for non-allowed value", () => {
      const schema = createCustomLimitSchema(5, customPageSizes);
      expect(schema.parse(99)).toBe(5);
    });

    it("should fall back to customLimit default for undefined", () => {
      const schema = createCustomLimitSchema(5, customPageSizes);
      expect(schema.parse(undefined)).toBe(5);
    });

    it("should fall back to customLimit default for null", () => {
      const schema = createCustomLimitSchema(5, customPageSizes);
      expect(schema.parse(null)).toBe(5);
    });

    it("should fall back to customLimit default for non-numeric string", () => {
      const schema = createCustomLimitSchema(5, customPageSizes);
      expect(schema.parse("abc")).toBe(5);
    });

    it("should fall back to customLimit default for float (non-integer)", () => {
      const schema = createCustomLimitSchema(5, customPageSizes);
      expect(schema.parse(5.5)).toBe(5);
    });
  });

  describe("boundary conditions", () => {
    it("should reject 0 (less than min 1) and fall back to customLimit", () => {
      const schema = createCustomLimitSchema(5, customPageSizes);
      expect(schema.parse(0)).toBe(5);
    });

    it("should reject negative numbers and fall back", () => {
      const schema = createCustomLimitSchema(5, customPageSizes);
      expect(schema.parse(-5)).toBe(5);
    });

    it("should fall back to first page size when customLimit is not in customPageSizes", () => {
      const schema = createCustomLimitSchema(99, [5, 10]);
      // 99 is not in [5, 10], so fallback is _customPageSizes[0] = 5
      expect(schema.parse(99)).toBe(5);
    });
  });
});

describe("createPaginationSchema", () => {
  const validOptions = {
    allowedSortBy: ["name", "createdAt"] as const,
    defaultSortBy: "name" as const,
  };

  describe("happy path", () => {
    it("should parse valid pagination params", () => {
      const schema = createPaginationSchema(validOptions);
      const result = schema.parse({
        page: 1,
        limit: 10,
        sortBy: "name",
        sortOrder: "asc",
      });
      expect(result).toEqual({
        page: 1,
        limit: 10,
        sortBy: "name",
        sortOrder: "asc",
      });
    });

    it("should use default sortOrder when not provided", () => {
      const schema = createPaginationSchema(validOptions);
      const result = schema.parse({ page: 1, limit: 10, sortBy: "name" });
      expect(result.sortOrder).toBe("asc");
    });

    it("should respect custom defaultSortOrder", () => {
      const schema = createPaginationSchema({
        ...validOptions,
        defaultSortOrder: "desc",
      });
      const result = schema.parse({ page: 1, limit: 10, sortBy: "name" });
      expect(result.sortOrder).toBe("desc");
    });

    it("should fall back to custom defaultSortOrder when sortOrder is invalid", () => {
      const schema = createPaginationSchema({
        ...validOptions,
        defaultSortOrder: "desc",
      });
      const result = schema.parse({
        page: 1,
        limit: 10,
        sortBy: "name",
        sortOrder: "INVALID",
      });
      expect(result.sortOrder).toBe("desc");
    });

    it("should use custom limit schema when customLimit is provided", () => {
      const schema = createPaginationSchema({
        ...validOptions,
        customLimit: 20,
        customPageSizes: [10, 20, 50],
      });
      const result = schema.parse({
        page: 1,
        limit: 20,
        sortBy: "name",
        sortOrder: "asc",
      });
      expect(result.limit).toBe(20);
    });

    it("should fall back to defaultSortBy for invalid sortBy", () => {
      const schema = createPaginationSchema(validOptions);
      const result = schema.parse({
        page: 1,
        limit: 10,
        sortBy: "invalid",
        sortOrder: "asc",
      });
      expect(result.sortBy).toBe("name");
    });
  });

  describe("error cases", () => {
    it("should throw when options is missing", () => {
      expect(() =>
        createPaginationSchema(undefined as unknown as typeof validOptions)
      ).toThrow("allowedSortBy and defaultSortBy are required");
    });

    it("should throw when allowedSortBy is missing", () => {
      expect(() =>
        createPaginationSchema({
          defaultSortBy: "name",
        } as unknown as typeof validOptions)
      ).toThrow("allowedSortBy and defaultSortBy are required");
    });

    it("should throw when defaultSortBy is missing", () => {
      expect(() =>
        createPaginationSchema({
          allowedSortBy: ["name"],
        } as unknown as typeof validOptions)
      ).toThrow("allowedSortBy and defaultSortBy are required");
    });

    it("should throw when options is null", () => {
      expect(() =>
        createPaginationSchema(null as unknown as typeof validOptions)
      ).toThrow("allowedSortBy and defaultSortBy are required");
    });

    it("should throw when options is an empty object", () => {
      expect(() =>
        createPaginationSchema({} as unknown as typeof validOptions)
      ).toThrow("allowedSortBy and defaultSortBy are required");
    });
  });

  describe("boundary conditions", () => {
    it("should parse query params coming as strings (URL scenario)", () => {
      const schema = createPaginationSchema(validOptions);
      const result = schema.parse({
        page: "3",
        limit: "50",
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      expect(result).toEqual({
        page: 3,
        limit: 50,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
    });

    it("should use defaults for completely empty input", () => {
      const schema = createPaginationSchema(validOptions);
      const result = schema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.sortBy).toBe("name");
      expect(result.sortOrder).toBe("asc");
    });
  });
});

describe("createPaginationSchemaWithSearch", () => {
  const validOptions = {
    allowedSortBy: ["title", "updatedAt"] as const,
    defaultSortBy: "title" as const,
  };

  describe("happy path", () => {
    it("should parse valid pagination params with search", () => {
      const schema = createPaginationSchemaWithSearch(validOptions);
      const result = schema.parse({
        page: 1,
        limit: 20,
        sortBy: "title",
        sortOrder: "asc",
        search: "hello",
      });
      expect(result).toEqual({
        page: 1,
        limit: 20,
        sortBy: "title",
        sortOrder: "asc",
        search: "hello",
      });
    });

    it("should default search to empty string when absent", () => {
      const schema = createPaginationSchemaWithSearch(validOptions);
      const result = schema.parse({
        page: 1,
        limit: 10,
        sortBy: "title",
        sortOrder: "asc",
      });
      expect(result.search).toBe("");
    });
  });

  describe("boundary conditions", () => {
    it("should fall back empty string for search exceeding 100 characters", () => {
      const schema = createPaginationSchemaWithSearch(validOptions);
      const result = schema.parse({
        page: 1,
        limit: 10,
        sortBy: "title",
        sortOrder: "asc",
        search: "a".repeat(301),
      });
      expect(result.search).toBe("");
    });

    it("should inherit createPaginationSchema validation errors", () => {
      expect(() =>
        createPaginationSchemaWithSearch(null as unknown as typeof validOptions)
      ).toThrow("allowedSortBy and defaultSortBy are required");
    });
  });
});

describe("createPaginationConfig", () => {
  const validOptions = {
    allowedSortBy: ["name", "createdAt"] as const,
    defaultSortBy: "name" as const,
  };

  it("should return schema, pageSizes, and defaults", () => {
    const config = createPaginationConfig(validOptions);
    expect(config).toHaveProperty("schema");
    expect(config).toHaveProperty("pageSizes");
    expect(config).toHaveProperty("defaults");
  });

  it("should use default PAGE_SIZES when no customPageSizes provided", () => {
    const config = createPaginationConfig(validOptions);
    expect(config.pageSizes).toEqual([10, 20, 50, 100]);
  });

  it("should use customPageSizes when provided", () => {
    const config = createPaginationConfig({
      ...validOptions,
      customPageSizes: [15, 30, 45],
    });
    expect(config.pageSizes).toEqual([15, 30, 45]);
  });

  it("should set defaults.limit to first page size", () => {
    const config = createPaginationConfig({
      ...validOptions,
      customPageSizes: [15, 30, 45],
    });
    expect(config.defaults.limit).toBe(15);
  });

  it("should set defaults.page to 1", () => {
    const config = createPaginationConfig(validOptions);
    expect(config.defaults.page).toBe(1);
  });

  it("should produce a schema that validates against pageSizes", () => {
    const config = createPaginationConfig({
      ...validOptions,
      customPageSizes: [15, 30, 45],
    });
    // Valid limit
    expect(config.schema.parse({ limit: 30 }).limit).toBe(30);
    // Invalid limit falls back to first page size
    expect(config.schema.parse({ limit: 10 }).limit).toBe(15);
  });

  it("should respect customLimit when provided", () => {
    const config = createPaginationConfig({
      ...validOptions,
      customLimit: 30,
      customPageSizes: [15, 30, 45],
    });
    expect(config.defaults.limit).toBe(30);
  });

  it("should throw if customLimit is not in pageSizes", () => {
    expect(() =>
      createPaginationConfig({
        ...validOptions,
        customLimit: 99,
        customPageSizes: [15, 30, 45],
      })
    ).toThrow("customLimit (99) must be one of pageSizes: [15, 30, 45]");
  });
});

describe("createPaginationConfigWithSearch", () => {
  const validOptions = {
    allowedSortBy: ["title", "updatedAt"] as const,
    defaultSortBy: "title" as const,
  };

  it("should return schema with search field, pageSizes, and defaults", () => {
    const config = createPaginationConfigWithSearch(validOptions);
    expect(config.defaults).toHaveProperty("search");
    expect(config.defaults.search).toBe("");
  });

  it("should use customPageSizes for pageSizes and schema", () => {
    const config = createPaginationConfigWithSearch({
      ...validOptions,
      customPageSizes: [15, 30, 45, 50],
    });
    expect(config.pageSizes).toEqual([15, 30, 45, 50]);
    expect(config.defaults.limit).toBe(15);
    // Invalid limit falls back to first page size
    expect(config.schema.parse({ limit: 10 }).limit).toBe(15);
  });

  it("should produce consistent defaults and schema validation", () => {
    const config = createPaginationConfigWithSearch({
      ...validOptions,
      customPageSizes: [25, 50, 75],
    });
    // The default limit should be a valid schema value
    const reparsed = config.schema.parse({ limit: config.defaults.limit });
    expect(reparsed.limit).toBe(config.defaults.limit);
  });

  it("should throw if customLimit is not in pageSizes", () => {
    expect(() =>
      createPaginationConfigWithSearch({
        ...validOptions,
        customLimit: 99,
        customPageSizes: [15, 30, 45],
      })
    ).toThrow("customLimit (99) must be one of pageSizes: [15, 30, 45]");
  });
});

describe("IsoDateStringSchema", () => {
  describe("happy path", () => {
    it("should accept a UTC ISO 8601 datetime string from toISOString()", () => {
      const value = new Date("2026-04-13T00:00:00.000Z").toISOString();
      expect(IsoDateStringSchema.parse(value)).toBe(value);
    });

    it("should accept ISO datetime without milliseconds", () => {
      expect(IsoDateStringSchema.parse("2026-04-13T00:00:00Z")).toBe(
        "2026-04-13T00:00:00Z"
      );
    });
  });

  describe("error cases", () => {
    it("should reject a non-date string", () => {
      expect(() => IsoDateStringSchema.parse("hello")).toThrow();
    });

    it("should reject an empty string", () => {
      expect(() => IsoDateStringSchema.parse("")).toThrow();
    });

    it("should reject a date-only string (no time component)", () => {
      expect(() => IsoDateStringSchema.parse("2026-04-13")).toThrow();
    });

    it("should reject a string longer than 40 chars", () => {
      expect(() => IsoDateStringSchema.parse("a".repeat(41))).toThrow();
    });

    it("should reject a non-string input", () => {
      expect(() => IsoDateStringSchema.parse(123)).toThrow();
    });

    it("should reject whitespace-only string", () => {
      expect(() => IsoDateStringSchema.parse("   ")).toThrow();
    });
  });
});

describe("ObjectIdsArraySchema", () => {
  const VALID_ID_A = "507f1f77bcf86cd799439011";
  const VALID_ID_B = "507f191e810c19729de860ea";

  describe("happy path (string input)", () => {
    it("should parse a single valid ObjectId into a 1-element array", () => {
      expect(ObjectIdsArraySchema.parse(VALID_ID_A)).toEqual([VALID_ID_A]);
    });

    it("should split a comma-separated list of valid ObjectIds", () => {
      expect(ObjectIdsArraySchema.parse(`${VALID_ID_A},${VALID_ID_B}`)).toEqual(
        [VALID_ID_A, VALID_ID_B]
      );
    });

    it("should trim whitespace around each id", () => {
      expect(
        ObjectIdsArraySchema.parse(`  ${VALID_ID_A} , ${VALID_ID_B}  `)
      ).toEqual([VALID_ID_A, VALID_ID_B]);
    });

    it("should drop empty entries between commas", () => {
      expect(
        ObjectIdsArraySchema.parse(`${VALID_ID_A},,${VALID_ID_B}`)
      ).toEqual([VALID_ID_A, VALID_ID_B]);
    });
  });

  describe("happy path", () => {
    it("should accept an array of valid ObjectIds unchanged", () => {
      expect(ObjectIdsArraySchema.parse([VALID_ID_A, VALID_ID_B])).toEqual([
        VALID_ID_A,
        VALID_ID_B,
      ]);
    });

    it("should trim whitespace and drop empty entries from array input", () => {
      expect(
        ObjectIdsArraySchema.parse([` ${VALID_ID_A} `, "", VALID_ID_B])
      ).toEqual([VALID_ID_A, VALID_ID_B]);
    });
  });

  describe("error cases", () => {
    it("should reject a non-hex id", () => {
      expect(() => ObjectIdsArraySchema.parse("nothex")).toThrow();
    });

    it("should reject a 23-character hex id (too short)", () => {
      expect(() => ObjectIdsArraySchema.parse("a".repeat(23))).toThrow();
    });

    it("should reject a 25-character hex id (too long)", () => {
      expect(() => ObjectIdsArraySchema.parse("a".repeat(25))).toThrow();
    });

    it("should reject if any id in the list is invalid", () => {
      expect(() =>
        ObjectIdsArraySchema.parse(`${VALID_ID_A},not-an-id`)
      ).toThrow();
    });

    it("should reject an invalid id inside an array input", () => {
      expect(() =>
        ObjectIdsArraySchema.parse([VALID_ID_A, "not-an-id"])
      ).toThrow();
    });

    it("should reject a string over 8000 characters", () => {
      expect(() => ObjectIdsArraySchema.parse("a".repeat(8001))).toThrow();
    });

    it("should reject non-string, non-array input", () => {
      expect(() => ObjectIdsArraySchema.parse(42)).toThrow();
      expect(() => ObjectIdsArraySchema.parse(null)).toThrow();
      expect(() => ObjectIdsArraySchema.parse(undefined)).toThrow();
      expect(() => ObjectIdsArraySchema.parse({})).toThrow();
    });

    it("should self-heal to undefined when wrapped with .optional().catch(undefined)", () => {
      const Optional = ObjectIdsArraySchema.optional().catch(undefined);
      expect(Optional.parse("not-an-id")).toBeUndefined();
      expect(Optional.parse(undefined)).toBeUndefined();
      expect(Optional.parse([VALID_ID_A])).toEqual([VALID_ID_A]);
    });
  });

  describe("boundary conditions", () => {
    it("should return undefined for an empty string", () => {
      expect(ObjectIdsArraySchema.parse("")).toBeUndefined();
    });

    it("should return undefined for an all-commas string", () => {
      expect(ObjectIdsArraySchema.parse(",,,")).toBeUndefined();
    });

    it("should return undefined for an empty array", () => {
      expect(ObjectIdsArraySchema.parse([])).toBeUndefined();
    });

    it("should return undefined for an array of only empty strings", () => {
      expect(ObjectIdsArraySchema.parse(["", "  "])).toBeUndefined();
    });
  });
});

describe("MonthSchema", () => {
  describe("happy path", () => {
    it("should accept a valid YYYY-MM string", () => {
      expect(MonthSchema.parse("2026-04")).toBe("2026-04");
    });

    it("should accept January (01)", () => {
      expect(MonthSchema.parse("2026-01")).toBe("2026-01");
    });

    it("should accept December (12)", () => {
      expect(MonthSchema.parse("2026-12")).toBe("2026-12");
    });
  });

  describe("error cases", () => {
    it("should reject month 00", () => {
      expect(() => MonthSchema.parse("2026-00")).toThrow();
    });

    it("should reject month 13", () => {
      expect(() => MonthSchema.parse("2026-13")).toThrow();
    });

    it("should reject a single-digit month without leading zero", () => {
      expect(() => MonthSchema.parse("2026-4")).toThrow();
    });

    it("should reject a 3-digit year", () => {
      expect(() => MonthSchema.parse("226-04")).toThrow();
    });

    it("should reject an ISO date (YYYY-MM-DD)", () => {
      expect(() => MonthSchema.parse("2026-04-13")).toThrow();
    });

    it("should reject an empty string", () => {
      expect(() => MonthSchema.parse("")).toThrow();
    });

    it("should reject whitespace padding", () => {
      expect(() => MonthSchema.parse(" 2026-04 ")).toThrow();
    });

    it("should reject a non-string input", () => {
      expect(() => MonthSchema.parse(202604 as unknown as string)).toThrow();
    });

    it("should reject a string longer than 7 characters", () => {
      expect(() => MonthSchema.parse("2026-041")).toThrow();
    });
  });

  describe("composition", () => {
    it("should self-heal to a default when wrapped with .catch().default()", () => {
      const schema = MonthSchema.catch("2026-01").default("2026-01");
      expect(schema.parse("2026-13")).toBe("2026-01");
      expect(schema.parse(undefined)).toBe("2026-01");
      expect(schema.parse("2026-06")).toBe("2026-06");
    });
  });
});

describe("SelectedPagesArraySchema", () => {
  describe("happy path (string input)", () => {
    it("should parse a comma-separated list of positive integers", () => {
      expect(SelectedPagesArraySchema.parse("1,3,5")).toEqual([1, 3, 5]);
    });

    it("should parse a single value into a 1-element array", () => {
      expect(SelectedPagesArraySchema.parse("7")).toEqual([7]);
    });

    it("should trim whitespace around each entry", () => {
      expect(SelectedPagesArraySchema.parse(" 1 , 2 , 3 ")).toEqual([1, 2, 3]);
    });

    it("should drop empty entries between commas", () => {
      expect(SelectedPagesArraySchema.parse("1,,3")).toEqual([1, 3]);
    });
  });

  describe("happy path (array input)", () => {
    it("should accept a number array unchanged", () => {
      expect(SelectedPagesArraySchema.parse([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it("should coerce numeric strings inside an array", () => {
      expect(SelectedPagesArraySchema.parse(["1", "2", "3"])).toEqual([
        1, 2, 3,
      ]);
    });

    it("should drop invalid entries from array input", () => {
      expect(SelectedPagesArraySchema.parse([1, "abc", 3])).toEqual([1, 3]);
    });
  });

  describe("filtering invalid entries", () => {
    it("should drop zero", () => {
      expect(SelectedPagesArraySchema.parse("0,1,2")).toEqual([1, 2]);
    });

    it("should drop negative numbers", () => {
      expect(SelectedPagesArraySchema.parse("-1,2")).toEqual([2]);
    });

    it("should drop non-integer (float) values", () => {
      expect(SelectedPagesArraySchema.parse("1.5,2")).toEqual([2]);
    });

    it("should drop non-numeric entries", () => {
      expect(SelectedPagesArraySchema.parse("abc,2,xyz")).toEqual([2]);
    });
  });

  describe("boundary conditions", () => {
    it("should return undefined for an empty string", () => {
      expect(SelectedPagesArraySchema.parse("")).toBeUndefined();
    });

    it("should return undefined for an all-commas string", () => {
      expect(SelectedPagesArraySchema.parse(",,,")).toBeUndefined();
    });

    it("should return undefined for an empty array", () => {
      expect(SelectedPagesArraySchema.parse([])).toBeUndefined();
    });

    it("should return undefined when no entry is a positive integer", () => {
      expect(SelectedPagesArraySchema.parse("0,-1,abc")).toBeUndefined();
    });
  });

  describe("error cases", () => {
    it("should reject a string over 8000 characters", () => {
      expect(() => SelectedPagesArraySchema.parse("a".repeat(8001))).toThrow();
    });

    it("should reject non-string, non-array input", () => {
      expect(() => SelectedPagesArraySchema.parse(42)).toThrow();
      expect(() => SelectedPagesArraySchema.parse(null)).toThrow();
      expect(() => SelectedPagesArraySchema.parse(undefined)).toThrow();
      expect(() => SelectedPagesArraySchema.parse({})).toThrow();
    });

    it("should self-heal to undefined when wrapped with .optional().catch(undefined)", () => {
      const Optional = SelectedPagesArraySchema.optional().catch(undefined);
      expect(Optional.parse(undefined)).toBeUndefined();
      expect(Optional.parse(42 as unknown as string)).toBeUndefined();
      expect(Optional.parse("1,2")).toEqual([1, 2]);
    });
  });
});

describe("SelectAllSchema", () => {
  describe("happy path", () => {
    it('should normalize the literal "true" string to "true"', () => {
      expect(SelectAllSchema.parse("true")).toBe("true");
    });

    it('should normalize boolean true to the literal "true"', () => {
      expect(SelectAllSchema.parse(true)).toBe("true");
    });

    it("should normalize boolean false to undefined", () => {
      expect(SelectAllSchema.parse(false)).toBeUndefined();
    });
  });

  describe("error cases", () => {
    it('should reject the string "false"', () => {
      // "false" is neither the "true" literal nor a boolean
      expect(() => SelectAllSchema.parse("false")).toThrow();
    });

    it('should reject an uppercase "TRUE"', () => {
      expect(() => SelectAllSchema.parse("TRUE")).toThrow();
    });

    it("should reject arbitrary strings", () => {
      expect(() => SelectAllSchema.parse("yes")).toThrow();
    });

    it("should reject undefined without .optional()", () => {
      expect(() => SelectAllSchema.parse(undefined)).toThrow();
    });

    it("should reject null", () => {
      expect(() => SelectAllSchema.parse(null)).toThrow();
    });

    it("should reject numeric input", () => {
      expect(() => SelectAllSchema.parse(1 as unknown as boolean)).toThrow();
    });

    it("should reject object input", () => {
      expect(() => SelectAllSchema.parse({} as unknown as boolean)).toThrow();
    });
  });

  describe("composition", () => {
    it("should self-heal to undefined when wrapped with .optional().catch(undefined)", () => {
      const Optional = SelectAllSchema.optional().catch(undefined);
      expect(Optional.parse(undefined)).toBeUndefined();
      expect(Optional.parse("false")).toBeUndefined();
      expect(Optional.parse("yes")).toBeUndefined();
      expect(Optional.parse("true")).toBe("true");
      expect(Optional.parse(true)).toBe("true");
      expect(Optional.parse(false)).toBeUndefined();
    });
  });
});
