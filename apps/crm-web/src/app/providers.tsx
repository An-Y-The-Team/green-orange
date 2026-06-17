"use client";

import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as React from "react";
import { Toaster } from "sonner";

import { ThemeProvider } from "@yan/ui/components/theme-provider";

// App-Router TanStack Query setup. The data layer still runs through
// src/lib/api today (Server Components); this provider makes Query available
// for students to build client-side fetching/mutations on top of crm-api —
// e.g. useQuery in a client component, or wiring the form dialogs' onSubmit to
// useMutation + invalidateQueries instead of console.log.
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR/Server Components, keep a non-zero staleTime so freshly
        // server-rendered data isn't refetched immediately on the client.
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

// One client per request on the server; a single reused client in the browser
// (so a Suspense during initial render doesn't throw the client away).
function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        {/* sonner toasts — used by the shared useServerAction hook for
            success/error feedback on server actions. */}
        <Toaster position="top-right" richColors />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
