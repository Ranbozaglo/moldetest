export const AUDIT_DATE = "September 19, 2026";
export const AUDIT_SITES = [
  "https://total-testing.com",
  "https://total-test.com",
  "https://total-testing-mold.com",
];

export const TRACKED_KEYWORDS = [
  {
    id: "brand",
    keyword: "total testing mold",
    intent: "Brand",
    volume: 50,
    difficulty: "Low",
    target: 1,
    evidence: "Search still returns total-test.com/products/ ($149 Spot Check) and total-test.com/our-story/, not the new total-testing.com package pages.",
  },
  {
    id: "no-kit",
    keyword: "diy mold test no kit",
    intent: "Commercial",
    volume: 210,
    difficulty: "Low",
    target: 3,
    evidence: "MycoTest owns position 1. Old total-test.com and total-testing-mold.com still appear. The new site does not.",
  },
  {
    id: "no-kit-needed",
    keyword: "mold test no kit needed",
    intent: "Commercial",
    volume: 90,
    difficulty: "Low",
    target: 3,
    evidence: "Same split: legacy domains show; total-testing.com package URLs do not.",
  },
  {
    id: "diy-mold-test-kit",
    keyword: "diy mold test kit",
    intent: "Commercial",
    volume: 2400,
    difficulty: "High",
    target: 3,
    evidence: "Page 1 is MycoTest, Home Armor, Moldlab. Total Testing is not there.",
  },
  {
    id: "mold-test-kit",
    keyword: "mold test kit",
    intent: "Commercial",
    volume: 6600,
    difficulty: "High",
    target: 5,
    evidence: "Hardware-store kits and lab-kit brands own this. You are invisible.",
  },
  {
    id: "home-mold-test-kit",
    keyword: "home mold test kit",
    intent: "Commercial",
    volume: 1900,
    difficulty: "Medium",
    target: 3,
    evidence: "Not on page 1. Competitors answer this with product pages that have been indexed for years.",
  },
  {
    id: "mold-test-kit-lab",
    keyword: "mold test kit with lab analysis",
    intent: "Commercial",
    volume: 480,
    difficulty: "Medium",
    target: 3,
    evidence: "You now have /packages/spot-check/ and a lab-analysis article. Neither appeared on page 1 in this scan.",
  },
  {
    id: "black-mold-test-kit",
    keyword: "black mold test kit",
    intent: "Commercial",
    volume: 1300,
    difficulty: "High",
    target: 5,
    evidence: "/is-black-mold-dangerous/ is live. It is not on page 1 yet.",
  },
  {
    id: "how-to-test-mold",
    keyword: "how to test for mold in your home",
    intent: "Informational",
    volume: 3600,
    difficulty: "Medium",
    target: 5,
    evidence: "/how-to-test-for-mold-in-your-house/ exists. EPA and publishers still own page 1.",
  },
  {
    id: "diy-vs-pro",
    keyword: "diy mold test vs professional inspection",
    intent: "Informational",
    volume: 720,
    difficulty: "Low",
    target: 3,
    evidence: "/diy-mold-testing-vs-professional-inspection/ is published. Not on page 1 yet (days old).",
  },
  {
    id: "read-mold-results",
    keyword: "how to read mold test results",
    intent: "Informational",
    volume: 880,
    difficulty: "Low",
    target: 3,
    evidence: "/how-to-read-your-mold-lab-report/ is live. Not ranking yet.",
  },
  {
    id: "musty-odor",
    keyword: "house smells musty but no visible mold",
    intent: "Informational",
    volume: 720,
    difficulty: "Low",
    target: 3,
    evidence: "Your article is live. Page 1 is inspector blogs. Total Testing was not in the results.",
  },
  {
    id: "mold-testing-houston",
    keyword: "mold testing houston",
    intent: "Local",
    volume: 1600,
    difficulty: "High",
    target: 5,
    evidence: "TDLR on-site firms and Maps listings win. No Google Business Profile found for Total Testing.",
  },
  {
    id: "mold-inspection-kit",
    keyword: "mold inspection kit",
    intent: "Commercial",
    volume: 590,
    difficulty: "Medium",
    target: 5,
    evidence: "Not ranking. Also fights the no-kit message.",
  },
  {
    id: "air-quality-mold-test",
    keyword: "air quality mold test kit",
    intent: "Commercial",
    volume: 720,
    difficulty: "Medium",
    target: 5,
    evidence: "You sell surface swabs. The homepage mock report was rewritten as a surface-sample example; this query still belongs to air-cassette kit brands.",
  },
  {
    id: "is-mold-testing-worth-it",
    keyword: "is a mold test kit worth it",
    intent: "Informational",
    volume: 390,
    difficulty: "Low",
    target: 3,
    evidence: "/how-much-does-diy-mold-testing-cost/ is live. Not on page 1 yet.",
  },
  {
    id: "household-swab",
    keyword: "mail in mold swab test",
    intent: "Commercial",
    volume: 320,
    difficulty: "Medium",
    target: 3,
    evidence: "MycoTest’s household tape/Q-tip page still ranks. You still lack one dedicated no-kit URL on total-testing.com.",
  },
  {
    id: "kits-accurate",
    keyword: "are home mold test kits accurate",
    intent: "Informational",
    volume: 880,
    difficulty: "Medium",
    target: 3,
    evidence: "Your article is live. Page 1 is Respirare Labs, EPA, and inspector blogs.",
  },
];

/** Google rank from public SERP checks on AUDIT_DATE. NR = not on page 1. */
export const AUDIT_RANKS = {
  brand: "1",
  "no-kit": "3",
  "no-kit-needed": "4",
  "diy-mold-test-kit": "NR",
  "mold-test-kit": "NR",
  "home-mold-test-kit": "NR",
  "mold-test-kit-lab": "NR",
  "black-mold-test-kit": "NR",
  "how-to-test-mold": "NR",
  "diy-vs-pro": "NR",
  "read-mold-results": "NR",
  "musty-odor": "NR",
  "mold-testing-houston": "NR",
  "mold-inspection-kit": "NR",
  "air-quality-mold-test": "NR",
  "is-mold-testing-worth-it": "NR",
  "household-swab": "NR",
  "kits-accurate": "NR",
};

export const AI_PROMPTS = [
  {
    id: "best-kit",
    prompt: "What is the best DIY mold test kit with lab results?",
    mentioned: false,
    finding:
      "Unlikely. Page-1 brands are MycoTest, Home Armor, and Moldlab. New Total Testing package pages are not in that citation set yet.",
  },
  {
    id: "vs-inspector",
    prompt: "Should I use a DIY mold test kit or hire a mold inspector?",
    mentioned: false,
    finding:
      "You now have a dedicated comparison URL. Models still cite EPA and inspector sites because those pages already rank.",
  },
  {
    id: "black-mold",
    prompt: "How can I test for black mold at home?",
    mentioned: false,
    finding: "/is-black-mold-dangerous/ exists but is not ranking, so it is not in the citation set.",
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
    finding: "/how-to-prevent-mold-after-water-damage/ is live. Generic DIY advice still ranks first.",
  },
  {
    id: "brand",
    prompt: "What is Total Testing DIY mold test kit?",
    mentioned: false,
    finding:
      "Risky: “Total Testing” still collides with an HR testing company and a COVID lab. Search and snippets still point at total-test.com.",
  },
  {
    id: "no-kit",
    prompt: "Can I test for mold at home with a cotton swab and no kit?",
    mentioned: false,
    finding:
      "The dedicated page is now live at /diy-mold-test-no-kit/. MycoTest’s household-supplies URL still ranks; this page needs indexation.",
  },
];

export const NEXT_ACTIONS = [
  {
    id: "finish-redirects",
    priority: 1,
    effort: "1 day",
    title: "301 leftover total-test.com pages (still on the old host)",
    why: "On total-testing.com, /products/ now 301s to /packages/ and /our-story/ 301s to /about/. total-test.com/products/ is still 200 at $149 and /our-story/ is still indexed. Brand search still returns those old URLs.",
    doNext:
      "On the total-test.com host (or DNS), 301 /products/ and /our-story/ — and the rest of that domain — to the matching total-testing.com URLs. Same for total-testing-mold.com. Keep total-testing-diy.com as the logged-in portal. This step needs you; it is a different site than the WordPress we can edit.",
  },
  {
    id: "index-new-urls",
    priority: 2,
    effort: "This week",
    title: "Request indexing for packages, no-kit, and new posts",
    why: "Yoast lists the catalog, /diy-mold-test-no-kit/, and 25 posts. Public search is not returning those URLs yet.",
    doNext:
      "In Search Console for total-testing.com, submit sitemap_index.xml and request indexing for /packages/spot-check/, /extended/, /full-house/, /diy-mold-test-no-kit/, and the September posts including Houston and bathroom.",
  },
  {
    id: "gbp",
    priority: 3,
    effort: "This week",
    title: "Create / verify Google Business Profile and collect Google reviews",
    why: "Still no Maps listing or Google star rating. Trustpilot is unchanged at 4.2 from 8 reviews.",
    doNext:
      "Claim GBP with the real legal name and a mail-in / nationwide + Houston lab service area. Send every completed report to a Google review link.",
  },
  {
    id: "eeat",
    priority: 4,
    effort: "This week",
    title: "Name the inspectors, licenses, and lab on the site",
    why: "Author pages are still /author/editorial/. Mold is YMYL. Homepage claims were softened; named credentials are still missing.",
    doNext:
      "Named author + TDLR license, lab accreditation with the lab’s public name if allowed, and one consistent NAP in footer + schema.",
  },
];

export const SEO_RECOMMENDATIONS = [
  {
    id: "legacy-index",
    title: "Google is still ranking the old domains",
    impact: "High",
    area: "Technical",
    detail:
      "Brand search still returns total-test.com/products/ ($149) and /our-story/. The homepage 301s to https://total-testing.com, but leftover paths that stay 200 split ranking signals. A site:total-testing.com query for the new package pages returned nothing in this scan.",
  },
  {
    id: "new-urls-not-ranking",
    title: "Package pages and 23 blog posts are live but not on page 1",
    impact: "High",
    area: "Indexation",
    detail:
      "Spot Check / Extended / Full House exist at /packages/{slug}. The sitemap lists 23 posts, including DIY vs inspector, how to test, how to read results, petri dishes, musty odor, and 10 signs. Public SERPs for those queries still omit total-testing.com.",
  },
  {
    id: "no-kit-url",
    title: "The no-kit landing page is live; it is not ranking yet",
    impact: "High",
    area: "On-page",
    detail:
      "/diy-mold-test-no-kit/ is published with FAQ schema and package CTAs. MycoTest’s household tape/Q-tip page is still what Google cites until this URL is indexed.",
  },
  {
    id: "homepage-mismatch",
    title: "Homepage claims were softened; keep every other surface consistent",
    impact: "High",
    area: "On-page",
    detail:
      "The mock report now says it is a surface-sample example, not an air test. “98% Lab Accuracy” and “Insurance-Ready” were removed from the first screen. Keep FAQ and ads aligned with that copy.",
  },
  {
    id: "eeat",
    title: "E-E-A-T is still anonymous for a health topic",
    impact: "High",
    area: "E-E-A-T",
    detail:
      "Posts are attributed to /author/editorial/. Inspectors are not named. TDLR numbers and the lab’s public name are still missing from the crawl.",
  },
  {
    id: "reviews",
    title: "Public reviews are unchanged",
    impact: "High",
    area: "Ratings",
    detail:
      "Trustpilot: 4.2★ from 8 reviews. No Google review graph found. Eight reviews is not enough to compete with kit brands or Houston inspectors.",
  },
  {
    id: "local",
    title: "Houston is mentioned, but local SEO is not set up",
    impact: "Medium",
    area: "Local SEO",
    detail:
      "Still no GBP. On-site Houston firms with hundreds of Google reviews own “mold testing Houston.” Position as nationwide mail-in with a Houston lab, not a fake storefront.",
  },
  {
    id: "sitemap",
    title: "Sitemap exists; Search Console still has to ingest it",
    impact: "Medium",
    area: "Technical",
    detail:
      "Yoast sitemap_index.xml is live (4 sitemaps: posts, pages, categories, author) and robots.txt points at it. /pricing/ is still a live page alongside /packages/. Submit the sitemap in Search Console for total-testing.com and request indexing of the package URLs — the previous audit said the sitemap was missing, which is no longer true.",
  },
];

export const GEO_RECOMMENDATIONS = [
  {
    id: "answer-first",
    title: "The first screen is now quote-ready — keep it that way",
    detail:
      "Home now leads with a mail-in surface swab and an inspector-reviewed lab report. The mock card says it is not an air test. Do not put “98%” or “insurance-ready” back on that screen.",
  },
  {
    id: "name-collision",
    title: "The brand name is still colliding",
    detail:
      "Always use “Total Testing mold test” plus total-testing.com in titles, schema, and the first sentence so models stop attaching the HR-testing or COVID-lab entity — or the old total-test.com domain.",
  },
  {
    id: "cite-new-posts",
    title: "You now have citable articles — they just are not cited yet",
    detail:
      "DIY vs inspector, petri vs lab swab, musty odor, vents, and how to read results are the right GEO pages. They need indexation and inbound links before ChatGPT or AI Overviews will quote them.",
  },
  {
    id: "llms",
    title: "llms.txt now matches the live offer",
    detail:
      "The file states household swab, package URLs, and screening limits. No 2x2. Keep it in sync if prices or SKUs change.",
  },
  {
    id: "mycotest",
    title: "MycoTest is still the GEO competitor to beat",
    detail:
      "They rank for DIY kit terms and own the household-supplies SERP. Outrank them on no-kit + inspector-reviewed report + Texas-licensed review — that combo is still open.",
  },
  {
    id: "unique-stats",
    title: "Publish lab stats only you have",
    detail:
      "Original numbers get mentioned; sales copy does not. % of bathroom vs HVAC samples elevated, most common species, Houston vs other states.",
  },
];

export const BLOG_IDEAS = [
  {
    id: "diy-vs-pro",
    priority: 1,
    queued: false,
    published: true,
    url: "https://total-testing.com/diy-mold-testing-vs-professional-inspection/",
    title: "DIY Mail-In Mold Test vs Hiring a Licensed Inspector",
    keyword: "diy mold test vs professional inspection",
    why: "Published. Next job is indexation and internal links from home and packages — not another draft.",
    difficulty: "Low",
    outline: [
      "When a household swab + lab report is enough",
      "When Texas TDLR on-site assessment is required",
      "What Total Testing reports vs what it cannot claim",
      "Price table vs petri dish vs inspector",
      "CTA to Spot Check",
    ],
  },
  {
    id: "how-to-test",
    priority: 2,
    queued: false,
    published: true,
    url: "https://total-testing.com/how-to-test-for-mold-in-your-house/",
    title: "How to Test for Mold at Home With a Cotton Swab (No Kit)",
    keyword: "diy mold test no kit",
    why: "Published, but the SERP still belongs to MycoTest. Pair this post with a dedicated no-kit landing page.",
    difficulty: "Low",
    outline: [
      "What you need: unused cotton swab, zip bag, marker",
      "Where to swab",
      "How to pack and use the prepaid FedEx label",
      "What the lab looks at",
      "Limits of a surface sample",
    ],
  },
  {
    id: "read-results",
    priority: 3,
    queued: false,
    published: true,
    url: "https://total-testing.com/how-to-read-your-mold-lab-report/",
    title: "How to Read Mold Test Results: Rare, Low, Medium, High",
    keyword: "how to read mold test results",
    why: "Published. Not ranking yet.",
    difficulty: "Low",
    outline: [
      "What a surface sample can and cannot say",
      "Plain-language ratings",
      "Common species in one paragraph each",
      "Next steps by rating",
    ],
  },
  {
    id: "kits-accurate",
    priority: 4,
    queued: false,
    published: true,
    url: "https://total-testing.com/are-home-mold-test-kits-accurate/",
    title: "Are Home Mold Test Kits Accurate?",
    keyword: "are home mold test kits accurate",
    why: "Published September 17. Respirare Labs and EPA still occupy page 1.",
    difficulty: "Medium",
    outline: [],
  },
  {
    id: "petri",
    priority: 5,
    queued: false,
    published: true,
    url: "https://total-testing.com/are-petri-dish-mold-tests-accurate/",
    title: "Are Petri Dish Mold Tests Accurate?",
    keyword: "petri dish mold test",
    why: "Published. Use this to capture “kit” demand without pretending you are Home Armor.",
    difficulty: "Medium",
    outline: [],
  },
  {
    id: "musty",
    priority: 6,
    queued: false,
    published: true,
    url: "https://total-testing.com/your-house-smells-musty-but-no-visible-mold/",
    title: "Your House Smells Musty but You Cannot See Mold",
    keyword: "house smells musty but no visible mold",
    why: "Published. Inspector blogs still own the SERP.",
    difficulty: "Low",
    outline: [],
  },
  {
    id: "vents",
    priority: 7,
    queued: false,
    published: true,
    url: "https://total-testing.com/is-this-mold-or-dirt-around-vents/",
    title: "Is This Mold or Dirt Around Vents?",
    keyword: "hvac vent mold or dirt",
    why: "Published. Supports Extended / Full House.",
    difficulty: "Low",
    outline: [],
  },
  {
    id: "ten-signs",
    priority: 8,
    queued: false,
    published: true,
    url: "https://total-testing.com/ten-signs-you-may-have-mold-in-your-home/",
    title: "10 Signs You May Have Mold in Your Home",
    keyword: "signs of mold in your home",
    why: "Published. Other companies already use this exact heading. Differentiation is the swab + lab CTA.",
    difficulty: "Medium",
    outline: [],
  },
  {
    id: "houston-humidity",
    priority: 9,
    queued: false,
    published: true,
    url: "https://total-testing.com/houston-humidity-and-mold-mail-in-test/",
    title: "Houston Humidity and Mold: When a Mail-In Test Helps",
    keyword: "mold testing houston",
    why: "Published September 20. Still needs indexation. Local inspectors with Google reviews own the SERP.",
    difficulty: "Medium",
    outline: [],
  },
  {
    id: "bathroom-kit",
    priority: 10,
    queued: false,
    published: true,
    url: "https://total-testing.com/bathroom-mold-where-to-swab/",
    title: "Bathroom Mold: Where to Swab (and How Many Samples)",
    keyword: "bathroom mold test",
    why: "Published September 20. Maps to Spot Check. Not ranking yet.",
    difficulty: "Low",
    outline: [],
  },
  {
    id: "lab-stats",
    priority: 11,
    queued: true,
    published: false,
    title: "What We Actually Find on Home Swabs (Original Lab Stats)",
    keyword: "most common household mold species",
    why: "Still blocked: we do not have exportable lab percentages. Do not invent them.",
    difficulty: "Low",
    outline: [
      "Share of bathroom vs HVAC vs basement samples",
      "Most common species in your lab stream",
      "What “elevated” meant in practice",
      "Limits: this is your customers, not a national study",
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
  visitors30d: "~10",
  visitorsNote:
    "First-party tracking on total-testing.com counted 9 sessions and 16 pageviews in the last 30 days. Almost none of that is organic kit-keyword traffic. Rankings below are page-1 checks, not Search Console.",
  visitorsHistory: lastSixMonths(),
  keywordRanks: { ...AUDIT_RANKS },
  aiMentions: Object.fromEntries(AI_PROMPTS.map((p) => [p.id, p.mentioned])),
  queuedBlogs: BLOG_IDEAS.filter((b) => b.queued).map((b) => b.id),
  updatedAt: "2026-09-20T07:40:00.000Z",
});
