import { Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { Card } from "@yan/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { crewMemberStatus, employmentType } from "@/lib/labels";

import { EmploymentType } from "../enums";
import type { CrewMember } from "../types";

export function RosterTab({ members }: { members: CrewMember[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" render={<Link href="/crew/new" />}>
          <Plus className="size-4" />
          Thêm nhân sự
        </Button>
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Số điện thoại / Zalo</TableHead>
              <TableHead>Vai trò mặc định</TableHead>
              <TableHead>Hình thức</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  <Link href={`/crew/${member.id}`} className="hover:underline">
                    {member.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.phone ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.default_role?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      member.employment_type === EmploymentType.PERMANENT
                        ? "default"
                        : "secondary"
                    }
                  >
                    {employmentType[member.employment_type]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={crewMemberStatus[member.status].variant}>
                    {crewMemberStatus[member.status].label}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
