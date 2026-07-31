"use client";

import { type ReactNode, createContext, useContext } from "react";

import {
  DEFAULT_LETTERHEAD_BODY,
  DEFAULT_NATIONAL_BODY,
} from "@/components/document-shell/default-header";
import { COMPANY, type CompanyData } from "@/config/company";

/**
 * The effective company profile for client components (document shells,
 * editors). The dashboard layout fetches the stored profile server-side and
 * provides it here; the built-in COMPANY defaults are the context default, so
 * anything rendered outside the provider still shows sensible values.
 */
const CompanyContext = createContext<CompanyData>({
  ...COMPANY,
  letterhead_body: DEFAULT_LETTERHEAD_BODY,
  national_body: DEFAULT_NATIONAL_BODY,
  logo: "",
});

export function CompanyProvider({
  company,
  children,
}: {
  company: CompanyData;
  children: ReactNode;
}) {
  return (
    <CompanyContext.Provider value={company}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyData {
  return useContext(CompanyContext);
}
