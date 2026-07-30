/**
 * Split quote lines into hạng mục sections: runs of CONSECUTIVE items sharing a
 * category. Order is never rearranged — `sort_order` (server) / field-array order
 * (builder) stays the truth, so the returned `indices` are the original
 * positions and double as the printed row numbers.
 *
 * A missing/blank category is its own unnamed section, which is what an
 * ungrouped quote (every item null) collapses to: one section, no header.
 */
export function groupByCategory(
  items: { category?: string | null }[] | undefined
): { category: string; indices: number[] }[] {
  const groups: { category: string; indices: number[] }[] = [];

  (items ?? []).forEach((item, index) => {
    const category = item?.category?.trim() ?? "";
    const current = groups.at(-1);
    if (current && current.category === category) current.indices.push(index);
    else groups.push({ category, indices: [index] });
  });

  return groups;
}
