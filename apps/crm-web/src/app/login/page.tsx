import { redirect } from "next/navigation";

import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { auth, signIn } from "@/auth";
import { authEnabled } from "@/auth.config";

// authEnabled comes from a runtime-only env var (AUTH_AUTHENTIK_ISSUER), but it
// gates an early redirect that runs before any dynamic API. Without this, Next
// prerenders /login at BUILD time (where auth env is absent → authEnabled=false)
// into a permanent "/login → /dashboard" redirect, which loops against the
// runtime middleware that sees auth as enabled. Force per-request rendering so
// authEnabled reflects the running container's env.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // No Authentik configured → there's nothing to log into; go straight in.
  if (!authEnabled) redirect("/dashboard");

  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Yan CRM</CardTitle>
          <CardDescription>
            Đăng nhập bằng tài khoản Authentik để tiếp tục.
          </CardDescription>
        </CardHeader>
        <form
          action={async () => {
            "use server";
            await signIn("authentik", { redirectTo: "/dashboard" });
          }}
          className="px-4 pb-1"
        >
          <Button type="submit" className="w-full">
            Đăng nhập với Authentik
          </Button>
        </form>
      </Card>
    </div>
  );
}
