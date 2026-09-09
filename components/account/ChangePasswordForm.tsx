"use client";

import { useRef, useState, useTransition } from "react";
import { changePassword, type AuthResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          const res = await changePassword(formData);
          setResult(res);
          // Leaving the old password sitting in the field after a successful
          // change is both untidy and a small hazard on a shared machine.
          if (!res.error) formRef.current?.reset();
        })
      }
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          required
          autoComplete="current-password"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
      {result?.message && <p className="text-sm text-emerald-400">{result.message}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
