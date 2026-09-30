import { renderLines } from "@/lib/text-lines";
import { type EditMode, editAttr } from "@/lib/visual-editor/edit-attr";

// Signboard-style section heading shared by every section: orange eyebrow,
// condensed uppercase title, the orange/green "sign edge" bar, then the intro.
export default function SectionHeading({
  cmsId,
  fields,
  eyebrow,
  heading,
  description,
  descriptionMode,
  tone = "light",
}: {
  cmsId?: number;
  /** site_settings field names for [eyebrow, heading, description]. */
  fields: [string, string, string];
  eyebrow: string;
  heading: string;
  description: string;
  descriptionMode?: EditMode;
  /** "dark" when the heading sits on the charcoal band. */
  tone?: "light" | "dark";
}) {
  const [eyebrowField, headingField, descriptionField] = fields;
  const edit = (field: string, mode?: EditMode) =>
    editAttr({ collection: "site_settings", item: cmsId, fields: field, mode });
  return (
    <div className="max-w-3xl mb-12">
      <span
        className={`text-sm font-bold uppercase tracking-[0.12em] ${tone === "dark" ? "text-tape" : "text-brand-secondary-600"}`}
        data-directus={edit(eyebrowField)}
      >
        {eyebrow}
      </span>
      <h2
        className={`font-heading font-extrabold uppercase text-4xl md:text-5xl leading-none mt-2 ${tone === "dark" ? "text-white" : "text-sign-ink"}`}
        data-directus={edit(headingField)}
      >
        {renderLines(heading)}
      </h2>
      <div className="flex mt-5 h-1.5 w-20" aria-hidden>
        <span className="flex-[3] bg-brand-secondary-600" />
        <span className="flex-1 bg-brand-primary-600" />
      </div>
      <p
        className={`mt-5 text-base md:text-lg leading-relaxed ${tone === "dark" ? "text-stone-300" : "text-stone-600"}`}
        data-directus={edit(descriptionField, descriptionMode)}
      >
        {renderLines(description)}
      </p>
    </div>
  );
}
