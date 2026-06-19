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
  // Legal representative — printed in the Party B block and signature line.
  representative: "Nguyễn Văn A",
  representative_title: "Giám Đốc",
  // Banking details — printed in the Party B block / payment article.
  bank_account: "0123456789",
  bank_name: "Ngân hàng TMCP Á Châu (ACB)",
  bank_branch: "PGD Quận 7 - TP.HCM",
} as const;
