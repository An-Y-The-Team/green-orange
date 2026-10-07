// "Nhập từ báo giá" — what one operator workbook (the Excel template in
// `01. MẪU FILE HỒ SƠ/Mẫu Báo giá - Nghiem thu - Quyet toan - DNTT.xlsx`)
// yields once parsed. No ids here: matching to existing rows happens after.
import type { ClientType } from "@/app/(dashboard)/clients/enums";

import type { ProjectStage } from "../enums";

/** One priced line, as POST /quotes and the settlement builder take it. */
export interface ParsedItem {
  category?: string; // "I. CÔNG TÁC CHUẨN BỊ" — the Roman-numeral row above it
  description: string;
  unit?: string;
  quantity: number;
  unit_price: number; // whole VND
}

export interface ParsedMoney {
  items: ParsedItem[];
  vat_rate: number; // 0.08
  discount_amount: number; // giảm giá trước thuế, whole VND
}

export interface ParsedWorkbook {
  project: {
    name: string;
    code_ref?: string; // the sheet's own "Mã số CT" — kept as a reference only
    type_names: string[]; // "Công việc: Tháo dỡ/ Thi công" → ["Tháo dỡ", "Thi công"]
    date?: string; // "Ngày" as printed (dd/mm/yyyy)
    site_address: string;
  };
  client: {
    name: string;
    type: ClientType;
    tax_code?: string;
    address?: string;
  };
  contact: { name: string; title?: string; phone?: string } | null;
  quote: ParsedMoney;
  /** Only when the quyết toán sheet carries khối lượng thực tế. */
  settlement: ParsedMoney | null;
  /** How far the paperwork in the file goes: quyết toán > nghiệm thu > báo giá. */
  stage: ProjectStage;
  /** Blocking — a file with any error is never imported. Vietnamese, for the operator. */
  errors: string[];
  /** Worth a look, never blocking. */
  warnings: string[];
}
