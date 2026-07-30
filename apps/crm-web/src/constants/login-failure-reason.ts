/**
 * Why a headless Authentik login failed. Crosses a wire boundary: the value is
 * thrown as `HeadlessLoginError(reason)` in auth.config.ts and read back off
 * NextAuth's `res.code` in the login overlay — so these strings are a contract,
 * not just labels. Defined once here for that reason.
 */
export enum LoginFailureReason {
  INVALID_CREDENTIALS = "invalid_credentials",
  /** MFA / captcha / consent / passkey — the UI falls back to hosted /login. */
  UNSUPPORTED_STAGE = "unsupported_stage",
  ERROR = "error",
}
