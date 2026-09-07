import "./globals.css";
import type { Metadata } from "next";

import { ThemeScript } from "@yan/ui/components/theme-script";

import { APP_NAME } from "@/constants/labels";

import { Providers } from "./providers/providers";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Quản lý công việc",
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
