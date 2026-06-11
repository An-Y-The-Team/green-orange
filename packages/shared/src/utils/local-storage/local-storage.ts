import CryptoJS from "crypto-js";

import { LOCAL_STORAGE_SECRET_KEY } from "../../constants";
import { isBoolean, isNull, isString, isUndefined } from "../is/is";
import { safeJSONParse } from "../safe-json-parse/safe-json-parse";

/**
 * Secure LocalStorage utility with AES encryption using crypto-js
 */
export const localStorage = {
  _encryptionKey:
    process.env.LOCAL_STORAGE_SECRET_KEY || LOCAL_STORAGE_SECRET_KEY,

  setEncryptionKey(key: string): void {
    if (!isString(key) || key.length === 0) {
      throw new Error("Encryption key must be a non-empty string");
    }
    this._encryptionKey = key;
  },

  /**
   * Encrypt data using AES
   * @param {string} data - Data to encrypt
   * @returns {string} Encrypted data
   */
  _encrypt(data: string): string {
    if (!isString(data)) throw new Error("Data must be a string");
    try {
      return CryptoJS.AES.encrypt(data, this._encryptionKey).toString();
    } catch (error) {
      console.warn("Encryption failed:", error);
      throw new Error("Encryption failed");
    }
  },

  /**
   * Decrypt data using AES
   * @param {string} encryptedData - Data to decrypt
   * @returns {string} Decrypted data
   *
   * Note: CryptoJS.AES.decrypt() is unreliable for error detection:
   * - It does NOT throw errors for invalid/corrupted data or wrong keys
   * - Instead, it silently returns empty string or garbage data
   * - We explicitly check for empty results and wrap in try-catch to ensure
   *   decryption failures are properly detected and thrown as errors
   */
  _decrypt(encryptedData: string): string {
    if (!isString(encryptedData) || encryptedData.length === 0) {
      throw new Error(
        "Decryption failed: encryptedData must be a non-empty string"
      );
    }

    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this._encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      // CryptoJS returns empty string on failure - this is the critical check
      if (!decrypted) {
        throw new Error("Decryption failed: invalid data or wrong key");
      }

      return decrypted;
    } catch {
      // CryptoJS may throw "Malformed UTF-8 data" or other errors
      throw new Error("Decryption failed: invalid data or wrong key");
    }
  },

  /**
   * Set item in localStorage with optional encryption
   * @param {string} key - Key to store under
   * @param {any} value - Value to store
   * @param {boolean} [encrypt=false] - Whether to encrypt the data
   */
  setItem(key: string, value: string, encrypt: boolean = false): void {
    // Restrict type of key and value to only string. For other types, caller stringify value first
    if (!isString(key)) throw new Error("Key must be a string");
    if (!isString(value)) throw new Error("Value must be a string");
    if (isUndefined(window)) return;

    try {
      const data = encrypt ? this._encrypt(value) : value;
      window.localStorage.setItem(key, data);
    } catch (error) {
      console.warn("Cannot save to localStorage:", error);
      throw new Error("Failed to store data");
    }
  },

  /**
   * Get item from localStorage with optional decryption
   * @param {string} key - Key to retrieve
   * @param {boolean} [decrypt=false] - Whether to decrypt the data
   * @returns {any} Retrieved value or null if not found
   */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getItem(key: string, decrypt: boolean = false): any {
    if (!isString(key)) throw new Error("Key must be a string");
    if (isUndefined(window)) return;
    if (!isBoolean(decrypt)) throw new Error("Decrypt must be a boolean");

    try {
      const data = window.localStorage.getItem(key);
      if (isNull(data)) return null;

      const processedData = decrypt ? this._decrypt(data) : data;

      return safeJSONParse(processedData, {});
    } catch (error) {
      console.warn("Cannot read from localStorage:", error);
      return null;
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key - Key to remove
   */
  removeItem(key: string): void {
    if (!isString(key)) throw new Error("Key must be a string");
    if (isUndefined(window)) return;
    window.localStorage.removeItem(key);
  },

  /**
   * Clear all items from localStorage
   */
  clear(): void {
    if (isUndefined(window)) return;
    window.localStorage.clear();
  },

  /**
   * Get all keys from localStorage
   * @returns {string[]} Array of keys
   */
  keys(): string[] {
    if (isUndefined(window)) return [];
    return Object.keys(window.localStorage);
  },

  /**
   * Check if a key exists in localStorage
   * @param {string} key - Key to check
   * @returns {boolean} True if key exists
   */
  has(key: string): boolean {
    if (!isString(key)) throw new Error("Key must be a string");
    if (isUndefined(window)) return false;
    return !isNull(window.localStorage.getItem(key));
  },

  /**
   * Get storage statistics
   * @returns {object} Storage usage information
   */
  getStats(): { count: number; totalSize: number } {
    if (isUndefined(window)) return { count: 0, totalSize: 0 };

    let totalSize = 0;
    const keys = this.keys();

    keys.forEach((key) => {
      const item = window.localStorage.getItem(key) || "";
      totalSize += key.length + item.length;
    });

    return {
      count: keys.length,
      totalSize: totalSize, // in characters (approximate bytes for UTF-16)
    };
  },
};

export default localStorage;
