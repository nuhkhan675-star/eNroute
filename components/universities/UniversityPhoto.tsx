"use client";

import { useState } from "react";
import Image from "next/image";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  photoUrl: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
  sizes?: string;
}

// Real campus photos should fill the frame edge-to-edge like any other photo
// grid (object-cover, no padding). The light neutral backdrop only matters
// for the icon fallback when no photo exists.
//
// Photos are hotlinked from each university's own site, so some will fail at
// render time even though the URL was valid when we stored it -- hotlink
// protection that rejects our referer, a site reorganisation, an expired CDN
// token. Falling back to the icon keeps that looking deliberate instead of
// showing the browser's broken-image glyph.
export function UniversityPhoto({ photoUrl, alt, className, iconClassName, sizes = "200px" }: Props) {
  const [failed, setFailed] = useState(false);
  const showPhoto = photoUrl && !failed;

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-neutral-100", className)}>
      {showPhoto ? (
        <Image
          src={photoUrl}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <GraduationCap className={cn("size-8 text-neutral-400", iconClassName)} />
      )}
    </div>
  );
}
