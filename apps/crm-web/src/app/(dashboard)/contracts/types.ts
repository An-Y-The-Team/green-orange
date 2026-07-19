import type { ContractStatus } from "./enums";

// Hợp đồng
export interface Contract {
  id: number;
  code: string;
  project_code: string;
  client: string;
  title: string;
  value: number;
  signed_date: string;
  start_date: string;
  end_date: string;
  status: ContractStatus;
  payment_terms: string;
  // Party A (client) profile — printed in the contract preamble. `client` is
  // the legal name; these optional fields fill the rest of the party block.
  client_address?: string;
  client_tax_code?: string;
  client_rep?: string; // người đại diện
  client_position?: string; // chức vụ
  client_phone?: string;
  // VAT rate applied to the contract value (e.g. 0.08). Drives the financial
  // breakdown tokens (before-tax / VAT amount). Defaults to 0.08 when unset.
  vat_rate?: number;
  // Optional printable template. When set, the contract document is rendered by
  // merging this template's body with the contract's data; when unset, the
  // detail page falls back to the built-in hard-coded layout.
  template_id?: number;
  // Rich-text clause prose (Lexical editorState JSON, string form). Seeded from
  // the chosen template on create, then editable per contract. Merge tokens stay
  // live (resolved at render). When present it supersedes the template body on
  // the detail page; see components/editor/lexical-document.tsx.
  body?: string;
}

// Mẫu hợp đồng — user-authored boilerplate (clauses, headings) with
// {{placeholders}} that merge against a contract's data at render time. The
// variable data lives on the Contract; the reusable prose lives here.
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
