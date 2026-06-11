import "./globals.css";
import type { Metadata } from "next";

import { SITE_URL, getSiteSettings } from "../data";

// Metadata is generated from the editable SiteSettings global so the business
// owner controls the site title, description, and social share image.
export async function generateMetadata(): Promise<Metadata> {
  const { seo, company } = await getSiteSettings();
  const images = seo.ogImageUrl ? [seo.ogImageUrl] : undefined;
  return {
    metadataBase: new URL(SITE_URL),
    title: seo.metaTitle,
    description: seo.metaDescription,
    alternates: { canonical: "/" },
    openGraph: {
      title: seo.metaTitle,
      description: seo.metaDescription,
      url: SITE_URL,
      siteName: company.shortName,
      locale: "vi_VN",
      type: "website",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.metaTitle,
      description: seo.metaDescription,
      ...(images ? { images } : {}),
    },
  };
}

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
