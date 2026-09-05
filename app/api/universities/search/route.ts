import { NextResponse, type NextRequest } from "next/server";
import { searchUniversities } from "@/lib/db/universities";

// Name lookup for the "Analyze a specific university" panel. Pure DB read --
// never triggers an AI call, so typing a name costs nothing. The analysis
// itself is a separate, explicit POST to /api/analyze/[universityId].
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  // One character is enough: typing "f" should list the F universities.
  if (q.length < 1) return NextResponse.json({ results: [] });

  const results = await searchUniversities(q);
  return NextResponse.json({
    results: results.map((u) => ({
      id: u.id,
      name: u.name,
      city: u.city,
      countryName: u.countryName,
    })),
  });
}
