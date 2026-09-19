export const AUDIT_DATE = "September 14, 2026";
export const AUDIT_SITES = ["https://total-test.com", "https://total-testing-mold.com", "https://total-testing-diy.com"];

export const TRACKED_KEYWORDS = [
  { id: "brand", keyword: "total testing mold", intent: "Brand", volume: 50, difficulty: "Low", target: 1, evidence: "Homepage ranks when people already know the name." },
  { id: "no-kit", keyword: "diy mold test no kit", intent: "Commercial", volume: 210, difficulty: "Low", target: 3, evidence: "total-test.com and total-testing-mold.com show up for this unique angle." },
  { id: "no-kit-needed", keyword: "mold test no kit needed", intent: "Commercial", volume: 90, difficulty: "Low", target: 3, evidence: "Your differentiator. Thin pages, but you do appear." },
  { id: "diy-mold-test-kit", keyword: "diy mold test kit", intent: "Commercial", volume: 2400, difficulty: "High", target: 3, evidence: "Page 1 is Home Armor, MycoTest, Moldlab. Total Testing is not there." },
  { id: "mold-test-kit", keyword: "mold test kit", intent: "Commercial", volume: 6600, difficulty: "High", target: 5, evidence: "Hardware-store kits and lab-kit brands own this. You are invisible." },
  { id: "home-mold-test-kit", keyword: "home mold test kit", intent: "Commercial", volume: 1900, difficulty: "Medium", target: 3, evidence: "Not on page 1." },
  { id: "mold-test-kit-lab", keyword: "mold test kit with lab analysis", intent: "Commercial", volume: 480, difficulty: "Medium", target: 3, evidence: "MycoTest and Moldlab occupy this. Your products page is too thin to compete." },
  { id: "black-mold-test-kit", keyword: "black mold test kit", intent: "Commercial", volume: 1300, difficulty: "High", target: 5, evidence: "Not on page 1. No dedicated black-mold article." },
  { id: "how-to-test-mold", keyword: "how to test for mold in your home", intent: "Informational", volume: 3600, difficulty: "Medium", target: 5, evidence: "EPA and publishers rank. You have no how-to blog." },
  { id: "diy-vs-pro", keyword: "diy mold test vs professional inspection", intent: "Informational", volume: 720, difficulty: "Low", target: 3, evidence: "Homepage comparison table exists but is not a rankable article URL." },
  { id: "read-mold-results", keyword: "how to read mold test results", intent: "Informational", volume: 880, difficulty: "Low", target: 3, evidence: "No article. This should be an easy win after purchase + SEO." },
  { id: "mold-testing-houston", keyword: "mold testing houston", intent: "Local", volume: 1600, difficulty: "High", target: 5, evidence: "Licensed on-site inspectors own Maps and organic. No Google listing found for Total Testing." },
  { id: "mold-inspection-kit", keyword: "mold inspection kit", intent: "Commercial", volume: 590, difficulty: "Medium", target: 5, evidence: "Not ranking. Also fights your “no kit” message." },
  { id: "air-quality-mold-test", keyword: "air quality mold test kit", intent: "Commercial", volume: 720, difficulty: "Medium", target: 5, evidence: "You do surface swabs, not air cassettes. Do not chase this until you sell air tests." },
  { id: "is-mold-testing-worth-it", keyword: "is a mold test kit worth it", intent: "Informational", volume: 390, difficulty: "Low", target: 3, evidence: "No content. Strong ad-support page if written honestly." },
  { id: "household-swab", keyword: "mail in mold swab test", intent: "Commercial", volume: 320, difficulty: "Medium", target: 3, evidence: "MycoTest already sells a household tape/Q-tip option. You need a dedicated landing page." },
];

/** Google rank from public SERP checks. NR = not on page 1. */
export const AUDIT_RANKS = {
  brand: "1",
  "no-kit": "6",
  "no-kit-needed": "8",
  "diy-mold-test-kit": "NR",
  "mold-test-kit": "NR",
  "home-mold-test-kit": "NR",
  "mold-test-kit-lab": "NR",
  "black-mold-test-kit": "NR",
  "how-to-test-mold": "NR",
  "diy-vs-pro": "NR",
  "read-mold-results": "NR",
  "mold-testing-houston": "NR",
  "mold-inspection-kit": "NR",
  "air-quality-mold-test": "NR",
  "is-mold-testing-worth-it": "NR",
  "household-swab": "NR",
};

export const AI_PROMPTS = [
  {
    id: "best-kit",
    prompt: "What is the best DIY mold test kit with lab results?",
    mentioned: false,
    finding:
      "Unlikely. Page-1 brands are Home Armor, MycoTest, and Moldlab. AI Overviews cite those pages, not total-test.com.",
  },
  {
    id: "vs-inspector",
    prompt: "Should I use a DIY mold test kit or hire a mold inspector?",
    mentioned: false,
    finding:
      "Unlikely. EPA and inspector sites dominate. Your comparison table is buried on the homepage, not a citable article.",
  },
  {
    id: "black-mold",
    prompt: "How can I test for black mold at home?",
    mentioned: false,
    finding: "No Total Testing black-mold page exists for models to quote.",
  },
  {
    id: "houston",
    prompt: "Where can I get mold testing in Houston?",
    mentioned: false,
    finding:
      "Local TDLR inspectors and Maps listings win. No Google Business Profile was found for Total Testing.",
  },
  {
    id: "after-water",
    prompt: "What should I do after a leak to test for mold?",
    mentioned: false,
    finding: "Generic DIY advice ranks. You are not in the citation set.",
  },
  {
    id: "brand",
    prompt: "What is Total Testing DIY mold test kit?",
    mentioned: false,
    finding:
      "Risky even for brand queries: “Total Testing” collides with an HR testing company and a COVID lab. Models can describe the wrong business.",
  },
  {
    id: "no-kit",
    prompt: "Can I test for mold at home with a cotton swab and no kit?",
    mentioned: false,
    finding:
      "This is your unique story, but MycoTest already publishes a household-supplies page. Until you have a dedicated URL, AI will cite them first.",
  },
];

export const NEXT_ACTIONS = [
  {
    id: "one-domain",
    priority: 1,
    effort: "1–2 days",
    title: "Pick one public domain and 301 everything else to it",
    why: "You are split across total-test.com, total-testing-mold.com, and total-testing-diy.com. Google and AI treat that as three weak brands.",
    doNext: "Make total-test.com the only marketing site. Redirect the others. Keep total-testing-diy.com as the logged-in portal, not a second homepage.",
  },
  {
    id: "gbp",
    priority: 2,
    effort: "This week",
    title: "Create / verify Google Business Profile and collect Google reviews",
    why: "No Maps listing or Google star rating was found. Trustpilot is 4.2 from only 8 reviews. Google stars are what shoppers and AI answers use.",
    doNext: "Claim GBP with the real legal name, service area (mail-in, nationwide + Houston lab), then send every completed report to a Google review link.",
  },
  {
    id: "no-kit-page",
    priority: 3,
    effort: "1 day",
    title: "Build a real landing page for “DIY mold test — no kit needed”",
    why: "This is the only non-brand query where you already show up. MycoTest is copying the household swab/tape angle. You can still own it.",
    doNext: "One URL, one H1, FAQ, photos of swab + zip bag + FedEx label, package CTAs, and FAQ schema. Do not call it a “kit” on this page.",
  },
  {
    id: "blog-three",
    priority: 4,
    effort: "This month",
    title: "Publish the first 3 rank posts (queued below)",
    why: "Public index of total-test.com is basically Home, Products, Our Story, Contact, Terms. There is no blog. That is why you cannot rank informational terms.",
    doNext: "Write: DIY vs inspector, how to test at home with a swab, how to read Rare/Low/Medium/High. Internally link each to /products/.",
  },
  {
    id: "thicken-products",
    priority: 5,
    effort: "2–3 days",
    title: "Give Spot Check, Extended, and Full House their own URLs",
    why: "/products/ is one thin page. Competitors have full product pages with lab method, what’s included, and FAQs.",
    doNext: "Three product URLs + Product schema (price, samples, turnaround). Unique 300+ words each.",
  },
  {
    id: "eeat",
    priority: 6,
    effort: "This week",
    title: "Put real inspector names, licenses, and lab identity on the site",
    why: "Mold is YMYL. The story page says “we” and “licensed inspectors” but no names, TDLR numbers, or lab name. Contact uses a Dallas virtual-style address and a 456 number that is not a standard US area code.",
    doNext: "Named author + TDLR license, lab accreditation (AIHA-LAP) with the lab’s public name if allowed, and one consistent NAP.",
  },
  {
    id: "claims",
    priority: 7,
    effort: "1 day",
    title: "Soften unprovable claims that can block rankings and AI citations",
    why: "Homepage says insurance/legal/doctor-accepted, 100% accuracy money-back, and “same as hiring an inspector.” Texas licensed on-site assessment is a different service. AI and Google prefer cautious, accurate pages.",
    doNext: "Keep: lab species ID, inspector-reviewed report, 48-hour lab TAT. Qualify: screening tool, not a substitute for a TDLR on-site assessment.",
  },
  {
    id: "schema-faq",
    priority: 8,
    effort: "1 day",
    title: "Add Organization, Product, FAQ, and Review schema",
    why: "You already have FAQs on the homepage. They are not marked up, so they rarely become rich results or AI Overview sources.",
    doNext: "FAQ schema on home + no-kit page. Product schema on package pages. Organization with the same name everywhere.",
  },
];

export const SEO_RECOMMENDATIONS = [
  {
    id: "product-pages",
    title: "Package pages are too thin to rank",
    impact: "High",
    area: "On-page",
    detail:
      "/products/ lists $149 / $215 / $270 but has almost no unique copy per package. Give each package its own URL with samples, who it’s for, FAQs, and a buy button.",
  },
  {
    id: "kit-vs-no-kit",
    title: "Stop mixing “kit” language with “no kit needed”",
    impact: "High",
    area: "Positioning",
    detail:
      "Customers search “mold test kit.” You sell a no-kit swab service. Rank for both with two pages: a no-kit page (your wedge) and a “lab test vs petri-dish kit” page (demand capture). Do not use both messages on every URL.",
  },
  {
    id: "domains",
    title: "Three websites split your authority",
    impact: "High",
    area: "Technical",
    detail:
      "total-test.com is the indexed marketing site. total-testing-mold.com repeats the offer. total-testing-diy.com (the app) has no public index. Redirect marketing copies; keep the app noindex except the login.",
  },
  {
    id: "content-hub",
    title: "There is no blog or resource hub",
    impact: "High",
    area: "Content",
    detail:
      "Indexed URLs are marketing/legal pages only. You cannot rank “how to test for mold” or earn AI citations without articles that answer the question in the first 60 words.",
  },
  {
    id: "schema",
    title: "FAQs exist but have no schema",
    impact: "High",
    area: "Technical",
    detail:
      "Home already answers collection, inspector comparison, insurance, turnaround, toxic mold, and swab accuracy. Add FAQ + Product + Organization schema so Google can reuse that.",
  },
  {
    id: "eeat",
    title: "E-E-A-T is too anonymous for a health topic",
    impact: "High",
    area: "E-E-A-T",
    detail:
      "Name the inspectors, show TDLR licenses, name the AIHA-LAP lab if contracts allow, and use one real business address/phone. Duplicate homepage sections and stock-style testimonials also weaken trust.",
  },
  {
    id: "reviews",
    title: "Public reviews are too few to move ratings",
    impact: "High",
    area: "Ratings",
    detail:
      "Trustpilot: 4.2★ from 8 reviews (total-testing.com). No Google review graph found. You already have a report-ready email — point it at Google, not only the website.",
  },
  {
    id: "local",
    title: "Houston is mentioned, but local SEO is not set up",
    impact: "Medium",
    area: "Local SEO",
    detail:
      "Lab is described as Houston; contact is Dallas; LinkedIn traces to another entity. Pick the true service-area story (nationwide mail-in, lab in Houston) and match GBP + footer + schema. Do not fake a storefront.",
  },
  {
    id: "sitemap",
    title: "Sitemap was not publicly reachable",
    impact: "Medium",
    area: "Technical",
    detail:
      "total-test.com/sitemap.xml did not return a usable sitemap in this audit. Submit a clean XML sitemap in Search Console after redirects are fixed.",
  },
];

export const GEO_RECOMMENDATIONS = [
  {
    id: "answer-first",
    title: "Your homepage is long, but not quote-ready",
    detail:
      "AI copies a 40–60 word definition. Put this at the top of one URL: “Total Testing is a mail-in surface mold test. You swab with a household cotton swab, ship with a prepaid label, and get an inspector-reviewed lab report (species and growth level) in 48 business hours. It is a screening tool, not an on-site licensed inspection.”",
  },
  {
    id: "name-collision",
    title: "The brand name is colliding in AI search",
    detail:
      "“Total Testing” is also an HR assessment company and a COVID lab. Always use “Total Testing mold test” or “Total Testing DIY mold test (total-test.com)” in titles, schema, and the first sentence so models attach the right entity.",
  },
  {
    id: "unique-stats",
    title: "Publish lab stats only you have",
    detail:
      "The site claims 1,500+ tests. Turn that into citeable facts: % of bathroom vs HVAC samples elevated, most common species, Houston vs other states. Original numbers get mentioned; sales copy does not.",
  },
  {
    id: "mycotest",
    title: "MycoTest is the GEO competitor to beat",
    detail:
      "They already rank for DIY kit terms and have a household tape/Q-tip page. Outrank them on no-kit + inspector-reviewed report + Texas-licensed review — that combo is still open.",
  },
  {
    id: "reddit",
    title: "You are not in the communities AI scrapes",
    detail:
      "r/Mold threads recommend tape lifts and warn against DIY kits. No Total Testing mentions found. A transparent “what this test is / isn’t” post (no spam) is how GEO brands get cited.",
  },
  {
    id: "third-party",
    title: "Get one independent review or news mention",
    detail:
      "AI Overviews prefer EPA, publishers, and ranked commercial pages. One honest roundup (“best mail-in swab tests 2026”) is worth more than another homepage rewrite.",
  },
];

export const BLOG_IDEAS = [
  {
    id: "diy-vs-pro",
    priority: 1,
    queued: true,
    title: "DIY Mail-In Mold Test vs Hiring a Licensed Inspector",
    keyword: "diy mold test vs professional inspection",
    why: "You already have a comparison table on the homepage, but it is not a rankable URL. This is the #1 page to publish this month.",
    difficulty: "Low",
    outline: [
      "When a household swab + lab report is enough (visible spot, curiosity, landlord evidence)",
      "When Texas TDLR on-site assessment is required (real estate, insurance protocol, hidden moisture)",
      "What Total Testing reports vs what it cannot claim",
      "Price table: petri dish vs Total Testing vs inspector ($149 vs $550–$1,500)",
      "CTA to Spot Check, plus “call a licensed inspector if…”",
    ],
  },
  {
    id: "how-to-test",
    priority: 2,
    queued: true,
    title: "How to Test for Mold at Home With a Cotton Swab (No Kit)",
    keyword: "diy mold test no kit",
    why: "This matches how you actually sell. It is also the only theme where you already appear in search.",
    difficulty: "Low",
    outline: [
      "What you need: unused cotton swab, zip bag, marker",
      "Where to swab: bathroom, under sink, HVAC register, attic stain",
      "How to pack and use the prepaid FedEx label",
      "What the lab looks at (direct exam / species / Rare–High)",
      "Limits: this is the sampled spot only, not air or behind walls",
      "CTA: start Spot Check the same day",
    ],
  },
  {
    id: "read-results",
    priority: 3,
    queued: true,
    title: "How to Read Mold Test Results: Rare, Low, Medium, High",
    keyword: "how to read mold test results",
    why: "Low competition, helps customers, and is easy for AI to quote. No one on your site explains the scale in public.",
    difficulty: "Low",
    outline: [
      "What a surface sample can and cannot say",
      "Plain-language Rare / Low / Medium / High",
      "Common species (Aspergillus/Penicillium, Cladosporium, Stachybotrys) in one paragraph each",
      "Next steps by rating",
      "Anonymized report screenshot",
    ],
  },
  {
    id: "best-kit-year",
    priority: 4,
    queued: false,
    title: "Petri-Dish Kits vs Mail-In Lab Swab Tests (2026)",
    keyword: "best diy mold test kit",
    why: "You will not beat Amazon kits on “kit” until this educational page exists. Attack petri dishes; don’t pretend you are Home Armor.",
    difficulty: "High",
    outline: [
      "Why petri dishes always grow something",
      "What lab microscopy actually reports",
      "Checklist: turnaround, inspector review, prepaid shipping, portal",
      "Where Total Testing fits vs MycoTest / Moldlab",
      "Who should skip DIY",
    ],
  },
  {
    id: "black-mold",
    priority: 5,
    queued: false,
    title: "Can a Home Swab Test Identify Black Mold (Stachybotrys)?",
    keyword: "black mold test kit",
    why: "High anxiety, high search. Be the honest source and you get citations.",
    difficulty: "Medium",
    outline: [
      "Black staining is not automatically Stachybotrys",
      "What a surface swab can confirm",
      "When to stop DIY and get an on-site assessor",
      "Safety while sampling",
    ],
  },
  {
    id: "houston-humidity",
    priority: 6,
    queued: false,
    title: "Houston Humidity and Mold: When a Mail-In Test Helps",
    keyword: "mold testing houston",
    why: "You mention a Houston lab but lose the local SERP to $550 inspectors. Rank for “mail-in option in Houston,” not fake storefront SEO.",
    difficulty: "Medium",
    outline: [
      "Why Gulf humidity + AC coils grow surface mold",
      "Mail-in swab vs TDLR on-site assessment",
      "Neighborhood-agnostic advice (no doorway-spam city pages)",
      "CTA + licensed-inspector disclaimer",
    ],
  },
  {
    id: "after-leak",
    priority: 7,
    queued: false,
    title: "After a Water Leak: When Should You Test for Mold?",
    keyword: "test for mold after water leak",
    why: "Storm season traffic. Easy internal link to Spot Check.",
    difficulty: "Low",
    outline: [
      "Dry first vs sample first",
      "48-hour moisture rule of thumb",
      "Which rooms to swab",
      "Insurance: what a DIY report can and cannot do",
    ],
  },
  {
    id: "bathroom-kit",
    priority: 8,
    queued: false,
    title: "Bathroom Mold: Where to Swab (and How Many Samples)",
    keyword: "bathroom mold test",
    why: "Maps directly to the $149 Spot Check (2 samples).",
    difficulty: "Low",
    outline: [
      "Grout, caulk, under-sink, exhaust fan",
      "Why two samples beat one",
      "Cleaning vs testing first",
      "Link Spot Check vs Extended",
    ],
  },
  {
    id: "hvac",
    priority: 9,
    queued: false,
    title: "Testing HVAC Registers for Mold at Home",
    keyword: "hvac mold test",
    why: "Supports Extended / Full House. Be clear a register swab is not a duct inspection.",
    difficulty: "Medium",
    outline: [
      "Why vents look dirty in Houston summers",
      "How to swab a register safely",
      "When to call HVAC vs a licensed assessor",
    ],
  },
  {
    id: "worth-it",
    priority: 10,
    queued: false,
    title: "Is a Mail-In Mold Test Worth $149?",
    keyword: "is a mold test kit worth it",
    why: "Handles the price objection for ads and organic.",
    difficulty: "Low",
    outline: [
      "$149 vs $10 petri dish vs $550+ inspector",
      "Worth it as screening, not a health diagnosis",
      "Who should skip straight to a licensed pro",
    ],
  },
];

export const lastSixMonths = () => {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      visitors: null,
    });
  }
  return months;
};

export const researchedSnapshot = () => ({
  googleRating: "",
  googleMapsFound: false,
  trustpilotRating: "4.2",
  reviewCount: "8",
  reviewSource: "Trustpilot (total-testing.com)",
  visitors30d: "<500",
  visitorsNote:
    "Public-index estimate. You are not on page 1 for kit keywords, and only a handful of URLs are indexed. Connect GA4 later for exact counts — do not wait on that to fix SEO.",
  visitorsHistory: lastSixMonths(),
  keywordRanks: { ...AUDIT_RANKS },
  aiMentions: Object.fromEntries(AI_PROMPTS.map((p) => [p.id, p.mentioned])),
  queuedBlogs: BLOG_IDEAS.filter((b) => b.queued).map((b) => b.id),
  updatedAt: "2026-09-14T16:00:00.000Z",
});
