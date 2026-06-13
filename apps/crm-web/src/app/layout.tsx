import "./globals.css";
import type { Metadata } from "next";

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
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
