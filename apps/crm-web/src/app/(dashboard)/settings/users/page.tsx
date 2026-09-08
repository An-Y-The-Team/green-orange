import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { Card } from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { EmptyState } from "@/components/empty-state/empty-state";
import { PageHeader } from "@/components/page-header/page-header";
import { FIELDS } from "@/constants/labels";
import { isUserAdmin } from "@/utils/authentik-admin/authentik-admin";
import { formatDate } from "@/utils/format-date/format-date";

import { listUsers } from "./queries";

/**
 * CRM accounts, read straight from Authentik. Gated: the layout only proves
 * "signed in"; this page also needs `crm-admins` membership (or superuser) —
 * a non-member is bounced to Danh mục rather than shown an empty table.
 */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  if (!(await isUserAdmin())) redirect("/settings");

  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const users = await listUsers(search);

  return (
    <>
      <PageHeader
        title="Người dùng"
        description="Tài khoản đăng nhập CRM, quản lý trên Authentik."
        action={
          <Button size="sm" render={<Link href="/settings/users/new" />}>
            + Người dùng mới
          </Button>
        }
      />

      {/* Plain GET form: the server component re-renders with ?q= — no client
          state, and the URL stays shareable. */}
      <form className="mb-4 max-w-sm">
        <Input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Tìm theo tên đăng nhập, họ tên, email"
          aria-label="Tìm người dùng"
        />
      </form>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên đăng nhập</TableHead>
              <TableHead>{FIELDS.fullName}</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Nhóm</TableHead>
              <TableHead>{FIELDS.status}</TableHead>
              <TableHead>Đăng nhập lần cuối</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    message={
                      search
                        ? "Không có người dùng nào khớp."
                        : "Chưa có người dùng."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.pk}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/settings/users/${user.pk}`}
                      className="hover:underline"
                    >
                      {user.username}
                    </Link>
                  </TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.groups_obj.map((g) => g.name).join(", ")}
                  </TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <Badge variant="success">Đang hoạt động</Badge>
                    ) : (
                      <Badge variant="secondary">Đã khóa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.last_login ? formatDate(user.last_login) : "Chưa"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
