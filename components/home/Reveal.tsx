"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades and lifts its children in the first time they scroll into view.
 *
 * IntersectionObserver rather than a scroll listener, so nothing runs on the
 * main thread between reveals. It unobserves after firing: re-animating on the
 * way back up is distracting when you're scrolling to re-read something.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** Stagger, in ms, for items revealed as a group. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No reduced-motion branch here: the class list already carries
    // motion-reduce:transition-none, so those users get the same reveal with
    // the movement removed rather than a separate code path.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.unobserve(entry.target);
      },
      // Fire slightly before the element reaches the viewport edge, so the
      // motion reads as "arriving" rather than "catching up".
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        // opacity and transform only: transition-all includes layout
        // properties, which the compositor can't handle, so every reveal
        // competed with whatever else was on the main thread.
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
