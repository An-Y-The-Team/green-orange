import { Fragment } from "react";

/**
 * Splits a string on newline characters and returns a Fragment with <br />
 * elements between each line. Allows CMS editors to break headings and
 * descriptions across multiple lines without rich-text overhead.
 */
export function renderLines(text: string) {
  const lines = text.split("\n");
  return (
    <Fragment>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </Fragment>
  );
}
