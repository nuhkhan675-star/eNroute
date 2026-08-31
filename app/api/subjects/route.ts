import { NextResponse, type NextRequest } from "next/server";
import { getSubjectsForCurriculum } from "@/lib/db/reference";

export async function GET(request: NextRequest) {
  const curriculumId = request.nextUrl.searchParams.get("curriculumId");
  if (!curriculumId) {
    return NextResponse.json({ error: "curriculumId is required" }, { status: 400 });
  }
  const subjects = await getSubjectsForCurriculum(curriculumId);
  return NextResponse.json({ subjects });
}
