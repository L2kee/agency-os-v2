// Cold-calling playbook for the "sell a local business a $1,000 website" model.
// Scripts use {{merge_fields}} (see src/server/outreach/merge.ts) so Call Mode
// can fill in the business name, first name, city, etc. for the lead you're
// calling.
//
// Pure — no Supabase import, safe to import from Client Components
// (call-panel.tsx, playbook-browser.tsx). Content ported verbatim from the
// original agency-os app's src/lib/playbook.ts — do not paraphrase the
// scripts, only add to them.

export type SectionId =
  | "mindset"
  | "opener"
  | "gatekeeper"
  | "discovery"
  | "pitch"
  | "objections"
  | "close"
  | "rejection"
  | "voicemail";

export interface PlaybookSection {
  id: SectionId;
  title: string;
  blurb: string;
}

export const SECTIONS: PlaybookSection[] = [
  { id: "mindset", title: "Mindset & rules", blurb: "How to hold the call before you dial." },
  { id: "opener", title: "The opener", blurb: "First 15 seconds — earn the next 30." },
  { id: "gatekeeper", title: "Gatekeeper", blurb: "Get to the owner without lying." },
  { id: "discovery", title: "Discovery", blurb: "Turn ‘interested’ into ‘I want this’." },
  { id: "pitch", title: "Introduce the offer", blurb: "The $1k website, framed as a win." },
  { id: "objections", title: "Objection handling", blurb: "Word-for-word responses to every brush-off." },
  { id: "close", title: "The close", blurb: "Book the next step. Always." },
  { id: "rejection", title: "Handling rejection", blurb: "Exit clean, keep the door open." },
  { id: "voicemail", title: "Voicemail & no-answer", blurb: "What to leave, when to try again." },
];

// ---------------------------------------------------------------------------
// Script blocks — narrative guidance and word-for-word lines
// ---------------------------------------------------------------------------
export interface ScriptBlock {
  key: string;
  section: SectionId;
  title: string;
  /** Lines/paragraphs. Lines starting with `"` are meant to be said verbatim. */
  lines: string[];
  tip?: string;
}

export const SCRIPTS: ScriptBlock[] = [
  // ---- mindset ----
  {
    key: "mindset-frame",
    section: "mindset",
    title: "You are not begging — you're offering a fix",
    lines: [
      "Their business is losing customers every week to competitors who show up better online. You are the person calling to fix that. Call from that posture.",
      "Your goal on the call is NOT to sell a website. It is to book a 10-minute follow-up where you show them their current online presence vs. a competitor's.",
      "One 'yes, show me' out of every ~15 conversations is a healthy rate. Rejection is the job, not a failure.",
    ],
    tip: "Stand up. Smile. Talk 10% slower than feels natural. Have their Google listing open on screen.",
  },
  {
    key: "mindset-rules",
    section: "mindset",
    title: "Five rules",
    lines: [
      "1. Never pitch price on the first call unless they force it — book the demo first.",
      "2. Ask permission early ('did I catch you at an okay time?'). It disarms people.",
      "3. Every objection gets acknowledged before it gets answered. 'Totally fair' then respond.",
      "4. Talk less. After you ask a question, shut up and count to three.",
      "5. Always leave with a next step and a specific time — never 'I'll follow up'.",
    ],
  },

  // ---- opener ----
  {
    key: "opener-permission",
    section: "opener",
    title: "Permission opener (default)",
    lines: [
      '"Hi, is this {{first_name}}? — Hey {{first_name}}, my name\'s {{sender_name}}. I know you weren\'t expecting my call, do you have 30 seconds and I\'ll tell you why I\'m calling, and you can tell me to buzz off if it\'s not useful?"',
      "Wait for the yes. You almost always get it.",
      '"Appreciate it. I build websites for {{category}} businesses around {{city}}, and I was looking at {{business_name}} online — I noticed a couple of things that are probably costing you calls. Mind if I ask you a quick question about it?"',
    ],
    tip: "The 'tell me to buzz off' line lowers their guard because you've given them the exit.",
  },
  {
    key: "opener-honest",
    section: "opener",
    title: "Honest / pattern-interrupt opener",
    lines: [
      '"Hey {{first_name}}, I\'ll be honest with you — this is a cold call. Do you want to give me 20 seconds to explain, or should I try you another time?"',
      "People respect the honesty and it breaks the telemarketer script they're bracing for.",
    ],
  },
  {
    key: "opener-no-website",
    section: "opener",
    title: "When they have NO website",
    lines: [
      '"I looked {{business_name}} up and couldn\'t find a website — is that right, you\'re running mostly off {{website}} / Google / word of mouth right now?"',
      "Let them confirm. Then:",
      '"That\'s actually really common in your trade. The issue is when someone Googles \'{{category}} near me\', you\'re not in the running — even if you\'re the best in town. That\'s the gap I help close."',
    ],
  },
  {
    key: "opener-bad-website",
    section: "opener",
    title: "When they have an OLD / bad website",
    lines: [
      '"I found your site — looks like it\'s been a few years? On my phone the [menu / booking button / photos] were [hard to tap / not loading]. Have you looked at it on a phone recently?"',
      "Most owners haven't. Getting them to pull it up on their own phone while you're talking is the whole game.",
    ],
  },

  // ---- gatekeeper ----
  {
    key: "gk-direct",
    section: "gatekeeper",
    title: "Straight approach",
    lines: [
      '"Hi, could you help me out — who looks after the website and marketing for {{business_name}}? …And are they in today?"',
      "Confident, slightly rushed, like you've done this a hundred times (you have).",
    ],
  },
  {
    key: "gk-whos-calling",
    section: "gatekeeper",
    title: "‘What’s this regarding?’",
    lines: [
      '"I noticed a couple of issues with how {{business_name}} shows up online that are probably sending customers to competitors — I wanted to flag them for whoever handles that. Is that you, or is there someone better?"',
      "Don't say 'I'm selling websites'. Say you found a problem worth flagging.",
    ],
  },
  {
    key: "gk-callback",
    section: "gatekeeper",
    title: "Owner not in",
    lines: [
      '"No worries — when\'s the best time to catch them, mornings or afternoons? …And can I get their name so I\'m not just cold-calling \'the owner\'?"',
      "Now you have a name and a window. Log it and call back then.",
    ],
  },

  // ---- discovery ----
  {
    key: "disc-questions",
    section: "discovery",
    title: "Questions that build the gap",
    lines: [
      '"How are most new customers finding you right now?"',
      '"If someone new searches \'{{category}} {{city}}\' on their phone tonight — what do you think they find?"',
      '"Roughly what\'s a new customer worth to you over a year?"',
      '"When was the last time the site actually brought you a call or a booking?"',
      '"Have any of your competitors got a slick site that bugs you?"',
    ],
    tip: "You're not interrogating — you're helping them notice the leak themselves. Their answers become your pitch.",
  },
  {
    key: "disc-mirror",
    section: "discovery",
    title: "Make the gap concrete",
    lines: [
      "Do the math out loud with their numbers:",
      '"So a customer\'s worth about $[X], and you figure you\'re missing maybe [2–3] a month because people can\'t find or book you easily — that\'s [$X * 2-3] a month walking to the competitor with the better site. Does that sound about right or am I overstating it?"',
      "Let them agree to the number. Now the website isn't a cost, it's plugging a leak.",
    ],
  },
  {
    key: "disc-interested-to-willing",
    section: "discovery",
    title: "Interested → willing (the pivot)",
    lines: [
      "The moment they say something like 'yeah, we probably should sort that out':",
      '"Here\'s what I\'d suggest — let me build you a quick mockup of what a modern site for {{business_name}} would look like. No charge, no obligation. If you like it, we talk about making it live. If you don\'t, you\'ve lost nothing. Fair?"',
      "This is the yes you actually want on call one. It's tiny and risk-free for them.",
    ],
    tip: "‘Willing’ isn't ‘buys now’. It's ‘agrees to the next step’. Get the mockup meeting booked.",
  },

  // ---- pitch ----
  {
    key: "pitch-offer",
    section: "pitch",
    title: "The offer, said simply",
    lines: [
      '"What I do is straightforward: I build you a modern, mobile-first website — [5 pages, your services, photos, a click-to-call and a booking/contact form] — and I have it done in about a week. It\'s a one-time $1,000, and that includes getting it live and showing you how to update it."',
      "Then stop. Don't justify. Let them react.",
    ],
    tip: "Say the price like it's nothing — because for what they're losing, it is. If you flinch, they flinch.",
  },
  {
    key: "pitch-why-now",
    section: "pitch",
    title: "Why now, not ‘someday’",
    lines: [
      '"Every month this sits, that\'s customers you don\'t get back. The competitor who ranks above you today keeps that spot the longer you wait. A week of work now fixes it for years."',
    ],
  },
  {
    key: "pitch-risk-reversal",
    section: "pitch",
    title: "Take the risk off the table",
    lines: [
      '"You don\'t pay me a cent until you\'ve seen the site and you\'re happy with it. I\'ll build the first version, you look at it, we tweak it, and only then do we talk money. If you hate it, we shake hands and part ways."',
    ],
  },

  // ---- close ----
  {
    key: "close-assumptive",
    section: "close",
    title: "Assumptive next-step close",
    lines: [
      '"Okay — I\'ll put together the mockup for {{business_name}}. I can walk you through it [Thursday at 2, or Friday morning] — which works better?"',
      "Offer two times, not 'when are you free'.",
    ],
  },
  {
    key: "close-trial",
    section: "close",
    title: "Trial close (temperature check)",
    lines: [
      '"On a scale of 1 to 10, how likely are you to move on this if the mockup looks good?"',
      "If 7+: book it. If 4–6: 'What would make it a 9?' and handle that. If 1–3: ask what you're missing, or park them politely.",
    ],
  },
  {
    key: "close-summary",
    section: "close",
    title: "Lock it in",
    lines: [
      '"Great. So {{date}} at {{time}} I\'ll call and screen-share the mockup. I\'ll text you a reminder. What\'s the best number and email for you?"',
      "Confirm the channel, get the email, set the follow-up in the CRM before you hang up.",
    ],
  },

  // ---- rejection ----
  {
    key: "rej-graceful",
    section: "rejection",
    title: "Exit without burning it",
    lines: [
      '"No problem at all, {{first_name}} — I appreciate you hearing me out. Can I do this: I\'ll send you one email with an example of what I mean, and if it\'s ever relevant down the line you\'ve got my details. Sound okay?"',
      "A soft 'yes' to an email keeps them a lead instead of a dead end.",
    ],
  },
  {
    key: "rej-note",
    section: "rejection",
    title: "After you hang up",
    lines: [
      "Log the real reason (price / timing / has a guy / rude). Set a follow-up 60–90 days out unless it was a hard no.",
      "People's situations change — the 'we're fine' business calls you in 6 months when their competitor eats their lunch.",
    ],
  },
  {
    key: "rej-referral",
    section: "rejection",
    title: "Salvage a referral",
    lines: [
      '"Totally understand it\'s not for you. Do you know another {{category}} owner around {{city}} who might actually want this? I\'d rather get a warm intro from you than cold-call them."',
    ],
  },

  // ---- voicemail ----
  {
    key: "vm-first",
    section: "voicemail",
    title: "First voicemail",
    lines: [
      '"Hi {{first_name}}, it\'s {{sender_name}} — I build websites for {{category}} businesses around {{city}} and I spotted a couple of things costing {{business_name}} customers online. Quick 2-minute call, no pitch. I\'ll try you again [tomorrow AM], or reach me at [your number]. Thanks."',
      "Keep it under 20 seconds. Give a reason, a time, a number.",
    ],
  },
  {
    key: "vm-cadence",
    section: "voicemail",
    title: "No-answer cadence",
    lines: [
      "Call 1: no VM (a lot of people call back a missed number).",
      "Call 2 (next day, different time): leave the voicemail above.",
      "Call 3 (day 4): VM + send the intro email same day.",
      "Call 4 (day 8) and Call 5 (day 15): short VMs.",
      "After 6 touches with zero response, drop to a 90-day 'nurture' follow-up.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Objection cards
// ---------------------------------------------------------------------------
export type ObjectionCategory =
  | "price"
  | "timing"
  | "trust"
  | "diy"
  | "brushoff"
  | "authority"
  | "process";

export const OBJECTION_CATEGORIES: { id: ObjectionCategory; label: string }[] = [
  { id: "price", label: "Price / money" },
  { id: "timing", label: "Timing / ‘not now’" },
  { id: "trust", label: "Trust / skepticism" },
  { id: "diy", label: "‘Already handled’" },
  { id: "brushoff", label: "Brush-offs" },
  { id: "authority", label: "Not the decision-maker" },
  { id: "process", label: "‘Send me info’ / stalls" },
];

export interface Objection {
  key: string;
  category: ObjectionCategory;
  triggers: string[];
  why: string;
  responses: string[];
  thenDo?: string;
}

export const OBJECTIONS: Objection[] = [
  // ---- price ----
  {
    key: "obj-too-expensive",
    category: "price",
    triggers: ["That's too expensive", "$1,000 is a lot", "I can't spend that right now"],
    why: "They haven't connected the price to what they're losing. It's an abstract cost with no value anchor yet.",
    responses: [
      '"I hear you. Can I ask — what\'s one new customer worth to you over a year?" … "Right, so [$X]. The site pays for itself with [one or two] extra customers, and then it keeps working every month after. It\'s a one-time thing, not a subscription."',
      '"Totally fair. That\'s exactly why I build it first and you only pay once you\'ve seen it and it\'s live. You\'re not betting $1,000 on a promise."',
      '"Compared to what — one slow month because people picked the competitor who was easier to find? This is a week of work that fixes that for years."',
    ],
    thenDo: "If real budget issue: offer to split into 2 payments, or book the mockup anyway and revisit.",
  },
  {
    key: "obj-payment-plan",
    category: "price",
    triggers: ["Can I pay monthly?", "Do you do payment plans?"],
    why: "Usually a soft yes — they want it, cash flow is the friction.",
    responses: [
      '"Yeah, I can do $500 to start and $500 when it goes live. That work?"',
    ],
    thenDo: "Move straight to booking the mockup.",
  },
  {
    key: "obj-free-options",
    category: "price",
    triggers: ["I can get a free website from [Wix/Google/Facebook]", "My cousin can do it for free"],
    why: "They're pricing the tool, not the outcome. Free builders need someone who knows what they're doing.",
    responses: [
      '"You totally can — the tools are cheap. The catch is they take 40–60 hours to do right, and most end up half-finished because everyone\'s busy running the actual business. You\'re paying me to have it done properly in a week, not to babysit a website builder."',
      '"How\'s that going so far?" (If it\'s been \'in progress\' for a year, you\'ve made your point.)',
    ],
  },

  // ---- timing ----
  {
    key: "obj-not-now",
    category: "timing",
    triggers: ["Not right now", "Maybe in a few months", "It's our busy season"],
    why: "'Later' almost always means 'no' unless you pin it down. Sometimes it's genuine bandwidth.",
    responses: [
      '"No problem. The good news is I do all the work — I\'d need about 20 minutes of your time total. Busy season is actually the best argument for it: those are the customers searching for you right now."',
      '"Let\'s do this — I\'ll build the free mockup now while it\'s slow for me, and we sit on it until you\'re ready. That way when you say go, it\'s a two-day job, not a two-week one."',
    ],
    thenDo: "Get a specific date to reconnect and set the follow-up. 'Q2' is not a date.",
  },
  {
    key: "obj-call-back",
    category: "timing",
    triggers: ["Call me back next week", "Email me and we'll set something up"],
    why: "Polite deflection 80% of the time. Test how real it is by pinning an exact slot.",
    responses: [
      '"Happy to. Rather than play phone tag — you\'re near your calendar? Let\'s just grab 15 minutes now. Tuesday 10, or Wednesday 3?"',
      "If they still deflect: \"No worries — I'll call Tuesday at 10. If it's bad timing just don't pick up and I'll know to try later.\"",
    ],
  },

  // ---- trust ----
  {
    key: "obj-legit",
    category: "trust",
    triggers: ["How do I know you're legit?", "I've never heard of you", "This feels like a scam"],
    why: "Reasonable. You're a stranger asking for money. Lead with proof and zero-risk.",
    responses: [
      '"Fair question. Here\'s my website and two local businesses I\'ve done — call them. And you don\'t pay anything until your site is built and live and you\'re happy. I take the risk, not you."',
      '"I\'m local — I\'m in {{city}}. Happy to meet in person if that\'s easier."',
    ],
    thenDo: "Text them your portfolio link + a reference while you're on the phone.",
  },
  {
    key: "obj-burned-before",
    category: "trust",
    triggers: ["I paid someone before and they disappeared", "Last web guy ripped me off"],
    why: "They want to buy — they're scared of repeating a bad experience. Acknowledge hard.",
    responses: [
      '"That\'s the worst, and it\'s way too common in this industry. That\'s exactly why I don\'t take money up front and why I give you the logins so you\'re never locked out or held hostage. You own everything."',
    ],
  },

  // ---- diy / already handled ----
  {
    key: "obj-have-website",
    category: "diy",
    triggers: ["We already have a website", "We're all set"],
    why: "They have *a* site. Whether it works is the question — and they probably know it doesn't.",
    responses: [
      '"I saw it — that\'s actually why I called. On a phone the [X] doesn\'t [Y], and it\'s not showing up when I search \'{{category}} {{city}}\'. When did it last bring you an actual customer?"',
      '"If it\'s working great, I\'ll leave you alone — genuinely. Do me one favour: pull it up on your phone right now and tell me the booking button works."',
    ],
  },
  {
    key: "obj-nephew",
    category: "diy",
    triggers: ["My nephew/friend handles it", "We have a guy"],
    why: "The 'guy' is usually unavailable, slow, or a hobbyist. Don't insult them — outframe on reliability.",
    responses: [
      '"That\'s great that you\'ve got someone. How quickly can they turn things around when you need a change? … The reason I ask is most \'friend of the family\' sites go stale because that person has a day job. I do this full-time with a one-week turnaround."',
      '"Keep them for the small stuff — let me do the rebuild, hand it over, and they maintain it. Best of both."',
    ],
  },
  {
    key: "obj-referrals-only",
    category: "diy",
    triggers: ["All our business is word of mouth", "We don't need to advertise"],
    why: "Word of mouth still Googles you before they call. The site backs up the referral.",
    responses: [
      '"That\'s a sign you do great work — and it\'s exactly why a site matters. When someone refers you, the first thing the new person does is look you up. If there\'s nothing there, or it looks dated, that referral cools off. The site closes the people your reputation already sent."',
    ],
  },

  // ---- brush-offs ----
  {
    key: "obj-not-interested",
    category: "brushoff",
    triggers: ["Not interested", "We're good thanks"],
    why: "Reflex. Fired before they've heard anything. You get one polite re-ask.",
    responses: [
      '"Totally fair — you don\'t know yet if there\'s anything to be interested in. Give me one sentence: when someone searches \'{{category}} near me\' in {{city}}, does {{business_name}} come up? … If yes, I\'ll hang up happy. If not, that\'s worth 30 seconds."',
      "If still no: \"Understood. I'll send one email you can look at whenever — no follow-up calls. Fair?\"",
    ],
    thenDo: "One re-ask maximum. Respect the second no. Set a 90-day nurture follow-up.",
  },
  {
    key: "obj-busy-now",
    category: "brushoff",
    triggers: ["I'm with a customer", "Can't talk right now"],
    why: "Often true. Don't push — schedule.",
    responses: [
      '"No worries, I\'ll be quick another time — is [this afternoon] or [tomorrow morning] better for a 5-minute call?"',
    ],
    thenDo: "Log the callback time. Actually call then.",
  },
  {
    key: "obj-remove-list",
    category: "brushoff",
    triggers: ["Take me off your list", "Stop calling me"],
    why: "Hard no. Comply immediately — it's the law and it's the right call.",
    responses: [
      '"Absolutely — done, you won\'t hear from me again. Sorry to bother you, have a good one."',
    ],
    thenDo: "Mark the lead Lost with reason 'do not contact'. Never call or email again.",
  },

  // ---- authority ----
  {
    key: "obj-not-owner",
    category: "authority",
    triggers: ["I'd have to ask the owner", "That's not my call"],
    why: "Could be true, could be a shield. Enlist them instead of going around them.",
    responses: [
      '"Makes sense. Two options — I can call the owner directly if you give me a good time, or, if it\'s easier, I send you a 2-minute mockup video you can forward to them. Which do you prefer?"',
    ],
    thenDo: "Get the owner's name + best time, OR get the contact's email to send the mockup.",
  },
  {
    key: "obj-partner",
    category: "authority",
    triggers: ["I need to talk to my business partner / spouse"],
    why: "Legit and common in small business. Make it easy to sell it internally.",
    responses: [
      '"Of course. Let me build the free mockup so you\'ve got something concrete to show them instead of describing it. When you two usually talk shop — should I check back Monday?"',
    ],
  },

  // ---- process / stalls ----
  {
    key: "obj-send-info",
    category: "process",
    triggers: ["Just send me some information", "Email me a brochure"],
    why: "The politest brush-off there is. Emails to 'just send info' get ignored ~95% of the time.",
    responses: [
      '"I can — but honestly a generic email won\'t show you much. What\'s useful is a 2-minute mockup of your actual site. Give me your email, I\'ll send that specifically, and I\'ll follow up [Thursday]. Cool?"',
      "Get a micro-commitment: \"If the mockup looks good, are you open to a quick call about it?\"",
    ],
    thenDo: "Send the mockup (not a brochure). Set the follow-up date. Enroll in the email sequence.",
  },
  {
    key: "obj-think-about-it",
    category: "process",
    triggers: ["Let me think about it", "I'll get back to you"],
    why: "Something specific is unresolved — price, trust, timing, or a partner. Find it.",
    responses: [
      '"Sure. Just so I send the right info — is it the price, the timing, or wanting to see more of my work that\'s the sticking point?"',
      "Whatever they name, you have a card for it above. Handle that one thing, then re-close.",
    ],
  },
  {
    key: "obj-what-competitors",
    category: "process",
    triggers: ["Who else have you worked with?", "Show me examples"],
    why: "Buying signal, not an objection. They're doing due diligence.",
    responses: [
      '"Happy to — texting you my portfolio and two {{category}} clients right now. Take a look while we\'re talking. What\'s your email so I can also send the mockup?"',
    ],
    thenDo: "Treat as interested. Move the lead to Interested and book the mockup.",
  },
];

// ---------------------------------------------------------------------------
// Call outcomes (Call Mode logs one of these)
// ---------------------------------------------------------------------------
export interface CallOutcome {
  id: string;
  label: string;
  /** Optional pipeline stage to move the lead to when this outcome is logged. */
  moveTo?: string;
  /** Suggested follow-up in days (Call Mode pre-fills this). */
  followUpDays?: number;
  tone: "good" | "neutral" | "bad";
}

export const CALL_OUTCOMES: CallOutcome[] = [
  { id: "booked", label: "Booked a demo / mockup call", moveTo: "interested", followUpDays: 2, tone: "good" },
  { id: "interested", label: "Interested — needs follow-up", moveTo: "interested", followUpDays: 3, tone: "good" },
  { id: "callback", label: "Call back later (bad timing)", moveTo: "contacted", followUpDays: 3, tone: "neutral" },
  { id: "gatekeeper", label: "Gatekeeper — owner not in", moveTo: "contacted", followUpDays: 1, tone: "neutral" },
  { id: "voicemail", label: "Left voicemail", moveTo: "contacted", followUpDays: 2, tone: "neutral" },
  { id: "no_answer", label: "No answer / no voicemail", moveTo: "contacted", followUpDays: 1, tone: "neutral" },
  { id: "not_interested", label: "Not interested", followUpDays: 90, tone: "bad" },
  { id: "not_qualified", label: "Not a fit / bad number", moveTo: "lost", tone: "bad" },
  { id: "do_not_contact", label: "Do not contact", moveTo: "lost", tone: "bad" },
];

export function outcomeById(id: string) {
  return CALL_OUTCOMES.find((o) => o.id === id);
}
