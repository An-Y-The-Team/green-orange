/**
 * Editor theme — Tailwind classes Lexical applies to nodes inside the editable
 * surface. Kept close to the printed `.print-sheet` typography so the editor
 * roughly previews the final document.
 */
import type { EditorThemeClasses } from "lexical";

export const editorTheme: EditorThemeClasses = {
  paragraph: "mb-2 text-xs leading-relaxed text-zinc-700",
  heading: {
    h2: "pt-1 mb-1 text-xs font-semibold uppercase text-zinc-900",
    h3: "pt-1 mb-1 text-xs font-semibold text-zinc-900",
  },
  quote: "border-l-2 border-zinc-300 pl-3 italic text-zinc-600",
  list: {
    ul: "list-disc pl-5 mb-2 text-xs text-zinc-700",
    ol: "list-decimal pl-5 mb-2 text-xs text-zinc-700",
    listitem: "mb-0.5",
  },
  link: "text-emerald-700 underline",
  text: {
    bold: "font-semibold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "rounded bg-zinc-100 px-1 text-[0.95em]",
  },
};
