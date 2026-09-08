import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";

export default function UsersLoading() {
  return (
    <>
      <PageHeader
        title="Người dùng"
        description="Tài khoản đăng nhập CRM, quản lý trên Authentik."
      />
      <TableSkeleton columns={6} />
    </>
  );
}
