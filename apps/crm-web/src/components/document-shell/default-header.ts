import {
  type LexNode,
  TEXT_FORMAT,
  doc,
  mf,
  p,
  t,
} from "@/utils/lexical-build/lexical-build";

const center = (node: LexNode): LexNode => ({ ...node, format: "center" });

/**
 * The built-in document header template: company letterhead followed by the
 * Quốc hiệu — a Vietnamese contract must carry both. Company fields are merge
 * chips, so the header follows the editable company profile; the stored
 * override lives in CompanyProfile.header_body (settings → Thông tin công ty).
 */
export const DEFAULT_HEADER_BODY = doc(
  p({ ...mf("company.name"), format: TEXT_FORMAT.bold }),
  p(t("Địa chỉ: "), mf("company.address")),
  p(
    t("ĐT: "),
    mf("company.phone"),
    t(" · Email: "),
    mf("company.email"),
    t(" — MST: "),
    mf("company.tax_id")
  ),
  p(),
  center(p(t("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", TEXT_FORMAT.bold))),
  center(p(t("Độc Lập – Tự Do – Hạnh Phúc", TEXT_FORMAT.bold))),
  center(p(t("———oOo———")))
);
