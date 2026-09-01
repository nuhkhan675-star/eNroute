import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

export interface RankingInfo {
  value: number;
  type: "national" | "global" | "subject";
  org: string;
  year: number;
}

const TYPE_LABEL: Record<RankingInfo["type"], string> = {
  national: "in country",
  global: "worldwide",
  subject: "in subject",
};

// Never renders a bare number -- every ranking must name its source and
// year so it can't be mistaken for a single unexplained figure. Renders
// nothing (not a placeholder) when there's no verified ranking.
export function RankingBadge({ ranking, className }: { ranking: RankingInfo | null; className?: string }) {
  if (!ranking) return null;
  return (
    <Badge className={`gap-1.5 border border-primary/30 bg-primary/10 text-primary ${className ?? ""}`}>
      <Trophy className="size-3.5" /> #{ranking.value} {TYPE_LABEL[ranking.type]} — {ranking.org}, {ranking.year}
    </Badge>
  );
}
