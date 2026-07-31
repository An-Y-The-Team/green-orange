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
 * Default letterhead template — printed on EVERY document (báo giá, hợp đồng,
 * quyết toán, đề nghị thanh toán…). Company details are merge chips, so the
 * text follows the fields in settings → Thông tin công ty instead of being
 * retyped here. Stored override: CompanyProfile.letterhead_body.
 */
export const DEFAULT_LETTERHEAD_BODY = doc(
  p({ ...mf("company.name"), format: TEXT_FORMAT.bold }),
  p(mf("company.tagline")),
  p(mf("company.address")),
  p(
    t("ĐT: "),
    mf("company.phone"),
    t(" · "),
    mf("company.email"),
    t(" · MST: "),
    mf("company.tax_id")
  )
);

/**
 * Default Quốc hiệu block — the statutory heading official Vietnamese
 * paperwork carries. Printed on any document whose header blocks include it
 * (both blocks are on by default). Stored override:
 * CompanyProfile.national_body.
 */
export const DEFAULT_NATIONAL_BODY = doc(
  center(p(t("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", TEXT_FORMAT.bold))),
  center(p(t("Độc Lập – Tự Do – Hạnh Phúc", TEXT_FORMAT.bold))),
  center(p(t("———oOo———")))
);
