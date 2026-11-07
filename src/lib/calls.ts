// Call specs: what Maria brings to the call (left), and the scripted demo call that fills
// the right panel. Mrs Chan follows the annex; the others follow the deck (page 4).
// Times are seconds into the call, compressed so the demo moves.

export type SectionKey = "changed" | "gaps" | "social" | "function" | "goals";
export type MedStatus = "taking" | "not" | "changed";

export type FollowUp = { ask: string; answer: string; value: string; note: string; status?: MedStatus };

export type Noticed = { id: string; text: string; source: string; age: string; plan: string; prov?: string };
export type Field = { key: string; section: SectionKey; label: string; value: string; source?: string; book?: string; prov?: string };
export type Med = { key: string; name: string; source: string; conflict?: string; prov?: string };
export type TaskSeed = { text: string; kind: "heard" | "suggested" };

export type Fill = { key: string; value: string; note?: string; unsure?: FollowUp };
export type MedFill = { key: string; status: MedStatus; detail: string; note?: string; unsure?: FollowUp };

export type Line = {
  at: number;
  who: string; // "maria" | "patient" | a name
  text: string;
  covers?: string; // a noticed/plan id
  fill?: Fill[];
  meds?: MedFill[];
  tasks?: TaskSeed[];
  note?: string;
};

export type CallSpec = {
  speaking: string; // who Maria is talking to
  phone: string;
  tags: { text: string; warn?: boolean }[];
  noticed: Noticed[];
  plan: { id: string; text: string }[]; // starting plan
  carried: string[]; // open tasks from the last signed call
  people: string[]; // who can be added
  joined?: string[]; // already on the line
  translated?: string;
  meds: Med[];
  fields: Field[];
  lines: Line[];
};

export const sectionTitles: Record<SectionKey, string> = {
  changed: "What changed",
  gaps: "Care gaps",
  social: "Social needs and caregiver",
  function: "Functioning",
  goals: "Goals",
};

export const specs: Record<string, CallSpec> = {
  /* ---------------- Mrs Chan: from the annex ---------------- */
  "lai-fong-chan": {
    speaking: "Grace (daughter, caregiver)",
    phone: "(555) 016-8891",
    tags: [{ text: "Speaking with caregiver" }, { text: "Consent: no authorised representative", warn: true }],
    noticed: [
      { id: "consent", text: "Grace is not her authorised representative yet", source: "Consent record", age: "on file", plan: "Confirm consent to talk with Grace" },
      { id: "amlo", text: "Amlodipine filled at two pharmacies, 20 and 22 Oct", source: "Pharmacy claims", age: "2 weeks", plan: "Check which amlodipine she takes" },
      { id: "mobility", text: "Health form says she “walks without help”, from before the hip fracture", source: "HRA", age: "Nov 2025", plan: "Re-ask mobility since the fracture" },
      { id: "strain", text: "“Daughter sounds exhausted, missing work”", source: "Care record", age: "30 Oct", plan: "Ask how Grace is coping" },
      { id: "bed", text: "Hospital-bed approval pending for 14 days", source: "Prior auth", age: "26 Oct", plan: "Check on the hospital bed" },
    ],
    plan: [
      { id: "consent", text: "Confirm consent to talk with Grace" },
      { id: "amlo", text: "Check which amlodipine she takes" },
      { id: "review", text: "Book the yearly review" },
    ],
    carried: [],
    people: ["Cantonese interpreter", "Rosa, social worker"],
    joined: ["Cantonese interpreter"],
    meds: [{ key: "amlo", name: "Amlodipine", source: "Prescription · 2 pharmacy fills", conflict: "Double fill", prov: "chan.amlodipine" }],
    fields: [
      { key: "event", section: "changed", label: "Recent events", value: "SNF discharge 16 Oct, hip fracture", source: "Discharge note · 16 Oct", prov: "chan.event" },
      { key: "language", section: "social", label: "Language", value: "English", source: "Eligibility · 1 Oct", prov: "chan.language" },
      { key: "falls", section: "changed", label: "Falls since discharge", value: "" },
      { key: "review", section: "gaps", label: "Yearly review", value: "Due Fri 13 Nov", source: "Care gaps · 1 Nov", book: "Book review" },
      { key: "strain", section: "social", label: "Caregiver", value: "Grace, works full time; strain noted 30 Oct", source: "Care record · 30 Oct", prov: "chan.caregiver" },
      { key: "equip", section: "social", label: "Equipment", value: "Hospital bed pending approval; walker", source: "Prior auth · 26 Oct" },
      { key: "mobility", section: "function", label: "Mobility", value: "Walks without help", source: "HRA · Nov 2025, before the fracture", prov: "chan.mobility" },
      { key: "goals", section: "goals", label: "Her goal", value: "" },
    ],
    lines: [
      { at: 2, who: "maria", text: "Hello Grace, it’s Maria from your mother’s health plan. Is it all right to talk about her care today?" },
      {
        at: 6,
        who: "Grace",
        text: "Yes, that’s fine. Mum’s here, and the interpreter can talk with her too.",
        covers: "consent",
        fill: [{ key: "language", value: "Cantonese, interpreter needed", note: "Mrs Chan speaks Cantonese; an interpreter is needed." }],
        tasks: [{ text: "Send Grace the authorised-representative form", kind: "suggested" }],
        note: "Grace agreed to discuss her mother’s care; Mrs Chan present with a Cantonese interpreter.",
      },
      { at: 10, who: "maria", text: "Two pharmacies filled her amlodipine in October. Which one is she taking?" },
      {
        at: 15,
        who: "Grace",
        text: "Both, I think. One from each shop.",
        covers: "amlo",
        meds: [
          {
            key: "amlo",
            status: "changed",
            detail: "Taking both supplies?",
            unsure: {
              ask: "Can you read me both labels, so we keep just one?",
              answer: "Same pill, same dose. I’ll put one bag away.",
              status: "taking",
              value: "Taking one supply; duplicate put away",
              note: "Amlodipine was filled twice; Grace has put the duplicate away.",
            },
          },
        ],
        tasks: [{ text: "Ask the pharmacy to cancel the duplicate amlodipine", kind: "suggested" }],
      },
      {
        at: 21,
        who: "Grace",
        text: "Since the fall she uses a walker. She can’t manage the stairs now.",
        covers: "mobility",
        fill: [
          { key: "mobility", value: "Uses a walker; can’t manage stairs", note: "Uses a walker since the fracture and can’t manage stairs." },
          { key: "falls", value: "No new falls mentioned" },
        ],
      },
      {
        at: 26,
        who: "Grace",
        text: "And the hospital bed still hasn’t come. She’s sleeping in the chair.",
        covers: "bed",
        fill: [{ key: "equip", value: "Bed not delivered; sleeping in a chair; walker in use", note: "The hospital bed has not arrived; she is sleeping in a chair." }],
        tasks: [
          { text: "Grace says the bed hasn’t arrived", kind: "heard" },
          { text: "Chase the hospital-bed approval (pending 14 days)", kind: "suggested" },
        ],
      },
      { at: 31, who: "maria", text: "How are you managing yourself, Grace?" },
      {
        at: 34,
        who: "Grace",
        text: "Honestly, I’m exhausted. I’ve missed a lot of work.",
        covers: "strain",
        fill: [{ key: "strain", value: "Grace: strain, offer respite (D-SNP benefit)", note: "Grace reports exhaustion and missed work." }],
        tasks: [{ text: "Offer Grace respite care (D-SNP benefit)", kind: "suggested" }],
      },
      {
        at: 39,
        who: "Grace",
        text: "Mum keeps saying she doesn’t want to fall again.",
        fill: [{ key: "goals", value: "“I don’t want to fall again”", note: "Her goal: not to fall again." }],
      },
      { at: 43, who: "maria", text: "Can we do her yearly review on Friday, with the interpreter?" },
      {
        at: 46,
        who: "Grace",
        text: "Friday afternoon works.",
        covers: "review",
        fill: [{ key: "review", value: "Booked Fri 13 Nov, afternoon, with interpreter", note: "Yearly review booked for Friday 13 Nov with an interpreter." }],
        tasks: [{ text: "Book the interpreter for Friday’s review", kind: "heard" }],
      },
    ],
  },

  /* ---------------- Tanya ---------------- */
  "tanya-brooks": {
    speaking: "Tanya Brooks (patient)",
    phone: "(555) 012-6678 · mobile",
    tags: [{ text: "Speaking with patient" }, { text: "Mental health sharing: consent on file" }],
    noticed: [
      { id: "stop", text: "Pharmacy refilled sertraline on 5 Nov; the hospital stopped it on 2 Nov", source: "Pharmacy claims", age: "4 days", plan: "Check sertraline: stopped or taking?" },
      { id: "home", text: "Hospital note says “staying with a friend”; health form says stable home", source: "Discharge note", age: "2 Nov", plan: "Ask where she is staying" },
      { id: "visit", text: "7-day follow-up after the mental health stay is due today", source: "Care gaps", age: "today", plan: "Offer a video psychiatry visit today" },
      { id: "number", text: "Last outreach went to voicemail", source: "Call log", age: "3 Nov", plan: "Confirm best number and time" },
    ],
    plan: [
      { id: "stop", text: "Check sertraline: stopped or taking?" },
      { id: "visit", text: "Offer a video psychiatry visit today" },
    ],
    carried: [],
    people: ["Rosa, social worker", "Interpreter line"],
    meds: [
      { key: "sert", name: "Sertraline 100 mg", source: "Discharge note · pharmacy fill", conflict: "Stopped vs refilled", prov: "tanya.sertraline" },
      { key: "arip", name: "Aripiprazole 5 mg", source: "Discharge note · picked up 3 Nov" },
    ],
    fields: [
      { key: "stay", section: "changed", label: "Recent events", value: "St Clare Behavioral, 28 Oct – 2 Nov", source: "Admit alert · 2 Nov", prov: "tanya.event" },
      { key: "home", section: "changed", label: "Home situation", value: "Stable home, lives alone", source: "Health form · 20 Feb", prov: "tanya.housing" },
      { key: "visit", section: "gaps", label: "7-day follow-up", value: "Due today", source: "Care gaps · today", book: "Book visit" },
      { key: "ride", section: "social", label: "Transport", value: "" },
      { key: "daily", section: "function", label: "Daily tasks and mood", value: "" },
      { key: "goals", section: "goals", label: "Her goal", value: "" },
    ],
    lines: [
      { at: 2, who: "maria", text: "Hi Tanya, it’s Maria from your health plan. Is now still a good time?" },
      { at: 5, who: "patient", text: "Yes, I’m on my break." },
      { at: 8, who: "maria", text: "The hospital stopped your sertraline. Are you still taking it?" },
      {
        at: 12,
        who: "patient",
        text: "I stopped it like they said, but the pharmacy sent another pack.",
        covers: "stop",
        meds: [{ key: "sert", status: "not", detail: "Stopped as the hospital asked; unused refill at home", note: "She stopped sertraline as the hospital asked; an unused refill is at home." }],
        tasks: [{ text: "Ask the pharmacy to cancel the sertraline refill", kind: "suggested" }],
      },
      { at: 16, who: "maria", text: "Where are you staying at the moment?" },
      {
        at: 19,
        who: "patient",
        text: "I’m at my friend’s place for now.",
        covers: "home",
        fill: [{ key: "home", value: "Staying with a friend, for now", note: "She is staying with a friend for now." }],
        tasks: [{ text: "Refer to the social worker for housing help", kind: "suggested" }],
      },
      {
        at: 23,
        who: "patient",
        text: "I’m managing, I guess. Some days are hard.",
        fill: [
          {
            key: "daily",
            value: "Low mood on some days?",
            unsure: {
              ask: "When you say some days are hard, is that your mood, or day-to-day things like cooking?",
              answer: "Mostly my mood. I can do the day-to-day stuff.",
              value: "Independent with daily tasks; low mood on some days",
              note: "Independent with daily tasks; low mood on some days.",
            },
          },
        ],
      },
      {
        at: 27,
        who: "patient",
        text: "Getting to appointments is hard. I don’t have a ride.",
        fill: [{ key: "ride", value: "No ride to appointments", note: "No ride to appointments." }],
      },
      { at: 31, who: "maria", text: "Could you do a video visit with psychiatry this afternoon, at 4?" },
      {
        at: 34,
        who: "patient",
        text: "Yes, 4 works.",
        covers: "visit",
        fill: [{ key: "visit", value: "Booked: video psychiatry visit today, 4 pm", note: "Agreed to a video psychiatry visit today at 4 pm." }],
        tasks: [{ text: "Video psychiatry visit today at 4 pm", kind: "heard" }],
      },
      {
        at: 38,
        who: "patient",
        text: "I just want to keep my job and feel steady again.",
        fill: [{ key: "goals", value: "“Keep my job and feel steady again”", note: "Her goal: keep her job and feel steady again." }],
      },
      { at: 42, who: "maria", text: "Is this mobile still the best number?" },
      { at: 45, who: "patient", text: "Yes. Mornings are best.", covers: "number", note: "Best contact: this mobile, mornings." },
    ],
  },

  /* ---------------- Walter ---------------- */
  "walter-briggs": {
    speaking: "Joan (wife), then Walter",
    phone: "(555) 014-2210 · home",
    tags: [{ text: "Speaking with patient and wife" }],
    noticed: [
      { id: "dose", text: "Discharge says furosemide 40 mg twice daily; the pharmacy last filled 20 mg on 20 Oct", source: "Discharge summary", age: "7 Nov", plan: "Confirm his furosemide dose", prov: "walter.furosemide" },
      { id: "pills", text: "New spironolactone on the discharge list was never picked up", source: "Pharmacy claims", age: "2 days", plan: "Check the new heart pill" },
      { id: "stay", text: "Admit alert had no reason; the summary came 31 hours later", source: "Discharge summary", age: "8 Nov", plan: "Ask about breathing since the stay" },
      { id: "cardio", text: "Heart specialist visit is not booked", source: "Care gaps", age: "today", plan: "Book the heart specialist" },
    ],
    plan: [
      { id: "dose", text: "Confirm his furosemide dose" },
      { id: "pills", text: "Check the new heart pill" },
      { id: "weights", text: "Ask about daily weights" },
      { id: "cardio", text: "Book the heart specialist" },
    ],
    carried: [],
    people: ["Joan, wife", "Rosa, social worker"],
    meds: [
      { key: "furo", name: "Furosemide", source: "Discharge 40 mg twice daily · pharmacy 20 mg", conflict: "Dose conflict", prov: "walter.furosemide" },
      { key: "spiro", name: "Spironolactone 25 mg", source: "Discharge list · 7 Nov", conflict: "Not collected" },
    ],
    fields: [
      { key: "stay", section: "changed", label: "Recent events", value: "Heart-failure stay; home Sat 7 Nov", source: "Admit alert · 7 Nov" },
      { key: "cardio", section: "gaps", label: "Heart specialist", value: "Visit within 5 days", source: "Care gaps · 8 Nov", book: "Book visit" },
      { key: "ride", section: "social", label: "Transport", value: "" },
      { key: "collect", section: "social", label: "Who collects his medicines", value: "" },
      { key: "weights", section: "function", label: "Daily weights", value: "" },
      { key: "breath", section: "function", label: "Breathing and stairs", value: "" },
      { key: "goals", section: "goals", label: "His goal", value: "" },
    ],
    lines: [
      { at: 2, who: "maria", text: "Hello, this is Maria from the health plan, calling for Walter." },
      { at: 5, who: "Joan", text: "This is Joan, his wife. I’ll put him on." },
      { at: 9, who: "patient", text: "Hello? Walter here." },
      { at: 12, who: "maria", text: "Which water pill are you taking now, the furosemide?" },
      {
        at: 16,
        who: "patient",
        text: "The 20 milligram one, once a day. Same as before.",
        covers: "dose",
        meds: [{ key: "furo", status: "changed", detail: "Taking 20 mg once a day; discharge says 40 mg twice daily", note: "He is still taking furosemide 20 mg once a day; the discharge dose is 40 mg twice daily." }],
        tasks: [{ text: "Confirm furosemide 40 mg twice daily with his cardiologist", kind: "suggested" }],
      },
      { at: 20, who: "maria", text: "And the new spironolactone from the hospital?" },
      {
        at: 23,
        who: "patient",
        text: "Never picked it up. Joan can’t drive me this week.",
        covers: "pills",
        meds: [{ key: "spiro", status: "not", detail: "Not collected", note: "He has not collected the new spironolactone." }],
        fill: [{ key: "ride", value: "No transport this week", note: "No transport this week." }],
        tasks: [{ text: "Home delivery of furosemide 40 mg and spironolactone today", kind: "suggested" }],
      },
      {
        at: 27,
        who: "Joan",
        text: "Our son might get them, or maybe I can. I’m not sure yet.",
        fill: [
          {
            key: "collect",
            value: "Son or Joan collects?",
            unsure: {
              ask: "Would home delivery be easier, so nobody has to collect them?",
              answer: "Yes, delivery is much easier for us.",
              value: "Home delivery; nobody needs to collect",
              note: "Joan prefers home delivery, so nobody has to collect his medicines.",
            },
          },
        ],
      },
      { at: 31, who: "maria", text: "Are you weighing yourself every morning?" },
      {
        at: 34,
        who: "patient",
        text: "No, we don’t have scales at home.",
        covers: "weights",
        fill: [{ key: "weights", value: "Not weighing; no scales at home", note: "He is not weighing himself; there are no scales at home." }],
        tasks: [{ text: "Send home scales and a daily weight log", kind: "suggested" }],
      },
      {
        at: 38,
        who: "patient",
        text: "I get out of breath on the stairs, about the same as before.",
        covers: "stay",
        fill: [{ key: "breath", value: "Breathless on stairs; no worse than before", note: "Breathless on stairs, no worse than before the stay." }],
      },
      { at: 42, who: "maria", text: "I’ll book your heart specialist before the end of the week." },
      {
        at: 45,
        who: "patient",
        text: "Thursday morning is best.",
        covers: "cardio",
        fill: [{ key: "cardio", value: "Booked Thu 12 Nov, morning", note: "Heart specialist booked for Thursday 12 Nov, morning." }],
        tasks: [{ text: "Heart specialist booked, Thu 12 Nov", kind: "heard" }],
      },
      { at: 49, who: "patient", text: "I just don’t want to go back in.", fill: [{ key: "goals", value: "“I don’t want to go back in”", note: "His goal: stay out of hospital." }] },
    ],
  },

  /* ---------------- Darnell ---------------- */
  "darnell-price": {
    speaking: "Darnell Price (patient)",
    phone: "(555) 019-4471 · new mobile from the ER",
    tags: [{ text: "Speaking with patient" }, { text: "Old number disconnected", warn: true }],
    noticed: [
      { id: "number", text: "Five calls to the old number since September failed", source: "Call log", age: "since Sep", plan: "Confirm the new number" },
      { id: "asthma", text: "4 ER visits in 90 days; claims show only 2", source: "Hospital alerts", age: "3 days", plan: "Ask about his breathing" },
      { id: "preventer", text: "Preventer inhaler not refilled recently", source: "Pharmacy claims", age: "this month", plan: "Restart the preventer inhaler" },
    ],
    plan: [
      { id: "number", text: "Confirm the new number" },
      { id: "preventer", text: "Restart the preventer inhaler" },
    ],
    carried: [],
    people: ["Rosa, social worker"],
    meds: [
      { key: "prev", name: "Preventer inhaler", source: "Prescription · no recent fill", conflict: "Not refilled" },
      { key: "rel", name: "Reliever inhaler", source: "Pharmacy · filled" },
    ],
    fields: [
      { key: "er", section: "changed", label: "Recent events", value: "ER visit Fri 6 Nov; 4 in 90 days", source: "Hospital alerts · 6 Nov" },
      { key: "follow", section: "gaps", label: "Asthma follow-up", value: "Due within 7 days of the ER visit", source: "Care gaps · 6 Nov", book: "Book follow-up" },
      { key: "work", section: "social", label: "Work and triggers", value: "" },
      { key: "breath", section: "function", label: "Breathing", value: "" },
      { key: "goals", section: "goals", label: "His goal", value: "" },
    ],
    lines: [
      { at: 2, who: "maria", text: "Hi Darnell, it’s Maria from your health plan. I got this number from the ER on Friday." },
      { at: 6, who: "patient", text: "Yeah, my old phone got cut off.", covers: "number", note: "Reached on the new mobile from Friday’s ER visit." },
      { at: 10, who: "maria", text: "How’s your breathing since Friday?" },
      {
        at: 13,
        who: "patient",
        text: "Better. I’ve been using the blue one a lot.",
        covers: "asthma",
        meds: [{ key: "rel", status: "taking", detail: "Using it a lot since Friday", note: "Using his reliever a lot since Friday." }],
        fill: [{ key: "breath", value: "Better since Friday" }],
      },
      { at: 17, who: "maria", text: "Are you using the brown preventer inhaler every day?" },
      {
        at: 20,
        who: "patient",
        text: "I ran out a while back.",
        covers: "preventer",
        meds: [{ key: "prev", status: "not", detail: "Ran out a while back", note: "He ran out of his preventer inhaler." }],
        tasks: [{ text: "Refill the preventer inhaler today", kind: "suggested" }],
      },
      { at: 24, who: "maria", text: "I’ll get it refilled today and book a follow-up with your doctor." },
      {
        at: 27,
        who: "patient",
        text: "Okay, thanks.",
        fill: [{ key: "follow", value: "Agreed: follow-up within 2 days", note: "Agreed to a follow-up within 2 days." }],
        tasks: [{ text: "Asthma follow-up within 2 days", kind: "heard" }],
      },
      {
        at: 30,
        who: "patient",
        text: "Work’s been rough. Dust everywhere.",
        fill: [
          {
            key: "work",
            value: "Dust at work?",
            unsure: {
              ask: "Is the dust at work making your asthma worse?",
              answer: "Yeah, it’s a warehouse. Worst on loading days.",
              value: "Warehouse dust triggers his asthma",
              note: "Warehouse dust at work triggers his asthma.",
            },
          },
        ],
      },
      { at: 35, who: "patient", text: "I just want to stop ending up in the ER.", fill: [{ key: "goals", value: "“Stop ending up in the ER”", note: "His goal: stay out of the ER." }] },
    ],
  },

  /* ---------------- Elena ---------------- */
  "elena-delgado": {
    speaking: "Elena Delgado (patient)",
    phone: "(555) 016-8854 · kept after the record merge",
    tags: [{ text: "Speaking with patient" }, { text: "Spanish" }],
    noticed: [
      { id: "insulin", text: "No insulin pickup since 18 July (16 weeks)", source: "Pharmacy claims", age: "16 weeks", plan: "Ask why she stopped insulin" },
      { id: "risk", text: "Risk score up 78%", source: "Risk model", age: "1 Nov", plan: "Ask about symptoms" },
      { id: "number", text: "Two member records merged; they had different phones", source: "Eligibility", age: "this week", plan: "Confirm this number" },
    ],
    plan: [
      { id: "insulin", text: "Ask why she stopped insulin" },
      { id: "number", text: "Confirm this number" },
    ],
    carried: [],
    people: ["Spanish interpreter", "Rosa, social worker"],
    translated: "Spanish",
    meds: [{ key: "ins", name: "Insulin", source: "Prescription · last fill 18 Jul", conflict: "16-week gap" }],
    fields: [
      { key: "records", section: "changed", label: "Records", value: "Two member records merged this week", source: "Eligibility · 5 Nov" },
      { key: "dm", section: "gaps", label: "Diabetes review", value: "Overdue", source: "Care gaps · 1 Nov", book: "Book review" },
      { key: "cost", section: "social", label: "Cost and access", value: "" },
      { key: "energy", section: "function", label: "Energy", value: "" },
      { key: "goals", section: "goals", label: "Her goal", value: "" },
    ],
    lines: [
      { at: 2, who: "maria", text: "Hi Elena, it’s Maria from your health plan." },
      { at: 6, who: "patient", text: "Hello. Yes, this number is right.", covers: "number", note: "Reached on the number kept after the record merge." },
      { at: 10, who: "maria", text: "I see you haven’t picked up your insulin since July. What happened?" },
      {
        at: 14,
        who: "patient",
        text: "It got too expensive after my plan changed.",
        covers: "insulin",
        meds: [{ key: "ins", status: "not", detail: "Stopped in July because of cost", note: "She stopped insulin in July because of cost." }],
        fill: [
          {
            key: "cost",
            value: "Cost barrier?",
            unsure: {
              ask: "Would a lower-cost option or a mail-order supply help?",
              answer: "Yes, if it’s cheaper I’ll take it.",
              value: "Cost barrier; open to a lower-cost supply",
              note: "Open to a lower-cost or mail-order insulin supply.",
            },
          },
        ],
        tasks: [{ text: "Find a lower-cost insulin supply", kind: "suggested" }],
      },
      { at: 20, who: "patient", text: "I feel tired all the time.", covers: "risk", fill: [{ key: "energy", value: "Tired all the time", note: "Reports feeling tired all the time." }] },
      { at: 24, who: "maria", text: "I’ll let your doctor know and book a diabetes review." },
      {
        at: 27,
        who: "patient",
        text: "Okay, thank you. Evenings are best.",
        fill: [{ key: "dm", value: "Agreed; evenings preferred", note: "Agreed to a diabetes review; evenings preferred." }],
        tasks: [{ text: "Tell her doctor and book a diabetes review", kind: "suggested" }],
      },
      { at: 31, who: "patient", text: "I want to see my grandkids grow up.", fill: [{ key: "goals", value: "“See my grandkids grow up”", note: "Her goal: see her grandchildren grow up." }] },
    ],
  },
  "keisha-moore": {
    speaking: "Keisha Moore (patient)",
    phone: "(555) 017-3301 · mobile",
    tags: [{ text: "Speaking with patient" }, { text: "Prefers text" }],
    noticed: [
      { id: "visits", text: "No prenatal visit since 9 Sept; due in March", source: "Medical claims", age: "8 weeks", plan: "Ask what got in the way" },
      { id: "vitamins", text: "Prenatal vitamins last filled 2 Sept", source: "Pharmacy claims", age: "9 weeks", plan: "Ask about her vitamins" },
    ],
    plan: [
      { id: "visits", text: "Ask what got in the way" },
      { id: "book", text: "Book the next prenatal visit" },
    ],
    carried: [],
    people: ["Rosa, social worker"],
    meds: [{ key: "vit", name: "Prenatal vitamins", source: "Pharmacy · last fill 2 Sep", conflict: "9-week gap" }],
    fields: [
      { key: "prenatal", section: "gaps", label: "Prenatal visit", value: "Overdue", source: "Care gaps · 1 Nov", book: "Book visit" },
      { key: "ride", section: "social", label: "Getting to visits", value: "" },
      { key: "goal", section: "goals", label: "Her goal", value: "" },
    ],
    lines: [
      { at: 2, who: "maria", text: "Hi Keisha, it’s Maria from your health plan. Is now okay?" },
      { at: 6, who: "patient", text: "Yes, I’m on lunch." },
      { at: 9, who: "maria", text: "I noticed you haven’t been to a prenatal visit since September. What got in the way?" },
      {
        at: 14,
        who: "patient",
        text: "The clinic moved across town and the bus takes two hours.",
        covers: "visits",
        fill: [{ key: "ride", value: "No easy transport to the new clinic", note: "The clinic moved; the bus takes two hours." }],
        tasks: [{ text: "Arrange plan transport to prenatal visits", kind: "suggested" }],
      },
      {
        at: 19,
        who: "patient",
        text: "And I ran out of the vitamins a while ago.",
        covers: "vitamins",
        meds: [{ key: "vit", status: "not", detail: "Ran out", note: "She ran out of prenatal vitamins." }],
        tasks: [{ text: "Send a refill of prenatal vitamins", kind: "suggested" }],
      },
      { at: 24, who: "maria", text: "I can book a ride for you. Does next Tuesday work for a visit?" },
      {
        at: 28,
        who: "patient",
        text: "Tuesday morning is good.",
        covers: "book",
        fill: [{ key: "prenatal", value: "Booked Tue morning, with a ride", note: "Prenatal visit Tuesday morning; ride arranged." }],
      },
      { at: 32, who: "patient", text: "I just want the baby to be healthy.", fill: [{ key: "goal", value: "“A healthy baby”", note: "Her goal: a healthy baby." }] },
    ],
  },
  "andre-wilson": {
    speaking: "Andre Wilson (patient)",
    phone: "(555) 017-4420 · mobile",
    tags: [{ text: "Speaking with patient" }],
    noticed: [
      { id: "er", text: "ER visit for asthma on 28 Oct", source: "Hospital ADT feed", age: "12 days", plan: "Ask how his breathing is now" },
      { id: "rescue", text: "3 rescue inhaler fills in October, no controller", source: "Pharmacy claims", age: "this month", plan: "Ask how often he uses the rescue inhaler" },
    ],
    plan: [
      { id: "er", text: "Ask how his breathing is now" },
      { id: "rescue", text: "Ask how often he uses the rescue inhaler" },
    ],
    carried: [],
    people: ["Pharmacist"],
    meds: [
      { key: "alb", name: "Albuterol inhaler", source: "Pharmacy · 3 fills in Oct", conflict: "Heavy use" },
      { key: "ctl", name: "Controller inhaler", source: "No prescription on record" },
    ],
    fields: [
      { key: "followup", section: "gaps", label: "Asthma follow-up", value: "Due Thursday", source: "ER discharge · 5 Nov", book: "Book follow-up" },
      { key: "triggers", section: "function", label: "Triggers", value: "" },
      { key: "goal", section: "goals", label: "His goal", value: "" },
    ],
    lines: [
      { at: 2, who: "maria", text: "Hi Andre, it’s Maria from your health plan. How’s your breathing since the ER?" },
      {
        at: 6,
        who: "patient",
        text: "Better, but I’m using the blue inhaler most days.",
        covers: "er",
        meds: [{ key: "alb", status: "taking", detail: "Most days", note: "Uses the rescue inhaler most days." }],
      },
      { at: 10, who: "maria", text: "Did anyone give you a daily inhaler to prevent attacks?" },
      {
        at: 14,
        who: "patient",
        text: "I think they mentioned one, but I never got it.",
        covers: "rescue",
        meds: [
          {
            key: "ctl",
            status: "not",
            detail: "Never filled?",
            unsure: {
              ask: "Was it a prescription you didn’t pick up, or did no one write one?",
              answer: "No one wrote it. They just said see my doctor.",
              status: "not",
              value: "Never prescribed",
              note: "No controller inhaler was ever prescribed.",
            },
          },
        ],
        tasks: [{ text: "Ask his doctor to prescribe a controller inhaler", kind: "suggested" }],
      },
      {
        at: 20,
        who: "patient",
        text: "It gets worse at work, there’s a lot of dust.",
        fill: [{ key: "triggers", value: "Dust at work", note: "Symptoms worse with dust at work." }],
      },
      {
        at: 25,
        who: "patient",
        text: "Thursday after five works for the follow-up.",
        fill: [{ key: "followup", value: "Thu after 5 pm", note: "Follow-up Thursday after 5 pm." }],
      },
      { at: 29, who: "patient", text: "I want to play basketball again without stopping.", fill: [{ key: "goal", value: "“Play basketball without stopping”", note: "His goal: play basketball without stopping." }] },
    ],
  },
  "frank-novak": {
    speaking: "Frank Novak (patient) · son Mike joins",
    phone: "(555) 018-0912 · home",
    tags: [{ text: "Speaking with patient" }, { text: "Son Mike may join" }],
    noticed: [
      { id: "fall", text: "ER visit for a fall on 4 Nov", source: "Hospital ADT feed", age: "5 days", plan: "Ask how he is managing at home" },
      { id: "physio", text: "Physio recommended at discharge; nothing booked", source: "Discharge summary", age: "4 Nov", plan: "Book physio" },
    ],
    plan: [
      { id: "fall", text: "Ask how he is managing at home" },
      { id: "physio", text: "Book physio" },
    ],
    carried: [],
    people: ["Mike, son", "Home safety team"],
    meds: [{ key: "thin", name: "Blood thinner", source: "Pharmacy · picked up 1 Nov" }],
    fields: [
      { key: "physio", section: "gaps", label: "Physiotherapy", value: "Not booked", source: "Discharge summary · 4 Nov", book: "Book physio" },
      { key: "home", section: "social", label: "Living situation", value: "Lives alone", source: "Health form · Jun 2025" },
      { key: "mobility", section: "function", label: "Getting around", value: "" },
      { key: "goal", section: "goals", label: "His goal", value: "" },
    ],
    lines: [
      { at: 2, who: "maria", text: "Hi Frank, it’s Maria from your health plan. I heard you had a fall. How are you?" },
      {
        at: 6,
        who: "patient",
        text: "Sore, but I’m getting around with my old cane.",
        covers: "fall",
        fill: [{ key: "mobility", value: "Walking with a cane; sore", note: "Walking with a cane; still sore after the fall." }],
      },
      { at: 10, who: "maria", text: "Are you still taking your blood thinner?" },
      { at: 13, who: "patient", text: "Every morning, yes.", meds: [{ key: "thin", status: "taking", detail: "Every morning", note: "Taking his blood thinner every morning." }] },
      {
        at: 17,
        who: "patient",
        text: "The stairs to the bathroom are the hard part.",
        fill: [{ key: "home", value: "Lives alone; stairs to the bathroom are hard", note: "Stairs to the bathroom are difficult." }],
        tasks: [{ text: "Request a home safety check", kind: "suggested" }],
      },
      {
        at: 22,
        who: "Mike",
        text: "I can drive him to physio on Mondays.",
        covers: "physio",
        fill: [{ key: "physio", value: "Mondays; son drives", note: "Physio on Mondays; Mike will drive." }],
        tasks: [{ text: "Book physio on Mondays", kind: "suggested" }],
      },
      { at: 27, who: "patient", text: "I want to keep living in my own house.", fill: [{ key: "goal", value: "“Keep living in my own house”", note: "His goal: keep living in his own home." }] },
    ],
  },
  "margaret-ellis": {
    speaking: "Margaret Ellis (patient)",
    phone: "(555) 018-2276 · home",
    tags: [{ text: "Speaking with patient" }],
    noticed: [
      { id: "mammo", text: "No mammogram since 2023", source: "HEDIS gap engine", age: "this month", plan: "Book a mammogram" },
      { id: "eye", text: "No diabetic eye exam this year", source: "HEDIS gap engine", age: "this month", plan: "Book an eye exam" },
    ],
    plan: [
      { id: "mammo", text: "Book a mammogram" },
      { id: "eye", text: "Book an eye exam" },
    ],
    carried: [],
    people: [],
    meds: [{ key: "met", name: "Metformin", source: "Pharmacy · picked up 30 Oct" }],
    fields: [
      { key: "mammo", section: "gaps", label: "Mammogram", value: "Overdue", source: "HEDIS gap engine · 1 Nov", book: "Book mammogram" },
      { key: "eye", section: "gaps", label: "Diabetic eye exam", value: "Overdue", source: "HEDIS gap engine · 1 Nov", book: "Book eye exam" },
      { key: "goal", section: "goals", label: "Her goal", value: "" },
    ],
    lines: [
      { at: 2, who: "maria", text: "Hi Margaret, it’s Maria from your health plan. Just a quick one about two check-ups." },
      { at: 6, who: "patient", text: "Oh yes, I got your letter and forgot all about it." },
      {
        at: 10,
        who: "patient",
        text: "Could I do both on the same day?",
        covers: "mammo",
        fill: [{ key: "mammo", value: "Same day as eye exam", note: "Wants the mammogram and eye exam on the same day." }],
        tasks: [{ text: "Book mammogram and eye exam on one day", kind: "suggested" }],
      },
      {
        at: 15,
        who: "patient",
        text: "Afternoons are best, my daughter can drive me.",
        covers: "eye",
        fill: [{ key: "eye", value: "Afternoon, daughter drives", note: "Afternoons are best; her daughter drives." }],
      },
      { at: 20, who: "maria", text: "And the metformin, still once a day?" },
      { at: 23, who: "patient", text: "Twice now, the doctor changed it.", meds: [{ key: "met", status: "changed", detail: "Twice a day", note: "Metformin now twice a day." }] },
      { at: 27, who: "patient", text: "I’d like to stay well for my trip in the spring.", fill: [{ key: "goal", value: "“Stay well for a spring trip”", note: "Her goal: stay well for a trip in the spring." }] },
    ],
  },
};
