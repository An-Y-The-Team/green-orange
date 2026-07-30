import { expect, test } from "vitest";

import {
  TEXT_FORMAT,
  doc,
  h2,
  lexicalPlainText,
  lexicalRoot,
  li,
  lineItems,
  mf,
  ol,
  p,
  t,
  ul,
} from "./lexical-build";

// Why this file matters: the backend seed authors contract-template bodies with
// these builders and every printable document (renderer + .docx) reads them
// back, so a shape change here silently corrupts contracts.

test("doc() emits the { root } editorState shape both readers expect", () => {
  const root = lexicalRoot(doc(p(t("Xin chào"))));

  expect(root?.type).toBe("root");
  expect(root?.version).toBe(1);
  // The renderer maps root.children, so blocks must land there, not one deeper.
  expect(root?.children?.[0]?.type).toBe("paragraph");
  expect(root?.children?.[0]?.children?.[0]).toMatchObject({
    type: "text",
    text: "Xin chào",
  });
});

test("format bit-flags survive the round-trip", () => {
  const root = lexicalRoot(
    doc(p(t("đậm", TEXT_FORMAT.bold | TEXT_FORMAT.underline)))
  );

  expect(root?.children?.[0]?.children?.[0]?.format).toBe(9);
});

test("headings carry their tag and lists number their items", () => {
  const root = lexicalRoot(doc(h2(t("Điều 1")), ol(li(t("a")), li(t("b")))));

  expect(root?.children?.[0]).toMatchObject({ type: "heading", tag: "h2" });
  expect(root?.children?.[1]).toMatchObject({
    type: "list",
    listType: "number",
    tag: "ol",
    start: 1,
  });
  // Lexical needs a 1-based `value` per item, not the placeholder li() sets.
  expect(root?.children?.[1]?.children?.map((it) => it.value)).toEqual([1, 2]);
  expect(lexicalRoot(doc(ul(li(t("a")))))?.children?.[0]).toMatchObject({
    listType: "bullet",
    tag: "ul",
  });
});

test("the line-items block is a bare typed node", () => {
  expect(lexicalRoot(doc(lineItems()))?.children?.[0]).toEqual({
    type: "line-items",
    version: 1,
  });
});

// mf() is the seed's only way to write a merge field: the `token` is what the
// merge resolves against, the `text` is only the editor chip's label.
test("merge-field nodes round-trip token + catalog label", () => {
  const node = lexicalRoot(doc(p(mf("code"))))?.children?.[0]?.children?.[0];

  expect(node).toMatchObject({
    type: "merge-field",
    token: "code",
    text: "Mã hợp đồng",
  });
});

test("an off-catalog token labels itself instead of rendering blank", () => {
  expect(mf("bogus")).toMatchObject({ token: "bogus", text: "bogus" });
});

test("lexicalPlainText flattens nested text, merge-field labels included", () => {
  const body = doc(
    h2(t("Điều 1")),
    p(t("Công trình: "), mf("project_name")),
    ul(li(t("x")))
  );

  expect(lexicalPlainText(body)).toBe("Điều 1Công trình: Tên công trìnhx");
});

// A structurally-empty document still serialises to a non-empty JSON string,
// which is why the contract schema validates on this and not on body.length.
test("an empty document is empty text, and whitespace doesn't count", () => {
  expect(lexicalPlainText(doc())).toBe("");
  expect(lexicalPlainText(doc(p()))).toBe("");
  expect(lexicalPlainText(doc(p(t("  \n "))))).toBe("");
});

// The parse-failure path: both readers go through lexicalRoot, which swallows
// bad input rather than throwing at a Server Component or an export click.
test("malformed input yields no root and empty text, never a throw", () => {
  for (const bad of ["not json", "", "{", "[1,2", '{"root":']) {
    expect(lexicalRoot(bad)).toBeUndefined();
    expect(lexicalPlainText(bad)).toBe("");
  }
});

test("valid JSON that isn't a Lexical document yields no root", () => {
  expect(lexicalRoot('{"foo":1}')).toBeUndefined();
  expect(lexicalRoot("[]")).toBeUndefined();
  expect(lexicalRoot("null")).toBeUndefined();
  expect(lexicalRoot("123")).toBeUndefined();
  expect(lexicalPlainText('{"foo":1}')).toBe("");
});

// Parses fine, then breaks the walk. lexicalPlainText backs the contract
// schema's presence check, so it must report "empty" rather than throw at
// validation time.
test("a body whose children isn't an array is empty text, not a throw", () => {
  const wrong = '{"root":{"children":5}}';

  expect(lexicalRoot(wrong)).toEqual({ children: 5 });
  expect(lexicalPlainText(wrong)).toBe("");
});
