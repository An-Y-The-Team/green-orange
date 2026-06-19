import Link from "next/link";

import { Badge } from "@yan/ui/components/badge";
import { Card } from "@yan/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { PageHeader } from "@/components/page-header";
import { formatVND } from "@/lib/format";
import { crewRole, crewStatus } from "@/lib/labels";

import { CrewFormDialog } from "./components/crew-form-dialog/crew-form-dialog";
import { CrewStatus } from "./enums";
import { listCrew } from "./queries";

export default async function CrewPage() {
  const members = await listCrew();
  const activeCount = members.filter(
    (m) => m.status === CrewStatus.DANG_LAM
  ).length;

  return (
    <>
      <PageHeader
        title="Nhân sự"
        description={`${members.length} nhân sự · ${activeCount} đang làm`}
        action={<CrewFormDialog />}
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead className="text-right">Ngày công</TableHead>
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
                  {crewRole[member.role]}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.phone}
                </TableCell>
                <TableCell className="text-right">
                  {formatVND(member.day_rate)}
                </TableCell>
                <TableCell>
                  <Badge variant={crewStatus[member.status].variant}>
                    {crewStatus[member.status].label}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
