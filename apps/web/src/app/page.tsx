import { draftMode } from "next/headers";
import React, { Suspense } from "react";

import ContactForm from "../components/contact-form/contact-form";
import Footer from "../components/footer/footer";
import Header from "../components/header/header";
import Hero from "../components/hero/hero";
import Introduction from "../components/introduction/introduction";
import { VisualEditorInit } from "../components/live-preview/visual-editor-init";
import Projects from "../components/projects/projects";
import Services from "../components/services/services";
import Testimonials from "../components/testimonials/testimonials";
import {
  SITE_URL,
  type SiteSettings,
  getProjects,
  getServices,
  getSiteSettings,
  getTestimonials,
} from "../data";
import { Service } from "../types";

// Render at request time instead of prerendering at build: the CMS isn't
// reachable from the CI build, and this keeps content fresh from the internal
// CMS on every request. Data fetches are still cached (see REVALIDATE_SECONDS).
export const dynamic = "force-dynamic";

// Structured data (schema.org LocalBusiness + the service catalog) so search
// engines render rich results — high value for a local, Google-driven business.
function buildJsonLd(settings: SiteSettings, services: Service[]) {
  const { company, seo } = settings;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company.name,
    url: SITE_URL,
    ...(company.phone ? { telephone: company.phone } : {}),
    ...(company.email ? { email: company.email } : {}),
    ...(company.address ? { address: company.address } : {}),
    ...(company.motto ? { slogan: company.motto } : {}),
    ...(seo.ogImageUrl ? { image: seo.ogImageUrl } : {}),
    ...(services.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Dịch vụ",
            itemListElement: services.map((s) => ({
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: s.title,
                description: s.description,
              },
            })),
          },
        }
      : {}),
  };
}

export default async function Page() {
  const { isEnabled: isPreviewMode } = await draftMode();

  // Fetch CMS content on the server, then hand it to the interactive client
  // sections as props (keeps those components free of data-fetching effects).
  const [services, projects, testimonials, settings] = await Promise.all([
    getServices(isPreviewMode),
    getProjects(isPreviewMode),
    getTestimonials(isPreviewMode),
    getSiteSettings(isPreviewMode),
  ]);

  const jsonLd = buildJsonLd(settings, services);

  return (
    <div
      className="min-h-screen flex flex-col bg-white overflow-x-hidden antialiased font-sans"
      style={
        {
          "--font-heading": `var(--font-${settings.typography.headingFont})`,
          "--font-serif": `var(--font-${settings.typography.heroDisplayFont})`,
          "--font-sans": `var(--font-${settings.typography.bodyFont})`,
        } as React.CSSProperties
      }
    >
      {isPreviewMode && <VisualEditorInit />}

      {/* schema.org structured data for rich search results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header component containing the logo and active states */}
      <Header settings={settings} />

      {/* Main page body */}
      <main className="flex-grow">
        {/* Hero banner section */}
        <Hero settings={settings} />

        {/* Corporate introduction, values representation, and 5-step process */}
        <Introduction settings={settings} />

        {/* Service grid catalog */}
        <Services services={services} settings={settings} />

        {/* Finished projects history case-study gallery */}
        <Projects projects={projects} settings={settings} />

        {/* Professional customer ratings, testimonials layout */}
        <Testimonials testimonials={testimonials} settings={settings} />

        {/* Interactive feedback submission with automated fields fill-in and LocalStorage inbox */}
        <Suspense
          fallback={
            <div className="py-16 md:py-24 bg-white text-center">
              Loading contact form...
            </div>
          }
        >
          <ContactForm services={services} settings={settings} />
        </Suspense>
      </main>

      {/* Trust credentials corporate footer */}
      <Footer settings={settings} />
    </div>
  );
}
