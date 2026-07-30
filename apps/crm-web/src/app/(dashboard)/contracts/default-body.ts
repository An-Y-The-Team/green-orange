import { doc, h2, mf, p, t } from "@/utils/lexical-build/lexical-build";

/**
 * Editor seed for a contract that has no stored body and no template — the
 * Lexical twin of the print page's built-in fallback layout
 * (contracts/[id]/page.tsx), so opening such a contract in the editor starts
 * from the same document the print page shows instead of a blank sheet.
 * Merge chips keep the values live; the first autosave turns this into the
 * contract's real body.
 */
export const DEFAULT_CONTRACT_BODY = doc(
  p(t("Hôm nay, ngày "), mf("signed_date"), t(", hai bên gồm có:")),
  h2(t("Bên A (Khách hàng)")),
  p(mf("client")),
  h2(t("Bên B (Nhà cung cấp dịch vụ)")),
  p(mf("company.name")),
  p(mf("company.address"), t(" · MST: "), mf("company.tax_id")),
  h2(t("Thông tin hợp đồng")),
  p(t("Công trình: "), mf("project_code"), t(" · "), mf("project_name")),
  p(t("Ngày ký: "), mf("signed_date")),
  p(
    t("Giá trị (theo báo giá đã chốt): "),
    mf("value"),
    t(" — bằng chữ: "),
    mf("value_in_words")
  ),
  p(t("Ghi chú: "), mf("note"))
);
