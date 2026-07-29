"use client";

// ponytail: VND is always 7–10 digits, so an ungrouped <input type="number"> makes
// a dropped zero a 10× error nobody can see. Grouping while typing + tr/k/tỷ
// shorthand fixes both halves. Base UI's NumberField was the cheaper option but
// it only groups on blur and hard-blocks letter keys, so no shorthand.
import * as React from "react";

import { Input } from "@yan/ui/components/input";

const GROUPER = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

/** Only digits and grouping dots — anything else is shorthand still in flight. */
const PLAIN = /^[\d.]*$/;

// `m` (triệu) and `b` (tỷ) are deliberately absent: this is a construction CRM
// where m/m² means mét, and a money box reading `m` as million is the exact 10⁶
// error we're preventing.
const SUFFIXES: [RegExp, number][] = [
  [/(?:tr|triệu|trieu)$/, 1e6],
  [/t[ỷỉy]$/, 1e9],
  [/(?:k|nghìn|nghin|ng)$/, 1e3],
];

/** "12500000" -> "12.500.000". Digits in, grouped out; "" stays "". */
export function formatVndDigits(digits: string): string {
  const clean = digits.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  // BigInt, not Number — exact past 2^53 instead of quietly rounding.
  return clean === "" ? "" : GROUPER.format(BigInt(clean));
}

/**
 * Free text -> whole đồng, or null when it isn't a usable amount.
 * Accepts grouped digits, "," as the decimal separator, a tr/k/tỷ suffix, and
 * pasted formatVND output ("12.500.000 ₫", NBSP included).
 */
export function parseVndInput(text: string): number | null {
  let s = text.replace(/[₫\s]/g, "").toLowerCase();
  let scale = 1;
  for (const [re, mult] of SUFFIXES) {
    if (re.test(s)) {
      scale = mult;
      s = s.replace(re, "");
      break;
    }
  }
  // Dots group, comma decimalises (vi-VN) — so "12.5" is 125, not 12½.
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  if (s === "" || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n * scale);
}

export const countDigits = (s: string) => s.replace(/\D/g, "").length;

/**
 * Index just past the nth digit of `s` — where the caret belongs once regrouping
 * has shifted every separator. Exported only so the arithmetic is pinned by a
 * test; the repo has no DOM harness to drive the real selection.
 */
export function caretAfterDigits(s: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i]! >= "0" && s[i]! <= "9" && ++seen === n) return i + 1;
  }
  return s.length;
}

/**
 * Money field for VND. Groups digits as you type and expands `12,5tr` /
 * `500k` / `1,2 tỷ` on blur or Enter. Reports whole đồng only.
 */
export function MoneyInput({
  value,
  onChange,
  onBlur,
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number | null;
  /** whole đồng, or null when the field is empty */
  onChange: (value: number | null) => void;
}) {
  // Non-null only while typing, so `value` stays the source of truth.
  const [draft, setDraft] = React.useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const raw = el.value;

    // Shorthand or a decimal comma in flight: leave the text alone, because
    // "12t" can still become "12tr" or "12tỷ". Resolved on blur/Enter.
    if (!PLAIN.test(raw)) {
      setDraft(raw);
      return;
    }
    if (countDigits(raw) === 0) {
      setDraft("");
      onChange(null);
      return;
    }
    // ponytail: writing el.value + the caret BEFORE setDraft means React's
    // re-render finds the DOM already matching state and leaves the selection
    // alone — no useEffect. If a browser ever fights it, delete this block and
    // group on blur only.
    const before = countDigits(raw.slice(0, el.selectionStart ?? raw.length));
    const next = formatVndDigits(raw);
    el.value = next;
    const caret = caretAfterDigits(next, before);
    el.setSelectionRange(caret, caret);
    setDraft(next);
    onChange(parseVndInput(next));
  };

  // Blur/Enter is where shorthand resolves. A blur without typing must not
  // wipe the value, hence the null-draft bail.
  const commit = () => {
    if (draft === null) return;
    onChange(parseVndInput(draft));
    setDraft(null);
  };

  return (
    <Input
      {...props}
      inputMode="numeric"
      value={draft ?? (value == null ? "" : formatVndDigits(String(value)))}
      onChange={handleChange}
      // Compose, don't replace — RHF hands us its own onBlur to track `touched`.
      onBlur={(e) => {
        commit();
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        onKeyDown?.(e);
      }}
    />
  );
}
