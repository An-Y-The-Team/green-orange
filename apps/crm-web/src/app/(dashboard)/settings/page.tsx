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

import { listProjectTypes } from "../projects/queries";
import { ProjectTypesManager } from "./project-types-manager/project-types-manager";

export default async function SettingsPage() {
  const projectTypes = await listProjectTypes();

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
            <CardTitle>Thông tin công ty</CardTitle>
            <CardDescription>
              Đầu trang tài liệu (letterhead) & thông tin Bên B — in trên mọi
              báo giá, hợp đồng, quyết toán.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/settings/company"
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
            >
              <span>Sửa thông tin công ty</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
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
      </div>
    </>
  );
}
