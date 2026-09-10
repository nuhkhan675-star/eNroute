import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

// Inline rather than from lucide: this version dropped brand glyphs, and
// Instagram's mark isn't something to approximate with a generic camera icon.
function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Only real destinations belong here -- a footer full of dead links reads
// worse than a short one.
const PRODUCT = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Explore universities", href: "/universities" },
  { label: "Saved schools", href: "/saved" },
  { label: "Application info", href: "/application-info" },
];

const COMPANY = [
  { label: "Why we built eNroute", href: "/about" },
  { label: "Data sources & methodology", href: "/data-sources" },
  { label: "Terms & privacy", href: "/terms" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contact", href: "/contact" },
];

const COVERAGE = ["United States", "United Kingdom", "India", "Australia", "Singapore", "Hong Kong"];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Logo className="h-9" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            eNroute reads your results on their own terms &mdash; IB points, A Level grades, a CBSE
            percentage &mdash; and works out where that actually places you at universities across six
            countries. Every estimate is traced back to the admissions data behind it, and shown with
            the reasoning that produced it.
          </p>
          <a
            href="https://www.instagram.com/_.enroute/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <InstagramMark />
            @_.enroute
          </a>

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
