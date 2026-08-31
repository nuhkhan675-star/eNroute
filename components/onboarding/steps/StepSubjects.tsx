"use client";

import { useEffect, useState } from "react";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import type { Subject, Curriculum } from "@/lib/db/reference";
import type { SubjectEntry } from "@/lib/validation/onboarding";
import { getGradeOptionsForScale } from "@/lib/utils/grades";
import { getExpectedSubjectCount } from "@/lib/utils/subjectCounts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface Row {
  rowId: string;
  subjectId: string | null;
  level: string | null;
  grade: string | null;
}

function makeEmptyRow(): Row {
  return { rowId: crypto.randomUUID(), subjectId: null, level: null, grade: null };
}

function buildInitialRows(stored: SubjectEntry[], expectedCount: number): Row[] {
  const fromStored: Row[] = stored.map((s) => ({
    rowId: crypto.randomUUID(),
    subjectId: s.subjectId,
    level: s.level,
    grade: s.grade,
  }));
  const padding = Array.from({ length: Math.max(0, expectedCount - fromStored.length) }, makeEmptyRow);
  return [...fromStored, ...padding];
}

interface Props {
  curricula: Curriculum[];
  onNext: () => void;
  onBack: () => void;
}

export function StepSubjects({ curricula, onNext, onBack }: Props) {
  const curriculumId = useOnboardingStore((s) => s.draft.curriculumId);
  const storedSubjects = useOnboardingStore((s) => s.draft.subjects);
  const setSubjects = useOnboardingStore((s) => s.setSubjects);

  const curriculum = curricula.find((c) => c.id === curriculumId);
  const expectedCount = getExpectedSubjectCount(curriculum?.code);

  const [available, setAvailable] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>(() => buildInitialRows(storedSubjects, expectedCount));

  useEffect(() => {
    if (!curriculumId) return;
    // Deliberate loading flag while re-fetching on curriculum change -- not
    // a cascading update, just the fetch's in-flight indicator.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/subjects?curriculumId=${curriculumId}`)
      .then((r) => r.json())
      .then((data) => setAvailable(data.subjects ?? []))
      .finally(() => setLoading(false));
  }, [curriculumId]);

  const updateRow = (rowId: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));

  const removeRow = (rowId: string) => setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  const addRow = () => setRows((prev) => [...prev, makeEmptyRow()]);

  const rowIsComplete = (row: Row) => {
    const subject = available.find((s) => s.id === row.subjectId);
    if (!subject || !row.grade) return false;
    if (subject.available_levels.length > 0 && !row.level) return false;
    return true;
  };

  const canContinue = rows.length > 0 && rows.every(rowIsComplete);

  const handleNext = () => {
    const entries: SubjectEntry[] = rows.map((row) => {
      const subject = available.find((s) => s.id === row.subjectId)!;
      return {
        subjectId: subject.id,
        subjectName: subject.name,
        level: row.level,
        grade: row.grade!,
      };
    });
    setSubjects(entries);
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subjects and grades</CardTitle>
        <CardDescription>
          {curriculum?.code === "IB"
            ? "IB Diploma: your 6 subjects, plus your Theory of Knowledge and Extended Essay grades -- fill in each one below."
            : curriculum
              ? `${curriculum.name} typically has ${expectedCount} subjects -- fill in each one below.`
              : "Add every subject you're taking, with its grade."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.map((row) => {
          const selectedSubject = available.find((s) => s.id === row.subjectId);
          const levelOptions = selectedSubject?.available_levels ?? [];
          const gradeOptions = selectedSubject ? getGradeOptionsForScale(selectedSubject.grade_scale) : [];

          return (
            <div key={row.rowId} className="grid items-center gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
              <Select
                items={Object.fromEntries(available.map((s) => [s.id, s.name]))}
                value={row.subjectId}
                onValueChange={(v) => updateRow(row.rowId, { subjectId: v, level: null, grade: null })}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loading ? "Loading subjects…" : "Subject"} />
                </SelectTrigger>
                <SelectContent>
                  {available.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {levelOptions.length > 0 ? (
                <Select
                  items={Object.fromEntries(levelOptions.map((lvl) => [lvl, lvl]))}
                  value={row.level}
                  onValueChange={(v) => updateRow(row.rowId, { level: v })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levelOptions.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="w-24" />
              )}

              <Select
                items={Object.fromEntries(gradeOptions.map((g) => [g, g]))}
                value={row.grade}
                onValueChange={(v) => updateRow(row.rowId, { grade: v })}
                disabled={!row.subjectId}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {gradeOptions.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                type="button"
                onClick={() => removeRow(row.rowId)}
                aria-label="Remove subject"
                className="justify-self-end rounded-full p-1.5 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        <Button type="button" variant="secondary" onClick={addRow}>
          + Add another subject
        </Button>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleNext} disabled={!canContinue}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
