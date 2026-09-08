"use client";

import { useState, useTransition } from "react";
import { updateDisplayName, type AuthResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(async () => setResult(await updateDisplayName(formData)))}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="name">Name</Label>
      <div className="flex gap-2">
        <Input
          id="name"
          name="name"
          defaultValue={initialName}
          placeholder="Your name"
          required
          maxLength={80}
          autoComplete="name"
        />
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">This is what appears in the top-right menu.</p>
      {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
      {result?.message && <p className="text-sm text-emerald-400">{result.message}</p>}
    </form>
  );
}
