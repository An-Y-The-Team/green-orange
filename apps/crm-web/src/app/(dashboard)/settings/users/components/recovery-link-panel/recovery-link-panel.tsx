"use client";

import { Copy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";

import { BACK_TO } from "@/constants/labels";

/**
 * The one place a recovery link is ever shown. The admin copies it and hands
 * it to the person (Zalo, in practice); crm-web never emails, and the link is
 * never put in a URL or logged. It works once, for one day.
 */
export function RecoveryLinkPanel({
  pk,
  username,
  link,
}: {
  pk: number;
  username: string;
  link: string | null;
}) {
  const copy = () =>
    navigator.clipboard
      .writeText(link ?? "")
      .then(() => toast.success("Đã sao chép liên kết."))
      .catch(() =>
        toast.error("Không sao chép được — hãy chọn và sao chép thủ công.")
      );

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Liên kết đặt mật khẩu cho {username}</CardTitle>
        <CardDescription>
          {link
            ? "Gửi liên kết này cho người dùng. Hiệu lực 1 ngày, dùng một lần; sau đó họ đăng nhập bằng mật khẩu vừa đặt."
            : "Chưa tạo được liên kết. Mở trang người dùng và dùng “Đặt lại mật khẩu”."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {link ? (
          <div className="flex gap-2">
            <Input
              readOnly
              value={link}
              aria-label="Liên kết đặt mật khẩu"
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs"
            />
            <Button type="button" variant="outline" onClick={copy}>
              <Copy className="size-4" />
              Sao chép
            </Button>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href={`/settings/users/${pk}`} />}>
            Xem người dùng
          </Button>
          <Button variant="outline" render={<Link href="/settings/users" />}>
            {BACK_TO.list}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
