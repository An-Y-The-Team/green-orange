import { Printer } from "lucide-react";
import Link from "next/link";

import { Button } from "@yan/ui/components/button";

/** The two acceptance-request letters: to the client, and to the building management. */
export function PrintLinks({ projectId }: { projectId: number }) {
  const href = `/projects/${projectId}/print/acceptance-request`;
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        render={
          <Link href={href} target="_blank">
            <Printer className="size-4" />
            In thư yêu cầu nghiệm thu
          </Link>
        }
      />
      <Button
        variant="outline"
        render={
          <Link href={`${href}?to=building`} target="_blank">
            <Printer className="size-4" />
            In thư gửi BQL tòa nhà
          </Link>
        }
      />
    </div>
  );
}
