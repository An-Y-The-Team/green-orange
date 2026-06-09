"use client";

import { useEffect, useState } from "react";

export function useScrollSpy(sectionIds: string[], offset: number = 120) {
  const [activeSection, setActiveSection] = useState("hero");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Update scrolled state
      setIsScrolled(window.scrollY > 20);

      // Update active section
      const scrollPosition = window.scrollY + offset;

      if (window.scrollY < 100) {
        setActiveSection("hero");
        return;
      }

      for (const section of sectionIds) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initially
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionIds, offset]);

  return { activeSection, isScrolled };
}
