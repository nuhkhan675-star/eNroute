"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  signInWithPassword,
  signInWithEmailCode,
  verifyEmailCode,
  type AuthResult,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [isPending, startTransition] = useTransition();
  // Once a code has been sent we swap the email field for the code field,
  // remembering the address so the verify step can be a single input.
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Log in to continue with your admissions advisor.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={(formData) => startTransition(async () => setResult(await signInWithPassword(formData)))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            <TurnstileWidget />
            {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
            {result?.message && <p className="text-sm text-muted-foreground">{result.message}</p>}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Google and the emailed code are both alternatives to the password
              form above, so they sit together under one divider rather than
              each getting their own "or". */}
          <GoogleButton label="Continue with Google" />

          <div className="mt-3">
            {codeSentTo === null ? (
            <form
              action={(formData) =>
                startTransition(async () => {
                  const res = await signInWithEmailCode(formData);
                  setResult(res);
                  if (!res.error) setCodeSentTo(String(formData.get("email") || "").trim());
                })
              }
              className="flex flex-col gap-2"
            >
              <Input name="email" type="email" placeholder="you@example.com" required />
              <Button type="submit" variant="outline" disabled={isPending}>
                {isPending ? "Sending…" : "Email me a sign-in code"}
              </Button>
            </form>
          ) : (
            <form
              action={(formData) => startTransition(async () => setResult(await verifyEmailCode(formData)))}
              className="flex flex-col gap-2"
            >
              <input type="hidden" name="email" value={codeSentTo} />
              <Input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="6-digit code"
                required
                autoFocus
                className="text-center text-lg tracking-[0.4em]"
              />
              <Button type="submit" disabled={isPending}>
                {isPending ? "Verifying…" : "Sign in"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setCodeSentTo(null);
                  setResult(null);
                }}
                className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
              >
                Use a different email
              </button>
            </form>
            )}
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
