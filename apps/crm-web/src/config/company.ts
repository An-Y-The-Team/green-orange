/**
 * Built-in defaults for the company these documents (Báo giá / Hợp đồng) are
 * issued by, printed in the header of every A4 document. The live values come
 * from the editable company profile (Danh mục → Thông tin công ty), which
 * falls back to these per field — see settings/company/queries.ts and
 * components/company-provider.
 */
export const COMPANY = {
  name: "CÔNG TY TNHH DỊCH VỤ GREENORANGE",
  tagline: "Vệ Sinh Công Nghiệp & Thi Công Cửa Hàng",
  address: "123 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh",
  phone: "0909 123 456",
  email: "lienhe@greenorange.vn",
  tax_id: "0312345678",
  website: "greenorange.vn",
  // Legal representative — printed in the Party B block and signature line.
  representative: "Nguyễn Văn A",
  representative_title: "Giám Đốc",
  // Banking details — printed in the Party B block / payment article.
  bank_account: "0123456789",
  bank_name: "Ngân hàng TMCP Á Châu (ACB)",
  bank_branch: "PGD Quận 7 - TP.HCM",
} as const;

/** The company profile shape every document renders from. */
export type CompanyInfo = Record<keyof typeof COMPANY, string>;

/**
 * Profile plus the rich-text document header (Lexical editorState JSON —
 * letterhead + Quốc hiệu). The default lives in
 * components/document-shell/default-header.ts, not here: building it needs the
 * lexical-build helpers, which would import-cycle back into this module.
 */
export type CompanyData = CompanyInfo & { header_body: string };
