import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { DisplayNameForm } from "@/components/account/DisplayNameForm";
import { KeyRound, User } from "lucide-react";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(user.user_metadata?.full_name ?? "");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Account settings</h1>
      <p className="mt-1 text-muted-foreground">Manage your account details and password.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4 text-emerald-400" /> Your details
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 text-sm">
          <DisplayNameForm initialName={name} />
          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
            <span className="text-muted-foreground">Email</span>
            <span className="truncate font-medium">{user.email}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-sky-400" /> Change password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
