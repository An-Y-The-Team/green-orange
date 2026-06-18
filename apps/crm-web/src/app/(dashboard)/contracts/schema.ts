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
  // Optional printable template. The empty string from the "no template" <option>
  // is normalised to undefined before the positive-int check.
  template_id: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().positive().optional()
  ),
});
export type ContractFormValues = z.infer<typeof contractSchema>;

// Mẫu hợp đồng form schema — shared by the template editor and its save action.
export const contractTemplateSchema = z.object({
  name: z.string().min(3, "Tên mẫu phải có ít nhất 3 ký tự"),
  doc_title: z.string().min(3, "Tiêu đề tài liệu phải có ít nhất 3 ký tự"),
  body: z.string().min(10, "Nội dung mẫu quá ngắn"),
  is_active: z.coerce.boolean(),
});
export type ContractTemplateFormValues = z.infer<typeof contractTemplateSchema>;
