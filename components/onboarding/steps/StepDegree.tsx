"use client";

import { useMemo, useState } from "react";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import type { ProgramCategory } from "@/lib/db/reference";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  programCategories: ProgramCategory[];
  onNext: () => void;
  onBack: () => void;
}

export function StepDegree({ programCategories, onNext, onBack }: Props) {
  const intendedProgramCategoryId = useOnboardingStore((s) => s.draft.intendedProgramCategoryId);
  const setIntendedProgramCategory = useOnboardingStore((s) => s.setIntendedProgramCategory);
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const groups = new Map<string, ProgramCategory[]>();
    for (const c of programCategories) {
      if (!groups.has(c.parent_group)) groups.set(c.parent_group, []);
      groups.get(c.parent_group)!.push(c);
    }
    return groups;
  }, [programCategories]);

  const selected = programCategories.find((c) => c.id === intendedProgramCategoryId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>What are you planning to study?</CardTitle>
        <CardDescription>
          Search our standardized program list — this is what we match universities against.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between font-normal"
              >
                {selected ? selected.name : "Search for a program (e.g. Finance)"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            }
          />
          <PopoverContent className="w-[--anchor-width] p-0">
            <Command>
              <CommandInput placeholder="Search programs…" />
              <CommandList>
                <CommandEmpty>No program found.</CommandEmpty>
                {Array.from(grouped.entries()).map(([group, items]) => (
                  <CommandGroup key={group} heading={group}>
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.name}
                        onSelect={() => {
                          setIntendedProgramCategory(item.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            intendedProgramCategoryId === item.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {item.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={!intendedProgramCategoryId}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
