"use client";

import { RefreshRouteOnSave as PayloadRefreshRouteOnSave } from "@payloadcms/live-preview-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

// Read the public CMS origin directly from the inlined env var rather than
// importing CMS_URL from `data.ts` — that module pulls in `next/headers`, which
// is server-only and would break this client component's bundle.
const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3001";

// Listens for postMessage events from the Payload admin Live Preview host and
// refreshes the route (re-running server components) whenever a document is
// saved/autosaved, so the preview reflects the latest draft. `serverURL` MUST be
// the admin origin that posts the messages.
export function RefreshRouteOnSave() {
  const router = useRouter();
  const isInitialMessage = useRef(true);

  const refresh = useCallback(() => {
    // PayloadRefreshRouteOnSave calls refresh() immediately on mount/ready.
    // If router.refresh() causes this component to remount (e.g. Next.js bug in
    // iframes), we get an infinite loop of RSC fetches and remounts.
    // We ignore the first refresh. The CMS already loads the draft data on the
    // initial iframe load because Draft Mode is enabled!
    if (isInitialMessage.current) {
      isInitialMessage.current = false;
      return;
    }
    router.refresh();
  }, [router]);

  return <PayloadRefreshRouteOnSave refresh={refresh} serverURL={CMS_URL} />;
}
