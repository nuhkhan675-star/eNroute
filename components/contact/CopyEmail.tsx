"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

/**
 * A mailto link silently does nothing when the browser has no default mail
 * handler, which is the common case on desktop. Showing the address and making
 * it copyable means the page works regardless.
 */
export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused (insecure context, permissions). The
      // address is on screen either way, so there's nothing to recover from.
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
      <span className="font-mono text-sm break-all select-all">{email}</span>
      <Button variant="outline" size="sm" onClick={copy} className="ml-auto gap-2">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
