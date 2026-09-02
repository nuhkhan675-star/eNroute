"use client";

import { useState } from "react";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { getGradeOptionsForScale } from "@/lib/utils/grades";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

const GRADE_10_BOARDS = ["IGCSE", "GCSE", "CBSE", "ICSE", "State Board", "American High School", "Other"];

// No dedicated Grade 10 subject catalog exists in the DB (that's scoped to
// post-10th curricula), so this is a fixed list covering what's actually
// commonly taken across IGCSE/GCSE/CBSE/ICSE/state boards.
const GRADE_10_SUBJECTS = [
  "English Language",
  "English Literature",
  "Mathematics",
  "Additional Mathematics",
  "Core Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Combined Science",
  "Computer Science",
  "Information & Communication Technology",
  "Global Perspectives",
  "History",
  "Geography",
  "Economics",
  "Business Studies",
  "Accounting",
  "French",
  "Spanish",
  "Hindi",
  "Art & Design",
  "Physical Education",
  "Religious Studies",
  "Other",
];

// Which grade scale a board's results are typically reported in -- reuses
// the same scale->options mapping the main Subjects step already uses.
const BOARD_GRADE_SCALE: Record<string, string> = {
  IGCSE: "A*-G",
  GCSE: "A*-G",
  CBSE: "0-100",
  ICSE: "0-100",
  "State Board": "0-100",
  "American High School": "A-F",
  Other: "0-100",
};

// A handful of subjects cap out below the board's usual top grade -- e.g.
// Cambridge IGCSE "Core" tier papers (Core Mathematics, Core Science) are
// only ever graded C-G, never A*/A/B, regardless of board. Override per
// subject rather than per board so the grade dropdown can't offer a grade
// that subject can't actually achieve.
const SUBJECT_GRADE_OVERRIDE: Record<string, string[]> = {
  "Core Mathematics": ["C", "D", "E", "F", "G", "U"],
};

interface Row {
  rowId: string;
  subjectName: string;
  grade: string | null;
}

function makeEmptyRow(): Row {
  return { rowId: crypto.randomUUID(), subjectName: "", grade: null };
}

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function StepGrade10({ onNext, onBack }: Props) {
  // ?? guards against older persisted drafts saved before these fields
  // existed, where the key is simply absent -- Base UI's Select warns if
  // `value` is `undefined` on first render and a real value afterward.
  const grade10Board = useOnboardingStore((s) => s.draft.grade10Board ?? null);
  const setGrade10Board = useOnboardingStore((s) => s.setGrade10Board);
  // Read once via getState() for the lazy initializer below, rather than a
  // subscribed selector -- a `?? []` fallback in a selector creates a new
  // array reference every render, which breaks Zustand's snapshot caching
  // ("getSnapshot should be cached" / infinite-loop warning).
  const setGrade10Subjects = useOnboardingStore((s) => s.setGrade10Subjects);

  const [rows, setRows] = useState<Row[]>(() => {
    const storedSubjects = useOnboardingStore.getState().draft.grade10Subjects ?? [];
    return storedSubjects.length > 0
      ? storedSubjects.map((s) => ({ rowId: crypto.randomUUID(), subjectName: s.subjectName, grade: s.grade }))
      : [makeEmptyRow()];
  });

  const boardGradeOptions = getGradeOptionsForScale(grade10Board ? BOARD_GRADE_SCALE[grade10Board] : "0-100");
  const gradeOptionsFor = (subjectName: string) => SUBJECT_GRADE_OVERRIDE[subjectName] ?? boardGradeOptions;

  const updateRow = (rowId: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  const removeRow = (rowId: string) => setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  const addRow = () => setRows((prev) => [...prev, makeEmptyRow()]);

  const handleNext = () => {
    const entries = rows
      .filter((r) => r.subjectName.trim() && r.grade)
      .map((r) => ({ id: crypto.randomUUID(), subjectName: r.subjectName.trim(), grade: r.grade! }));
    setGrade10Subjects(entries);
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Grade 10 result</CardTitle>
        <CardDescription>
          Your Grade 10 / secondary school board and subject grades. Optional -- skip if it doesn&apos;t
          apply to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label>Board / curriculum</Label>
          <Select
            items={Object.fromEntries(GRADE_10_BOARDS.map((b) => [b, b]))}
            value={grade10Board}
            onValueChange={setGrade10Board}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your Grade 10 board" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_10_BOARDS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3">
          <Label>Subjects and grades</Label>
          {rows.map((row) => {
            const rowGradeOptions = gradeOptionsFor(row.subjectName);
            return (
              <div key={row.rowId} className="grid items-center gap-3 sm:grid-cols-[1fr_auto_auto]">
                <Select
                  items={Object.fromEntries(GRADE_10_SUBJECTS.map((s) => [s, s]))}
                  value={row.subjectName || null}
                  onValueChange={(v) =>
                    updateRow(row.rowId, {
                      subjectName: v ?? "",
                      // A subject switch can invalidate the previously-picked
                      // grade (e.g. Core Mathematics can't be graded "A").
                      grade: v && SUBJECT_GRADE_OVERRIDE[v]?.includes(row.grade ?? "") ? row.grade : null,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {GRADE_10_SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  items={Object.fromEntries(rowGradeOptions.map((g) => [g, g]))}
                  value={row.grade}
                  onValueChange={(v) => updateRow(row.rowId, { grade: v })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {rowGradeOptions.map((g) => (
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
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleNext}>Continue</Button>
        </div>
      </CardContent>
    </Card>
  );
}
