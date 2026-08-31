"use client";

import { useState } from "react";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import type { Country } from "@/lib/db/reference";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  countries: Country[];
  onNext: () => void;
  onBack: () => void;
}

export function StepCountries({ countries, onNext, onBack }: Props) {
  const preferredCountryIds = useOnboardingStore((s) => s.draft.preferredCountryIds);
  const setPreferredCountries = useOnboardingStore((s) => s.setPreferredCountries);
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    if (preferredCountryIds.includes(id)) {
      setPreferredCountries(preferredCountryIds.filter((c) => c !== id));
    } else {
      setPreferredCountries([...preferredCountryIds, id]);
    }
  };

  const selectedCountries = countries.filter((c) => preferredCountryIds.includes(c.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where do you want to study?</CardTitle>
        <CardDescription>Select as many countries as you&apos;re considering.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                {selectedCountries.length > 0
                  ? `${selectedCountries.length} countries selected`
                  : "Select countries"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            }
          />
          <PopoverContent className="w-[--anchor-width] p-0">
            <Command>
              <CommandInput placeholder="Search countries…" />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {countries.map((c) => (
                    <CommandItem key={c.id} value={c.name} onSelect={() => toggle(c.id)}>
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          preferredCountryIds.includes(c.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="flex flex-wrap gap-2">
          {selectedCountries.map((c) => (
            <Badge key={c.id} variant="outline" className="gap-1 py-1.5">
              {c.name}
              <button
                type="button"
                onClick={() => toggle(c.id)}
                aria-label={`Remove ${c.name}`}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={selectedCountries.length === 0}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
