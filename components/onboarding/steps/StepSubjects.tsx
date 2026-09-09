"use client";

import { useEffect, useState } from "react";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import type { Subject, Curriculum } from "@/lib/db/reference";
import type { SubjectEntry } from "@/lib/validation/onboarding";
import { getGradeOptionsForScale } from "@/lib/utils/grades";
import { getExpectedSubjectCount } from "@/lib/utils/subjectCounts";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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

/**
 * Nobody takes the same subject twice, and six rows of English A: Literature
 * would be scored as a real diploma. Two defences: the dropdown hides subjects
 * already chosen in another row, and Continue checks anyway -- a draft
 * restored from storage can contain duplicates the dropdown never saw.
 */
function subjectsTakenByOtherRows(rows: Row[], rowId: string): Set<string> {
  return new Set(rows.filter((r) => r.rowId !== rowId && r.subjectId).map((r) => r.subjectId!));
}

function hasDuplicateSubjects(rows: Row[]): boolean {
  const chosen = rows.map((r) => r.subjectId).filter(Boolean);
  return new Set(chosen).size !== chosen.length;
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

// The real, standard IB Diploma group order -- used only to organize the
// subject dropdown, NOT to constrain the selection. Real diplomas routinely
// take two Sciences or two Individuals & Societies subjects in place of an
// Arts subject, so nothing here requires one-per-group.
const IB_GROUPS = [
  "Studies in Language & Literature",
  "Language Acquisition",
  "Individuals & Societies",
  "Sciences",
  "Mathematics",
  "The Arts",
];

// Graded diploma core, entered separately from the 6 subjects.
const IB_CORE_KEYS = ["Extended Essay", "Theory of Knowledge"];
const IB_SUBJECT_COUNT = 6;

interface Props {
  curricula: Curriculum[];
  onNext: () => void;
  onBack: () => void;
}

export function StepSubjects({ curricula, onNext, onBack }: Props) {
  const curriculumId = useOnboardingStore((s) => s.draft.curriculumId);
  const storedSubjects = useOnboardingStore((s) => s.draft.subjects);
  const setSubjects = useOnboardingStore((s) => s.setSubjects);
  const casCompleted = useOnboardingStore((s) => s.draft.casCompleted ?? false);
  const setCasCompleted = useOnboardingStore((s) => s.setCasCompleted);

  const curriculum = curricula.find((c) => c.id === curriculumId);
  const isIB = curriculum?.code === "IB";
  const expectedCount = getExpectedSubjectCount(curriculum?.code);

  const [available, setAvailable] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>(() => buildInitialRows(storedSubjects, expectedCount));
  // IB path: a free-form list of subject rows (any mix of groups), plus the
  // separately-graded EE/TOK core.
  const [ibRows, setIbRows] = useState<Row[] | null>(null);
  const [coreSelection, setCoreSelection] = useState<Record<string, Row>>({});

  useEffect(() => {
    if (!curriculumId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/subjects?curriculumId=${curriculumId}`)
      .then((r) => r.json())
      .then((data) => setAvailable(data.subjects ?? []))
      .finally(() => setLoading(false));
  }, [curriculumId]);

  useEffect(() => {
    if (!isIB || available.length === 0) return;
    const coreIds = new Set(
      available.filter((a) => IB_CORE_KEYS.includes(a.name)).map((a) => a.id)
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIbRows((prev) => {
      if (prev) return prev;
      // Everything except EE/TOK is a normal subject row -- however many of
      // them the student actually takes, from whichever groups.
      return buildInitialRows(
        storedSubjects.filter((s) => !coreIds.has(s.subjectId)),
        IB_SUBJECT_COUNT
      );
    });

    setCoreSelection((prev) => {
      const next = { ...prev };
      for (const key of IB_CORE_KEYS) {
        if (next[key]) continue;
        const subject = available.find((a) => a.name === key);
        const stored = storedSubjects.find((s) => s.subjectId === subject?.id);
        next[key] = stored
          ? { rowId: crypto.randomUUID(), subjectId: stored.subjectId, level: stored.level, grade: stored.grade }
          : { rowId: crypto.randomUUID(), subjectId: subject?.id ?? null, level: null, grade: null };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIB, available]);

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

  if (isIB) {
    const currentIbRows = ibRows ?? [];
    const coreRows = IB_CORE_KEYS.map((k) => coreSelection[k]);
    const ibHasDuplicates = hasDuplicateSubjects(currentIbRows);
    const canContinue =
      currentIbRows.length > 0 &&
      currentIbRows.every(rowIsComplete) &&
      coreRows.every((r) => r && rowIsComplete(r)) &&
      !ibHasDuplicates;

    // Subjects the student can pick from, still organized by IB group in the
    // dropdown for findability -- but any combination is allowed (two
    // Sciences and no Arts is a perfectly normal diploma).
    const selectableSubjects = available.filter((s) => !IB_CORE_KEYS.includes(s.name));

    const updateIbRow = (rowId: string, patch: Partial<Row>) =>
      setIbRows((prev) => (prev ?? []).map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
    const removeIbRow = (rowId: string) => setIbRows((prev) => (prev ?? []).filter((r) => r.rowId !== rowId));
    const addIbRow = () => setIbRows((prev) => [...(prev ?? []), makeEmptyRow()]);

    const handleNext = () => {
      const entries: SubjectEntry[] = [...currentIbRows, ...coreRows]
        .filter((r): r is Row => Boolean(r) && rowIsComplete(r))
        .map((row) => {
          const subject = available.find((s) => s.id === row.subjectId)!;
          return { subjectId: subject.id, subjectName: subject.name, level: row.level, grade: row.grade! };
        });
      setSubjects(entries);
      onNext();
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Subjects and grades</CardTitle>
          <CardDescription>
            IB Diploma: add each subject you take, in any combination -- two Sciences and no Arts is
            perfectly normal. Then add your Extended Essay and Theory of Knowledge grades.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {currentIbRows.map((row) => {
            const selectedSubject = selectableSubjects.find((s) => s.id === row.subjectId);
            const levelOptions = selectedSubject?.available_levels ?? [];
            const gradeOptions = selectedSubject ? getGradeOptionsForScale(selectedSubject.grade_scale) : [];

            // Subjects already used elsewhere are removed from this row's list,
            // so a duplicate can't be picked in the first place.
            const taken = subjectsTakenByOtherRows(currentIbRows, row.rowId);
            const rowSubjects = selectableSubjects.filter((s) => !taken.has(s.id));
            const rowGrouped = IB_GROUPS.map((group) => ({
              group,
              subjects: rowSubjects.filter((s) => s.subject_group === group),
            })).filter((g) => g.subjects.length > 0);
            const rowUngrouped = rowSubjects.filter((s) => !IB_GROUPS.includes(s.subject_group ?? ""));

            return (
              <div key={row.rowId} className="grid items-center gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
                <Select
                  items={Object.fromEntries(rowSubjects.map((s) => [s.id, s.name]))}
                  value={row.subjectId}
                  onValueChange={(v) => updateIbRow(row.rowId, { subjectId: v, level: null, grade: null })}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loading ? "Loading…" : "Subject"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {rowGrouped.map(({ group, subjects }) => (
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                    {rowUngrouped.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Other</SelectLabel>
                        {rowUngrouped.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>

                {levelOptions.length > 0 ? (
                  <Select
                    items={Object.fromEntries(levelOptions.map((lvl) => [lvl, lvl]))}
                    value={row.level}
                    onValueChange={(v) => updateIbRow(row.rowId, { level: v })}
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
                  onValueChange={(v) => updateIbRow(row.rowId, { grade: v })}
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
                  onClick={() => removeIbRow(row.rowId)}
                  aria-label="Remove subject"
                  className="justify-self-end rounded-full p-1.5 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}

          <Button type="button" variant="secondary" onClick={addIbRow}>
            + Add another subject
          </Button>

          {IB_CORE_KEYS.map((key) => {
            const subject = available.find((s) => s.name === key);
            const row = coreSelection[key] ?? { rowId: key, subjectId: subject?.id ?? null, level: null, grade: null };
            const gradeOptions = subject ? getGradeOptionsForScale(subject.grade_scale) : [];
            return (
              <div key={key} className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">{key}</Label>
                <Select
                  items={Object.fromEntries(gradeOptions.map((g) => [g, g]))}
                  value={row.grade}
                  onValueChange={(v) => setCoreSelection((prev) => ({ ...prev, [key]: { ...row, grade: v } }))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              checked={casCompleted}
              onCheckedChange={(checked) => setCasCompleted(checked === true)}
              id="cas-completed"
            />
            <Label htmlFor="cas-completed" className="text-sm font-normal">
              CAS (Creativity, Activity, Service) complete
            </Label>
          </div>

          {ibHasDuplicates && (
            <p className="text-sm text-destructive">
              You&apos;ve listed the same subject more than once. Remove the duplicate rows to continue.
            </p>
          )}

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

  const hasDuplicates = hasDuplicateSubjects(rows);
  const canContinue = rows.length > 0 && rows.every(rowIsComplete) && !hasDuplicates;

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
          {curriculum
            ? `${curriculum.name} typically has ${expectedCount} subjects -- fill in each one below.`
            : "Add every subject you're taking, with its grade."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.map((row) => {
          const selectedSubject = available.find((s) => s.id === row.subjectId);
          const levelOptions = selectedSubject?.available_levels ?? [];
          const gradeOptions = selectedSubject ? getGradeOptionsForScale(selectedSubject.grade_scale) : [];
          const taken = subjectsTakenByOtherRows(rows, row.rowId);
          const rowSubjects = available.filter((s) => !taken.has(s.id));

          return (
            <div key={row.rowId} className="grid items-center gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
              <Select
                items={Object.fromEntries(rowSubjects.map((s) => [s.id, s.name]))}
                value={row.subjectId}
                onValueChange={(v) => updateRow(row.rowId, { subjectId: v, level: null, grade: null })}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loading ? "Loading subjects…" : "Subject"} />
                </SelectTrigger>
                <SelectContent>
                  {rowSubjects.map((s) => (
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

        {hasDuplicates && (
          <p className="text-sm text-destructive">
            You&apos;ve listed the same subject more than once. Remove the duplicate rows to continue.
          </p>
        )}

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
