"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface CategoryOption {
  id: string;
  name: string;
  parent_group: string;
}

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "ranking", label: "Ranking" },
  { value: "tuition", label: "Tuition (low to high)" },
  { value: "likelihood", label: "Admission likelihood" },
];

interface Props {
  countryId: string;
  categories: CategoryOption[];
  defaultCategory: string;
  defaultSort: string;
}

export function FilterSortForm({ countryId, categories, defaultCategory, defaultSort }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<string>(defaultCategory || "all");
  const [sort, setSort] = useState(defaultSort || "name");

  const groups = new Map<string, CategoryOption[]>();
  for (const c of categories) {
    if (!groups.has(c.parent_group)) groups.set(c.parent_group, []);
    groups.get(c.parent_group)!.push(c);
  }

  const apply = () => {
    const params = new URLSearchParams({ country: countryId });
    if (category && category !== "all") params.set("category", category);
    if (sort && sort !== "name") params.set("sort", sort);
    router.push(`/universities?${params.toString()}`);
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Select
        items={{ all: "All programs", ...Object.fromEntries(categories.map((c) => [c.id, c.name])) }}
        value={category}
        onValueChange={(v) => setCategory(v ?? "all")}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All programs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All programs</SelectItem>
          {[...groups.entries()].map(([group, items]) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {items.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={Object.fromEntries(SORT_OPTIONS.map((o) => [o.value, o.label]))}
        value={sort}
        onValueChange={(v) => setSort(v ?? "name")}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              Sort: {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="button" variant="outline" size="sm" onClick={apply}>
        Apply
      </Button>
    </div>
  );
}
