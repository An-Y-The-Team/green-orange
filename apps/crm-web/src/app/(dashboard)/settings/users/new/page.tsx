import { redirect } from "next/navigation";

import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";
import { isUserAdmin } from "@/utils/authentik-admin/authentik-admin";

import { UserForm } from "../components/user-form/user-form";

export default async function NewUserPage() {
  if (!(await isUserAdmin())) redirect("/settings");

  return (
    <>
      <BackLink href="/settings/users">{BACK_TO.list}</BackLink>
      <PageHeader
        title="Thêm người dùng"
        description="Tài khoản được tạo không có mật khẩu — bạn sẽ nhận một liên kết để gửi cho người dùng tự đặt."
      />
      <UserForm />
    </>
  );
}
