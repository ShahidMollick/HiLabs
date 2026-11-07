// Invented test patients from the HiLabs case (Monday 9 Nov, 8 am).

export type Urgency = "today" | "week";

export type Patient = {
  id: string;
  name: string;
  initials: string;
  age: number;
  reason: string;
  why: string;
  due: string;
  bestTime: string;
  contact: string;
  urgency: Urgency;
  tone: string; // fallback avatar colour pair
  photo: string;
};

export const patients: Patient[] = [
  {
    id: "tanya-brooks",
    photo: "/patients/tanya-brooks-deck.jpg",
    name: "Tanya Brooks",
    initials: "TB",
    age: 34,
    reason: "Pharmacy refilled a medicine the hospital stopped",
    why: "Left a mental health unit on 2 Nov",
    due: "7-day check-up due today",
    bestTime: "8:30 am",
    contact: "Tanya",
    urgency: "today",
    tone: "bg-[#d3e3fd] text-[#041e49]",
  },
  {
    id: "walter-briggs",
    photo: "/patients/walter-briggs-deck.jpg",
    name: "Walter Briggs",
    initials: "WB",
    age: 78,
    reason: "New heart pills not collected",
    why: "Home from hospital on Saturday",
    due: "Contact due tomorrow",
    bestTime: "10:00 am",
    contact: "Walter, wife Joan",
    urgency: "today",
    tone: "bg-[#c4eed0] text-[#072711]",
  },
  {
    id: "darnell-price",
    photo: "/patients/darnell-price-deck.jpg",
    name: "Darnell Price",
    initials: "DP",
    age: 46,
    reason: "ER visit Friday; new mobile number found",
    why: "Old number failed 5 times since September",
    due: "Follow-up due in 4 days",
    bestTime: "6:30 pm",
    contact: "Darnell, text first",
    urgency: "today",
    tone: "bg-[#ffdbcb] text-[#341100]",
  },
  {
    id: "frank-novak",
    photo: "/patients/frank-novak.jpg",
    name: "Frank Novak",
    initials: "FN",
    age: 81,
    reason: "Fell at home; no physio booked",
    why: "ER visit for a fall on 4 Nov; lives alone",
    due: "Check-in due Wednesday",
    bestTime: "11:00 am",
    contact: "Frank, son Mike",
    urgency: "week",
    tone: "bg-[#e1e3e1] text-[#191c1b]",
  },
  {
    id: "andre-wilson",
    photo: "/patients/andre-wilson.jpg",
    name: "Andre Wilson",
    initials: "AW",
    age: 24,
    reason: "Three rescue inhalers in a month, no controller",
    why: "ER visit for asthma on 28 Oct",
    due: "Follow-up due Thursday",
    bestTime: "5:30 pm",
    contact: "Andre",
    urgency: "week",
    tone: "bg-[#c2e7ff] text-[#001d35]",
  },
  {
    id: "lai-fong-chan",
    photo: "/patients/lai-fong-chan-deck.jpg",
    name: "Lai Fong Chan",
    initials: "LC",
    age: 84,
    reason: "Yearly review; double blood-pressure supply",
    why: "Health form is from before her hip fracture",
    due: "Review Friday",
    bestTime: "12:30 pm",
    contact: "Grace, daughter",
    urgency: "week",
    tone: "bg-[#e8def8] text-[#1d192b]",
  },
  {
    id: "elena-delgado",
    photo: "/patients/elena-delgado-deck.jpg",
    name: "Elena Delgado",
    initials: "ED",
    age: 67,
    reason: "No insulin collected since 18 July",
    why: "Risk score up 78%; prefers Spanish",
    due: "This week",
    bestTime: "7:00 pm",
    contact: "Elena, in Spanish",
    urgency: "week",
    tone: "bg-[#fde293] text-[#3a2a00]",
  },
  {
    id: "keisha-moore",
    photo: "/patients/keisha-moore.jpg",
    name: "Keisha Moore",
    initials: "KM",
    age: 29,
    reason: "Missed two prenatal visits",
    why: "Due in March; joined the plan in October",
    due: "Visit to book this week",
    bestTime: "12:15 pm",
    contact: "Keisha, text first",
    urgency: "week",
    tone: "bg-[#ffd8e4] text-[#31111d]",
  },
  {
    id: "margaret-ellis",
    photo: "/patients/margaret-ellis.jpg",
    name: "Margaret Ellis",
    initials: "ME",
    age: 70,
    reason: "Mammogram and eye exam overdue",
    why: "Two care gaps close on 31 Dec",
    due: "This week",
    bestTime: "2:00 pm",
    contact: "Margaret",
    urgency: "week",
    tone: "bg-[#c4eed0] text-[#072711]",
  },
];

export const changes = [
  { id: "tanya-brooks", text: "Pharmacy refilled a medicine the hospital stopped", when: "Thu" },
  { id: "walter-briggs", text: "Home from hospital; new pills not collected", when: "Sat" },
  { id: "darnell-price", text: "ER visit; gave a new mobile number", when: "Fri" },
];

export const progress = { callsDone: 0, callsTotal: 3, flagsDone: 0, flagsTotal: 10 };
export const allClear = 43;

/* ---------- what Maria needs on the call (from the deck, page 4) ---------- */

export type Topic = { title: string; found: string; action: string; when: string; urgent?: boolean };
export type Med = { name: string; status: string; tone: "conflict" | "gap" | "ok" };
export type Details = {
  phone: string;
  phoneNote?: string;
  language: string;
  plan: string;
  lastContact: string;
  topics: Topic[];
  meds: Med[];
};

// Phone numbers are fictional (555-01xx range).
export const details: Record<string, Details> = {
  "tanya-brooks": {
    phone: "(555) 012-6678",
    phoneNote: "Mobile",
    language: "English",
    plan: "Medicaid · M-52930",
    lastContact: "Voicemail, Tue 3 Nov",
    topics: [
      {
        title: "Stopped medicine was refilled",
        found: "Hospital stopped sertraline on 2 Nov; the pharmacy refilled it on 5 Nov.",
        action: "Cancel the refill and book a video psychiatry visit today.",
        when: "Today",
        urgent: true,
      },
      {
        title: "Where is she staying?",
        found: "Hospital note says she is with a friend; her February form says stable home.",
        action: "Confirm where she is staying; refer for housing help.",
        when: "Within 2 days",
      },
    ],
    meds: [
      { name: "Sertraline 100 mg", status: "Stopped by hospital · refilled 5 Nov", tone: "conflict" },
      { name: "Aripiprazole 5 mg", status: "New · picked up 3 Nov", tone: "ok" },
    ],
  },
  "walter-briggs": {
    phone: "(555) 014-2210",
    phoneNote: "Home · wife Joan answers",
    language: "English",
    plan: "Medicare Advantage",
    lastContact: "None since discharge",
    topics: [
      {
        title: "New heart pills not collected",
        found: "The discharge list has new heart pills; the pharmacy shows no pickup.",
        action: "Check his medicines with him and arrange home delivery.",
        when: "Today",
        urgent: true,
      },
      {
        title: "Book his heart specialist",
        found: "Heart-failure stay; the summary arrived 31 hours after the alert.",
        action: "Book a visit with his heart specialist.",
        when: "Within 5 days",
      },
    ],
    meds: [
      { name: "Furosemide", status: "Discharge 40 mg twice daily · pharmacy 20 mg", tone: "conflict" },
      { name: "Spironolactone 25 mg", status: "New on discharge · not collected", tone: "gap" },
    ],
  },
  "darnell-price": {
    phone: "(555) 019-4471",
    phoneNote: "New mobile from the ER · old number dead",
    language: "English",
    plan: "Medicaid",
    lastContact: "5 failed calls since September",
    topics: [
      {
        title: "Reach him on the new number",
        found: "Five calls to the old number went nowhere; he gave a new mobile at the ER.",
        action: "Text first, then call after 6 pm.",
        when: "Today",
        urgent: true,
      },
      {
        title: "4 ER visits in 90 days",
        found: "Bills show only 2; hospital alerts show 4.",
        action: "Restart his preventer inhaler; book a follow-up.",
        when: "Within 2 days",
      },
    ],
    meds: [{ name: "Preventer inhaler", status: "Not being used · restart", tone: "gap" }],
  },
  "lai-fong-chan": {
    phone: "(555) 016-8891",
    phoneNote: "Grace, daughter (caregiver)",
    language: "Cantonese · interpreter",
    plan: "Dual-eligible D-SNP",
    lastContact: "Yearly review, Nov 2025",
    topics: [
      {
        title: "Double blood-pressure supply",
        found: "Two pharmacies gave her the same blood-pressure pill in the same week.",
        action: "Ask Grace which pills her mother actually takes.",
        when: "Within 2 days",
      },
      {
        title: "Yearly form is out of date",
        found: "Her form is from before her hip fracture in August.",
        action: "Redo the yearly form with a Cantonese interpreter.",
        when: "Within 5 days",
      },
    ],
    meds: [{ name: "Blood-pressure pill", status: "Filled by 2 pharmacies the same week", tone: "conflict" }],
  },
  "elena-delgado": {
    phone: "(555) 016-8854",
    phoneNote: "Kept after merging her two records",
    language: "Spanish",
    plan: "Medicare Advantage",
    lastContact: "Wrong number on file until today",
    topics: [
      {
        title: "No insulin since 18 July",
        found: "About 16 weeks without a pickup; her risk score rose 78%.",
        action: "Call in Spanish in the evening; ask why she stopped.",
        when: "Within 2 days",
      },
      {
        title: "Tell her doctor",
        found: "Two member records with different phone numbers were merged.",
        action: "Tell her doctor and book a diabetes review.",
        when: "Within 5 days",
      },
    ],
    meds: [{ name: "Insulin", status: "Last collected 18 July", tone: "gap" }],
  },
  "keisha-moore": {
    phone: "(555) 017-3301",
    phoneNote: "Mobile · prefers text",
    language: "English",
    plan: "Medicaid · M-61184",
    lastContact: "Welcome text, 21 Oct",
    topics: [
      {
        title: "Two prenatal visits missed",
        found: "Claims show no prenatal visit since 9 Sept; she is due in March.",
        action: "Find out what got in the way and book the next visit.",
        when: "This week",
        urgent: true,
      },
    ],
    meds: [{ name: "Prenatal vitamins", status: "Last fill 2 Sept", tone: "gap" }],
  },
  "andre-wilson": {
    phone: "(555) 017-4420",
    phoneNote: "Mobile",
    language: "English",
    plan: "Medicaid · M-57702",
    lastContact: "None",
    topics: [
      {
        title: "Relying on his rescue inhaler",
        found: "Three albuterol fills in October and no controller inhaler on record.",
        action: "Ask about symptoms and get a controller prescribed.",
        when: "Before Thursday",
        urgent: true,
      },
    ],
    meds: [
      { name: "Albuterol inhaler", status: "3 fills in October", tone: "conflict" },
      { name: "Controller inhaler", status: "None on record", tone: "gap" },
    ],
  },
  "frank-novak": {
    phone: "(555) 018-0912",
    phoneNote: "Home · son Mike on the account",
    language: "English",
    plan: "Medicare Advantage",
    lastContact: "Annual review, 12 Aug",
    topics: [
      {
        title: "Fall at home, no physio yet",
        found: "ER discharge on 4 Nov recommends physiotherapy; nothing is booked.",
        action: "Check how he is managing and book physio and a home safety check.",
        when: "By Wednesday",
        urgent: true,
      },
    ],
    meds: [{ name: "Blood thinner", status: "Taking · fall raises bleeding risk", tone: "ok" }],
  },
  "margaret-ellis": {
    phone: "(555) 018-2276",
    phoneNote: "Home",
    language: "English",
    plan: "Medicare Advantage",
    lastContact: "Reminder letter, 2 Oct",
    topics: [
      {
        title: "Two screenings overdue",
        found: "No mammogram since 2023 and no diabetic eye exam this year.",
        action: "Book both, ideally the same week.",
        when: "Before 31 Dec",
      },
    ],
    meds: [{ name: "Metformin", status: "Picked up 30 Oct", tone: "ok" }],
  },
};

/* ---------- right card: what the middle doesn't show ---------- */

export type Task = { id: string; patientId: string; text: string; due: string; urgent?: boolean; fromCall?: boolean };

// Follow-ups already open before Monday's calls.
export const openTasks: Task[] = [
  { id: "t1", patientId: "lai-fong-chan", text: "Book a Cantonese interpreter for the yearly review", due: "Thu" },
  { id: "t2", patientId: "elena-delgado", text: "Confirm the merged member record with eligibility", due: "Wed" },
  { id: "t3", patientId: "darnell-price", text: "Request ER notes from Friday’s visit", due: "Tue" },
];

// How current each feed is: Maria needs to know what the list can't see yet.
export const sources = [
  { name: "Hospital alerts", age: "Live", tone: "ok" as const },
  { name: "Pharmacy pickups", age: "Yesterday", tone: "ok" as const },
  { name: "Discharge notes", age: "1–3 days late", tone: "soon" as const },
  { name: "Insurance claims", age: "~6 weeks behind", tone: "urgent" as const },
];
