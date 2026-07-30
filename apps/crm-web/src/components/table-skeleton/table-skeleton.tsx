import { Card } from "@yan/ui/components/card";
import { Skeleton } from "@yan/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { SKELETON_ROW_COUNT } from "./constants";

/**
 * Cold-load placeholder for the list pages (`loading.tsx`), matching their
 * shared `Card > Table` shape so the real rows swap in without a layout jump.
 * `columns` should match the page's `<TableHead>` count.
 */
export function TableSkeleton({
  columns,
  rows = SKELETON_ROW_COUNT,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }, (_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, row) => (
            <TableRow key={row}>
              {Array.from({ length: columns }, (_, col) => (
                <TableCell key={col}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
