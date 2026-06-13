"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@yan/ui/components/dialog";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import { Plus } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Single Zod schema → client validation + inferred TS type. The same shape is
// what POST /customers will accept on the backend (a student exercise).
const customerSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().min(6, "Số điện thoại không hợp lệ"),
  company: z.string().min(1, "Vui lòng nhập công ty"),
  status: z.enum(["active", "lead", "churned"]),
});

type CustomerForm = z.infer<typeof customerSchema>;

export function CustomerFormDialog() {
  const [open, setOpen] = React.useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { status: "lead" },
  });

  // Mock mode: validate + log, then close. When the backend is live this is
  // where students call POST /customers and revalidate the list.
  const onSubmit = (data: CustomerForm) => {
    console.log("Khách hàng mới (demo, chưa lưu):", data);
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus />
            Thêm khách hàng
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Khách hàng mới</DialogTitle>
          <DialogDescription>
            Biểu mẫu mẫu (xác thực bằng Zod). Lưu vào backend là bài tập cho học
            viên.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-3"
          noValidate
        >
          <div className="grid gap-1.5">
            <Label htmlFor="name">Tên</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input id="phone" {...register("phone")} />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="company">Công ty</Label>
            <Input id="company" {...register("company")} />
            {errors.company && (
              <p className="text-xs text-destructive">
                {errors.company.message}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="status">Trạng thái</Label>
            <select
              id="status"
              {...register("status")}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="lead">Tiềm năng</option>
              <option value="active">Đang hoạt động</option>
              <option value="churned">Đã rời bỏ</option>
            </select>
          </div>
          <DialogFooter className="mt-2">
            <DialogClose render={<Button variant="outline" type="button" />}>
              Hủy
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
