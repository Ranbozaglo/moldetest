import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Lightbulb,
  ListChecks,
  MapPin,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AI_PROMPTS,
  AUDIT_DATE,
  BLOG_IDEAS,
  GEO_RECOMMENDATIONS,
  NEXT_ACTIONS,
  SEO_RECOMMENDATIONS,
  TRACKED_KEYWORDS,
  researchedSnapshot,
} from "@/data/seoGeoPlaybook";

const STORAGE_KEY = "tt-seo-geo-dashboard-v4";

const loadSnapshot = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return researchedSnapshot();
    const parsed = JSON.parse(raw);
    const base = researchedSnapshot();
    return {
      ...base,
      ...parsed,
      keywordRanks: { ...base.keywordRanks, ...(parsed.keywordRanks || {}) },
      aiMentions: { ...base.aiMentions, ...(parsed.aiMentions || {}) },
      queuedBlogs: parsed.queuedBlogs?.length ? parsed.queuedBlogs : base.queuedBlogs,
    };
  } catch {
    return researchedSnapshot();
  }
};

const rankNumber = (value) => {
  if (value === "NR" || value === "nr") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const opportunityScore = (keyword, rank) => {
  const current = rank || 40;
  const difficultyWeight = keyword.difficulty === "High" ? 0.7 : keyword.difficulty === "Medium" ? 0.85 : 1;
  return Math.round((keyword.volume / current) * difficultyWeight);
};

const impactClass = (impact) => {
  if (impact === "High") return "bg-red-100 text-red-800";
  if (impact === "Medium") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
};

export default function SeoGeoDashboard() {
  const [snapshot, setSnapshot] = useState(researchedSnapshot);
  const [copiedId, setCopiedId] = useState("");
  const [innerTab, setInnerTab] = useState("next");

  useEffect(() => {
    const loaded = loadSnapshot();
    setSnapshot(loaded);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
  }, []);

  const persist = (next) => {
    const withTime = { ...next, updatedAt: new Date().toISOString() };
    setSnapshot(withTime);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withTime));
  };

  const rankedKeywords = useMemo(() => {
    return TRACKED_KEYWORDS.map((keyword) => {
      const rank = rankNumber(snapshot.keywordRanks[keyword.id]);
      const raw = snapshot.keywordRanks[keyword.id];
      return {
        ...keyword,
        rank,
        rankLabel: raw === "NR" || !rank ? "Not ranking" : `#${rank}`,
        opportunity: opportunityScore(keyword, rank),
      };
    }).sort((a, b) => b.opportunity - a.opportunity);
  }, [snapshot.keywordRanks]);

  const topTenCount = rankedKeywords.filter((k) => k.rank && k.rank <= 10).length;
  const aiMentionCount = AI_PROMPTS.filter((p) => snapshot.aiMentions[p.id]).length;

  const copyBlog = async (idea) => {
    const text = [
      `# ${idea.title}`,
      `Target keyword: ${idea.keyword}`,
      `Why this ranks: ${idea.why}`,
      "",
      "Outline:",
      ...(idea.outline || []).map((item, i) => `${i + 1}. ${item}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(idea.id);
      setTimeout(() => setCopiedId(""), 2000);
    } catch {
      setCopiedId("");
    }
  };

  const toggleQueued = (id) => {
    const queued = snapshot.queuedBlogs.includes(id)
      ? snapshot.queuedBlogs.filter((x) => x !== id)
      : [...snapshot.queuedBlogs, id];
    persist({ ...snapshot, queuedBlogs: queued });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg flex-shrink-0">
            <Globe className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-gray-900">SEO & GEO visibility</h2>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Recrawl of total-testing.com, leftover total-test.com / total-testing-mold.com URLs, and public search ({AUDIT_DATE}).
              Package pages, no-kit landing, and 25 posts are live. Google still ranks the old domains.
              Start with <span className="font-semibold">Do this next</span>.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Rankings are page-1 checks, not Search Console. Visitors come from first-party tracking on
              total-testing.com (~9 sessions / 16 pageviews in 30 days). Trustpilot is public; no Google Maps listing was found.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard
          title="Google rating"
          value="None found"
          hint="No Maps listing. Trustpilot 4.2★ from 8 reviews"
          icon={Star}
          color="from-amber-50 to-amber-100 border-amber-200"
          iconBg="bg-amber-500"
        />
        <KpiCard
          title="Organic visitors"
          value="~10 / 30d"
          hint="First-party sessions — almost none from kit keywords"
          icon={Users}
          color="from-blue-50 to-blue-100 border-blue-200"
          iconBg="bg-blue-500"
        />
        <KpiCard
          title="Keywords in top 10"
          value={`${topTenCount}/${TRACKED_KEYWORDS.length}`}
          hint="Brand + no-kit still on old domains, not total-testing.com"
          icon={TrendingUp}
          color="from-green-50 to-green-100 border-green-200"
          iconBg="bg-green-500"
        />
        <KpiCard
          title="AI mentioned"
          value={`${aiMentionCount}/${AI_PROMPTS.length}`}
          hint="New posts exist; models still cite MycoTest / EPA"
          icon={Bot}
          color="from-violet-50 to-violet-100 border-violet-200"
          iconBg="bg-violet-500"
        />
        <KpiCard
          title="Write next"
          value={`${snapshot.queuedBlogs.length} posts`}
          hint={`${BLOG_IDEAS.filter((b) => b.published).length} already live — Houston, bathroom, lab stats left`}
          icon={Lightbulb}
          color="from-orange-50 to-orange-100 border-orange-200"
          iconBg="bg-orange-500"
        />
      </div>

      <Tabs value={innerTab} onValueChange={setInnerTab} className="space-y-4">
        <div className="bg-white rounded-xl p-2 shadow-sm border border-slate-200">
          <TabsList className="flex w-full flex-wrap h-auto gap-1 bg-slate-100 p-1">
            <TabsTrigger value="next" className="flex-1 min-w-[110px] gap-2">
              <ListChecks className="w-4 h-4" />
              Do this next
            </TabsTrigger>
            <TabsTrigger value="snapshot" className="flex-1 min-w-[110px] gap-2">
              <BarChart3 className="w-4 h-4" />
              Snapshot
            </TabsTrigger>
            <TabsTrigger value="rankings" className="flex-1 min-w-[110px] gap-2">
              <Search className="w-4 h-4" />
              Rankings
            </TabsTrigger>
            <TabsTrigger value="geo" className="flex-1 min-w-[110px] gap-2">
              <Sparkles className="w-4 h-4" />
              GEO / AI
            </TabsTrigger>
            <TabsTrigger value="blogs" className="flex-1 min-w-[110px] gap-2">
              <Lightbulb className="w-4 h-4" />
              Blog ideas
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex-1 min-w-[110px] gap-2">
              <Globe className="w-4 h-4" />
              SEO findings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="next" className="space-y-4">
          <Card className="border-indigo-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-indigo-600" />
                What to improve next
              </CardTitle>
              <CardDescription>
                Content is no longer the bottleneck. Finish 301s, get the new URLs indexed, then GBP and the no-kit landing page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {NEXT_ACTIONS.map((item) => (
                <div key={item.id} className="rounded-xl border bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge className="bg-indigo-600 text-white">#{item.priority}</Badge>
                    <Badge variant="outline">{item.effort}</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{item.why}</p>
                  <p className="text-sm text-indigo-900 mt-2 bg-indigo-50 rounded-md p-3">
                    <span className="font-medium">Do next: </span>
                    {item.doNext}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshot" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Visitors
                </CardTitle>
                <CardDescription>First-party tracking on total-testing.com, not Search Console.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-4xl font-bold text-slate-900">~10 sessions / 30 days</div>
                <p className="text-sm text-slate-600">{snapshot.visitorsNote}</p>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
                  Yoast lists the package URLs, /diy-mold-test-no-kit/, and 25 blog posts. Public search is still
                  returning the old total-test.com URLs. Most visits in the tracker are Instagram, not organic.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Ratings & reviews
                </CardTitle>
                <CardDescription>Google is empty. Trustpilot is the only public score found.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-slate-500">Google Business</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">Not found</p>
                    <p className="text-xs text-slate-500 mt-1">No Maps listing or star rating</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-slate-500">Trustpilot</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">4.2★</p>
                    <p className="text-xs text-slate-500 mt-1">8 reviews on total-testing.com</p>
                  </div>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                  8 reviews is not enough to compete. Point the existing report-ready email at a Google review link
                  after GBP is live. Do not rely on homepage testimonials alone.
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <a
                    href="https://www.trustpilot.com/review/total-testing.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-blue-700 hover:underline"
                  >
                    Trustpilot profile
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>
                  <a
                    href="https://business.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-blue-700 hover:underline"
                  >
                    Create Google Business Profile
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Brand & site snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg border p-4">
                <p className="font-medium text-slate-900">What you actually sell</p>
                <p className="text-slate-600 mt-1">
                  Mail-in surface swab. Household cotton swab + zip bag. No physical kit. Inspector-reviewed lab report
                  in 24–48 business hours after the lab receives it. Packages $189 / $215 / $270.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium text-slate-900">Who beats you today</p>
                <p className="text-slate-600 mt-1">
                  Kits: Home Armor, MycoTest, Moldlab. Houston: on-site inspectors at ~$550. GEO: MycoTest already has a household-supplies page.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium text-slate-900">Your open wedge</p>
                <p className="text-slate-600 mt-1">
                  “No kit, swab today, inspector-reviewed lab report.” You still need one dedicated no-kit URL on
                  total-testing.com. MycoTest owns that SERP today.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rankings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-600" />
                Keyword ranking (page-1 audit)
              </CardTitle>
              <CardDescription>
                “Not ranking” means total-testing.com was not on page 1. Brand and no-kit ranks that do appear are still
                the old total-test.com / total-testing-mold.com URLs. Sorted by opportunity.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-3 font-medium">Keyword</th>
                    <th className="py-2 pr-3 font-medium">Intent</th>
                    <th className="py-2 pr-3 font-medium">Est. volume</th>
                    <th className="py-2 pr-3 font-medium">Rank</th>
                    <th className="py-2 pr-3 font-medium">Target</th>
                    <th className="py-2 font-medium">What we found</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedKeywords.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 align-top">
                      <td className="py-3 pr-3 font-medium text-slate-900">{row.keyword}</td>
                      <td className="py-3 pr-3">
                        <Badge variant="outline">{row.intent}</Badge>
                      </td>
                      <td className="py-3 pr-3">{row.volume.toLocaleString()}</td>
                      <td className="py-3 pr-3">
                        <Badge
                          className={row.rank && row.rank <= 10 ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"}
                          variant="secondary"
                        >
                          {row.rankLabel}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3">#{row.target}</td>
                      <td className="py-3 text-slate-600 max-w-md">{row.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-violet-600" />
                AI mention audit
              </CardTitle>
              <CardDescription>
                Checked against who Google already ranks (AI Overviews cite those pages). None of these prompts currently
                surface Total Testing — even though several matching articles are now live.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {AI_PROMPTS.map((item) => (
                <div key={item.id} className="p-3 rounded-lg border bg-white">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className="text-sm font-medium text-slate-900 flex-1">“{item.prompt}”</p>
                    <Badge className="bg-slate-100 text-slate-700" variant="secondary">
                      Not mentioned
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{item.finding}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                GEO recommendations
              </CardTitle>
              <CardDescription>
                Generative Engine Optimization — getting cited by ChatGPT, Perplexity, and Google AI Overviews.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GEO_RECOMMENDATIONS.map((item) => (
                <div key={item.id} className="rounded-lg border border-violet-100 bg-violet-50/50 p-4">
                  <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blogs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-orange-500" />
                Blog ideas, in ranking order
              </CardTitle>
              <CardDescription>
                Ten of these URLs are already live. Remaining queue is original lab stats (needs real numbers, not
                invented percentages). Link published posts to /packages/spot-check/, /extended/, /full-house/, and
                /diy-mold-test-no-kit/.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {BLOG_IDEAS.map((idea) => {
                const queued = snapshot.queuedBlogs.includes(idea.id);
                return (
                  <div key={idea.id} className="rounded-xl border border-slate-200 p-4 bg-white">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className="bg-indigo-600 text-white">#{idea.priority}</Badge>
                          <Badge variant="outline">{idea.keyword}</Badge>
                          <Badge className={impactClass(idea.difficulty)} variant="secondary">
                            {idea.difficulty} competition
                          </Badge>
                          {idea.published && (
                            <Badge className="bg-emerald-100 text-emerald-800" variant="secondary">
                              Published
                            </Badge>
                          )}
                          {queued && !idea.published && (
                            <Badge className="bg-green-100 text-green-800" variant="secondary">
                              Write next
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-base md:text-lg font-semibold text-slate-900">{idea.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">{idea.why}</p>
                        {idea.url && (
                          <a
                            href={idea.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-sm text-blue-700 hover:underline mt-2"
                          >
                            {idea.url.replace("https://", "")}
                            <ExternalLink className="w-3.5 h-3.5 ml-1" />
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {idea.outline?.length > 0 && (
                          <Button variant="outline" size="sm" onClick={() => copyBlog(idea)}>
                            {copiedId === idea.id ? (
                              <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 mr-1" />
                            )}
                            {copiedId === idea.id ? "Copied" : "Copy outline"}
                          </Button>
                        )}
                        {!idea.published && (
                          <Button
                            variant={queued ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => toggleQueued(idea.id)}
                          >
                            {queued ? "Queued" : "Queue"}
                          </Button>
                        )}
                      </div>
                    </div>
                    {idea.outline?.length > 0 && (
                      <ol className="mt-3 list-decimal pl-5 text-sm text-slate-700 space-y-1">
                        {idea.outline.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                SEO findings
              </CardTitle>
              <CardDescription>
                From the live marketing site at total-testing.com plus leftover indexation on total-test.com and
                total-testing-mold.com — not from the logged-in DIY app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {SEO_RECOMMENDATIONS.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 rounded-lg border bg-white">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <Badge className={impactClass(item.impact)} variant="secondary">
                        {item.impact} impact
                      </Badge>
                      <Badge variant="outline">{item.area}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ title, value, hint, icon: Icon, color, iconBg }) {
  return (
    <Card className={`bg-gradient-to-br ${color} hover:shadow-md transition-all`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-800">{title}</CardTitle>
        <div className={`p-2 ${iconBg} rounded-lg`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
        <p className="text-xs text-slate-600">{hint}</p>
      </CardContent>
    </Card>
  );
}
