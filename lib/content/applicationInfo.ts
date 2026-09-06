/**
 * Per-country application guidance.
 *
 * General, researched guidance on how each country's admissions SYSTEM works.
 * It is not the policy of any individual university and not a substitute for a
 * target school's own admissions page -- systems change, and a specific course
 * can always differ from the national norm.
 *
 * Deliberately describes systems rather than quoting cut-offs, grade profiles
 * or acceptance rates. Those change yearly and belong with the per-university
 * data, where they carry a source and a date, not in static copy that would
 * quietly go stale.
 *
 * Every country here is one the catalogue actually covers.
 */

export interface CountryGuide {
  slug: string;
  name: string;
  /** How applying actually works there, in one paragraph. */
  overview: string;
  platform: { note: string; links: { label: string; href: string }[] };
  needs: string[];
  extracurriculars: string;
  tests: string;
  essays: string;
  /** The single thing that most changes how a student should prepare. */
  priorities: string;
}

export const COUNTRY_GUIDES: CountryGuide[] = [
  {
    slug: "united-states",
    name: "United States",
    overview:
      "Create one Common App profile, add your schools, and submit a shared application plus any school-specific supplements. Your counsellor sends transcripts and recommendation letters directly.",
    platform: {
      note: "Common Application at most schools. Some also accept the Coalition Application or run their own portal.",
      links: [{ label: "Common App", href: "https://www.commonapp.org/" }],
    },
    needs: [
      "Full four-year transcript, grades 9 to 12",
      "SAT or ACT, though many schools are test-optional",
      "One to two teacher recommendations plus a counsellor recommendation",
      "Common App personal essay, 250 to 650 words",
      "School-specific supplemental essays at most selective schools",
      "Any curriculum is accepted. CBSE, ISC, A-Levels, IB and HKDSE are all read alongside a US GPA, interpreted through the school profile your counsellor submits",
    ],
    extracurriculars:
      "Weighted heavily. US admissions is genuinely holistic, and depth in one or two activities with real leadership or measurable impact reads far better than a long list of shallow involvements.",
    tests:
      "SAT or ACT. Many schools went test-optional after 2020 and a strong score remains a meaningful advantage at selective institutions, though several have since reinstated a requirement. Check each school directly.",
    essays:
      "Required everywhere. The Common App personal essay goes to every school and most selective schools add their own supplements, such as short why-us answers. This is among the most heavily weighted parts of the application.",
    priorities:
      "Grades and test scores matter, but extracurriculars, leadership and achievement still " +
      "carry real weight alongside them. A strong activities record can meaningfully offset a " +
      "slightly less perfect transcript.",
  },
  {
    slug: "united-kingdom",
    name: "United Kingdom",
    overview:
      "One UCAS application covers up to five courses. You apply to a specific course rather than to a university in general, and you are assessed almost entirely on academic fit for that subject.",
    platform: {
      note: "UCAS. A single application is shared across all of your choices.",
      links: [
        { label: "UCAS", href: "https://www.ucas.com/" },
        { label: "Discover Uni", href: "https://discoveruni.gov.uk/" },
      ],
    },
    needs: [
      "Predicted grades from your school, whether A-Level, IB or an equivalent",
      "One academic reference",
      "A personal statement, shared across all five choices",
      "Subject prerequisites, which are strict enough that a missing subject usually rules a course out",
      "An admissions test for some courses",
      "Interviews for Oxford, Cambridge, medicine and a handful of other courses",
    ],
    extracurriculars:
      "Far less important than in the United States, and relevant only where they connect to your subject. Reading, projects or work experience in your field count; unrelated clubs and sport generally do not.",
    tests:
      "Course-specific rather than universal. The LNAT for law, the UCAT for medicine, and mathematics tests such as the TMUA or STEP are common examples. There is no UK-wide equivalent of the SAT.",
    essays:
      "A single personal statement, and it must be subject-focused. Because the same statement reaches all five choices, it argues why you suit that course rather than that university.",
    priorities:
      "Grades and subject-specific fit dominate almost entirely. Extracurriculars barely " +
      "register — a personal statement helps, but it is not what gets you in.",
  },
  {
    slug: "india",
    name: "India",
    overview:
      "Admission is dominated by national entrance examinations, and for most courses your rank in that exam is decisive. Centralised counselling rounds then allocate seats by rank and stated preference.",
    platform: {
      note: "Varies by course. JoSAA handles seat allocation for the IITs, NITs, IIITs and GFTIs, while CUET covers many central universities.",
      links: [
        { label: "JoSAA", href: "https://josaa.nic.in/" },
        { label: "National Testing Agency", href: "https://nta.ac.in/" },
        { label: "NIRF rankings", href: "https://www.nirfindia.org/" },
      ],
    },
    needs: [
      "Class 10 and Class 12 board results",
      "An entrance exam score and rank: JEE Main and Advanced for engineering, NEET for medicine, CUET for many central universities",
      "Category and domicile documents where reservation policies apply",
      "Separate applications for most private universities, each with its own test or criteria",
    ],
    extracurriculars:
      "Rarely part of the decision for exam-based courses. Private and liberal-arts universities such as Ashoka, FLAME and Symbiosis do weigh them, and several run their own interviews or written assessments.",
    tests:
      "Central to almost everything. JEE Main and Advanced for engineering, NEET for medical courses, CUET for many central universities, plus institution-specific tests at private universities.",
    essays:
      "Not part of exam-based admissions. Private liberal-arts universities are the exception and commonly ask for essays alongside an interview.",
    priorities:
      "Almost entirely grades and exam-readiness against the cutoff. This reflects a rank-based " +
      "system where extracurriculars play essentially no role in the actual seat allocation.",
  },
  {
    slug: "australia",
    name: "Australia",
    overview:
      "There is no single national admissions body. Domestic students apply through their state's tertiary admissions centre, while international students usually apply directly to each university.",
    platform: {
      note: "State-based for domestic applicants, direct to the university for most international applicants.",
      links: [
        { label: "UAC, New South Wales and ACT", href: "https://uac.edu.au/" },
        { label: "VTAC, Victoria", href: "https://www.vtac.edu.au/" },
        { label: "QTAC, Queensland", href: "https://qtac.edu.au/" },
        { label: "QILT outcomes data", href: "https://www.qilt.edu.au/" },
      ],
    },
    needs: [
      "An ATAR or equivalent selection rank, to which IB and most international qualifications convert",
      "Subject prerequisites for the specific course",
      "Proof of English proficiency for international applicants",
      "A portfolio, audition or supplementary form for creative and some health courses",
    ],
    extracurriculars:
      "Largely irrelevant for standard entry, which is rank-driven. They matter for portfolio-based courses and for alternative-entry and equity access schemes.",
    tests:
      "No general entrance exam. A few courses add assessments, such as the UCAT for some medical programmes or auditions and portfolios for performing arts and design.",
    essays:
      "Not normally required. Some scholarship applications and alternative-entry schemes ask for a written statement.",
    priorities:
      "Grades alone are almost everything, with fit to the specific course close behind. " +
      "Extracurriculars are nearly irrelevant for standard entry.",
  },
  {
    slug: "singapore",
    name: "Singapore",
    overview:
      "You apply directly to each university's own portal. Places are competitive and largely grade-driven, and the published indicative grade profiles give a realistic sense of where you stand before you apply.",
    platform: {
      note: "Direct to each university. NUS, NTU, SMU, SUTD, SIT and SUSS each run their own portal.",
      links: [
        { label: "NUS indicative grade profile", href: "https://www.nus.edu.sg/oam/admissions/indicative-grade-profile" },
        { label: "NTU indicative grade profile", href: "https://www.ntu.edu.sg/admissions/undergraduate/indicative-grade-profile" },
        { label: "SMU indicative grade profile", href: "https://admissions.smu.edu.sg/admissions-requirements/indicative-grade-profile" },
      ],
    },
    needs: [
      "A-Level, IB, polytechnic diploma or a recognised international qualification",
      "Subject prerequisites for the specific course",
      "A personal statement or written responses at some universities",
      "Interviews or tests for law, medicine, architecture and scholarship candidates",
    ],
    extracurriculars:
      "A secondary but real factor, particularly at SMU and for scholarships and discretionary admission. Grades still lead.",
    tests:
      "No general entrance exam. Course-specific interviews and written tests apply to law, medicine and architecture.",
    essays:
      "Short written responses or a personal statement at several universities, shorter and more direct than a US essay.",
    priorities:
      "Grades and course fit still lead, but activities and leadership get more room here than " +
      "in the UK or Australia — enough to matter, not enough to compensate for weak grades.",
  },
  {
    slug: "hong-kong",
    name: "Hong Kong",
    overview:
      "Local HKDSE students apply through JUPAS, the joint admissions system. International and non-HKDSE applicants apply directly to each university under non-JUPAS admission.",
    platform: {
      note: "JUPAS for HKDSE students, direct non-JUPAS applications for everyone else.",
      links: [
        { label: "JUPAS", href: "https://www.jupas.edu.hk/en/" },
        { label: "UGC statistics", href: "https://cdcf.ugc.edu.hk/" },
      ],
    },
    needs: [
      "HKDSE results, or A-Levels, IB or another recognised qualification for non-JUPAS entry",
      "Programme choices ranked in order of preference under JUPAS",
      "Proof of English proficiency for international applicants",
      "Interviews for competitive programmes such as medicine, law and business",
    ],
    extracurriculars:
      "Considered through the JUPAS Student Learning Profile and in interviews, though academic results carry most of the weight.",
    tests:
      "No separate entrance exam beyond the HKDSE itself. Some programmes add interviews or written assessments.",
    essays:
      "Not a major component. Non-JUPAS applications often ask for a short personal statement.",
    priorities:
      "Very similar to Singapore: exam scores against the programme benchmark dominate, with a " +
      "modest but real allowance for extracurriculars.",
  },
];
