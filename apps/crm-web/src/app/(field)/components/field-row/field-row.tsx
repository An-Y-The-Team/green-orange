import type { ReactNode } from "react";

/**
 * One bordered row inside a `/field` card.
 *
 * Not a `Card`: these render *inside* `CardContent` (Hôm nay, Chờ quyết định,
 * Đang thi công), so a Card here would be a Card in a Card. The three sibling
 * components had this className three times over.
 */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="space-y-3 rounded-lg border p-3">{children}</div>;
}
