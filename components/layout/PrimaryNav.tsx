"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Gauge, GraduationCap, Star } from "lucide-react";

const ITEMS = [
  { href: "/universities", label: "Universities", icon: GraduationCap },
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/saved", label: "Saved Schools", icon: Star },
  { href: "/application-info", label: "Application Info", icon: ClipboardList },
];

/**
 * The signed-in primary navigation: four pills in one rounded track, the
 * current section lit. Client-side only for usePathname; everything else is
 * static. Below md the labels drop and the icons carry it, so the header
 * still fits a phone without collapsing into a hamburger.
 */
export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex items-center gap-1 rounded-full border border-border bg-card/60 p-1">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors md:px-3.5 " +
              (active
                ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary),transparent_60%)]"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")
            }
          >
            <item.icon className="size-4" strokeWidth={1.75} />
            <span className="hidden md:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
