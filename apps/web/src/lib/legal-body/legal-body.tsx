import { Fragment } from "react";

/**
 * Renders a CMS `body` field from the legal_terms sections.
 *
 * The CMS has no rich-text interface anywhere (see `renderLines` in
 * ../text-lines.tsx — "without rich-text overhead" is a deliberate house
 * decision), but a terms-of-use document genuinely needs paragraphs, bullet
 * lists and emphasis. So this supports exactly two conventions, both shown in
 * the field's note in the Studio:
 *
 *   - a blank line separates blocks
 *   - a block whose lines all start with "- " is a bullet list
 *   - **text** is bold, anywhere
 *
 * That is the whole syntax. It is deliberately not Markdown: no links, no
 * headings, no nesting. Anything more and this should become a real renderer
 * with a real parser rather than growing one regex at a time.
 */

const BULLET = "- ";

// Splits on ** pairs: odd indices are the emphasised runs. An unclosed ** has
// no pair, so its run stays plain text rather than swallowing the rest.
const renderBold = (text: string) => {
  const parts = text.split("**");
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i}>{part}</strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
};

export function LegalBody({ body }: { body: string }) {
  const blocks = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((line) => line.trim());
        const isList = lines.every((line) =>
          line.trimStart().startsWith(BULLET)
        );

        if (isList) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1.5">
              {lines.map((line, j) => (
                <li key={j}>
                  {renderBold(line.trimStart().slice(BULLET.length))}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i}>
            {lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderBold(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
