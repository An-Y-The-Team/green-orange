import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

// Entry point the Payload CMS Live Preview iframe loads. Validates the shared
// secret, turns on Next.js Draft Mode (a cookie scoped to this web origin), then
// redirects into the page so server fetches return draft content.
export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const redirectPath = searchParams.get("redirect") || "/";

  if (secret !== process.env.PAYLOAD_PREVIEW_SECRET) {
    return new Response("Invalid preview secret", { status: 401 });
  }
  // Only allow relative, same-site redirects.
  if (!redirectPath.startsWith("/")) {
    return new Response("Invalid redirect target", { status: 400 });
  }

  (await draftMode()).enable();
  redirect(redirectPath);
}
