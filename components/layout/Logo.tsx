import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The "N" in eNroute is artwork (mortarboard, tassel and gold "e" charm), not
 * a letter, so it can't just be dropped in as an inline image at a fixed size.
 * Everything below is in `em` so one component serves both the 20px header
 * wordmark and the 96px hero heading from a single asset.
 *
 * The numbers are measured, not eyeballed:
 *   asset frame ............ 526 x 578
 *   letterform inside it ... 427 x 451 at (98,127)
 *   heading cap-height ..... 0.66em (Times New Roman, measured via TextMetrics)
 *
 * So to make the LETTERFORM (not the frame) match cap-height:
 *   frame height = 0.66 * 578/451 = 0.846em
 *   left overhang = 0.846 * 98/578 = 0.143em  -> pulled back with a negative margin
 *
 * Baseline alignment needs no correction: the letterform's bottom edge is the
 * frame's bottom edge (measured slack: 0px), and an inline-block's bottom sits
 * on the text baseline. The small right margin compensates for the artwork's
 * N being slightly narrower than the font's, so "route" isn't crowded.
 */
export function BrandN({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/n-logo.png"
      alt="N"
      width={526}
      height={578}
      priority
      className={cn(
        // align-baseline is load-bearing, not decoration: Tailwind's preflight
        // sets `img { vertical-align: middle }`, which aligns the image's
        // MIDPOINT to the baseline plus half an x-height and dropped the N
        // ~0.19em below the surrounding letters. With baseline alignment the
        // box's bottom edge sits on the text baseline instead -- and since the
        // letterform's bottom edge IS the frame's bottom edge (0px slack),
        // "e", the N, and "route" land on one baseline with no nudging.
        "inline-block w-auto shrink-0 select-none align-baseline",
        "h-[0.846em] -ml-[0.143em] mr-[0.04em]",
        className
      )}
    />
  );
}

/**
 * The official eNroute lockup (gold mortarboard over the "eN" monogram),
 * used as-is rather than rebuilt from text. Height is set by the caller and
 * width follows from the intrinsic 719x622 aspect ratio, so the proportions
 * are never distorted. align-baseline is not wanted here -- unlike BrandN
 * this is a standalone mark, not a glyph sitting in a line of text.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/enroute-mark.png"
      alt="eNroute"
      width={719}
      height={622}
      priority
      className={cn("w-auto select-none", className)}
    />
  );
}
