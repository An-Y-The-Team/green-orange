/**
 * The service company these documents (Báo giá / Hợp đồng) are issued by.
 * Printed in the header of every A4 document. Demo values — a real deployment
 * would source these from settings.
 */
export const company = {
  name: "CÔNG TY TNHH DỊCH VỤ GREENORANGE",
  tagline: "Vệ Sinh Công Nghiệp & Thi Công Cửa Hàng",
  address: "123 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh",
  phone: "0909 123 456",
  email: "lienhe@greenorange.vn",
  tax_id: "0312345678",
  website: "greenorange.vn",
} as const;
