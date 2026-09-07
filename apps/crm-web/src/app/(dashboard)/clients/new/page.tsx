import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";

import { ClientForm } from "./client-form/client-form";

export default function NewClientPage() {
  return (
    <>
      <BackLink href="/clients">{BACK_TO.client}</BackLink>

      <PageHeader title="Thêm khách hàng" description="Khách hàng mới" />

      <ClientForm />
    </>
  );
}
