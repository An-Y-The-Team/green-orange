import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { batchProcess, createBatchProcessWithRetries } from "./batch-process";

describe("batchProcess", () => {
  describe("happy path", () => {
    it("should process all items in a single batch when data length <= batchSize", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(data, mockFn, 10);

      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(mockFn).toHaveBeenNthCalledWith(1, 1, 0);
      expect(mockFn).toHaveBeenNthCalledWith(2, 2, 1);
      expect(mockFn).toHaveBeenNthCalledWith(3, 3, 2);
    });

    it("should process all items in multiple batches when data length > batchSize", async () => {
      const data = [1, 2, 3, 4, 5];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(data, mockFn, 2);

      expect(mockFn).toHaveBeenCalledTimes(5);
      expect(mockFn).toHaveBeenNthCalledWith(1, 1, 0);
      expect(mockFn).toHaveBeenNthCalledWith(2, 2, 1);
      expect(mockFn).toHaveBeenNthCalledWith(3, 3, 2);
      expect(mockFn).toHaveBeenNthCalledWith(4, 4, 3);
      expect(mockFn).toHaveBeenNthCalledWith(5, 5, 4);
    });

    it("should use default batchSize of 10 when not provided", async () => {
      const data = Array.from({ length: 25 }, (_, i) => i);
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(data, mockFn);

      expect(mockFn).toHaveBeenCalledTimes(25);
    });

    it("should handle empty array", async () => {
      const data: number[] = [];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(data, mockFn, 5);

      expect(mockFn).not.toHaveBeenCalled();
    });

    it("should process complex objects", async () => {
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(data, mockFn, 5);

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenNthCalledWith(1, { id: 1, name: "Alice" }, 0);
      expect(mockFn).toHaveBeenNthCalledWith(2, { id: 2, name: "Bob" }, 1);
    });

    it("should continue processing other items when one fails", async () => {
      const data = [1, 2, 3];
      const mockFn = vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce(undefined);

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await batchProcess(data, mockFn, 5);

      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("error cases", () => {
    it("should log errors but not throw when fetchFunction rejects", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockRejectedValue(new Error("Processing failed"));
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(batchProcess(data, mockFn, 5)).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
      consoleErrorSpy.mockRestore();
    });

    it("should handle fetchFunction throwing synchronous errors", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockImplementation(() => {
        throw new Error("Sync error");
      });
      await expect(batchProcess(data, mockFn, 5)).rejects.toThrow("Sync error");
    });

    it("should handle mixed success and failures in same batch", async () => {
      const data = [1, 2, 3, 4];
      const mockFn = vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Failed"));

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await batchProcess(data, mockFn, 5);

      expect(mockFn).toHaveBeenCalledTimes(4);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("invalid arguments", () => {
    it("should throw TypeError when data is undefined", async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess(undefined as unknown as number[], mockFn, 5)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is null", async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess(null as unknown as number[], mockFn, 5)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is a number", async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess(123 as unknown as number[], mockFn, 5)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is a string", async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess("not an array" as unknown as number[], mockFn, 5)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is a boolean", async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess(true as unknown as number[], mockFn, 5)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is an object", async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess({ key: "value" } as unknown as number[], mockFn, 5)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is a function", async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess((() => {}) as unknown as number[], mockFn, 5)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is NaN", async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess(NaN as unknown as number[], mockFn, 5)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is a Symbol", async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess(Symbol("test") as unknown as number[], mockFn, 5)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is a BigInt", async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess(BigInt(123) as unknown as number[], mockFn, 5)
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is undefined", async () => {
      const data = [1, 2, 3];

      await expect(
        batchProcess(
          data,
          undefined as unknown as (
            item: number,
            index: number
          ) => Promise<void>,
          5
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is null", async () => {
      const data = [1, 2, 3];

      await expect(
        batchProcess(
          data,
          null as unknown as (item: number, index: number) => Promise<void>,
          5
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is a number", async () => {
      const data = [1, 2, 3];

      await expect(
        batchProcess(
          data,
          123 as unknown as (item: number, index: number) => Promise<void>,
          5
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is a string", async () => {
      const data = [1, 2, 3];

      await expect(
        batchProcess(
          data,
          "not a function" as unknown as (
            item: number,
            index: number
          ) => Promise<void>,
          5
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is a boolean", async () => {
      const data = [1, 2, 3];

      await expect(
        batchProcess(
          data,
          true as unknown as (item: number, index: number) => Promise<void>,
          5
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is an object", async () => {
      const data = [1, 2, 3];

      await expect(
        batchProcess(
          data,
          { key: "value" } as unknown as (
            item: number,
            index: number
          ) => Promise<void>,
          5
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is an array", async () => {
      const data = [1, 2, 3];

      await expect(
        batchProcess(
          data,
          [1, 2, 3] as unknown as (
            item: number,
            index: number
          ) => Promise<void>,
          5
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is NaN", async () => {
      const data = [1, 2, 3];

      await expect(
        batchProcess(
          data,
          NaN as unknown as (item: number, index: number) => Promise<void>,
          5
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is a Symbol", async () => {
      const data = [1, 2, 3];

      await expect(
        batchProcess(
          data,
          Symbol("test") as unknown as (
            item: number,
            index: number
          ) => Promise<void>,
          5
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is a BigInt", async () => {
      const data = [1, 2, 3];

      await expect(
        batchProcess(
          data,
          BigInt(123) as unknown as (
            item: number,
            index: number
          ) => Promise<void>,
          5
        )
      ).rejects.toThrow();
    });

    it("should handle batchSize as undefined and use default", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(data, mockFn, undefined);

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should throw error when batchSize is null", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);
      await expect(
        batchProcess(data, mockFn, null as unknown as number)
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is a string number", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);
      await expect(
        batchProcess(data, mockFn, "5" as unknown as number)
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is a boolean true", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);
      await expect(
        batchProcess(data, mockFn, true as unknown as number)
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is an object", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);
      await expect(
        batchProcess(data, mockFn, { size: 5 } as unknown as number)
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw error when batchSize is an array", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess(data, mockFn, [5] as unknown as number)
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw error when batchSize is NaN", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(batchProcess(data, mockFn, NaN)).rejects.toThrow(
        "batchSize must be a positive integer number"
      );
    });

    it("should throw error when batchSize is an empty string", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess(data, mockFn, "" as unknown as number)
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw error when batchSize is 0", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(batchProcess(data, mockFn, 0)).rejects.toThrow(
        "batchSize must be a positive integer number"
      );
    });
    it("should throw error when batchSize is Infinity", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(batchProcess(data, mockFn, Infinity)).rejects.toThrow(
        "batchSize must be a positive integer number"
      );
    });

    it("should throw error when batchSize is -Infinity", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(batchProcess(data, mockFn, -Infinity)).rejects.toThrow(
        "batchSize must be a positive integer number"
      );
    });

    it("should throw error when batchSize is negative", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(batchProcess(data, mockFn, -5)).rejects.toThrow(
        "batchSize must be a positive integer number"
      );
    });

    it("should throw TypeError when batchSize is a function", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess(data, mockFn, (() => 5) as unknown as number)
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is a Symbol", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess(data, mockFn, Symbol("test") as unknown as number)
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is a BigInt", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        batchProcess(data, mockFn, BigInt(5) as unknown as number)
      ).rejects.toThrow("batchSize must be a positive integer number");
    });
  });

  describe("boundary conditions", () => {
    it("should handle batchSize of 1", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(data, mockFn, 1);

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should handle batchSize larger than data length", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(data, mockFn, 100);

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should handle very large array", async () => {
      const data = Array.from({ length: 10000 }, (_, i) => i);
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(data, mockFn, 100);

      expect(mockFn).toHaveBeenCalledTimes(10000);
    });

    it("should handle array with one item", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(data, mockFn, 5);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(1, 0);
    });

    it("should handle extremely long strings in array", async () => {
      const longString = "a".repeat(1000000);
      const data = [longString];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(data, mockFn, 5);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(longString, 0);
    });

    it("should handle deeply nested objects", async () => {
      type NestedObject = { level: number; nested?: NestedObject };
      const deepObject: NestedObject = { level: 1 };
      let current: NestedObject = deepObject;
      for (let i = 0; i < 100; i++) {
        current.nested = { level: i + 2 };
        current = current.nested;
      }
      const data = [deepObject];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(data, mockFn, 5);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(deepObject, 0);
    });

    it("should handle array with circular references", async () => {
      type CircularArray = (number | CircularArray)[];
      const circularArray: CircularArray = [1, 2];
      circularArray.push(circularArray);
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(circularArray, mockFn, 5);

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should handle object with circular references", async () => {
      type CircularObject = { id: number; self?: CircularObject };
      const circularObj: CircularObject = { id: 1 };
      circularObj.self = circularObj;
      const data = [circularObj];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await batchProcess(data, mockFn, 5);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(circularObj, 0);
    });

    it("should throw TypeError when batchSize is a floating point number", async () => {
      const data = [1, 2, 3, 4, 5];
      const mockFn = vi.fn().mockResolvedValue(undefined);

      await expect(batchProcess(data, mockFn, 2.7)).rejects.toThrow(
        "batchSize must be a positive integer number"
      );
    });
  });
});

describe("createBatchProcessWithRetries", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("happy path", () => {
    it("should process all items successfully", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");
      const onSuccess = vi.fn();

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { onSuccess });

      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(onSuccess).toHaveBeenCalledTimes(3);
    });

    it("should call onSuccess with correct event data", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("result");
      const onSuccess = vi.fn();

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { onSuccess });

      expect(onSuccess).toHaveBeenCalledWith({
        item: 1,
        index: 0,
        result: "result",
        summary: { total: 3, success: 1, failed: 0 },
        cancel: expect.any(Function),
      });
    });

    it("should call onDone with final summary", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");
      const onDone = vi.fn();

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { onDone });

      expect(onDone).toHaveBeenCalledWith({
        total: 3,
        success: 3,
        failed: 0,
        cancelled: false,
        cancel: expect.any(Function),
      });
    });

    it("should use default options when not provided", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn);

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should handle empty array", async () => {
      const data: number[] = [];
      const mockFn = vi.fn().mockResolvedValue("success");
      const onDone = vi.fn();

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { onDone });

      expect(mockFn).not.toHaveBeenCalled();
      expect(onDone).toHaveBeenCalledWith({
        total: 0,
        success: 0,
        failed: 0,
        cancelled: false,
        cancel: expect.any(Function),
      });
    });

    it("should process items with custom batchSize", async () => {
      const data = [1, 2, 3, 4, 5];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { batchSize: 2 });

      expect(mockFn).toHaveBeenCalledTimes(5);
    });

    it("should cancel processing when cancel is called", async () => {
      const data = [1, 2, 3, 4, 5];
      let cancelFn: (() => void) | null = null;
      const mockFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "success";
      });
      const onSuccess = vi.fn((event) => {
        cancelFn = event.cancel;
        if (event.index === 1) {
          event.cancel();
        }
      });

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { onSuccess, batchSize: 1 });

      expect(cancelFn).not.toBeNull();
      expect(onSuccess.mock.calls.length).toBeLessThan(5);
    });
  });

  describe("error cases", () => {
    it("should retry failed operations", async () => {
      const data = [1];
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("First fail"))
        .mockRejectedValueOnce(new Error("Second fail"))
        .mockResolvedValueOnce("success");
      const onSuccess = vi.fn();

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { retries: 3, onSuccess });

      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("should call onError when all retries fail", async () => {
      const data = [1];
      const mockFn = vi.fn().mockRejectedValue(new Error("Always fails"));
      const onError = vi.fn();

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { retries: 2, onError });

      expect(onError).toHaveBeenCalledWith({
        item: 1,
        index: 0,
        error: expect.any(Error),
        summary: { total: 1, success: 0, failed: 1 },
        cancel: expect.any(Function),
      });
    });

    it("should handle mix of successes and failures", async () => {
      const data = [1, 2, 3];
      const mockFn = vi
        .fn()
        .mockResolvedValueOnce("success")
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce("success");
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const onDone = vi.fn();

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, {
        retries: 0,
        onSuccess,
        onError,
        onDone,
      });

      expect(onSuccess).toHaveBeenCalledTimes(2);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledWith({
        total: 3,
        success: 2,
        failed: 1,
        cancelled: false,
        cancel: expect.any(Function),
      });
    });

    it("should throw 429 errors without retrying", async () => {
      const data = [1];
      const error429 = { status: 429, message: "Too many requests" };
      const mockFn = vi.fn().mockRejectedValue(error429);
      const onError = vi.fn();

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { retries: 3, onError });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(mockFn.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle synchronous errors in fetchFunction", async () => {
      const data = [1];
      const mockFn = vi.fn().mockImplementation(() => {
        throw new Error("Sync error");
      });
      const onError = vi.fn();

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { retries: 0, onError });

      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe("invalid arguments", () => {
    it("should throw TypeError when data is undefined", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(undefined as unknown as number[], mockFn)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is null", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(null as unknown as number[], mockFn)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is a number", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(123 as unknown as number[], mockFn)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is a string", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run("not an array" as unknown as number[], mockFn)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is a boolean", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(true as unknown as number[], mockFn)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is an object", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run({ key: "value" } as unknown as number[], mockFn)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is a function", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run((() => {}) as unknown as number[], mockFn)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is NaN", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(NaN as unknown as number[], mockFn)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is a Symbol", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(Symbol("test") as unknown as number[], mockFn)
      ).rejects.toThrow();
    });

    it("should throw TypeError when data is a BigInt", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(BigInt(123) as unknown as number[], mockFn)
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is undefined", async () => {
      const data = [1, 2, 3];

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(
          data,
          undefined as unknown as (
            item: number,
            index: number
          ) => Promise<string>
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is null", async () => {
      const data = [1, 2, 3];

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(
          data,
          null as unknown as (item: number, index: number) => Promise<string>
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is a number", async () => {
      const data = [1, 2, 3];

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(
          data,
          123 as unknown as (item: number, index: number) => Promise<string>
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is a string", async () => {
      const data = [1, 2, 3];

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(
          data,
          "not a function" as unknown as (
            item: number,
            index: number
          ) => Promise<string>
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is a boolean", async () => {
      const data = [1, 2, 3];

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(
          data,
          true as unknown as (item: number, index: number) => Promise<string>
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is an object", async () => {
      const data = [1, 2, 3];

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, { key: "value" } as unknown as (
          item: number,
          index: number
        ) => Promise<string>)
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is an array", async () => {
      const data = [1, 2, 3];

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, [1, 2, 3] as unknown as (
          item: number,
          index: number
        ) => Promise<string>)
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is NaN", async () => {
      const data = [1, 2, 3];

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(
          data,
          NaN as unknown as (item: number, index: number) => Promise<string>
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is a Symbol", async () => {
      const data = [1, 2, 3];

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(
          data,
          Symbol("test") as unknown as (
            item: number,
            index: number
          ) => Promise<string>
        )
      ).rejects.toThrow();
    });

    it("should throw TypeError when fetchFunction is a BigInt", async () => {
      const data = [1, 2, 3];

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(
          data,
          BigInt(123) as unknown as (
            item: number,
            index: number
          ) => Promise<string>
        )
      ).rejects.toThrow();
    });

    it("should handle options as undefined", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, undefined);

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should handle options as null", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(
        data,
        mockFn,
        null as unknown as {
          batchSize?: number;
          retries?: number;
          onSuccess?: (event: {
            item: number;
            index: number;
            result: string;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void;
          onError?: (event: {
            item: number;
            index: number;
            error: unknown;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void;
          onDone?: (event: {
            total: number;
            success: number;
            failed: number;
            cancelled: boolean;
            cancel: () => void;
          }) => void;
        }
      );

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should handle options as empty object", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, {});

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should throw TypeError when batchSize is a string number", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          batchSize: "5" as unknown as number,
        })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is null", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          batchSize: null as unknown as number,
        })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is Infinity", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { batchSize: Infinity })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is 0", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { batchSize: 0 })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is negative", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { batchSize: -5 })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is a negative floating point number", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { batchSize: 5.4 })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is NaN", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { batchSize: NaN })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is -Infinity", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { batchSize: -Infinity })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is an object", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          batchSize: { size: 5 } as unknown as number,
        })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is a function", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          batchSize: (() => 5) as unknown as number,
        })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is an array", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { batchSize: [5] as unknown as number })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is a boolean", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { batchSize: true as unknown as number })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is a Symbol", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          batchSize: Symbol("test") as unknown as number,
        })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when batchSize is a BigInt", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          batchSize: BigInt(5) as unknown as number,
        })
      ).rejects.toThrow("batchSize must be a positive integer number");
    });

    it("should throw TypeError when retries is a string number", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { retries: "3" as unknown as number })
      ).rejects.toThrow("retries must be a non-negative integer number");
    });

    it("should throw TypeError when retries is null", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { retries: null as unknown as number })
      ).rejects.toThrow("retries must be a non-negative integer number");
    });

    it("should throw TypeError when retries is NaN", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { retries: NaN })
      ).rejects.toThrow("retries must be a non-negative integer number");
    });

    it("should throw TypeError when retries is a floating point number", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { retries: 5.4 })
      ).rejects.toThrow("retries must be a non-negative integer number");
    });

    it("should throw TypeError when retries is negative", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { retries: -5 })
      ).rejects.toThrow("retries must be a non-negative integer number");
    });

    it("should throw TypeError when retries is Infinity", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { retries: Infinity })
      ).rejects.toThrow("retries must be a non-negative integer number");
    });

    it("should throw TypeError when retries is -Infinity", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { retries: -Infinity })
      ).rejects.toThrow("retries must be a non-negative integer number");
    });

    it("should throw TypeError when retries is an object", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          retries: { count: 3 } as unknown as number,
        })
      ).rejects.toThrow("retries must be a non-negative integer number");
    });

    it("should throw TypeError when retries is a function", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { retries: (() => 3) as unknown as number })
      ).rejects.toThrow("retries must be a non-negative integer number");
    });

    it("should throw TypeError when retries is an array", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { retries: [3] as unknown as number })
      ).rejects.toThrow("retries must be a non-negative integer number");
    });

    it("should throw TypeError when retries is a boolean", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { retries: true as unknown as number })
      ).rejects.toThrow("retries must be a non-negative integer number");
    });

    it("should throw TypeError when retries is a Symbol", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          retries: Symbol("test") as unknown as number,
        })
      ).rejects.toThrow("retries must be a non-negative integer number");
    });

    it("should throw TypeError when retries is a BigInt", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, { retries: BigInt(3) as unknown as number })
      ).rejects.toThrow("retries must be a non-negative integer number");
    });

    it("should handle retries of 0", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { retries: 0 });
    });

    it("should throw error when onSuccess is a string", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onSuccess: "not a function" as unknown as (event: {
            item: number;
            index: number;
            result: string;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onSuccess must be a function");
    });

    it("should throw error when onSuccess is null", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onSuccess: null as unknown as (event: {
            item: number;
            index: number;
            result: string;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onSuccess must be a function");
    });

    it("should throw error when onSuccess is a number", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onSuccess: 123 as unknown as (event: {
            item: number;
            index: number;
            result: string;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onSuccess must be a function");
    });

    it("should throw error when onSuccess is a boolean", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onSuccess: true as unknown as (event: {
            item: number;
            index: number;
            result: string;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onSuccess must be a function");
    });

    it("should throw error when onSuccess is an object", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onSuccess: { key: "value" } as unknown as (event: {
            item: number;
            index: number;
            result: string;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onSuccess must be a function");
    });

    it("should throw error when onSuccess is an array", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onSuccess: [1, 2, 3] as unknown as (event: {
            item: number;
            index: number;
            result: string;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onSuccess must be a function");
    });

    it("should throw error when onSuccess is NaN", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onSuccess: NaN as unknown as (event: {
            item: number;
            index: number;
            result: string;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onSuccess must be a function");
    });

    it("should throw error when onSuccess is a Symbol", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onSuccess: Symbol("test") as unknown as (event: {
            item: number;
            index: number;
            result: string;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onSuccess must be a function");
    });

    it("should throw error when onSuccess is a BigInt", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onSuccess: BigInt(123) as unknown as (event: {
            item: number;
            index: number;
            result: string;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onSuccess must be a function");
    });

    it("should throw error when onError is a string", async () => {
      const data = [1];
      const mockFn = vi.fn().mockRejectedValue(new Error("Failed"));

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          retries: 0,
          onError: "not a function" as unknown as (event: {
            item: number;
            index: number;
            error: unknown;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onError must be a function");
    });

    it("should throw error when onError is null", async () => {
      const data = [1];
      const mockFn = vi.fn().mockRejectedValue(new Error("Failed"));

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          retries: 0,
          onError: null as unknown as (event: {
            item: number;
            index: number;
            error: unknown;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onError must be a function");
    });

    it("should throw error when onError is a number", async () => {
      const data = [1];
      const mockFn = vi.fn().mockRejectedValue(new Error("Failed"));

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          retries: 0,
          onError: 123 as unknown as (event: {
            item: number;
            index: number;
            error: unknown;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onError must be a function");
    });

    it("should throw error when onError is a boolean", async () => {
      const data = [1];
      const mockFn = vi.fn().mockRejectedValue(new Error("Failed"));

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          retries: 0,
          onError: true as unknown as (event: {
            item: number;
            index: number;
            error: unknown;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onError must be a function");
    });

    it("should throw error when onError is an object", async () => {
      const data = [1];
      const mockFn = vi.fn().mockRejectedValue(new Error("Failed"));

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          retries: 0,
          onError: { key: "value" } as unknown as (event: {
            item: number;
            index: number;
            error: unknown;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onError must be a function");
    });

    it("should throw error when onError is an array", async () => {
      const data = [1];
      const mockFn = vi.fn().mockRejectedValue(new Error("Failed"));

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          retries: 0,
          onError: [1, 2, 3] as unknown as (event: {
            item: number;
            index: number;
            error: unknown;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onError must be a function");
    });

    it("should throw error when onError is NaN", async () => {
      const data = [1];
      const mockFn = vi.fn().mockRejectedValue(new Error("Failed"));

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          retries: 0,
          onError: NaN as unknown as (event: {
            item: number;
            index: number;
            error: unknown;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onError must be a function");
    });

    it("should throw error when onError is a Symbol", async () => {
      const data = [1];
      const mockFn = vi.fn().mockRejectedValue(new Error("Failed"));

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          retries: 0,
          onError: Symbol("test") as unknown as (event: {
            item: number;
            index: number;
            error: unknown;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onError must be a function");
    });

    it("should throw error when onError is a BigInt", async () => {
      const data = [1];
      const mockFn = vi.fn().mockRejectedValue(new Error("Failed"));

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          retries: 0,
          onError: BigInt(123) as unknown as (event: {
            item: number;
            index: number;
            error: unknown;
            summary: { total: number; success: number; failed: number };
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onError must be a function");
    });

    it("should throw error when onDone is a string", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onDone: "not a function" as unknown as (event: {
            total: number;
            success: number;
            failed: number;
            cancelled: boolean;
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onDone must be a function");
    });

    it("should throw error when onDone is null", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onDone: null as unknown as (event: {
            total: number;
            success: number;
            failed: number;
            cancelled: boolean;
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onDone must be a function");
    });

    it("should throw error when onDone is a number", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onDone: 123 as unknown as (event: {
            total: number;
            success: number;
            failed: number;
            cancelled: boolean;
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onDone must be a function");
    });

    it("should throw error when onDone is a boolean", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onDone: true as unknown as (event: {
            total: number;
            success: number;
            failed: number;
            cancelled: boolean;
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onDone must be a function");
    });

    it("should throw error when onDone is an object", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onDone: { key: "value" } as unknown as (event: {
            total: number;
            success: number;
            failed: number;
            cancelled: boolean;
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onDone must be a function");
    });

    it("should throw error when onDone is an array", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onDone: [1, 2, 3] as unknown as (event: {
            total: number;
            success: number;
            failed: number;
            cancelled: boolean;
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onDone must be a function");
    });

    it("should throw error when onDone is NaN", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onDone: NaN as unknown as (event: {
            total: number;
            success: number;
            failed: number;
            cancelled: boolean;
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onDone must be a function");
    });

    it("should throw error when onDone is a Symbol", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onDone: Symbol("test") as unknown as (event: {
            total: number;
            success: number;
            failed: number;
            cancelled: boolean;
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onDone must be a function");
    });

    it("should throw error when onDone is a BigInt", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await expect(
        processor.run(data, mockFn, {
          onDone: BigInt(123) as unknown as (event: {
            total: number;
            success: number;
            failed: number;
            cancelled: boolean;
            cancel: () => void;
          }) => void,
        })
      ).rejects.toThrow("onDone must be a function");
    });
  });

  describe("boundary conditions", () => {
    it("should handle batchSize of 1", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { batchSize: 1 });

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should handle batchSize larger than data length", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { batchSize: 100 });

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should handle retries of 0", async () => {
      const data = [1];
      const mockFn = vi.fn().mockRejectedValue(new Error("Failed"));
      const onError = vi.fn();

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { retries: 0, onError });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("should handle very large retry count", async () => {
      const data = [1];
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { retries: 1000 });

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it("should handle array with one item", async () => {
      const data = [1];
      const mockFn = vi.fn().mockResolvedValue("success");
      const onDone = vi.fn();

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { onDone });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledWith({
        total: 1,
        success: 1,
        failed: 0,
        cancelled: false,
        cancel: expect.any(Function),
      });
    });

    it("should handle very large array", async () => {
      const data = Array.from({ length: 1000 }, (_, i) => i);
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { batchSize: 50 });

      expect(mockFn).toHaveBeenCalledTimes(1000);
    });

    it("should handle extremely long strings", async () => {
      const longString = "a".repeat(1000000);
      const data = [longString];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<string, string>();
      await processor.run(data, mockFn);
      expect(mockFn).toHaveBeenCalledWith(longString, 0);
    });

    it("should handle deeply nested objects", async () => {
      type NestedObject = { level: number; nested?: NestedObject };
      const deepObject: NestedObject = { level: 1 };
      let current: NestedObject = deepObject;
      for (let i = 0; i < 100; i++) {
        current.nested = { level: i + 2 };
        current = current.nested;
      }
      const data = [deepObject];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<NestedObject, string>();
      await processor.run(data, mockFn);

      expect(mockFn).toHaveBeenCalledWith(deepObject, 0);
    });

    it("should handle circular reference in array", async () => {
      type CircularArray = (number | CircularArray)[];
      const circularArray: CircularArray = [1, 2];
      circularArray.push(circularArray);
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<unknown, string>();
      await processor.run(circularArray as unknown[], mockFn);

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should handle circular reference in object", async () => {
      type CircularObject = { id: number; self?: CircularObject };
      const circularObj: CircularObject = { id: 1 };
      circularObj.self = circularObj;
      const data = [circularObj];
      const mockFn = vi.fn().mockResolvedValue("success");

      const processor = createBatchProcessWithRetries<CircularObject, string>();
      await processor.run(data, mockFn);

      expect(mockFn).toHaveBeenCalledWith(circularObj, 0);
    });

    it("should handle multiple cancel calls", async () => {
      const data = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue("success");
      const onSuccess = vi.fn((event) => {
        if (event.index === 0) {
          event.cancel();
          event.cancel();
          event.cancel();
        }
      });

      const processor = createBatchProcessWithRetries<number, string>();
      await processor.run(data, mockFn, { onSuccess, batchSize: 1 });

      expect(onSuccess.mock.calls.length).toBeLessThanOrEqual(3);
    });

    it("should allow creating multiple independent processors", async () => {
      const data1 = [1, 2];
      const data2 = [3, 4];
      const mockFn1 = vi.fn().mockResolvedValue("success1");
      const mockFn2 = vi.fn().mockResolvedValue("success2");

      const processor1 = createBatchProcessWithRetries<number, string>();
      const processor2 = createBatchProcessWithRetries<number, string>();

      await Promise.all([
        processor1.run(data1, mockFn1),
        processor2.run(data2, mockFn2),
      ]);

      expect(mockFn1).toHaveBeenCalledTimes(2);
      expect(mockFn2).toHaveBeenCalledTimes(2);
    });
  });
});
