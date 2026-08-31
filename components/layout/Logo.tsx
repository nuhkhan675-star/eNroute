import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight", className)}>
      e<span className="text-primary">N</span>route
    </span>
  );
}
