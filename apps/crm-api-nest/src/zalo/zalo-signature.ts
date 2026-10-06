import { createHash } from "node:crypto";

/**
 * Builds the `X-ZEvent-Signature` Zalo sends on every Mini App webhook.
 *
 * A direct port of the reference `generateSignature` in Zalo's "Hướng dẫn
 * verify signature" (docs.zaloplatforms.com, updated 27/9/2026):
 *
 *     keys sorted A-Z → concatenate each value (objects via JSON.stringify)
 *     → sha256(content + apiKey) → hex
 *
 * Two details are load-bearing and easy to get wrong:
 *   • an object value is JSON.stringify'd, NOT coerced — `String({})` gives
 *     "[object Object]" and every signature would mismatch;
 *   • `typeof null === "object"`, so a null field contributes the literal
 *     "null". Mapping it to "" instead (the obvious-looking tidy-up) silently
 *     breaks verification for any payload carrying a null.
 *
 * The key is the **API Key** from Quản lý Zalo App → Open APIs — NOT
 * ZALO_APP_SECRET, which is the separate app secret used by /auth/zalo-token.
 *
 * Exported for the unit test.
 */
export const zaloSignature = (
  payload: Record<string, unknown>,
  apiKey: string
): string => {
  const content = Object.keys(payload)
    .sort()
    .map((key) => {
      const value = payload[key];
      return typeof value === "object" ? JSON.stringify(value) : String(value);
    })
    .join("");
  return createHash("sha256").update(`${content}${apiKey}`).digest("hex");
};

/**
 * Constant-time compare. Zalo's sample uses plain equality; this does not,
 * because a `===` on a secret-derived string leaks how many leading characters
 * an attacker has guessed.
 */
export const signatureMatches = (expected: string, got: string): boolean => {
  if (expected.length !== got.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ got.charCodeAt(i);
  }
  return diff === 0;
};
