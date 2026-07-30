/** Vietnamese đồng — e.g. 12.500.000 ₫. No fractional digits (VND has none). */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}
