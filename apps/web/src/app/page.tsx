import { Suspense } from "react";

import ContactForm from "../components/contact-form/contact-form";
import Footer from "../components/footer/footer";
import Header from "../components/header/header";
import Hero from "../components/hero/hero";
import Introduction from "../components/introduction/introduction";
import Projects from "../components/projects/projects";
import Services from "../components/services/services";
import Testimonials from "../components/testimonials/testimonials";
import { getProjects, getServices, getTestimonials } from "../data";

export default async function Page() {
  // Fetch CMS content on the server, then hand it to the interactive client
  // sections as props (keeps those components free of data-fetching effects).
  const [services, projects, testimonials] = await Promise.all([
    getServices(),
    getProjects(),
    getTestimonials(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden antialiased font-sans">
      {/* Header component containing the logo and active states */}
      <Header />

      {/* Main page body */}
      <main className="flex-grow">
        {/* Hero banner section */}
        <Hero />

        {/* Corporate introduction, values representation, and 5-step process */}
        <Introduction />

        {/* Service grid catalog */}
        <Services services={services} />

        {/* Finished projects history case-study gallery */}
        <Projects projects={projects} />

        {/* Professional customer ratings, testimonials layout */}
        <Testimonials testimonials={testimonials} />

        {/* Interactive feedback submission with automated fields fill-in and LocalStorage inbox */}
        <Suspense
          fallback={
            <div className="py-16 md:py-24 bg-white text-center">
              Loading contact form...
            </div>
          }
        >
          <ContactForm services={services} />
        </Suspense>
      </main>

      {/* Trust credentials corporate footer */}
      <Footer />
    </div>
  );
}
