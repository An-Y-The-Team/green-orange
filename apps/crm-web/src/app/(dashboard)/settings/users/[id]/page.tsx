import { notFound, redirect } from "next/navigation";

import { Badge } from "@yan/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";
import {
  isUserAdmin,
  sessionUsername,
} from "@/utils/authentik-admin/authentik-admin";
import { formatDate } from "@/utils/format-date/format-date";

import { ActiveToggle } from "../components/active-toggle/active-toggle";
import { UserForm } from "../components/user-form/user-form";
import { getUser } from "../queries";

// Edit page: the profile form plus the account's status. Reset-password and
// group membership land on this same page next.
export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isUserAdmin())) redirect("/settings");
  const { id } = await params;
  const [user, me] = await Promise.all([
    getUser(Number(id)),
    sessionUsername(),
  ]);
  if (!user) notFound();

  return (
    <>
      <BackLink href="/settings/users">{BACK_TO.list}</BackLink>
      <PageHeader
        title={user.name || user.username}
        description={`Tên đăng nhập: ${user.username}`}
        action={
          user.is_active ? (
            <Badge variant="success">Đang hoạt động</Badge>
          ) : (
            <Badge variant="secondary">Đã khóa</Badge>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <UserForm user={user} />

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Tài khoản</CardTitle>
            <CardDescription>
              {user.last_login
                ? `Đăng nhập lần cuối ${formatDate(user.last_login)}.`
                : "Chưa đăng nhập lần nào."}
              {user.groups_obj.length
                ? ` Nhóm: ${user.groups_obj.map((g) => g.name).join(", ")}.`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActiveToggle
              pk={user.pk}
              active={user.is_active}
              self={me === user.username}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
