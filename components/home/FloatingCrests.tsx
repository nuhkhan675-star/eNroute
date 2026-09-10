/**
 * Decorative university crests drifting behind the profile hero.
 *
 * Monograms rather than the institutions' real logos, deliberately. Those are
 * trademarks, and floating them on a signed-in dashboard of a commercial
 * product reads as endorsement or partnership when there is none. Monograms
 * carry the same "this is about universities" signal with none of that, and
 * they cost no network requests -- the hero already had a starfield and a
 * gradient to paint, and this page is one a user hits on every visit.
 *
 * The set spans all six covered countries so the row doubles as a quiet
 * statement of coverage.
 */
const CRESTS: { mark: string; name: string; className: string; size: string; delay: string }[] = [
  { mark: "OX",   name: "Oxford",      className: "left-[5%] top-[14%]",  size: "size-16", delay: "0s" },
  { mark: "NUS",  name: "Singapore",   className: "left-[7%] top-[44%]", size: "size-14", delay: "-2.4s" },
  { mark: "IITB", name: "IIT Bombay",  className: "left-[5.5%] top-[72%]",  size: "size-[3.25rem]", delay: "-4.1s" },
  { mark: "MIT",  name: "MIT",         className: "right-[5%] top-[18%]", size: "size-14", delay: "-1.2s" },
  { mark: "HKU",  name: "Hong Kong",   className: "right-[7%] top-[48%]", size: "size-16", delay: "-3.3s" },
  { mark: "ANU",  name: "Australia",   className: "right-[5.5%] top-[74%]", size: "size-[3.25rem]", delay: "-5.0s" },
];

export function FloatingCrests() {
  return (
    // Hidden below xl. The reading column is max-w-4xl (896px), so at the lg
    // breakpoint only 64px of margin remains each side and the crests slid
    // straight under the strengths/weaknesses cards -- verified in the
    // browser before this was raised. At xl there is 192px to sit in.
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden xl:block">
      {CRESTS.map((c) => (
        <div
          key={c.mark}
          className={`absolute flex flex-col items-center gap-2 motion-safe:animate-[drift_9s_ease-in-out_infinite] ${c.className}`}
          style={{ animationDelay: c.delay }}
        >
          <span
            className={`flex ${c.size} items-center justify-center rounded-full border border-primary/20 bg-primary/[0.06] text-sm font-semibold tracking-wide text-primary/45 shadow-[0_0_28px_-14px_var(--primary)] backdrop-blur-[2px]`}
          >
            {c.mark}
          </span>
          <span className="text-[10px] tracking-wide text-foreground/15">{c.name}</span>
        </div>
      ))}
    </div>
  );
}
