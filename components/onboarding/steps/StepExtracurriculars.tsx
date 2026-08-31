"use client";

import { useState } from "react";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { extracurricularCategories } from "@/lib/validation/onboarding";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  sports: "Sports",
  leadership: "Leadership",
  volunteering: "Volunteering",
  entrepreneurship: "Entrepreneurship",
  research: "Research",
  internship: "Internship",
  academic_competition: "Academic competition",
  arts: "Arts",
  music: "Music",
  technology: "Technology",
  community_service: "Community service",
  student_organization: "Student organization",
  work_experience: "Work experience",
  other: "Other",
};

const emptyForm: {
  activityName: string;
  category: string | null;
  role: string;
  yearsInvolved: string;
  description: string;
  achievements: string;
  impact: string;
} = {
  activityName: "",
  category: null,
  role: "",
  yearsInvolved: "",
  description: "",
  achievements: "",
  impact: "",
};

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function StepExtracurriculars({ onNext, onBack }: Props) {
  const extracurriculars = useOnboardingStore((s) => s.draft.extracurriculars);
  const addExtracurricular = useOnboardingStore((s) => s.addExtracurricular);
  const removeExtracurricular = useOnboardingStore((s) => s.removeExtracurricular);

  const [form, setForm] = useState(emptyForm);

  const canAdd = form.activityName.trim() && form.category;

  const handleAdd = () => {
    addExtracurricular({
      id: crypto.randomUUID(),
      activityName: form.activityName.trim(),
      category: form.category as (typeof extracurricularCategories)[number],
      role: form.role || undefined,
      yearsInvolved: form.yearsInvolved ? Number(form.yearsInvolved) : undefined,
      description: form.description || undefined,
      achievements: form.achievements || undefined,
      impact: form.impact || undefined,
    });
    setForm(emptyForm);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracurricular activities</CardTitle>
        <CardDescription>
          Add each activity that matters — we evaluate leadership, commitment, impact, and
          relevance to your intended program, not just how many you list.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {extracurriculars.length > 0 && (
          <div className="flex flex-col gap-2">
            {extracurriculars.map((a) => (
              <div key={a.id} className="flex items-start justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">
                    {a.activityName}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {CATEGORY_LABELS[a.category]}
                      {a.role ? ` · ${a.role}` : ""}
                      {a.yearsInvolved ? ` · ${a.yearsInvolved} yr` : ""}
                    </span>
                  </p>
                  {a.impact && <p className="mt-1 text-sm text-muted-foreground">{a.impact}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeExtracurricular(a.id)}
                  aria-label={`Remove ${a.activityName}`}
                  className="rounded-full p-1 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Separator className="my-2" />
          </div>
        )}

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Activity name</Label>
              <Input
                value={form.activityName}
                onChange={(e) => setForm((f) => ({ ...f, activityName: e.target.value }))}
                placeholder="e.g. National Finance Olympiad"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Select
                items={CATEGORY_LABELS}
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {extracurricularCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <Input
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Team Captain"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Years involved</Label>
              <Input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={form.yearsInvolved}
                onChange={(e) => setForm((f) => ({ ...f, yearsInvolved: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What did you actually do?"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Achievements / awards</Label>
            <Textarea
              value={form.achievements}
              onChange={(e) => setForm((f) => ({ ...f, achievements: e.target.value }))}
              placeholder="Any recognitions, rankings, selectivity"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Impact</Label>
            <Textarea
              value={form.impact}
              onChange={(e) => setForm((f) => ({ ...f, impact: e.target.value }))}
              placeholder="What changed because of this activity?"
            />
          </div>

          <Button type="button" variant="secondary" onClick={handleAdd} disabled={!canAdd}>
            + Add another activity
          </Button>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext}>Continue</Button>
        </div>
      </CardContent>
    </Card>
  );
}
