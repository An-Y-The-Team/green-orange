import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { PROJECT_STAGES } from "@/constants/labels";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { labelOf } from "@/utils/label-of/label-of";

import type { StageSummary } from "../../../projects/types";

/**
 * Where the business stands — the block the design specified
 * (`crm-ui-redesign.md` §Tổng quan: "8 columns with project counts + total
 * quoted value per stage") and the one that never shipped, so nothing in the
 * app answered that question.
 *
 * `deal_total` is the Σ of each project's CHỐT quote, hence "đã chốt": a number
 * that means one specific thing rather than "whatever was last quoted".
 * Every cell deep-links into the projects list, which already reads `stage`
 * from the URL.
 */
export function PipelineBlock({ stages }: { stages: StageSummary[] }) {
  const active = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Pipeline</CardTitle>
        <span className="text-sm text-muted-foreground">
          {active} công trình đang hoạt động
        </span>
      </CardHeader>
      <CardContent>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          {stages.map((s, i) => {
            const stage = labelOf(PROJECT_STAGES, s.stage);
            return (
              <li key={s.stage}>
                <Link
                  href={`/projects?stage=${s.stage}`}
                  className="flex h-full flex-col gap-1 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <span className="text-xs text-muted-foreground">
                    {i + 1}. {stage.label}
                  </span>
                  <span className="text-lg font-semibold tabular-nums">
                    {s.count}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {s.deal_total > 0 ? formatVND(s.deal_total) : "—"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          Số tiền là tổng báo giá đã chốt của các công trình ở giai đoạn đó.
        </p>
      </CardContent>
    </Card>
  );
}
