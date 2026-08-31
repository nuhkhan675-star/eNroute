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

// Many universities' Wikipedia lead image is a seal/coat-of-arms rendered as
// dark line art on a transparent background -- invisible against our dark
// theme's cards. A light backdrop plus object-contain (rather than cover)
// keeps both crests and real campus photos legible without cropping.
export function UniversityPhoto({ photoUrl, alt, className, iconClassName, sizes = "200px" }: Props) {
  return (
    <div className={cn("relative flex items-center justify-center bg-neutral-100", className)}>
      {photoUrl ? (
        <Image src={photoUrl} alt={alt} fill sizes={sizes} className="object-contain p-2" unoptimized />
      ) : (
        <GraduationCap className={cn("size-8 text-neutral-400", iconClassName)} />
      )}
    </div>
  );
}
