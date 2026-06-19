import { z } from "zod";

import { MilestoneType } from "./enums";

// Đợt thanh toán form schema — shared by the dialog and the add-payment-
// milestone action.
export const milestoneSchema = z.object({
  contract_code: z.string().min(1, "Vui lòng nhập mã hợp đồng"),
  project_code: z.string().min(1, "Vui lòng nhập mã công trình"),
  customer: z.string().min(1, "Vui lòng nhập khách hàng"),
  name: z.string().min(1, "Nhập tên đợt"),
  type: z.nativeEnum(MilestoneType),
  due_amount: z.coerce.number().min(0, "Số tiền không hợp lệ"),
  due_date: z.string().min(1, "Chọn ngày đến hạn"),
  gated_by_acceptance: z.boolean(),
});
export type MilestoneFormValues = z.infer<typeof milestoneSchema>;
