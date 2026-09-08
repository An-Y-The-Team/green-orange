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
  USER_ADMIN_GROUP,
  isUserAdmin,
  sessionUsername,
} from "@/utils/authentik-admin/authentik-admin";
import { formatDate } from "@/utils/format-date/format-date";

import { ActiveToggle } from "../components/active-toggle/active-toggle";
import { GroupPicker } from "../components/group-picker/group-picker";
import { ResetPassword } from "../components/reset-password/reset-password";
import { UserForm } from "../components/user-form/user-form";
import { getUser, listGroups } from "../queries";

// Edit page: the profile form, the account's status (lock / reset password)
// and its group memberships.
export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isUserAdmin())) redirect("/settings");
  const { id } = await params;
  const [user, groups, me] = await Promise.all([
    getUser(Number(id)),
    listGroups(),
    sessionUsername(),
  ]);
  if (!user) notFound();

  const self = me === user.username;
  // Superuser groups are not this page's business (see group-changes.ts).
  const manageable = groups.filter((g) => !g.is_superuser);
  const lockedPk = self
    ? manageable.find((g) => g.name === USER_ADMIN_GROUP)?.pk
    : undefined;

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

        <div className="space-y-6 self-start">
          <Card>
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
            <CardContent className="space-y-4">
              <ActiveToggle pk={user.pk} active={user.is_active} self={self} />
              <ResetPassword pk={user.pk} active={user.is_active} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nhóm</CardTitle>
              <CardDescription>
                Thành viên {USER_ADMIN_GROUP} được quản lý người dùng.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GroupPicker
                pk={user.pk}
                groups={manageable}
                current={user.groups_obj.map((g) => g.pk)}
                lockedPk={lockedPk}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
