import "./globals.css";
import type { Metadata } from "next";
import {
  Be_Vietnam_Pro,
  DM_Serif_Display,
  Inter,
  Lexend,
  Lora,
  Manrope,
  Nunito_Sans,
  Playfair_Display,
} from "next/font/google";

import { SITE_URL, getSiteSettings } from "../data";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-be-vietnam-pro",
});
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-inter",
});
const lexend = Lexend({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-lexend",
});
const nunitoSans = Nunito_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-nunito-sans",
});
const manrope = Manrope({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700", "800"],
  display: "swap",
  preload: false,
  variable: "--font-manrope",
});
const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-playfair-display",
});
const lora = Lora({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
  variable: "--font-lora",
});
const dmSerif = DM_Serif_Display({
  subsets: ["latin", "vietnamese" as "latin"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-dm-serif-display",
});

const FONT_VARIABLES = [
  beVietnamPro.variable,
  inter.variable,
  lexend.variable,
  nunitoSans.variable,
  manrope.variable,
  playfair.variable,
  lora.variable,
  dmSerif.variable,
].join(" ");

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
    <html lang="vi" className={FONT_VARIABLES}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
