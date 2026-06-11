import { isObject, isString } from "../is/is";
import { safeJSONParse } from "../safe-json-parse/safe-json-parse";

export interface LocalStorageWithExpirationEnvelope<T> {
  data: T;
  createdAt: string;
  expiresAt: string;
}

export interface LocalStorageWithExpirationOptions {
  namespace: string;
  defaultTtlMs: number;
  maxEntries?: number;
}

export interface LocalStorageWithExpirationEntry<T> {
  key: string;
  data: T;
  createdAt: string;
  expiresAt: string;
}

export class LocalStorageWithExpiration<T> {
  private readonly namespace: string;
  private readonly defaultTtl: number;
  private readonly maxEntries: number | undefined;

  constructor(options: LocalStorageWithExpirationOptions) {
    this.namespace = options.namespace;
    this.defaultTtl = options.defaultTtlMs;
    this.maxEntries = options.maxEntries;
  }

  public get(segments: string[]): T | null {
    if (typeof window === "undefined") return null;

    try {
      const key = this._buildKey(segments);
      const envelope = this._readEnvelope(key);

      if (!envelope) {
        this._safeRemove(key);
        return null;
      }

      if (this._isExpired(envelope)) {
        this._safeRemove(key);
        return null;
      }

      return envelope.data;
    } catch {
      return null;
    }
  }

  public getAll(): LocalStorageWithExpirationEntry<T>[] {
    if (typeof window === "undefined") return [];

    const entries: LocalStorageWithExpirationEntry<T>[] = [];

    try {
      const keys = this._getNamespaceKeys();

      for (const key of keys) {
        const envelope = this._readEnvelope(key);

        if (!envelope) {
          this._safeRemove(key);
          continue;
        }

        if (this._isExpired(envelope)) {
          this._safeRemove(key);
          continue;
        }

        entries.push({
          key,
          data: envelope.data,
          createdAt: envelope.createdAt,
          expiresAt: envelope.expiresAt,
        });
      }
    } catch {
      console.error("[LocalStorageWithExpiration] Failed to get all entries");
    }

    return entries;
  }

  public set(segments: string[], data: T, ttl?: number): void {
    if (typeof window === "undefined") return;

    const key = this._buildKey(segments);
    const now = new Date();
    const effectiveTtl = ttl ?? this.defaultTtl;

    const envelope: LocalStorageWithExpirationEnvelope<T> = {
      data,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + effectiveTtl).toISOString(),
    };

    try {
      window.localStorage.setItem(key, JSON.stringify(envelope));
    } catch (error) {
      if (this._isQuotaError(error)) {
        this._handleQuotaExceeded(key, envelope);
        return;
      }
      console.error(
        "[LocalStorageWithExpiration] Failed to write to storage:",
        error
      );
      return;
    }

    // enforce maxEntries after successful write
    this._pruneIfOverLimit();
  }

  public remove(segments: string[]): void {
    if (typeof window === "undefined") return;
    this._safeRemove(this._buildKey(segments));
  }

  public pruneExpired(): number {
    if (typeof window === "undefined") return 0;
    let removed = 0;

    try {
      const keys = this._getNamespaceKeys();

      for (const key of keys) {
        const envelope = this._readEnvelope(key);
        if (!envelope || this._isExpired(envelope)) {
          this._safeRemove(key);
          removed++;
        }
      }
    } catch {
      console.error(
        "[LocalStorageWithExpiration] Failed to remove expired entries"
      );
    }

    return removed;
  }

  /**
   * Remove ALL entries in this namespace (expired or not).
   */
  public clear(): void {
    if (typeof window === "undefined") return;

    try {
      const keys = this._getNamespaceKeys();
      for (const key of keys) {
        this._safeRemove(key);
      }
    } catch {
      console.error("[LocalStorageWithExpiration] Failed to clear all entries");
    }
  }

  /**
   * Build a full localStorage key from segments.
   *
   * @example _buildKey(["user123", "session456"])
   *          → "played_takes:user123:session456"
   */
  private _buildKey(segments: string[]): string {
    return `${this.namespace}:${segments.join(":")}`;
  }

  private _getNamespaceKeys(): string[] {
    const prefix = `${this.namespace}:`;
    const keys: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }

    return keys;
  }

  private _pruneIfOverLimit(): void {
    if (this.maxEntries === undefined) return;

    try {
      const keys = this._getNamespaceKeys();
      if (keys.length <= this.maxEntries) return;
      const entries: Array<{ key: string; createdAt: number }> = [];

      for (const key of keys) {
        const envelope = this._readEnvelope(key);

        if (!envelope || this._isExpired(envelope)) {
          this._safeRemove(key);
          continue;
        }

        entries.push({
          key,
          createdAt: new Date(envelope.createdAt).getTime(),
        });
      }

      // if done cleaning expired key and limit is under, done
      if (entries.length <= this.maxEntries) return;

      // else, sort entries ascending (oldest first)
      entries.sort((a, b) => a.createdAt - b.createdAt);

      // remove oldest entries until under limit
      const exceededEntries = entries.length - this.maxEntries;
      for (let i = 0; i < exceededEntries; i++) {
        this._safeRemove(entries[i]!.key);
      }
    } catch {
      console.error("[LocalStorageWithExpiration] Failed to prune storage");
    }
  }

  private _readEnvelope(
    key: string
  ): LocalStorageWithExpirationEnvelope<T> | null {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = safeJSONParse<LocalStorageWithExpirationEnvelope<T>>(raw);

    if (!parsed || !isObject(parsed)) return null;
    if (!("data" in parsed)) return null;
    if (!isString(parsed.createdAt)) return null;
    if (!isString(parsed.expiresAt)) return null;

    return parsed;
  }

  private _safeRemove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      console.error("[LocalStorageWithExpiration] Failed to remove key");
    }
  }

  private _isExpired(envelope: LocalStorageWithExpirationEnvelope<T>): boolean {
    return new Date(envelope.expiresAt).getTime() <= Date.now();
  }

  private _handleQuotaExceeded(
    key: string,
    envelope: LocalStorageWithExpirationEnvelope<T>
  ): void {
    // step 1: prune expired
    this.pruneExpired();

    // step 2: aggressive prune if maxEntries is set
    this._pruneIfOverLimit();

    // step 3: retry
    try {
      window.localStorage.setItem(key, JSON.stringify(envelope));
    } catch {
      console.warn(
        `[LocalStorageWithExpiration] Quota exceeded for namespace "${this.namespace}" — ` +
          "entry was not saved after cleanup attempt."
      );
    }
  }

  private _isQuotaError(error: unknown): boolean {
    if (error instanceof DOMException) {
      return error.name === "QuotaExceededError" || error.code === 22; // legacy code for QuotaExceededError
    }
    return false;
  }
}
