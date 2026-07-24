import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";

import { ClientForm } from "./client-form";

export default function NewClientPage() {
  return (
    <>
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại khách hàng
      </Link>

      <PageHeader title="Thêm khách hàng" description="Khách hàng mới" />

      <ClientForm />
    </>
  );
}
