import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { KitService } from "@/api/entities";

const SUMMARY_URL = "https://total-testing.com/wp-json/tt-analytics/v1/summary";
const ANALYTICS_KEY = "tt_ld_7f3c9e2a1b84d6f0";
const ACCENT = "#1d4ed8";

/**
 * Reserved for later phases. Present in the API as null and must never be
 * rendered as live numbers until the matching phase writes real values.
 */
export const FUTURE_METRIC_KEYS = [
  "orders",
  "revenue",
  "purchase_conversion_rate",
  "revenue_per_visitor",
  "utm_content",
  "utm_term",
  "creator",
  "creative",
  "device",
  "scroll_depth",
  "first_touch",
  "last_touch",
];

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "custom", label: "Custom" },
];

const TREND_METRICS = [
  { key: "visitors", label: "Visitors" },
  { key: "pageviews", label: "Page Views" },
  { key: "checkout_clicks", label: "Checkout Clicks" },
  { key: "checkout_click_rate", label: "Checkout Click Rate" },
  { key: "orders", label: "Orders" },
  { key: "revenue", label: "Revenue" },
];

const TERM_HELP = {
  visitors: "Unique visitor IDs (tt_sid) in this period. One person can still have more than one 30-minute session.",
  sessions: "A session ends after 30 minutes without a new event. This is inferred from events; stored rows are not rewritten.",
  pageviews: "pageview events in sessions that started in this period.",
  avg_engaged_sec: "Average engaged time per session, using the larger of recorded engaged time and session span.",
  checkout_clicks: "Clicks on buy.stripe.com. This is not a purchase.",
  checkout_click_rate: "Share of sessions with at least one checkout click. Not a purchase conversion rate.",
  entrances: "Sessions whose first page was this path.",
  exit_rate: "Share of sessions that viewed this page and also ended there. An exit is not automatically a problem.",
  exits: "Sessions whose last page was this path. People often leave after they found what they needed.",
  orders: "Stripe purchases joined to a visit id after checkout. Older fulfillments without a visit id are listed on the Revenue tab, not counted as attributed conversion.",
  revenue: "Attributed purchase revenue from Stripe amount_total. $0 until a purchase is joined to a visit.",
  purchase_conversion_rate: "Attributed purchases divided by sessions. Not checkout click rate.",
  aov: "Average order value of attributed purchases.",
  revenue_per_visitor: "Attributed revenue divided by unique visitors.",
  first_touch: "Source stored on the visitor's first marketing-site landing (local first-touch). Direct is used if no source was stored.",
  last_touch: "Last non-direct source in the session.",
  scroll_depth: "Deepest scroll band recorded for the session. New events only; older visits have no scroll data.",
};

const formatDuration = (seconds) => {
  const n = Number(seconds) || 0;
  if (n < 60) return `${Math.round(n)}s`;
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const formatPct = (value, digits = 1) => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${(Number(value) * 100).toFixed(digits)}%`;
};

const formatInt = (value) => {
  if (value == null) return "—";
  return Number(value).toLocaleString();
};

const formatMoney = (value) => {
  if (value == null || value === "") return "—";
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Help = ({ term }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button" className="inline-flex text-slate-400 hover:text-slate-600" aria-label="What this means">
        <Info className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs bg-slate-900 text-white">
      {TERM_HELP[term] || term}
    </TooltipContent>
  </Tooltip>
);

const Delta = ({ kpi, invert = false }) => {
  if (!kpi) return null;
  const isRate = kpi.delta_pp != null && kpi.delta_pct == null;
  const raw = isRate ? kpi.delta_pp : kpi.delta_pct;
  if (raw == null) return <p className="text-xs text-slate-400">No previous comparison</p>;
  const up = raw > 0;
  const down = raw < 0;
  const good = invert ? down : up;
  const color = raw === 0 ? "text-slate-500" : good ? "text-emerald-600" : "text-red-600";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const label = isRate
    ? `${raw > 0 ? "+" : ""}${raw} pp vs previous`
    : `${raw > 0 ? "+" : ""}${raw}% vs previous`;
  return (
    <p className={`flex items-center gap-0.5 text-xs ${color}`}>
      {raw !== 0 ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </p>
  );
};

function sortRows(rows, key, dir) {
  const copy = [...rows];
  copy.sort((a, b) => {
    const av = a?.[key];
    const bv = b?.[key];
    if (typeof av === "string" || typeof bv === "string") {
      return dir * String(av || "").localeCompare(String(bv || ""));
    }
    return dir * ((Number(av) || 0) - (Number(bv) || 0));
  });
  return copy;
}

function SortHead({ label, column, sort, onSort, align = "left", term }) {
  const active = sort.key === column;
  return (
    <TableHead className={align === "right" ? "text-right" : ""}>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium hover:text-blue-700"
        onClick={() => onSort(column)}
      >
        {label}
        {term ? <Help term={term} /> : null}
        {active ? (sort.dir === 1 ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : null}
      </button>
    </TableHead>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

export default function LeadsAnalytics() {
  const [preset, setPreset] = useState("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [trendMetric, setTrendMetric] = useState("visitors");
  const [section, setSection] = useState("overview");
  const [data, setData] = useState(null);
  const [stripePurchases, setStripePurchases] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openRaw, setOpenRaw] = useState("");
  const [sorts, setSorts] = useState({
    acquisition: { key: "sessions", dir: -1 },
    landings: { key: "entrances", dir: -1 },
    content: { key: "entrances", dir: -1 },
    exits: { key: "sessions", dir: -1 },
    journeys: { key: "sessions", dir: -1 },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ preset });
      if (preset === "custom") {
        if (!customFrom || !customTo) {
          throw new Error("Choose a start and end date for the custom range.");
        }
        params.set("from", customFrom);
        params.set("to", customTo);
      }
      if (sourceFilter) params.set("source", sourceFilter);
      const res = await fetch(`${SUMMARY_URL}?${params.toString()}`, {
        headers: { "X-TT-Analytics-Key": ANALYTICS_KEY },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || json.error || `Could not load analytics (${res.status})`);
      }
      setData(json);
      try {
        const purchases = await KitService.getAnalyticsPurchases({
          from: json.range?.from,
          to: json.range?.to,
        });
        setStripePurchases(purchases);
      } catch {
        setStripePurchases(null);
      }
    } catch (err) {
      setData(null);
      setError(err?.message || "Could not load analytics");
    } finally {
      setLoading(false);
    }
  }, [preset, customFrom, customTo, sourceFilter]);

  useEffect(() => {
    if (preset === "custom" && (!customFrom || !customTo)) return;
    load();
  }, [load, preset, customFrom, customTo]);

  const kpis = data?.kpis || {};
  const thresholds = data?.thresholds || { min_sessions_period: 20, min_sessions_segment: 15, session_timeout_min: 30 };
  const trendPoints = data?.trend?.points || [];
  const acquisition = useMemo(
    () => sortRows(data?.acquisition || [], sorts.acquisition.key, sorts.acquisition.dir),
    [data, sorts.acquisition]
  );
  const landings = useMemo(
    () => sortRows(data?.landings || [], sorts.landings.key, sorts.landings.dir),
    [data, sorts.landings]
  );
  const content = useMemo(
    () => sortRows(data?.content || [], sorts.content.key, sorts.content.dir),
    [data, sorts.content]
  );
  const exits = useMemo(
    () => sortRows(data?.exits || [], sorts.exits.key, sorts.exits.dir),
    [data, sorts.exits]
  );
  const journeys = useMemo(
    () => sortRows(data?.journeys || [], sorts.journeys.key, sorts.journeys.dir),
    [data, sorts.journeys]
  );

  const setSort = (table, key) => {
    setSorts((prev) => {
      const current = prev[table];
      const dir = current.key === key ? current.dir * -1 : -1;
      return { ...prev, [table]: { key, dir } };
    });
  };

  const kpiCards = [
    { key: "visitors", label: "Visitors", format: (k) => formatInt(k?.value), term: "visitors" },
    { key: "sessions", label: "Sessions", format: (k) => formatInt(k?.value), term: "sessions" },
    { key: "pageviews", label: "Page Views", format: (k) => formatInt(k?.value), term: "pageviews" },
    { key: "avg_engaged_sec", label: "Avg Engaged Time", format: (k) => formatDuration(k?.value), term: "avg_engaged_sec" },
    { key: "checkout_clicks", label: "Checkout Clicks", format: (k) => formatInt(k?.value), term: "checkout_clicks" },
    { key: "checkout_click_rate", label: "Checkout Click Rate", format: (k) => formatPct(k?.value), term: "checkout_click_rate" },
  ];
  const revenueCards = [
    { key: "orders", label: "Attributed Orders", format: (k) => formatInt(k?.value), term: "orders" },
    { key: "revenue", label: "Attributed Revenue", format: (k) => formatMoney(k?.value), term: "revenue" },
    { key: "purchase_conversion_rate", label: "Purchase Conversion", format: (k) => formatPct(k?.value), term: "purchase_conversion_rate" },
    { key: "aov", label: "AOV", format: (k) => formatMoney(k?.value), term: "aov" },
    { key: "revenue_per_visitor", label: "Revenue / Visitor", format: (k) => formatMoney(k?.value), term: "revenue_per_visitor" },
  ];

  const chartData = trendPoints.map((row) => ({
    ...row,
    checkout_click_rate_pct: Number(row.checkout_click_rate || 0) * 100,
  }));
  const chartKey = trendMetric === "checkout_click_rate" ? "checkout_click_rate_pct" : trendMetric;
  const chartIsRate = trendMetric === "checkout_click_rate";
  const chartIsMoney = trendMetric === "revenue";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <Card className="border-slate-200">
          <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between space-y-0">
            <div>
              <CardTitle className="text-xl text-slate-900">Leads Analytics / Growth Analytics</CardTitle>
              <CardDescription>
                Marketing site visits, aggregated on the server. Attributed orders require a Stripe visit id. Comparison is the immediately preceding equivalent period.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {preset === "custom" ? (
                <>
                  <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-[150px]" />
                  <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-[150px]" />
                </>
              ) : null}
              <Button variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          {sourceFilter ? (
            <CardContent className="pt-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-800">
                Source: {sourceFilter}
                <button type="button" onClick={() => setSourceFilter("")} aria-label="Clear source filter">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardContent>
          ) : null}
        </Card>

        <Tabs value={section} onValueChange={setSection}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attribution">Attribution</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="creatives">Creatives</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            {error ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6 text-sm text-red-800">{error}</CardContent>
              </Card>
            ) : null}

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {kpiCards.map((card) => (
                <div key={card.key} className="rounded-xl border border-slate-200 bg-white p-4 border-t-2" style={{ borderTopColor: ACCENT }}>
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                    {card.label}
                    <Help term={card.term} />
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{loading ? "—" : card.format(kpis[card.key])}</div>
                  {!loading ? <Delta kpi={kpis[card.key]} /> : <p className="text-xs text-slate-400">Loading</p>}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {revenueCards.map((card) => (
                <div key={card.key} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                    {card.label}
                    <Help term={card.term} />
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{loading ? "—" : card.format(kpis[card.key])}</div>
                  {!loading ? <Delta kpi={kpis[card.key]} /> : <p className="text-xs text-slate-400">Loading</p>}
                </div>
              ))}
            </div>

            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
                <div>
                  <CardTitle>Traffic trend</CardTitle>
                  <CardDescription>
                    Grouped by {data?.trend?.bucket || "day"}. Totals are computed on the server.
                  </CardDescription>
                </div>
                <Select value={trendMetric} onValueChange={setTrendMetric}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TREND_METRICS.map((m) => (
                      <SelectItem key={m.key} value={m.key}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 && !loading ? (
                  <Empty>No sessions in this range yet.</Empty>
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#64748b" }} minTickGap={24} />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickFormatter={(v) => (chartIsRate ? `${v}%` : chartIsMoney ? `$${v}` : v)}
                          width={56}
                        />
                        <ChartTooltip
                          formatter={(value) =>
                            chartIsRate ? `${Number(value).toFixed(1)}%` : chartIsMoney ? formatMoney(value) : formatInt(value)
                          }
                        />
                        <Line type="monotone" dataKey={chartKey} stroke={ACCENT} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Traffic sources</CardTitle>
                  <CardDescription>
                    Display names are normalized. Original UTM and referrer values are unchanged. Click a source to filter.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {acquisition.length === 0 && !loading ? (
                    <Empty>No sources in this range.</Empty>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortHead label="Source" column="source" sort={sorts.acquisition} onSort={(k) => setSort("acquisition", k)} />
                          <SortHead label="Sessions" column="sessions" sort={sorts.acquisition} onSort={(k) => setSort("acquisition", k)} align="right" />
                          <SortHead label="Page Views" column="pageviews" sort={sorts.acquisition} onSort={(k) => setSort("acquisition", k)} align="right" />
                          <SortHead label="Avg Engaged Time" column="avg_engaged_sec" sort={sorts.acquisition} onSort={(k) => setSort("acquisition", k)} align="right" />
                          <SortHead label="Checkout Clicks" column="checkout_clicks" sort={sorts.acquisition} onSort={(k) => setSort("acquisition", k)} align="right" />
                          <SortHead label="Checkout Click Rate" column="checkout_click_rate" sort={sorts.acquisition} onSort={(k) => setSort("acquisition", k)} align="right" term="checkout_click_rate" />
                          <SortHead label="Orders" column="purchases" sort={sorts.acquisition} onSort={(k) => setSort("acquisition", k)} align="right" term="orders" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {acquisition.map((row) => (
                          <React.Fragment key={row.source}>
                            <TableRow className="cursor-pointer hover:bg-slate-50" onClick={() => setSourceFilter(row.source)}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {row.source}
                                  {(row.raw_sources || []).length > 0 ? (
                                    <button
                                      type="button"
                                      className="text-xs text-blue-700 hover:underline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenRaw(openRaw === row.source ? "" : row.source);
                                      }}
                                    >
                                      raw
                                    </button>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{formatInt(row.sessions)}</TableCell>
                              <TableCell className="text-right">{formatInt(row.pageviews)}</TableCell>
                              <TableCell className="text-right">{formatDuration(row.avg_engaged_sec)}</TableCell>
                              <TableCell className="text-right">{formatInt(row.checkout_clicks)}</TableCell>
                              <TableCell className="text-right">{formatPct(row.checkout_click_rate)}</TableCell>
                              <TableCell className="text-right">{formatInt(row.purchases)}</TableCell>
                            </TableRow>
                            {openRaw === row.source ? (
                              <TableRow>
                                <TableCell colSpan={7} className="bg-slate-50 text-xs text-slate-600">
                                  Stored values:{" "}
                                  {(row.raw_sources || []).map((raw) => `${raw.value} (${raw.sessions})`).join(" · ") || "none"}
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Funnel</CardTitle>
                  <CardDescription>
                    Only stages the current events can prove: session, package page viewed, checkout click. Home and Pricing are not required steps.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(data?.funnel || []).map((step, idx) => (
                    <div key={step.step} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-800">{step.step}</span>
                        <span className="text-slate-600">
                          {formatInt(step.sessions)} · {formatPct(step.pct_total)} of sessions
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-700" style={{ width: `${Math.max(1, (step.pct_total || 0) * 100)}%` }} />
                      </div>
                      {idx > 0 ? (
                        <p className="text-xs text-slate-500">
                          {formatPct(step.pct_prev)} progressed from the previous stage · {formatPct(step.drop_prev)} dropped off
                        </p>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Landing pages</CardTitle>
                <CardDescription>
                  First page of each 30-minute session, not every pageview. Entrances and sessions can differ when people also reach the page later in a visit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {landings.length === 0 && !loading ? (
                  <Empty>No landing pages yet.</Empty>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortHead label="Landing Page" column="path" sort={sorts.landings} onSort={(k) => setSort("landings", k)} />
                        <SortHead label="Entrances" column="entrances" sort={sorts.landings} onSort={(k) => setSort("landings", k)} align="right" term="entrances" />
                        <SortHead label="Sessions" column="sessions" sort={sorts.landings} onSort={(k) => setSort("landings", k)} align="right" />
                        <SortHead label="Avg Engaged Time" column="avg_engaged_sec" sort={sorts.landings} onSort={(k) => setSort("landings", k)} align="right" />
                        <SortHead label="Checkout Clicks" column="checkout_clicks" sort={sorts.landings} onSort={(k) => setSort("landings", k)} align="right" />
                        <SortHead label="Checkout Click Rate" column="checkout_click_rate" sort={sorts.landings} onSort={(k) => setSort("landings", k)} align="right" term="checkout_click_rate" />
                        <SortHead label="Exit Rate" column="exit_rate" sort={sorts.landings} onSort={(k) => setSort("landings", k)} align="right" term="exit_rate" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {landings.map((row) => (
                        <TableRow key={row.path}>
                          <TableCell>
                            <div className="font-medium">{row.topic || row.path}</div>
                            <div className="text-xs text-slate-500">{row.path}</div>
                          </TableCell>
                          <TableCell className="text-right">{formatInt(row.entrances)}</TableCell>
                          <TableCell className="text-right">{formatInt(row.sessions)}</TableCell>
                          <TableCell className="text-right">{formatDuration(row.avg_engaged_sec)}</TableCell>
                          <TableCell className="text-right">{formatInt(row.checkout_clicks)}</TableCell>
                          <TableCell className="text-right">{formatPct(row.checkout_click_rate)}</TableCell>
                          <TableCell className="text-right">{formatPct(row.exit_rate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content performance</CardTitle>
                <CardDescription>
                  Published WordPress posts, matched by permalink. Checkout clicks are not called conversions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {content.length === 0 && !loading ? (
                  <Empty>No blog or article traffic in this range.</Empty>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortHead label="Article / Page" column="path" sort={sorts.content} onSort={(k) => setSort("content", k)} />
                        <SortHead label="Entrances" column="entrances" sort={sorts.content} onSort={(k) => setSort("content", k)} align="right" term="entrances" />
                        <SortHead label="Avg Engaged Time" column="avg_engaged_sec" sort={sorts.content} onSort={(k) => setSort("content", k)} align="right" />
                        <SortHead label="Checkout Clicks" column="checkout_clicks" sort={sorts.content} onSort={(k) => setSort("content", k)} align="right" />
                        <SortHead label="Checkout Click Rate" column="checkout_click_rate" sort={sorts.content} onSort={(k) => setSort("content", k)} align="right" term="checkout_click_rate" />
                        <SortHead label="Orders" column="purchases" sort={sorts.content} onSort={(k) => setSort("content", k)} align="right" term="orders" />
                        <SortHead label="Exits" column="exits" sort={sorts.content} onSort={(k) => setSort("content", k)} align="right" term="exits" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {content.map((row) => (
                        <TableRow key={row.path}>
                          <TableCell>
                            <div className="font-medium">{row.topic || row.path}</div>
                            <div className="text-xs text-slate-500">{row.path}</div>
                          </TableCell>
                          <TableCell className="text-right">{formatInt(row.entrances)}</TableCell>
                          <TableCell className="text-right">{formatDuration(row.avg_engaged_sec)}</TableCell>
                          <TableCell className="text-right">{formatInt(row.checkout_clicks)}</TableCell>
                          <TableCell className="text-right">{formatPct(row.checkout_click_rate)}</TableCell>
                          <TableCell className="text-right">{formatInt(row.purchases)}</TableCell>
                          <TableCell className="text-right">{formatInt(row.exits)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Where sessions end</CardTitle>
                  <CardDescription>
                    Last page of the session. This is a location, not a diagnosis. People often leave after they got what they came for.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {exits.length === 0 && !loading ? (
                    <Empty>No exits yet.</Empty>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortHead label="Last Page" column="path" sort={sorts.exits} onSort={(k) => setSort("exits", k)} />
                          <SortHead label="Sessions Ending There" column="sessions" sort={sorts.exits} onSort={(k) => setSort("exits", k)} align="right" />
                          <SortHead label="% of Session Exits" column="exit_share" sort={sorts.exits} onSort={(k) => setSort("exits", k)} align="right" />
                          <SortHead label="Avg Engaged Time" column="avg_engaged_sec" sort={sorts.exits} onSort={(k) => setSort("exits", k)} align="right" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exits.map((row) => (
                          <TableRow key={row.path}>
                            <TableCell className="font-medium">{row.path}</TableCell>
                            <TableCell className="text-right">{formatInt(row.sessions)}</TableCell>
                            <TableCell className="text-right">{formatPct(row.exit_share)}</TableCell>
                            <TableCell className="text-right">{formatDuration(row.avg_engaged_sec)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Entry → Exit</CardTitle>
                  <CardDescription>Common first-page to last-page pairs from the same sessions. Full visitor journeys come later.</CardDescription>
                </CardHeader>
                <CardContent>
                  {journeys.length === 0 && !loading ? (
                    <Empty>No journeys yet.</Empty>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortHead label="Landing Page" column="entry" sort={sorts.journeys} onSort={(k) => setSort("journeys", k)} />
                          <SortHead label="Last Page" column="exit" sort={sorts.journeys} onSort={(k) => setSort("journeys", k)} />
                          <SortHead label="Sessions" column="sessions" sort={sorts.journeys} onSort={(k) => setSort("journeys", k)} align="right" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {journeys.map((row) => (
                          <TableRow key={`${row.entry}->${row.exit}`}>
                            <TableCell className="text-sm">{row.entry}</TableCell>
                            <TableCell className="text-sm">{row.exit}</TableCell>
                            <TableCell className="text-right">{formatInt(row.sessions)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top opportunities</CardTitle>
                <CardDescription>
                  Deterministic observations only. No AI and no cause-and-effect claims. Hidden when sample size is too small (period ≥ {thresholds.min_sessions_period} sessions in both windows; source or page ≥ {thresholds.min_sessions_segment} sessions).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(data?.opportunities || []).length === 0 && !loading ? (
                  <Empty>No observations met the sample-size rules for this range.</Empty>
                ) : (
                  <ul className="space-y-3">
                    {(data?.opportunities || []).map((row, idx) => (
                      <li key={`${row.text}-${idx}`} className="rounded-lg border border-slate-200 px-4 py-3">
                        <p className="text-sm text-slate-800">{row.text}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.kind || "observation"} · {row.based_on}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attribution" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>First touch</CardTitle>
                  <CardDescription>Source stored from the visitor’s first landing.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="text-right">Checkout Clicks</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.first_touch || []).map((row) => (
                        <TableRow key={row.source || row.label}>
                          <TableCell>{row.source || row.label}</TableCell>
                          <TableCell className="text-right">{formatInt(row.sessions)}</TableCell>
                          <TableCell className="text-right">{formatInt(row.checkout_clicks)}</TableCell>
                          <TableCell className="text-right">{formatInt(row.purchases)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Last touch</CardTitle>
                  <CardDescription>Last non-direct source in the session.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="text-right">Checkout Clicks</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.last_touch || []).map((row) => (
                        <TableRow key={row.source || row.label}>
                          <TableCell>{row.source || row.label}</TableCell>
                          <TableCell className="text-right">{formatInt(row.sessions)}</TableCell>
                          <TableCell className="text-right">{formatInt(row.checkout_clicks)}</TableCell>
                          <TableCell className="text-right">{formatInt(row.purchases)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Channel</CardTitle>
                  <CardDescription>Paid uses utm_medium. Google, Bing, and AI sources without paid medium are organic.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="text-right">Checkout Clicks</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.channels || []).map((row) => (
                        <TableRow key={row.channel || row.label}>
                          <TableCell>{row.channel || row.label}</TableCell>
                          <TableCell className="text-right">{formatInt(row.sessions)}</TableCell>
                          <TableCell className="text-right">{formatInt(row.checkout_clicks)}</TableCell>
                          <TableCell className="text-right">{formatInt(row.purchases)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Device</CardTitle>
                  <CardDescription>From viewport/user agent on new hits. Older rows show unknown.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="text-right">Checkout Clicks</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.devices || []).map((row) => (
                        <TableRow key={row.device || row.label}>
                          <TableCell>{row.device || row.label}</TableCell>
                          <TableCell className="text-right">{formatInt(row.sessions)}</TableCell>
                          <TableCell className="text-right">{formatInt(row.checkout_clicks)}</TableCell>
                          <TableCell className="text-right">{formatInt(row.purchases)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Stripe fulfillments</CardTitle>
                <CardDescription>
                  {stripePurchases?.note || "All kit fulfillments in this date range, including purchases not joined to a website visit."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Orders</p>
                  <p className="text-2xl font-semibold">{formatInt(stripePurchases?.orders)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Revenue</p>
                  <p className="text-2xl font-semibold">{stripePurchases ? formatMoney(stripePurchases.revenue) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Attributed to a visit</p>
                  <p className="text-2xl font-semibold">{formatInt(stripePurchases?.attributed_orders)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Estimated list-price rows</p>
                  <p className="text-2xl font-semibold">{formatInt(stripePurchases?.estimated_orders)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>By package</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Package</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stripePurchases?.by_package || []).map((row) => (
                      <TableRow key={row.package_type}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className="text-right">{formatInt(row.orders)}</TableCell>
                        <TableCell className="text-right">{formatMoney((row.revenue_cents || 0) / 100)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!stripePurchases ? <Empty>Sign in as admin to load fulfillment totals. Attributed visit orders still appear on Overview.</Empty> : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="creatives" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>UTM contract</CardTitle>
                <CardDescription>Use these parameters on ads and UGC links. Historical visits without utm_content still appear by campaign only.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Meaning</TableHead>
                      <TableHead>Example</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.utm_contract || []).map((row) => (
                      <TableRow key={row.param}>
                        <TableCell className="font-medium">{row.param}</TableCell>
                        <TableCell>{row.meaning}</TableCell>
                        <TableCell className="text-slate-600">{row.example}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {[
                ["Campaigns", data?.campaigns, "campaign"],
                ["Creators", data?.creators, "creator"],
                ["Creatives", data?.creatives, "creative"],
              ].map(([title, rows, key]) => (
                <Card key={title}>
                  <CardHeader>
                    <CardTitle>{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!(rows || []).length ? (
                      <Empty>No {title.toLowerCase()} in this range. New UTMs start recording after this deploy.</Empty>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Sessions</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(rows || []).map((row) => (
                            <TableRow key={row[key] || row.label}>
                              <TableCell>{row[key] || row.label}</TableCell>
                              <TableCell className="text-right">{formatInt(row.sessions)}</TableCell>
                              <TableCell className="text-right">{formatInt(row.purchases)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>CTA clicks</CardTitle>
                </CardHeader>
                <CardContent>
                  {!(data?.ctas || []).length ? (
                    <Empty>CTA names start recording after this deploy.</Empty>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>CTA</TableHead>
                          <TableHead className="text-right">Clicks</TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.ctas || []).map((row) => (
                          <TableRow key={row.cta}>
                            <TableCell>{row.cta}</TableCell>
                            <TableCell className="text-right">{formatInt(row.clicks)}</TableCell>
                            <TableCell className="text-right">{formatInt(row.sessions)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>FAQ opens</CardTitle>
                </CardHeader>
                <CardContent>
                  {!(data?.faqs || []).length ? (
                    <Empty>FAQ opens start recording after this deploy.</Empty>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>FAQ</TableHead>
                          <TableHead className="text-right">Opens</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.faqs || []).map((row) => (
                          <TableRow key={row.faq}>
                            <TableCell>{row.faq}</TableCell>
                            <TableCell className="text-right">{formatInt(row.opens)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Live events (5 min)</p>
                <p className="text-2xl font-semibold">{formatInt(data?.live?.events)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Live visitors (5 min)</p>
                <p className="text-2xl font-semibold">{formatInt(data?.live?.visitors)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Scroll 90%+ sessions</p>
                <p className="text-2xl font-semibold">{formatInt((data?.scroll || []).find((r) => r.depth === "90%+")?.sessions)}</p>
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Insights</CardTitle>
                <CardDescription>
                  Facts, observations, and possible opportunities from thresholds only. No AI. Winner/problem labels need ≥ {thresholds.min_sessions_winner || 50} sessions (or 10 checkout clicks).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(data?.opportunities || []).length === 0 && !loading ? (
                  <Empty>No insights met the sample-size rules for this range.</Empty>
                ) : (
                  <ul className="space-y-3">
                    {(data?.opportunities || []).map((row, idx) => (
                      <li key={`ins-${idx}`} className="rounded-lg border border-slate-200 px-4 py-3">
                        <Badge variant="outline" className="mb-2">{row.kind}</Badge>
                        <p className="text-sm text-slate-800">{row.text}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.based_on}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Search Console</CardTitle>
                <CardDescription>{data?.gsc?.note}</CardDescription>
              </CardHeader>
              <CardContent>
                <Empty>Not connected. Impressions will never be mixed into onsite visitor counts.</Empty>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
