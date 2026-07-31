import "./globals.css";
import type { Metadata } from "next";

import { ThemeScript } from "@yan/ui/components/theme-script";

import { Providers } from "./providers/providers";

export const metadata: Metadata = {
  title: "Yan CRM",
  description: "CRM dashboard — teaching app (Next.js UI + FastAPI backend)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased">
        {/* Parse-time theme stamp — must render from this server layout. */}
        <ThemeScript />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
