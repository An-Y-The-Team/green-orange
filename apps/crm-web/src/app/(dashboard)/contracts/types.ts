import type { HeaderVariant } from "@/constants/header-variant";

import type { ContractStatus } from "./enums";

// Hợp đồng — v2. Optional entity (0..n per project); the party/value data
// lives on the project + chốt quote now. The printable body/template feature
// is kept from v1. GET /contracts includes a slim project relation.
export interface Contract {
  id: number;
  project_id: number | null; // null = standalone contract
  code: string; // HD-YYYY-NNN
  status: ContractStatus;
  signed_date?: string | null; // YYYY-MM-DD
  note?: string | null;
  // Printable-contract feature (kept from v1): optional template + per-contract
  // rich body (Lexical editorState JSON, string form). Body supersedes the
  // template body at render; merge tokens resolve at render time.
  template_id?: number | null;
  body?: string | null;
  // Signature footer (per-contract signer lines); B side falls back to the
  // company representative when unset, labels to ĐẠI DIỆN BÊN A/B.
  rep_a_label?: string | null;
  rep_a_name?: string | null;
  rep_a_title?: string | null;
  rep_b_label?: string | null;
  rep_b_name?: string | null;
  rep_b_title?: string | null;
  // Frozen at signing (JSON) — see contracts/print-snapshot.ts. Absent on
  // drafts and on contracts signed before snapshots existed.
  print_snapshot?: string | null;
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
  body: string; // Lexical editorState JSON (string form); see src/utils/lexical-build/lexical-build.ts
  // Printed header style; defaults to letterhead when unset.
  header_style?: HeaderVariant;
  is_active: boolean;
}
