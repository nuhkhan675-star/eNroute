"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signUpWithPassword, type AuthResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle>Create your advisor account</CardTitle>
          <CardDescription>
            We use this to save your profile and analyses securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={(formData) => startTransition(async () => setResult(await signUpWithPassword(formData)))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" type="text" required autoComplete="name" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <TurnstileWidget />
            {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
            {result?.message && <p className="text-sm text-muted-foreground">{result.message}</p>}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
