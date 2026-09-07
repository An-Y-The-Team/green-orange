import { notFound } from "next/navigation";

import { BackLink } from "@/components/back-link/back-link";
import { BACK_TO } from "@/constants/labels";

import { getClient } from "../queries";
import { ClientDetailView } from "./client-detail/client-detail";

export default async function ClientDetailPage({
  params,
}: {
  // Next 16 route params are async.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(Number(id));

  if (!client) {
    notFound();
  }

  return (
    <>
      <BackLink href="/clients">{BACK_TO.list}</BackLink>

      <ClientDetailView client={client} />
    </>
  );
}
