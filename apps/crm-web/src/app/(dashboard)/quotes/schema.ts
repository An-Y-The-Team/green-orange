import { z } from "zod";

import { QuoteType } from "./enums";

// Báo giá / Quyết toán form schema — shared by the dialog (client validation)
// and the add-quote action (server re-validation). Line items are a nested
// array validated per row.
export const quoteSchema = z.object({
  title: z.string().min(3, "Tiêu đề phải có ít nhất 3 ký tự"),
  customer: z.string().min(1, "Vui lòng nhập khách hàng"),
  project_code: z.string().min(1, "Vui lòng nhập mã công trình"),
  type: z.nativeEnum(QuoteType),
  issue_date: z.string().min(1, "Chọn ngày lập"),
  valid_until: z.string().min(1, "Chọn ngày hết hạn"),
  vat_rate: z.coerce.number().min(0).max(1),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Nhập diễn giải"),
        unit: z.string().min(1, "Đơn vị"),
        quantity: z.coerce.number().min(0),
        unit_price: z.coerce.number().min(0),
      })
    )
    .min(1, "Cần ít nhất một hạng mục"),
});
export type QuoteFormValues = z.infer<typeof quoteSchema>;
