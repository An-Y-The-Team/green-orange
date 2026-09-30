// Two overlapping brand circles (orange + green) — the logo mark. Static SVG,
// safe to render from both server and client components.
export default function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 18" className={className} aria-hidden>
      <circle cx="9" cy="9" r="8" className="fill-brand-secondary-600" />
      <circle
        cx="17"
        cy="9"
        r="8"
        className="fill-brand-primary-600"
        fillOpacity=".9"
      />
    </svg>
  );
}
