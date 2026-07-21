import "./globals.css";
import type { Metadata } from "next";

import { Providers } from "./providers";

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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
