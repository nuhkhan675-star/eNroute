import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

// Only real destinations belong here -- a footer full of dead links reads
// worse than a short one. Social goes in when the accounts exist.
const PRODUCT = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Explore universities", href: "/universities" },
  { label: "Saved schools", href: "/saved" },
  { label: "Application info", href: "/application-info" },
];

const COMPANY = [
  { label: "Why we built eNroute", href: "/" },
  { label: "Compare universities", href: "/universities/compare" },
  { label: "Contact", href: "mailto:enrouteuniadvisor@gmail.com" },
];

const COVERAGE = ["United States", "United Kingdom", "India", "Australia", "Singapore", "Hong Kong"];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Logo className="h-9" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Most admissions tools only cover the US, and only understand a single GPA scale. eNroute
            reads real admissions data across six countries and gives 11th and 12th graders an honest
            read on their chances &mdash; reasoned from published figures, not guessed &mdash; wherever
            they&apos;re applying.
          </p>
          <p className="mt-6 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} eNroute. All rights reserved.
          </p>
        </div>

        <FooterColumn title="Product" links={PRODUCT} />
        <FooterColumn title="Company" links={COMPANY} />

        <div>
          <h3 className="text-sm font-semibold">Coverage</h3>
          <ul className="mt-4 flex flex-col gap-2.5">
            {COVERAGE.map((c) => (
              <li key={c} className="text-sm text-muted-foreground">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
