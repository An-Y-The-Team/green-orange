// Build-time constant — Zalo hosts the bundle, so there is no runtime env.
// Point at the public CRM API domain for a release build; localhost for the
// local loop (add http://localhost:3003 to the API's CORS_ORIGINS).
export const API_BASE = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE ?? "http://localhost:8001")
  : "https://api-crm.dichvuyan.com";

export const TOKEN_STORAGE_KEY = "crew_token";
