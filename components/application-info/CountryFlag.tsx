/**
 * Small drawn flags for the six covered countries.
 *
 * Inline SVG rather than emoji: Windows has no flag glyphs at all and renders
 * them as two regional-indicator letters, which is what this replaced. Each
 * flag is simplified to what still reads at 28px -- Australia's stars and
 * the bauhinia's fine detail would be noise at that size. All are 3:2.
 */
export function CountryFlag({ slug, className }: { slug: string; className?: string }) {
  const Flag = FLAGS[slug];
  if (!Flag) return null;
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden="true" focusable="false">
      <Flag />
    </svg>
  );
}

/* Union Jack in a 30x20 frame; reused at half size inside Australia's canton. */
function UnionJack({ scale = 1 }: { scale?: number }) {
  return (
    <g transform={`scale(${scale})`}>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="6" />
      <path d="M15 0V20M0 10H30" stroke="#C8102E" strokeWidth="3.4" />
    </g>
  );
}

const FLAGS: Record<string, () => React.ReactElement> = {
  "united-states": () => (
    <>
      <rect width="30" height="20" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#B22234" />
      ))}
      <rect width="12" height={(20 * 7) / 13} fill="#3C3B6E" />
      {[2, 5, 8, 10].map((x) =>
        [2, 5, 8].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.55" fill="#fff" />),
      )}
    </>
  ),

  "united-kingdom": () => <UnionJack />,

  india: () => (
    <>
      <rect width="30" height="6.67" fill="#FF9933" />
      <rect y="6.67" width="30" height="6.67" fill="#fff" />
      <rect y="13.33" width="30" height="6.67" fill="#138808" />
      <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth="0.8" />
      <circle cx="15" cy="10" r="0.5" fill="#000080" />
    </>
  ),

  australia: () => (
    <>
      <rect width="30" height="20" fill="#012169" />
      <UnionJack scale={0.5} />
      {/* Commonwealth star under the canton, Southern Cross on the fly. */}
      <circle cx="7.5" cy="15" r="1.4" fill="#fff" />
      <circle cx="22" cy="4" r="0.9" fill="#fff" />
      <circle cx="26" cy="8" r="0.9" fill="#fff" />
      <circle cx="19" cy="9.5" r="0.7" fill="#fff" />
      <circle cx="22.5" cy="16" r="0.9" fill="#fff" />
      <circle cx="24.5" cy="11" r="0.6" fill="#fff" />
    </>
  ),

  singapore: () => (
    <>
      <rect width="30" height="10" fill="#EF3340" />
      <rect y="10" width="30" height="10" fill="#fff" />
      <circle cx="7" cy="5" r="3.2" fill="#fff" />
      <circle cx="8.2" cy="5" r="2.7" fill="#EF3340" />
      {[
        [10.5, 3],
        [12.3, 4.3],
        [11.6, 6.4],
        [9.4, 6.4],
        [8.7, 4.3],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.55" fill="#fff" />
      ))}
    </>
  ),

  "hong-kong": () => (
    <>
      <rect width="30" height="20" fill="#DE2910" />
      {/* Five petals as a rotated teardrop. */}
      {[0, 72, 144, 216, 288].map((a) => (
        <path
          key={a}
          d="M15 10 C 13.2 8 13.6 5.2 15 4.6 C 16.4 5.2 16.8 8 15 10 Z"
          fill="#fff"
          transform={`rotate(${a} 15 10)`}
        />
      ))}
      <circle cx="15" cy="10" r="0.9" fill="#DE2910" />
    </>
  ),
};
