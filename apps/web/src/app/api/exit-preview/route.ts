import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

// Disables Draft Mode and returns to the published site.
export async function GET(): Promise<Response> {
  (await draftMode()).disable();
  redirect("/");
}
