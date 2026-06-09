import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "GreenOrange - Dịch vụ Thi công, Cải tạo & Vệ sinh Cửa hàng Chuyên nghiệp",
  description: "Dịch vụ Thi công, Cải tạo & Vệ sinh Cửa hàng Chuyên nghiệp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
