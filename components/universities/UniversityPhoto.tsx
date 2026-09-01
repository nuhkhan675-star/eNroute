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
export function UniversityPhoto({ photoUrl, alt, className, iconClassName, sizes = "200px" }: Props) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-neutral-100", className)}>
      {photoUrl ? (
        <Image src={photoUrl} alt={alt} fill sizes={sizes} className="object-cover" unoptimized />
      ) : (
        <GraduationCap className={cn("size-8 text-neutral-400", iconClassName)} />
      )}
    </div>
  );
}
