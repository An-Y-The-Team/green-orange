import { ContractStatus } from "@/app/(dashboard)/contracts/enums";
import type { Contract } from "@/app/(dashboard)/contracts/types";
import { doc, h2, lineItems, mf, p, t } from "@/lib/lexical-build";

// Hợp đồng — one per project that has reached the contract stage. CT-2026-004
// (Aeon) is still at báo giá so it has no contract yet. `value` matches the
// approved quote total; `payment_terms` drives the milestone schedule.
const STANDARD_TERMS =
  "Tạm ứng 30% khi ký hợp đồng · Theo tiến độ 40% · Khi nghiệm thu 25% · Giữ lại 5% bảo hành (hoàn sau 12 tháng).";

// A per-contract body that was seeded from template 2 then edited (an extra
// clause added). Demonstrates the body-supersedes-template render path; merge
// tokens stay live. Contract 1 has only template_id (renders from the template);
// contract 4 has neither (falls back to the built-in layout).
const CIRCLE_K_BODY = doc(
  p(t("Hôm nay, ngày "), mf("signed_date"), t(", hai bên gồm có:")),
  h2(t("BÊN A (Chủ đầu tư)")),
  p(mf("client")),
  h2(t("BÊN B (Nhà thầu thi công)")),
  p(mf("company.name"), t(" — MST: "), mf("company.tax_id")),
  h2(t("Điều 1: Phạm vi thi công")),
  p(
    t("Bên B thi công hạng mục “"),
    mf("title"),
    t("” tại công trình "),
    mf("project_code"),
    t(", từ "),
    mf("start_date"),
    t(" đến "),
    mf("end_date"),
    t(". Khối lượng và đơn giá theo bảng báo giá đã được duyệt:")
  ),
  lineItems(),
  h2(t("Điều 2: Giá trị hợp đồng")),
  p(
    t("Tổng giá trị: "),
    mf("value"),
    t(" (đã gồm VAT "),
    mf("vat_rate"),
    t("). Bằng chữ: "),
    mf("value_in_words"),
    t(".")
  ),
  h2(t("Điều 3: Tạm ứng & thanh toán")),
  p(mf("payment_terms")),
  h2(t("Điều 4: Cam kết tiến độ (bổ sung)")),
  p(
    t(
      "Bên B cam kết không làm gián đoạn hoạt động kinh doanh của cửa hàng; mọi công việc gây tiếng ồn được thực hiện ngoài giờ mở cửa."
    )
  )
);

export const contracts: Contract[] = [
  {
    id: 1,
    code: "HD-2026-001",
    project_code: "CT-2026-001",
    client: "CÔNG TY CP VINCOM RETAIL",
    client_address: "72 Lê Thánh Tôn, Phường Sài Gòn, TP.HCM",
    client_tax_code: "0311945734",
    client_rep: "Trần Văn Khải",
    client_position: "Trưởng BQL",
    client_phone: "028 3936 9999",
    title: "Hợp đồng vệ sinh tổng thể TTTM Vincom Plaza Q.1",
    value: 450_360_000,
    vat_rate: 0.08,
    signed_date: "2026-03-10",
    start_date: "2026-03-15",
    end_date: "2026-06-30",
    status: ContractStatus.DANG_THUC_HIEN,
    payment_terms: STANDARD_TERMS,
    template_id: 1,
  },
  {
    id: 2,
    code: "HD-2026-002",
    project_code: "CT-2026-002",
    client: "CÔNG TY TNHH VÒNG TRÒN ĐỎ (CIRCLE K)",
    client_address: "Lầu 10, Tòa nhà CR3, 109 Tôn Dật Tiên, P. Tân Phú, TP.HCM",
    client_tax_code: "0303883266",
    client_rep: "Phạm Thị Hồng",
    client_position: "Giám đốc Vận hành",
    title: "Hợp đồng thi công cải tạo cửa hàng Circle K Q.7",
    value: 279_072_000,
    vat_rate: 0.08,
    signed_date: "2026-02-20",
    start_date: "2026-02-25",
    end_date: "2026-05-15",
    status: ContractStatus.DANG_THUC_HIEN,
    payment_terms: STANDARD_TERMS,
    template_id: 2,
    body: CIRCLE_K_BODY,
  },
  {
    id: 3,
    code: "HD-2026-003",
    project_code: "CT-2026-003",
    client: "FPT Software",
    title: "Hợp đồng vệ sinh sau xây dựng văn phòng FPT Tower",
    value: 179_280_000,
    signed_date: "2026-01-15",
    start_date: "2026-01-20",
    end_date: "2026-03-10",
    status: ContractStatus.DA_KY,
    payment_terms: STANDARD_TERMS,
    template_id: 1,
  },
  {
    id: 4,
    code: "HD-2026-005",
    project_code: "CT-2026-005",
    client: "GS25 Việt Nam",
    title: "Hợp đồng vệ sinh định kỳ chuỗi cửa hàng GS25",
    value: 95_040_000,
    signed_date: "2025-12-01",
    start_date: "2025-12-05",
    end_date: "2026-03-05",
    status: ContractStatus.THANH_LY,
    payment_terms: STANDARD_TERMS,
  },
];
