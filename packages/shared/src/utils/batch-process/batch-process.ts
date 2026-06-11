import pLimit from "p-limit";
import pRetry from "p-retry";

export async function batchProcess<T>(
  data: T[],
  fetchFunction: (item: T, index: number) => Promise<void>,
  batchSize: number = 10
): Promise<void> {
  if (!Array.isArray(data)) {
    throw new TypeError("Batch data must be an array");
  }

  if (typeof fetchFunction !== "function") {
    throw new TypeError("fetchFunction must be a function");
  }

  if (
    !Number.isFinite(batchSize) ||
    batchSize <= 0 ||
    !Number.isInteger(batchSize)
  ) {
    throw new Error("batchSize must be a positive integer number");
  }

  for (let i = 0; i < data.length; i += batchSize) {
    const results = await Promise.allSettled(
      data
        .slice(i, i + batchSize)
        .map((item, index) => fetchFunction(item, i + index))
    );

    results.forEach((result, idx) => {
      if (result.status === "rejected") {
        console.error(`Batch item ${i + idx} failed:`, result.reason);
      }
    });
  }
}

interface SuccessEvent<T, R> {
  item: T;
  index: number;
  result: R;
  summary: { total: number; success: number; failed: number };
  cancel: () => void;
}

interface ErrorEvent<T> {
  item: T;
  index: number;
  error: unknown;
  summary: { total: number; success: number; failed: number };
  cancel: () => void;
}

interface DoneEvent {
  total: number;
  success: number;
  failed: number;
  cancelled: boolean;
  cancel: () => void;
}

interface BatchProcessOptions<T, R> {
  batchSize?: number;
  retries?: number;
  onSuccess?: (event: SuccessEvent<T, R>) => void;
  onError?: (event: ErrorEvent<T>) => void;
  onDone?: (event: DoneEvent) => void;
}

export function createBatchProcessWithRetries<T, R>() {
  let isCancelled = false;

  function cancel() {
    isCancelled = true;
  }

  async function run(
    data: T[],
    fetchFunction: (item: T, index: number) => Promise<R>,
    options: BatchProcessOptions<T, R> = {}
  ): Promise<void> {
    const {
      batchSize = 5,
      retries = 3,
      onSuccess,
      onError,
      onDone,
    } = options ?? {};

    if (!Array.isArray(data)) {
      throw new TypeError("Batch data must be an array");
    }

    if (typeof fetchFunction !== "function") {
      throw new TypeError("fetchFunction must be a function");
    }

    if (onSuccess !== undefined && typeof onSuccess !== "function") {
      throw new TypeError("onSuccess must be a function");
    }

    if (onError !== undefined && typeof onError !== "function") {
      throw new TypeError("onError must be a function");
    }

    if (onDone !== undefined && typeof onDone !== "function") {
      throw new TypeError("onDone must be a function");
    }

    if (
      !Number.isFinite(batchSize) ||
      batchSize <= 0 ||
      !Number.isInteger(batchSize)
    ) {
      throw new Error("batchSize must be a positive integer number");
    }

    if (
      !Number.isFinite(retries) ||
      retries < 0 ||
      !Number.isInteger(retries)
    ) {
      throw new Error("retries must be a non-negative integer number");
    }

    const limit = pLimit(batchSize);
    let successCount = 0;
    let failedCount = 0;
    const total = data.length;

    await Promise.all(
      data.map((item, index) =>
        limit(async () => {
          if (isCancelled) return;

          try {
            const result: R =
              retries > 0
                ? await pRetry(async () => fetchFunction(item, index), {
                    retries,
                    onFailedAttempt: (error: unknown) => {
                      if (
                        error &&
                        typeof error === "object" &&
                        "status" in error &&
                        error.status === 429
                      ) {
                        throw error;
                      }
                    },
                  })
                : await fetchFunction(item, index);

            successCount++;
            onSuccess?.({
              item,
              index,
              result,
              summary: { total, success: successCount, failed: failedCount },
              cancel,
            });
          } catch (error) {
            failedCount++;
            onError?.({
              item,
              index,
              error,
              summary: { total, success: successCount, failed: failedCount },
              cancel,
            });
          }
        })
      )
    );

    onDone?.({
      total,
      success: successCount,
      failed: failedCount,
      cancelled: isCancelled,
      cancel,
    });
  }

  return { run, cancel };
}
