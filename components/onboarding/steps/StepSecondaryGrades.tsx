"use client";

import { useState } from "react";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { getGradeOptionsForScale } from "@/lib/utils/grades";
import type { Country, Curriculum } from "@/lib/db/reference";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ChevronDown } from "lucide-react";

const GRADE_10_BOARDS = ["IGCSE", "GCSE", "CBSE", "ICSE", "State Board", "American High School", "Other"];

const GRADE_10_SUBJECTS = [
  "English Language", "English Literature", "Mathematics", "Additional Mathematics",
  "Core Mathematics", "Physics", "Chemistry", "Biology", "Combined Science",
  "Computer Science", "Information & Communication Technology", "Global Perspectives",
  "History", "Geography", "Economics", "Business Studies", "Accounting",
  "French", "Spanish", "Hindi", "Art & Design", "Physical Education",
  "Religious Studies", "Other",
];

const BOARD_GRADE_SCALE: Record<string, string> = {
  IGCSE: "A*-G", GCSE: "A*-G", CBSE: "0-100", ICSE: "0-100",
  "State Board": "0-100", "American High School": "A-F", Other: "0-100",
};

const SUBJECT_GRADE_OVERRIDE: Record<string, string[]> = {
  "Core Mathematics": ["C", "D", "E", "F", "G", "U"],
};

/**
 * Grade 11 belongs to the senior curriculum, not the secondary board.
 *
 * An IB student sits IGCSEs in grades 9-10 and then starts the diploma in
 * grade 11 -- so their grade 11 results are on the 1-7 scale, not A*-G. The
 * board dropdown on this step only governs grades 9 and 10; grade 11 follows
 * whichever curriculum was chosen earlier in onboarding.
 */
const CURRICULUM_GRADE_SCALE: Record<string, string> = {
  IB: "1-7",
  A_LEVELS: "A*-E",
  AP: "1-5",
  US_HS_DIPLOMA: "A-F",
  AU_CURRICULUM: "A-E",
  CBSE: "0-100",
  ICSE: "0-100",
  ISC: "0-100",
};

interface Row {
  rowId: string;
  subjectName: string;
  grade: string | null;
}

function makeEmptyRow(): Row {
  return { rowId: crypto.randomUUID(), subjectName: "", grade: null };
}

// US 9th-12th weighting note is deliberately generic ("your fuller record
// matters") rather than an invented precise weighting -- matches the
// qualitative-only approach used everywhere else in this app.
const GRADE_WEIGHT_NOTES: Record<number, Partial<Record<string, string>>> = {
  9: {
    US: "US admissions review your full 9th-12th record as one trajectory -- 9th grade matters more at highly selective schools.",
    GB: "UK admissions mainly look at your final 2 years, but Grade 9 results can still support a competitive application.",
    HK: "Hong Kong mainly weighs senior secondary results -- Grade 9 is background context.",
    SG: "Singapore weighs your final 2 years most heavily -- Grade 9 is background context.",
  },
  11: {
    US: "11th grade is usually the single most-weighted year in a US application.",
    GB: "UK admissions mainly evaluate your final 2 years via predicted grades -- Grade 11 (Year 12) results matter directly.",
    HK: "Grade 11 is part of the senior-secondary results Hong Kong universities weigh most.",
    SG: "Grade 11 (Year 12) results are core to Singapore's final-2-years evaluation.",
  },
};

function GradeYearSection({
  label,
  gradeScale,
  rows,
  setRows,
  onCommit,
  note,
}: {
  label: string;
  /** Which scale this year's grades are on -- the secondary board for 9 and 10, the senior curriculum for 11. */
  gradeScale: string;
  rows: Row[];
  setRows: (updater: (prev: Row[]) => Row[]) => void;
  onCommit: (rows: Row[]) => void;
  note?: string;
}) {
  const boardGradeOptions = getGradeOptionsForScale(gradeScale);
  const gradeOptionsFor = (subjectName: string) => SUBJECT_GRADE_OVERRIDE[subjectName] ?? boardGradeOptions;

  const updateRow = (rowId: string, patch: Partial<Row>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r));
      onCommit(next);
      return next;
    });
  };
  const removeRow = (rowId: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.rowId !== rowId);
      onCommit(next);
      return next;
    });
  };
  const addRow = () => setRows((prev) => [...prev, makeEmptyRow()]);

  return (
    <div className="flex flex-col gap-3">
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      <Label>{label} subjects and grades</Label>
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
      <Button type="button" variant="secondary" size="sm" onClick={addRow}>
        + Add another subject
      </Button>
    </div>
  );
}

interface Props {
  countries: Country[];
  curricula: Curriculum[];
  onNext: () => void;
  onBack: () => void;
}

export function StepSecondaryGrades({ countries, curricula, onNext, onBack }: Props) {
  const grade10Board = useOnboardingStore((s) => s.draft.grade10Board ?? null);
  const curriculumId = useOnboardingStore((s) => s.draft.curriculumId);

  // Grades 9 and 10 follow the secondary board picked below; grade 11 follows
  // the senior curriculum picked at the start of onboarding.
  const seniorCurriculum = curricula.find((c) => c.id === curriculumId);
  const secondaryScale = grade10Board ? BOARD_GRADE_SCALE[grade10Board] : "0-100";
  const seniorScale = (seniorCurriculum && CURRICULUM_GRADE_SCALE[seniorCurriculum.code]) ?? secondaryScale;
  const grade11Label = seniorCurriculum ? `Grade 11 (${seniorCurriculum.name})` : "Grade 11";
  const setGrade10Board = useOnboardingStore((s) => s.setGrade10Board);
  const setGrade9Subjects = useOnboardingStore((s) => s.setGrade9Subjects);
  const setGrade10Subjects = useOnboardingStore((s) => s.setGrade10Subjects);
  const setGrade11Subjects = useOnboardingStore((s) => s.setGrade11Subjects);
  const targetCountryIds = useOnboardingStore((s) => s.draft.targetCountryIds ?? []);

  const targetIsoCodes = countries.filter((c) => targetCountryIds.includes(c.id)).map((c) => c.iso_code);
  const noteFor = (grade: 9 | 11) => {
    const notes = targetIsoCodes
      .map((code) => GRADE_WEIGHT_NOTES[grade]?.[code])
      .filter((n): n is string => Boolean(n));
    return notes[0]; // one representative note is enough context, not a wall of text
  };

  const [rows9, setRows9] = useState<Row[]>(() => {
    const stored = useOnboardingStore.getState().draft.grade9Subjects ?? [];
    return stored.map((s) => ({ rowId: crypto.randomUUID(), subjectName: s.subjectName, grade: s.grade }));
  });
  const [rows10, setRows10] = useState<Row[]>(() => {
    const stored = useOnboardingStore.getState().draft.grade10Subjects ?? [];
    return stored.length > 0
      ? stored.map((s) => ({ rowId: crypto.randomUUID(), subjectName: s.subjectName, grade: s.grade }))
      : [makeEmptyRow()];
  });
  const [rows11, setRows11] = useState<Row[]>(() => {
    const stored = useOnboardingStore.getState().draft.grade11Subjects ?? [];
    return stored.map((s) => ({ rowId: crypto.randomUUID(), subjectName: s.subjectName, grade: s.grade }));
  });

  const [show9, setShow9] = useState(rows9.length > 0);
  const [show11, setShow11] = useState(rows11.length > 0);

  const toEntries = (rows: Row[]) =>
    rows
      .filter((r) => r.subjectName.trim() && r.grade)
      .map((r) => ({ id: crypto.randomUUID(), subjectName: r.subjectName.trim(), grade: r.grade! }));

  const handleNext = () => {
    setGrade9Subjects(toEntries(rows9));
    setGrade10Subjects(toEntries(rows10));
    setGrade11Subjects(toEntries(rows11));
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Secondary school results</CardTitle>
        <CardDescription>
          Grade 10 is required. Grades 9 and 11 are optional -- adding them helps sharpen the
          analysis, especially for countries that review your full academic record.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label>Board / curriculum (grades 9 and 10)</Label>
          <Select
            items={Object.fromEntries(GRADE_10_BOARDS.map((b) => [b, b]))}
            value={grade10Board}
            onValueChange={setGrade10Board}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your board" />
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

        <button
          type="button"
          onClick={() => setShow9((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={`size-4 transition-transform ${show9 ? "rotate-180" : ""}`} />
          9th grade — optional, adding this helps strengthen your analysis
        </button>
        {show9 && (
          <GradeYearSection label="Grade 9" gradeScale={secondaryScale} rows={rows9} setRows={setRows9} onCommit={() => {}} note={noteFor(9)} />
        )}

        <GradeYearSection label="Grade 10 (required)" gradeScale={secondaryScale} rows={rows10} setRows={setRows10} onCommit={() => {}} />

        <button
          type="button"
          onClick={() => setShow11((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={`size-4 transition-transform ${show11 ? "rotate-180" : ""}`} />
          11th grade — optional, adding this helps strengthen your analysis
        </button>
        {show11 && (
          <GradeYearSection label={grade11Label} gradeScale={seniorScale} rows={rows11} setRows={setRows11} onCommit={() => {}} note={noteFor(11)} />
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleNext}>Continue</Button>
        </div>
      </CardContent>
    </Card>
  );
}
