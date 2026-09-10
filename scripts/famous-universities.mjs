// Hand-ordered "who would a student actually search for" lists, per country.
//
// The backfill previously ordered by created_at, on the theory that the
// curated catalogue was imported before the ROR bulk load. That is only
// loosely true, and it cannot tell a university from an artefact of the
// import: the pool contains "Sydney University Musical Society", "Woman
// Online University", "Nottingham University Samworth Academy" (a school),
// "Cambridge University Health Partners" and "University of Warwick Science
// Park", none of which have an undergraduate intake to have a rate for.
// It also contains straight duplicates -- RMIT University and Royal
// Melbourne Institute of Technology, University of Newcastle and University
// of Newcastle Australia.
//
// Each paid lookup is roughly two web-search calls, so the ordering decides
// what a fixed budget actually buys. Names must match the `universities`
// table exactly; a name that matches nothing is reported by the runner
// rather than silently skipped.

export const FAMOUS = {
  "Hong Kong": [
    // The eight UGC-funded universities. The self-financing institutions
    // (Shue Yan, Hang Seng, Metropolitan, Saint Francis) are left out --
    // they publish little and are rarely searched from abroad.
    "The University of Hong Kong",
    "The Chinese University of Hong Kong",
    "The Hong Kong University of Science and Technology",
    "The Hong Kong Polytechnic University",
    "City University of Hong Kong",
    "Hong Kong Baptist University",
    "The Education University of Hong Kong",
    "Lingnan University",
  ],

  Singapore: [
    // The six autonomous universities plus the two arts institutions.
    // Foreign branch campuses (James Cook, Newcastle, Glasgow, DigiPen,
    // Wales Cardiff) admit through their parent and are excluded.
    "National University of Singapore",
    "Nanyang Technological University",
    "Singapore Management University",
    "Singapore University of Technology and Design",
    "Singapore Institute of Technology",
    "Singapore University of Social Sciences",
    "Singapore Institute of Management (SIM)",
    "LASALLE College of the Arts",
    "Nanyang Academy of Fine Arts",
  ],

  Australia: [
    "University of Melbourne",
    "University of Sydney",
    "University of New South Wales",
    "Australian National University",
    "Monash University",
    "University of Queensland",
    "Adelaide University",
    "University of Technology Sydney",
    "Macquarie University",
    "RMIT University",
    "Queensland University of Technology",
    "Deakin University",
    "University of Wollongong",
    "University of Newcastle",
    "Griffith University",
    "La Trobe University",
    "Swinburne University of Technology",
    "University of Tasmania",
    "Flinders University",
    "Western Sydney University",
    "Murdoch University",
    "Edith Cowan University",
    "Bond University",
    "University of Canberra",
    "Charles Sturt University",
    "Central Queensland University",
    "University of Southern Queensland",
    "Victoria University",
    "Australian Catholic University",
    "University of the Sunshine Coast",
    "Charles Darwin University",
    "Southern Cross University",
    "University of New England",
    "Torrens University Australia",
    "Federation University",
  ],

  // Mumbai only, by request. The city column is too sparse to filter on --
  // it holds 15 Mumbai rows and misses IIT Bombay and the University of
  // Mumbai entirely -- so these are named explicitly. Note how short the
  // list is: TISS, NMIMS, ICT, VJTI and St. Xavier's Mumbai are simply not
  // in the catalogue yet.
  India: [
    "Indian Institute of Technology, Bombay",
    "University of Mumbai",
    "Indian Institute of Management Mumbai",
    "Maharashtra National Law University Mumbai",
    "Somaiya Vidyavihar University",
    "Dr. Homi Bhabha State University",
    "HSNC University",
    "Shreemati Nathibai Damodar Thackersey Women's University",
    "D.Y. Patil University",
    "Dwarkadas J. Sanghvi College of Engineering",
    "Thakur College of Engineering and Technology",
    "Vidyalankar Institute of Technology",
    "ATLAS SkillTech University",
    "St. Francis Institute of Technology",
    "Shri Bhagubhai Mafatlal Polytechnic and College of Engineering",
  ],

  "United Kingdom": [
    "University of Oxford",
    "University of Cambridge",
    "Imperial College London",
    "London School of Economics and Political Science",
    "University College London",
    "King's College London",
    "University of Glasgow",
    "Durham University",
    "University of Birmingham",
    "University of St. Andrews",
    "Cardiff University",
    "University of Liverpool",
    "University of Exeter",
    "Queen Mary, University of London",
    "University of Sheffield",
    "University of York",
    "Lancaster University",
    "University of Kent",
    "Queen's University Belfast",
    "University of Strathclyde",
    "Loughborough University",
    "University of East Anglia",
    "University of Essex",
    "University of Sussex",
    "Heriot-Watt University",
    "Royal Holloway University of London",
    "SOAS University of London",
    "Goldsmiths University of London",
    "University of Dundee",
    "Swansea University",
    "Aston University",
    "University of Leicester",
    "Coventry University",
    "Northumbria University",
    "Oxford Brookes University",
    "Brunel University of London",
    "City St George's, University of London",
    "University of Stirling",
    "Keele University",
    "University of Hull",
    "Bangor University",
    "Aberystwyth University",
    "Manchester Metropolitan University",
    "Nottingham Trent University",
    "Sheffield Hallam University",
    "University of the Arts London",
    "Birkbeck, University of London",
    "The Open University",
    "University of Westminster",
    "Robert Gordon University",
  ],
};
