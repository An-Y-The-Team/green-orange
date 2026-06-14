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

import { listContacts } from "./queries";

export default async function ContactsPage() {
  const contacts = await listContacts();

  return (
    <>
      <PageHeader title="Liên hệ" description={`${contacts.length} liên hệ`} />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Chức danh</TableHead>
              <TableHead>Công ty</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Điện thoại</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.title}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.company}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.email}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.phone}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
