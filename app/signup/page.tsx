"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  signUpWithPassword,
  verifySignupCode,
  resendSignupCode,
  type AuthResult,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [isPending, startTransition] = useTransition();
  // The account exists but is unconfirmed until the emailed code is entered,
  // so we hold the address and swap the form rather than navigating away.
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  if (codeSentTo !== null) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
        <Card>
          <CardHeader>
            <CardTitle>Confirm your email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to {codeSentTo}. Enter it to finish creating your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={(formData) => startTransition(async () => setResult(await verifySignupCode(formData)))}
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
              {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
              {result?.message && <p className="text-sm text-muted-foreground">{result.message}</p>}
              <Button type="submit" disabled={isPending}>
                {isPending ? "Confirming…" : "Confirm email"}
              </Button>
            </form>
            <form
              action={(formData) => startTransition(async () => setResult(await resendSignupCode(formData)))}
              className="mt-3 text-center"
            >
              <input type="hidden" name="email" value={codeSentTo} />
              <button
                type="submit"
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
              >
                Didn&apos;t get it? Send another code
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Wrong address?{" "}
              <button
                type="button"
                onClick={() => {
                  setCodeSentTo(null);
                  setResult(null);
                }}
                className="underline underline-offset-4"
              >
                Start over
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            action={(formData) =>
              startTransition(async () => {
                const res = await signUpWithPassword(formData);
                setResult(res);
                if (!res.error) setCodeSentTo(String(formData.get("email") || "").trim());
              })
            }
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
