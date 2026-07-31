import { DEFAULT_HEADER_BODY } from "@/components/document-shell/default-header";
import { COMPANY, type CompanyData, type CompanyInfo } from "@/config/company";
import { apiFetchSafe } from "@/utils/http/http";

/**
 * The effective company profile: the stored row (settings → Thông tin công ty)
 * merged over the built-in defaults, per field — an unset/cleared field falls
 * back to its default. Includes the rich-text document header (`header_body`,
 * defaulting to the built-in letterhead + Quốc hiệu template). Backend
 * unreachable → pure defaults.
 */
export async function getCompany(): Promise<CompanyData> {
  // Never throw: this feeds the dashboard LAYOUT (every page, including the
  // logged-out login-overlay render). An expired session or dead backend must
  // degrade to the default letterhead, not 500 the whole dashboard — the
  // page's own data fetches are what surface auth/outage problems.
  let stored: Partial<Record<keyof CompanyData, unknown>> = {};
  try {
    stored = await apiFetchSafe("/company-profile", stored);
  } catch {
    // defaults below
  }

  const merged = {
    ...COMPANY,
    header_body: DEFAULT_HEADER_BODY,
  } as CompanyData;
  for (const key of Object.keys(merged) as (keyof CompanyInfo)[]) {
    const value = stored[key];
    if (typeof value === "string" && value.trim() !== "") merged[key] = value;
  }
  return merged;
}
