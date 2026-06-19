"use client";

import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createHeadingNode, type HeadingTagType } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  type ElementNode,
  FORMAT_TEXT_COMMAND,
  type TextFormatType,
} from "lexical";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Underline,
} from "lucide-react";

import { Button } from "@yan/ui/components/button";

/** Block/inline formatting controls. Buttons are type="button" so they never
 * submit the surrounding template/contract form. */
export function Toolbar() {
  const [editor] = useLexicalComposerContext();

  const format = (type: TextFormatType) => () =>
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);

  const toBlock = (create: () => ElementNode) => () =>
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) $setBlocksType(selection, create);
    });

  const toParagraph = toBlock($createParagraphNode);
  const toHeading = (tag: HeadingTagType) =>
    toBlock(() => $createHeadingNode(tag));

  const list = (kind: "ul" | "ol") => () =>
    editor.dispatchCommand(
      kind === "ul"
        ? INSERT_UNORDERED_LIST_COMMAND
        : INSERT_ORDERED_LIST_COMMAND,
      undefined
    );

  const clearList = () =>
    editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);

  const items: Array<{
    icon: typeof Bold;
    label: string;
    onClick: () => void;
  }> = [
    { icon: Bold, label: "Đậm", onClick: format("bold") },
    { icon: Italic, label: "Nghiêng", onClick: format("italic") },
    { icon: Underline, label: "Gạch chân", onClick: format("underline") },
    { icon: Heading2, label: "Tiêu đề lớn", onClick: toHeading("h2") },
    { icon: Heading3, label: "Tiêu đề nhỏ", onClick: toHeading("h3") },
    { icon: Pilcrow, label: "Đoạn văn", onClick: toParagraph },
    { icon: List, label: "Danh sách", onClick: list("ul") },
    { icon: ListOrdered, label: "Danh sách số", onClick: list("ol") },
  ];

  return (
    <>
      {items.map(({ icon: Icon, label, onClick }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon-sm"
          title={label}
          aria-label={label}
          onClick={onClick}
          onDoubleClick={label.startsWith("Danh sách") ? clearList : undefined}
        >
          <Icon />
        </Button>
      ))}
    </>
  );
}
