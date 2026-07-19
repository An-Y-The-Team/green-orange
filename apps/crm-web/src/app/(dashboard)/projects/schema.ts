import { z } from "zod";

import { AcceptanceStatus, CostCategory, ProjectType } from "./enums";

// Validation schemas for the projects feature — the công trình itself plus its
// on-site sub-records (chi phí, nghiệm thu). Shared by the form dialogs (client
// validation) and the server actions (server-side re-validation). Numeric
// fields coerce the string values coming out of the inputs.

export const projectSchema = z.object({
  name: z.string().min(3, "Tên công trình phải có ít nhất 3 ký tự"),
  client: z.string().min(1, "Vui lòng nhập khách hàng"),
  type: z.nativeEnum(ProjectType),
  address: z.string().min(1, "Vui lòng nhập địa điểm"),
  manager: z.string().min(1, "Vui lòng nhập người phụ trách"),
  contract_value: z.coerce.number().min(0, "Giá trị không hợp lệ"),
  estimated_cost: z.coerce.number().min(0, "Dự toán không hợp lệ"),
  start_date: z.string().min(1, "Chọn ngày bắt đầu"),
  end_date: z.string().min(1, "Chọn ngày kết thúc"),
});
export type ProjectFormValues = z.infer<typeof projectSchema>;

export const costSchema = z.object({
  project_code: z.string().min(1, "Vui lòng nhập mã công trình"),
  date: z.string().min(1, "Chọn ngày"),
  category: z.nativeEnum(CostCategory),
  description: z.string().min(1, "Nhập diễn giải"),
  amount: z.coerce.number().min(0, "Số tiền không hợp lệ"),
  is_incident: z.boolean(),
});
export type CostFormValues = z.infer<typeof costSchema>;

export const acceptanceSchema = z.object({
  project_code: z.string().min(1, "Vui lòng nhập mã công trình"),
  date: z.string().min(1, "Chọn ngày"),
  status: z.nativeEnum(AcceptanceStatus),
  inspector: z.string().min(1, "Nhập người kiểm tra"),
  client_rep: z.string().min(1, "Nhập đại diện khách hàng"),
  notes: z.string().optional(),
});
export type AcceptanceFormValues = z.infer<typeof acceptanceSchema>;
