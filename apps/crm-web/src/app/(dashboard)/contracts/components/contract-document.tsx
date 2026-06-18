/**
 * Renders a merged contract-template body (the string returned by
 * mergeTemplate) into the A4 document. It supports a deliberately tiny markup
 * subset so authors can structure clauses without any HTML:
 *
 *   "## Heading"   → a bold, uppercase clause heading
 *   other lines    → paragraphs (blank lines separate them)
 *
 * Everything is rendered as React children (escaped), never via
 * dangerouslySetInnerHTML — an author cannot inject markup through a template.
 */
export function ContractDocumentBody({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/).map((b) => b.trim());

  return (
    <div className="mt-3 space-y-3 text-xs leading-relaxed text-zinc-700">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <p key={i} className="pt-1 font-semibold uppercase text-zinc-900">
              {block.slice(3).trim()}
            </p>
          );
        }
        // Preserve single newlines within a paragraph as line breaks.
        const lines = block.split("\n");
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {line}
                {j < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
