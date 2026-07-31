import { DEFAULT_HEADER_BODY } from "@/components/document-shell/default-header";
import { COMPANY, type CompanyData, type CompanyInfo } from "@/config/company";
import { ApiError, apiFetch } from "@/utils/http/http";

/** The Python teaching sandbox answers 501 for endpoints it hasn't built. */
const NOT_IMPLEMENTED = 501;

export type CompanyLoad = {
  company: CompanyData;
  /**
   * The stored profile could NOT be read (session expired, backend down), so
   * `company` is the built-in defaults and may not match what is configured.
   *
   * Deliberately distinct from "no profile saved yet": there the defaults ARE
   * the truth and nothing is wrong. Only this flag means "these values are a
   * guess" — which is why documents carrying money or legal identity (bills,
   * contracts) refuse to print on it instead of quietly using stale details.
   */
  degraded: boolean;
};

/**
 * The effective company profile: the stored row (settings → Thông tin công ty)
 * merged over the built-in defaults, per field — an unset/cleared field falls
 * back to its default. Includes the rich-text document header (`header_body`,
 * defaulting to the built-in letterhead + Quốc hiệu template).
 *
 * Never throws: it feeds the dashboard LAYOUT (every page, including the
 * logged-out login-overlay render), so a failure must degrade rather than 500
 * the whole dashboard. Callers that print money or legal identity must check
 * {@link CompanyLoad.degraded} — see the bill and contract print pages.
 */
export async function loadCompany(): Promise<CompanyLoad> {
  let stored: Partial<Record<keyof CompanyData, unknown>> = {};
  let degraded = false;

  try {
    // The endpoint answers `{}` when nothing is saved yet — a 200, not a miss.
    stored =
      await apiFetch<Partial<Record<keyof CompanyData, unknown>>>(
        "/company-profile"
      );
  } catch (err) {
    // 501 = the sandbox backend has no such endpoint; the defaults are all
    // there ever was, so that is not a degraded read.
    if (!(err instanceof ApiError) || err.status !== NOT_IMPLEMENTED) {
      degraded = true;
    }
  }

  const company = {
    ...COMPANY,
    header_body: DEFAULT_HEADER_BODY,
  } as CompanyData;
  for (const key of Object.keys(company) as (keyof CompanyInfo)[]) {
    const value = stored[key];
    if (typeof value === "string" && value.trim() !== "") company[key] = value;
  }

  return { company, degraded };
}

/** {@link loadCompany} for callers that can live with the defaults (chrome). */
export async function getCompany(): Promise<CompanyData> {
  return (await loadCompany()).company;
}
