"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@yan/ui/components/form";
import { Input } from "@yan/ui/components/input";

const loginSchema = z.object({
  username: z.string().min(1, "Nhập tên đăng nhập"),
  password: z.string().min(1, "Nhập mật khẩu"),
});
type LoginValues = z.infer<typeof loginSchema>;

// Inline (headless) Authentik login: credentials go to the server-side flow
// executor driver (lib/authentik-flow.ts), so the user never leaves the page
// they deep-linked to — after sign-in the same URL re-renders authenticated.
// The hosted /login stays reachable for anything headless can't do (MFA…).
export function LoginOverlay() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onValid = (values: LoginValues) => {
    setError(null);
    startTransition(async () => {
      const res = await signIn("credentials", { ...values, redirect: false });
      if (res?.error) {
        setError(
          res.code === "unsupported_stage"
            ? "Tài khoản này cần bước xác thực bổ sung — dùng “Cách đăng nhập khác” bên dưới."
            : "Tên đăng nhập hoặc mật khẩu không đúng."
        );
        return;
      }
      // Reveal the now-authenticated page in place.
      router.refresh();
    });
  };

  return (
    // Controlled-open with no onOpenChange → not dismissible.
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Đăng nhập</DialogTitle>
          <DialogDescription>
            Nhập tài khoản Authentik để tiếp tục — bạn sẽ ở lại trang này.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onValid)} className="grid gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên đăng nhập</FormLabel>
                  <FormControl>
                    <Input autoComplete="username" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
            <a
              href="/login"
              className="text-center text-xs text-muted-foreground underline underline-offset-3 hover:text-foreground"
            >
              Cách đăng nhập khác
            </a>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
