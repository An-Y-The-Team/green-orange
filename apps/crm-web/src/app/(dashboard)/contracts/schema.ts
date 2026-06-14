import { z } from "zod";

// Hợp đồng form schema — shared by the dialog and the add-contract action.
export const contractSchema = z.object({
  title: z.string().min(3, "Tiêu đề phải có ít nhất 3 ký tự"),
  customer: z.string().min(1, "Vui lòng nhập khách hàng"),
  project_code: z.string().min(1, "Vui lòng nhập mã công trình"),
  value: z.coerce.number().min(0, "Giá trị không hợp lệ"),
  signed_date: z.string().min(1, "Chọn ngày ký"),
  start_date: z.string().min(1, "Chọn ngày bắt đầu"),
  end_date: z.string().min(1, "Chọn ngày kết thúc"),
  status: z.enum(["nhap", "da_ky", "dang_thuc_hien", "thanh_ly"]),
  payment_terms: z.string().min(1, "Nhập điều khoản thanh toán"),
});
export type ContractFormValues = z.infer<typeof contractSchema>;
