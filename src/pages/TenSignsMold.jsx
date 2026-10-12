import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Droplets, FlaskConical, ShieldAlert } from "lucide-react";

const META_TITLE = "10 Signs You May Have Mold in Your Home | Total Testing";
const META_DESCRIPTION =
  "Wondering if that musty odor or dark spot is mold? Learn 10 key signs of indoor mold growth, how to sample surfaces correctly, and when to test.";
const SLUG = "/ten-signs-you-may-have-mold-in-your-home";
const ORDER_URL = "https://total-testing.com/packages/spot-check/";

const SIGNS = [
  {
    n: 1,
    title: "A Persistent Musty or Damp Odor",
    why: "As mold colonies consume organic building materials like drywall paper, wood framing, or carpet backing, they release microbial volatile organic compounds (mVOCs). These gases produce a distinct earthy, stale, or musty smell even when colonies stay hidden behind cabinets or furniture.",
    do: "If a room consistently smells damp despite cleaning and ventilation, inspect nearby surfaces for hidden moisture or subtle discoloration.",
  },
  {
    n: 2,
    title: "Visible Discoloration, Staining, or Fuzzy Patches",
    why: "Visible growth is the most obvious sign, but mold is not always dark black. Colors can range from deep black and dark green to velvet white, yellow, gray, or brown. Texture may look dry and powdery, fuzzy and raised, or slick and slimy.",
    do: "Not every dark spot is mold — soot, dirt, and mineral deposits often mimic it. Swab a 2x2 inch patch so an accredited lab can verify fungal structures under a microscope.",
  },
  {
    n: 3,
    title: "Unexplained Water Stains or Drywall Discoloration",
    why: "Yellowish-brown rings on ceilings or dark streaks on drywall are physical proof that materials absorbed moisture. EPA moisture guidance is clear: if porous materials stay wet longer than 24 to 48 hours, indoor spores can settle and grow.",
    do: "Check beneath upper-floor bathrooms, roof valleys, window sills, and exterior wall corners.",
  },
  {
    n: 4,
    title: "History of Plumbing Leaks, Sink Drips, or Appliance Spills",
    why: "A pipe drip under the kitchen sink, a slow dishwasher leak, or a washing machine overflow can leave water under kickplates, subflooring, or baseboards where airflow is minimal.",
    do: "Dry structural materials within 24 to 48 hours. If discolored patches appear after a spill, a surface swab confirms whether mold developed.",
  },
  {
    n: 5,
    title: "High Indoor Humidity and Window Condensation",
    why: "The EPA and CDC recommend keeping indoor relative humidity between 30% and 50%. Above 60%, condensation forms on cold glass, metal frames, and exterior-facing walls.",
    do: "Frequent droplets on windows mean indoor air is holding too much water vapor. Watch adjacent trim and drywall for surface mold.",
  },
  {
    n: 6,
    title: "Peeling, Bubbling, or Cracking Paint and Wallpaper",
    why: "Moisture behind paint or wallpaper breaks the adhesive bond. Paint bubbles, blisters, or flakes at baseboards; wallpaper seams lift, curl, or show dark outlines.",
    do: "Swab the discolored drywall beneath peeling paint for a direct lab sample.",
  },
  {
    n: 7,
    title: "Dark Staining in Tile Grout and Caulking Seams",
    why: "Bathrooms, shower stalls, and backsplashes are high-moisture surfaces where spores settle along silicone caulk and porous grout.",
    do: "Do not scrape grout or caulk. Swab a 2x2 inch patch for a lab ID, then hire a qualified mold remediation professional.",
  },
  {
    n: 8,
    title: "Damp, Soft, or Warped Flooring and Baseboards",
    why: "Hardwood that cups or crowns, vinyl or laminate that lifts or feels spongy, and baseboards that pull away or stain along the floor line all point to subfloor or slab dampness.",
    do: "Collect a surface swab from the discolored floor joint or lower baseboard edge before you start floor repairs.",
  },
  {
    n: 9,
    title: "Dust-Like Growth Around Air Vents or HVAC Grilles",
    why: "When humid indoor air hits cool supply vents, condensation forms on metal grilles. Watch for dark, dust-like buildup on louvers or fuzzy spots on ceiling drywall around registers.",
    do: "Swab the grille or surrounding ceiling patch to tell active surface mold from ordinary household dust.",
  },
  {
    n: 10,
    title: "Allergic-Type Responses That Seem Worse Indoors",
    why: "Total Testing kits are surface screening tools, not medical diagnostic instruments. Some people notice nasal congestion, sneezing, or eye irritation more in specific rooms, then feel better outdoors. CDC and WHO note that indoor dampness and mold can reduce indoor air quality.",
    do: "Verify surface conditions with lab data so you can make a maintenance decision — then talk with a clinician about health symptoms.",
  },
];

const PACKAGES = [
  {
    name: "Spot Check",
    price: "$149",
    samples: "2 surface swab samples",
    turnaround: "48 business hours after lab receipt",
    best: "Single spots or one area of concern",
  },
  {
    name: "Extended",
    price: "$215",
    samples: "4 surface swab samples",
    turnaround: "48 business hours after lab receipt",
    best: "Multi-room coverage",
  },
  {
    name: "Full House",
    price: "$270",
    samples: "6 surface swab samples",
    turnaround: "Priority 24 business hours after lab receipt",
    best: "Comprehensive home coverage",
  },
];

const FAQS = [
  {
    q: "How do I know if a dark spot is mold or just dirt?",
    a: "Dirt and soot usually wipe away and do not grow back unless new dust settles. Fungal growth embeds into organic materials and often looks textured or patterned. Swab a 2x2 inch patch and submit it with your package-specific PDF Chain of Custody form so the lab can examine it microscopically.",
  },
  {
    q: "Do I need to test every room in my house?",
    a: "No. Target the areas of concern — discolored drywall, a damp basement corner, or a cabinet interior. Spot Check (2 samples) fits a single spot. Extended (4) and Full House (6) cover multiple rooms.",
  },
  {
    q: "How does the package-specific PDF Chain of Custody form work?",
    a: "Your package includes a PDF Chain of Custody (COC) form. Write the sample location (for example, “Kitchen Sink Cabinet” or “Basement West Wall”) on the form and place it in the return box with your labeled swab tubes before you seal the prepaid FedEx mailer.",
  },
  {
    q: "What is the turnaround time for lab results?",
    a: "After the accredited laboratory receives your box via prepaid FedEx, Spot Check and Extended take 48 business hours. Full House includes priority 24 business hour turnaround after receipt.",
  },
];

export default function TenSignsMold() {
  usePageMeta({
    title: META_TITLE,
    description: META_DESCRIPTION,
    canonicalPath: SLUG,
  });

  useEffect(() => {
    const scriptId = "tt-blog-jsonld-ten-signs";
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    const payload = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: "10 Signs You May Have Mold in Your Home: A Homeowner's Practical Guide",
          description: META_DESCRIPTION,
          author: { "@type": "Organization", name: "Total Testing" },
          publisher: { "@type": "Organization", name: "Total Testing" },
          datePublished: "2026-09-16",
          mainEntityOfPage: typeof window !== "undefined" ? `${window.location.origin}${SLUG}` : SLUG,
          keywords: "10 signs you may have mold in your home",
        },
        {
          "@type": "FAQPage",
          mainEntity: FAQS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        },
      ],
    };

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.text = JSON.stringify(payload);
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, []);

  return (
    <article className="max-w-3xl mx-auto px-6 py-10 md:py-14">
      <p className="text-sm text-blue-700 mb-4">
        <Link to="/blog" className="hover:underline">
          Blog
        </Link>
        <span className="text-slate-400"> / </span>
        10 signs of mold
      </p>

      <p className="text-xs font-semibold tracking-wide uppercase text-blue-700 mb-3">
        Homeowner&apos;s practical guide
      </p>
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
        10 Signs You May Have Mold in Your Home
      </h1>
      <p className="mt-4 text-lg text-slate-600 leading-relaxed">
        Homeownership comes with an endless checklist, but few things cause instant worry like suspecting mold.
        A subtle earthy smell in the basement or discolored patches under the bathroom sink are worth taking
        seriously — calmly — before moisture problems expand.
      </p>
      <p className="mt-3 text-slate-600 leading-relaxed">
        Rather than guessing or paying for an expensive on-site inspection right away, a preliminary surface swab
        gives accredited laboratory data. Our approach is simple: <strong>Test Before You Guess.</strong>
      </p>

      <Card className="mt-8 border-blue-100 bg-blue-50/60">
        <CardHeader>
          <CardTitle className="text-lg">Core takeaways</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          {[
            "Common indicators include persistent musty odors, water stains, bubbling paint, high indoor humidity, and localized discoloration.",
            "Mold needs organic material and moisture, so bathrooms, basements, kitchens, and laundry rooms are primary watch areas.",
            "Open-air culture plates trap ambient outdoor spores and often produce misleading false positives. Direct surface swabs isolate the spot you care about.",
            "Total Testing packages include sterile swabs, a package-specific PDF Chain of Custody (COC) form, prepaid FedEx express return shipping, and accredited laboratory analysis.",
            "Keep indoor relative humidity between 30% and 50%, and dry spills within 24 to 48 hours (EPA and CDC).",
          ].map((item) => (
            <div key={item} className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p>{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <nav className="mt-10 rounded-xl border bg-white p-5">
        <p className="text-sm font-semibold text-slate-900 mb-3">The 10 signs</p>
        <ol className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {SIGNS.map((sign) => (
            <li key={sign.n}>
              <a href={`#sign-${sign.n}`} className="text-blue-700 hover:underline">
                {sign.n}. {sign.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {SIGNS.map((sign) => (
          <section key={sign.n} id={`sign-${sign.n}`} className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-slate-900">
              Sign {sign.n}: {sign.title}
            </h2>
            <p className="mt-3 text-slate-700 leading-relaxed">{sign.why}</p>
            <p className="mt-3 text-slate-700 leading-relaxed">
              <span className="font-semibold text-slate-900">What to do: </span>
              {sign.do}
            </p>
          </section>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-slate-900">
          Direct surface swab sampling vs. open-air culture plates
        </h2>
        <p className="mt-3 text-slate-700 leading-relaxed">
          Choosing the right method is how you get facts instead of noise.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3 font-semibold">Feature</th>
                <th className="p-3 font-semibold">Open-air culture plates</th>
                <th className="p-3 font-semibold">Typical mail-in kits</th>
                <th className="p-3 font-semibold">Total Testing surface swabs</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {[
                ["Sampling method", "Open agar dish left in room air", "Variable surface or air collection", "Targeted sterile surface swab (2x2 inch patch)"],
                ["Lab fees", "Usually extra", "Often $40–$60 extra per sample", "Accredited lab analysis included"],
                ["Shipping", "No prepaid shipping", "Standard slow mail", "Prepaid FedEx express return included"],
                ["Documentation", "Manual paper slips", "Varies by brand", "Package-specific PDF Chain of Custody"],
                ["Turnaround", "7–10 days waiting for growth", "1–2 weeks after arrival", "24–48 business hours after lab receipt"],
                ["Scientific clarity", "Low — captures ambient spores", "Medium — depends on sample quality", "High — direct microscopic ID of surface mold"],
              ].map((row) => (
                <tr key={row[0]} className="border-t">
                  {row.map((cell, i) => (
                    <td key={cell} className={`p-3 align-top ${i === 0 || i === 3 ? "font-medium" : ""}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Industry comparison. Total Testing packages include laboratory analysis, prepaid express shipping, and a digital report with no hidden lab fees.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-slate-900">Total Testing packages</h2>
        <p className="mt-3 text-slate-700">
          Every package includes sterile swabs, a package-specific PDF Chain of Custody form, prepaid FedEx express
          return shipping, and accredited laboratory microbiology analysis.
        </p>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {PACKAGES.map((pkg) => (
            <Card key={pkg.name} className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <p className="text-2xl font-bold text-blue-700">{pkg.price}</p>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 space-y-1">
                <p>{pkg.samples}</p>
                <p>{pkg.turnaround}</p>
                <p className="font-medium text-slate-800 pt-2">{pkg.best}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="bg-blue-700 hover:bg-blue-800">
            <a href={ORDER_URL} target="_blank" rel="noreferrer">
              Choose a package
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/SignIn">Log in for digital reports</Link>
          </Button>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Droplets className="w-6 h-6 text-blue-600" />
          Moisture control & prevention
        </h2>
        <ul className="mt-4 space-y-3 text-slate-700">
          <li>
            <strong>Control indoor humidity.</strong> Keep relative humidity between 30% and 50% with air
            conditioning, dehumidifiers, and exhaust fans in kitchens and bathrooms.{" "}
            <a className="text-blue-700 hover:underline" href="https://www.epa.gov/mold" target="_blank" rel="noreferrer">
              EPA mold guidance
            </a>
            {" · "}
            <a className="text-blue-700 hover:underline" href="https://www.cdc.gov/mold" target="_blank" rel="noreferrer">
              CDC mold
            </a>
          </li>
          <li>
            <strong>Dry leaks promptly.</strong> Clean and dry standing water, pipe leaks, or window condensation within 24 to 48 hours.
          </li>
          <li>
            <strong>Do not clean visible growth yourself.</strong> Scrubbing, bleaching, or scraping mold can release spores. Share your lab report with a qualified mold remediation professional.
          </li>
          <li>
            <strong>Improve air circulation.</strong> Pull furniture slightly off exterior walls so air can move behind large pieces.
          </li>
        </ul>
      </section>

      <section className="mt-14 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-700" />
          Screening disclaimer
        </h2>
        <p className="mt-2 text-sm text-slate-700 leading-relaxed">
          Total Testing DIY mold test kits provide preliminary surface screening through accredited laboratory
          microbiology analysis. Surface swab sampling identifies mold on accessible surfaces. It is not a substitute
          for a comprehensive professional engineering evaluation, a structural building inspection, a licensed on-site
          mold assessment, or an indoor air quality study.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-slate-900">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="mt-4 bg-white rounded-xl border px-4">
          {FAQS.map((item, index) => (
            <AccordionItem key={item.q} value={`faq-${index}`}>
              <AccordionTrigger className="text-base">{item.q}</AccordionTrigger>
              <AccordionContent className="text-slate-700 leading-relaxed">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="mt-14 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-8">
        <FlaskConical className="w-8 h-8 mb-3" />
        <h2 className="text-2xl font-bold">Take control of your home&apos;s air quality</h2>
        <p className="mt-3 text-blue-100 leading-relaxed">
          Don&apos;t let unexplained dampness or discolored spots keep you guessing. Get lab-verified facts without
          paying for an inspection you may not need yet.
        </p>
        <p className="mt-2 font-semibold">Test Before You Guess.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="bg-white text-blue-800 hover:bg-blue-50">
            <a href={ORDER_URL} target="_blank" rel="noreferrer">
              Order a DIY mold test
            </a>
          </Button>
          <Button asChild variant="outline" className="border-white text-white hover:bg-white/10">
            <Link to="/SignIn">Access your reports</Link>
          </Button>
        </div>
      </section>
    </article>
  );
}
