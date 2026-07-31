import Link from "next/link";

import { Button } from "@yan/ui/components/button";

/**
 * Shown instead of a printable when the stored company profile could not be
 * read (see CompanyLoad.degraded). Rendering the document anyway would print
 * the built-in defaults — the wrong beneficiary bank account on a bill, or the
 * wrong Bên B identity on a contract — with nothing on the page saying so.
 *
 * Same "refuse rather than emit a wrong document" stance as the contract
 * page's missing-chốt-quote guard.
 */
export function CompanyUnavailable({ what }: { what: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-6 text-sm">
      <p className="font-medium">Chưa đọc được thông tin công ty</p>
      <p className="mt-1 text-muted-foreground">
        Không tải được thông tin công ty (tên, địa chỉ, tài khoản ngân hàng) từ
        máy chủ. {what} có thể in ra sai thông tin, nên tạm dừng ở đây. Hãy tải
        lại trang — nếu bạn vừa bị đăng xuất, đăng nhập lại rồi thử lại.
      </p>
      <Button
        className="mt-4"
        size="sm"
        variant="outline"
        render={
          <Link href="/settings/company">Kiểm tra thông tin công ty</Link>
        }
      />
    </div>
  );
}
