/**
 * Download redirect for one attachment: mints a short-lived signed GET on the
 * server and 302s the browser to the bucket.
 *
 * A route handler rather than a server action, because this has to be a real
 * `<a href>`:
 *
 *  - `window.open` after an `await` sits outside the user-gesture stack, so
 *    Safari (desktop and iOS) blocks it — silently, which reads to the user as
 *    "the file is gone".
 *  - A closed job renders its past stages inside `<fieldset disabled>`
 *    (`stage-panel.tsx`), which natively disables every `<button>` but not
 *    links. Downloading is a view action and the panel's contract says view
 *    links stay — a button could not honour that.
 *
 * `CRM_API_URL` and the bearer never reach the browser; the signed URL is only
 * ever handed out as a redirect, so it is not in the page HTML either.
 */
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

import { ApiError, apiFetch, toActionError } from "@/utils/http/http";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return new NextResponse("Không tìm thấy tệp.", { status: 404 });
  }

  let downloadUrl: string;
  try {
    const data = await apiFetch<{ download_url: string }>(
      `/attachments/${id}/url`
    );
    downloadUrl = data.download_url;
  } catch (err) {
    // Plain text, not JSON: the user followed a link and is looking at this
    // response. The backend's 404 for a pre-bucket row says so in Vietnamese
    // via toActionError, which beats the provider's raw NoSuchKey XML.
    const status = err instanceof ApiError ? err.status : 502;
    return new NextResponse(toActionError(err, "Không thể tải tệp."), {
      status,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  redirect(downloadUrl);
}
