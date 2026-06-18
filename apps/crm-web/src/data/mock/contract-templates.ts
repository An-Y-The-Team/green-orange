import type { ContractTemplate } from "@/types";

// Mẫu hợp đồng — reusable boilerplate authored in the template editor. The
// {{tokens}} are merged with a contract's data at render time (see
// lib/merge-template.ts). `## ` lines become clause headings; blank lines
// separate paragraphs (see components/contract-document.tsx).
export const contractTemplates: ContractTemplate[] = [
  {
    id: 1,
    name: "Hợp đồng dịch vụ vệ sinh",
    doc_title: "HỢP ĐỒNG DỊCH VỤ VỆ SINH",
    is_active: true,
    body: `Hôm nay, ngày {{signed_date}}, hai bên gồm có:

## BÊN A (Khách hàng)
{{customer}}

## BÊN B (Nhà cung cấp dịch vụ)
{{company.name}}
Địa chỉ: {{company.address}}
MST: {{company.tax_id}} · ĐT: {{company.phone}}

## Điều 1: Nội dung công việc
Bên B cung cấp dịch vụ vệ sinh cho công trình {{project_code}}: "{{title}}". Thời gian thực hiện từ {{start_date}} đến {{end_date}}.

## Điều 2: Giá trị hợp đồng
Tổng giá trị hợp đồng là {{value}} (đã bao gồm thuế GTGT).

## Điều 3: Điều khoản thanh toán
{{payment_terms}}

## Điều 4: Điều khoản chung
Hai bên cam kết thực hiện đúng các điều khoản đã ký. Mọi sửa đổi phải được lập thành văn bản và có chữ ký của cả hai bên.`,
  },
  {
    id: 2,
    name: "Hợp đồng thi công cửa hàng",
    doc_title: "HỢP ĐỒNG THI CÔNG",
    is_active: true,
    body: `Hôm nay, ngày {{signed_date}}, hai bên gồm có:

## BÊN A (Chủ đầu tư)
{{customer}}

## BÊN B (Nhà thầu thi công)
{{company.name}} — MST: {{company.tax_id}}

## Điều 1: Phạm vi thi công
Bên B thi công hạng mục "{{title}}" tại công trình {{project_code}}, từ {{start_date}} đến {{end_date}}.

## Điều 2: Giá trị hợp đồng
Tổng giá trị: {{value}}.

## Điều 3: Tạm ứng & thanh toán
{{payment_terms}}

## Điều 4: Bảo hành
Bên B bảo hành hạng mục thi công theo quy định hiện hành kể từ ngày nghiệm thu.`,
  },
];
