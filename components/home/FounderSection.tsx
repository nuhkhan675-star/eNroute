export function FounderSection() {
  return (
    <section className="w-full border-t border-border px-6 py-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
        <span className="text-xs font-medium tracking-widest text-primary uppercase">About the Founder</span>
        <div className="flex size-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xl font-semibold text-primary">
          NK
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Nuh Khan</h2>
        <p className="max-w-xl leading-relaxed text-muted-foreground">
          I&rsquo;m Nuh Khan, a student and founder who believes that the choices we make today shape
          the opportunities we have tomorrow. I built this platform to help students move forward
          with clarity, not uncertainty.
        </p>

        {/* Rendered here rather than on the landing page alone, because this
            section already appears on both the signed-out and signed-in
            homepages -- so the note stays at the bottom after login too. */}
        <p className="mt-10 max-w-xl border-t border-border/60 pt-8 text-sm leading-relaxed text-muted-foreground">
          This has been built with a great deal of care and effort, and it is still growing. If you
          have thoughts on what works, what doesn&rsquo;t, or what&rsquo;s missing, I&rsquo;d genuinely
          appreciate hearing them &mdash; you can reach me at{" "}
          <a
            href="mailto:enrouteuniadvisor@gmail.com"
            className="text-primary underline-offset-4 hover:underline"
          >
            enrouteuniadvisor@gmail.com
          </a>
          .
        </p>
      </div>
    </section>
  );
}
