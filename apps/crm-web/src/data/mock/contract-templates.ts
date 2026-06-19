import type { ContractTemplate } from "@/app/(dashboard)/contracts/types";
import { doc, h2, lineItems, mf, p, t } from "@/lib/lexical-build";

// Mẫu hợp đồng — reusable boilerplate authored in the rich-text editor. Bodies
// are stored as Lexical editorState JSON (string form); the merge-field chips
// (mf("token")) resolve to a contract's data at render time (see
// components/editor/lexical-document.tsx). These are built with the helpers in
// lib/lexical-build.ts so the JSON shape stays valid and readable rather than
// hand-written — authoring in the editor and pasting JSON works too.
export const contractTemplates: ContractTemplate[] = [
  {
    id: 1,
    name: "Hợp đồng dịch vụ vệ sinh",
    doc_title: "HỢP ĐỒNG DỊCH VỤ VỆ SINH",
    header_style: "national",
    is_active: true,
    body: doc(
      p(t("Hôm nay, ngày "), mf("signed_date"), t(", hai bên gồm có:")),
      h2(t("BÊN A (Khách hàng)")),
      p(mf("customer")),
      p(t("Địa chỉ: "), mf("customer_address")),
      p(
        t("MST: "),
        mf("customer_tax_code"),
        t(" · Đại diện: "),
        mf("customer_rep"),
        t(" — "),
        mf("customer_position")
      ),
      h2(t("BÊN B (Nhà cung cấp dịch vụ)")),
      p(mf("company.name")),
      p(t("Địa chỉ: "), mf("company.address")),
      p(t("MST: "), mf("company.tax_id"), t(" · ĐT: "), mf("company.phone")),
      p(t("Đại diện: "), mf("company.rep"), t(" — "), mf("company.rep_title")),
      h2(t("Điều 1: Nội dung công việc")),
      p(
        t("Bên B cung cấp dịch vụ vệ sinh cho công trình "),
        mf("project_code"),
        t(": “"),
        mf("title"),
        t("”. Thời gian thực hiện từ "),
        mf("start_date"),
        t(" đến "),
        mf("end_date"),
        t(". Nội dung công việc theo bảng báo giá đã được duyệt:")
      ),
      lineItems(),
      h2(t("Điều 2: Giá trị hợp đồng")),
      p(
        t("Tổng giá trị hợp đồng là "),
        mf("value"),
        t(" (đã bao gồm thuế GTGT "),
        mf("vat_rate"),
        t("). Bằng chữ: "),
        mf("value_in_words"),
        t(".")
      ),
      h2(t("Điều 3: Điều khoản thanh toán")),
      p(mf("payment_terms")),
      p(
        t("Thanh toán chuyển khoản về: "),
        mf("company.bank_account"),
        t(" tại "),
        mf("company.bank_name"),
        t(" — "),
        mf("company.bank_branch"),
        t(".")
      ),
      h2(t("Điều 4: Điều khoản chung")),
      p(
        t(
          "Hai bên cam kết thực hiện đúng các điều khoản đã ký. Mọi sửa đổi phải được lập thành văn bản và có chữ ký của cả hai bên."
        )
      )
    ),
  },
  {
    id: 2,
    name: "Hợp đồng thi công cửa hàng",
    doc_title: "HỢP ĐỒNG THI CÔNG",
    header_style: "national",
    is_active: true,
    body: doc(
      p(t("Hôm nay, ngày "), mf("signed_date"), t(", hai bên gồm có:")),
      h2(t("BÊN A (Chủ đầu tư)")),
      p(mf("customer")),
      p(t("Địa chỉ: "), mf("customer_address")),
      p(t("MST: "), mf("customer_tax_code")),
      h2(t("BÊN B (Nhà thầu thi công)")),
      p(mf("company.name"), t(" — MST: "), mf("company.tax_id")),
      p(t("Đại diện: "), mf("company.rep"), t(" — "), mf("company.rep_title")),
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
      h2(t("Điều 4: Bảo hành")),
      p(
        t(
          "Bên B bảo hành hạng mục thi công theo quy định hiện hành kể từ ngày nghiệm thu."
        )
      )
    ),
  },
];
