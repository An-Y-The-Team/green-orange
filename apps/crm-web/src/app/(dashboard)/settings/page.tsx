import { ChevronRight } from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { PageHeader } from "@/components/page-header/page-header";
import { FIELDS } from "@/constants/labels";
import { isUserAdmin } from "@/utils/authentik-admin/authentik-admin";

import { listProjectTypes } from "../projects/queries";
import { ProjectTypesManager } from "./project-types-manager/project-types-manager";

export default async function SettingsPage() {
  const [projectTypes, canManageUsers] = await Promise.all([
    listProjectTypes(),
    // False when Authentik admin isn't configured or the caller isn't in
    // crm-admins. The page re-checks — this only decides whether to show a card.
    isUserAdmin(),
  ]);

  return (
    <>
      <PageHeader
        title="Danh mục"
        description="Quản lý danh mục dùng chung của hệ thống."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{FIELDS.projectType}</CardTitle>
            <CardDescription>
              Nhãn phân loại công trình, dùng khi tiếp nhận yêu cầu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectTypesManager types={projectTypes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{FIELDS.contractTemplate}</CardTitle>
            <CardDescription>Quản lý mẫu văn bản hợp đồng.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/contracts/templates"
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
            >
              <span>Quản lý mẫu hợp đồng</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {canManageUsers ? (
          <Card>
            <CardHeader>
              <CardTitle>Người dùng</CardTitle>
              <CardDescription>
                Tài khoản đăng nhập CRM: thêm, sửa, khóa, đặt lại mật khẩu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/settings/users"
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <span>Quản lý người dùng</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
