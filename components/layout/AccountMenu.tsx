"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { signOut } from "@/lib/actions/auth";
import { ChevronDown, LogOut, Settings } from "lucide-react";

/** "Mohd Nuh Khan" -> "MN". Falls back to the email's first letter. */
function initialsFor(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (email[0] || "?").toUpperCase();
}

export function AccountMenu({ name, email }: { name: string; email: string }) {
  const label = name || email;

  return (
    <Popover>
      <PopoverTrigger
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm transition-colors hover:bg-muted/60"
        aria-label="Account menu"
      >
        <Avatar size="sm">
          <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-semibold">
            {initialsFor(name, email)}
          </AvatarFallback>
        </Avatar>
        {/* The name is the recognisable part, but a long one would push the
            nav around, so it truncates and drops out entirely on narrow
            screens -- the avatar alone still identifies the account. */}
        <span className="hidden max-w-[9rem] truncate sm:inline">{label}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>

      {/* PopoverContent defaults to w-72 with padding and a flex gap; this menu
          wants edge-to-edge rows under a divider, so all three are overridden. */}
      <PopoverContent align="end" className="w-64 gap-0 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="truncate text-sm font-semibold">{name || "Your account"}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>

        <div className="p-1">
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <Settings className="size-4 text-muted-foreground" />
            Account settings
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}
