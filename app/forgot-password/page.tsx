"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter the email you signed up with and we&apos;ll send you a link to set a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={(formData) => startTransition(async () => setResult(await requestPasswordReset(formData)))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <TurnstileWidget />
            {result?.error && <p className="text-destructive text-sm">{result.error}</p>}
            {result?.message && <p className="text-muted-foreground text-sm">{result.message}</p>}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending…" : "Email me a reset link"}
            </Button>
          </form>

          <p className="text-muted-foreground mt-4 text-center text-sm">
            Remembered it?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
