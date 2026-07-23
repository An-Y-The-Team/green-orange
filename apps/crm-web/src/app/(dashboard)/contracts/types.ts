import type { ContractStatus } from "./enums";

// Hợp đồng — v2. Optional entity (0..n per project); the party/value data
// lives on the project + chốt quote now. The printable body/template feature
// is kept from v1. GET /contracts includes a slim project relation.
export interface Contract {
  id: number;
  project_id: number;
  code: string; // HD-YYYY-NNN
  status: ContractStatus;
  signed_date?: string | null; // YYYY-MM-DD
  note?: string | null;
  // Printable-contract feature (kept from v1): optional template + per-contract
  // rich body (Lexical editorState JSON, string form). Body supersedes the
  // template body at render; merge tokens resolve at render time.
  template_id?: number | null;
  body?: string | null;
  // As included by crm-api-nest (list + detail).
  project?: {
    id: number;
    code: string;
    name: string;
    client: { id: number; name: string };
  };
}

// Mẫu hợp đồng — user-authored boilerplate (clauses, headings) with merge
// fields that resolve against a contract's data at render time.
export interface ContractTemplate {
  id: number;
  name: string; // internal name, e.g. "Hợp đồng vệ sinh định kỳ"
  doc_title: string; // printed heading, e.g. "HỢP ĐỒNG DỊCH VỤ VỆ SINH"
  body: string; // Lexical editorState JSON (string form); see lib/lexical-build.ts
  // Printed header style: "national" = CHXHCN VN motto (legal contracts),
  // "letterhead" = company branding. Defaults to "letterhead" when unset.
  header_style?: "letterhead" | "national";
  is_active: boolean;
}
