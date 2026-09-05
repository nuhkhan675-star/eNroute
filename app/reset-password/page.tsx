"use client";

import { useState, useTransition } from "react";
import { updatePassword, type AuthResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Landed on from the emailed reset link, which the auth callback exchanges for
 * a recovery session before redirecting here. Proving control of the inbox is
 * what authorises the change, so no current password is asked for.
 */
export default function ResetPasswordPage() {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>Pick something you don&apos;t use anywhere else.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={(formData) => startTransition(async () => setResult(await updatePassword(formData)))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {result?.error && <p className="text-destructive text-sm">{result.error}</p>}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save new password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
