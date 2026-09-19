import React, { useCallback, useEffect, useState } from "react";
import { BarChart3, Clock, Globe, LogOut, RefreshCw, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SUMMARY_URL = "https://total-testing.com/wp-json/tt-analytics/v1/summary";
const ANALYTICS_KEY = "tt_ld_7f3c9e2a1b84d6f0";

const formatDuration = (seconds) => {
  const n = Number(seconds) || 0;
  if (n < 60) return `${Math.round(n)}s`;
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

export default function LeadsAnalytics() {
  const [days, setDays] = useState("30");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${SUMMARY_URL}?days=${encodeURIComponent(days)}`, {
        headers: { "X-TT-Analytics-Key": ANALYTICS_KEY },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || json.error || `Could not load analytics (${res.status})`);
      }
      setData(json);
    } catch (err) {
      setData(null);
      setError(err?.message || "Could not load analytics");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals || {};
  const sources = data?.sources || [];
  const landings = data?.landings || [];
  const dropoffs = data?.dropoffs || [];
  const funnel = data?.funnel || [];
  const recent = data?.recent || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Leads analytics
            </CardTitle>
            <CardDescription>
              Every visit on total-testing.com: where it came from, how long they stayed, and where they left.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Sessions</CardTitle>
            <Users className="h-4 w-4 text-blue-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{loading ? "—" : totals.sessions ?? 0}</div>
            <p className="text-xs text-blue-700">Unique visits</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-900">Page views</CardTitle>
            <Globe className="h-4 w-4 text-indigo-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-900">{loading ? "—" : totals.pageviews ?? 0}</div>
            <p className="text-xs text-indigo-700">Pages opened</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-900">Avg time on site</CardTitle>
            <Clock className="h-4 w-4 text-amber-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900">
              {loading ? "—" : formatDuration(totals.avg_duration_sec)}
            </div>
            <p className="text-xs text-amber-700">Per session</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900">Checkout clicks</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{loading ? "—" : totals.checkouts ?? 0}</div>
            <p className="text-xs text-green-700">Stripe button clicks</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Where visits came from</CardTitle>
            <CardDescription>UTM tags, referrer, or direct</CardDescription>
          </CardHeader>
          <CardContent>
            {sources.length === 0 && !loading ? (
              <p className="text-sm text-slate-600">No visits in this range yet. New traffic will show here.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((row) => (
                    <TableRow key={row.source}>
                      <TableCell className="font-medium">{row.source}</TableCell>
                      <TableCell className="text-right">{row.sessions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Where they dropped
            </CardTitle>
            <CardDescription>Last page in the session</CardDescription>
          </CardHeader>
          <CardContent>
            {dropoffs.length === 0 && !loading ? (
              <p className="text-sm text-slate-600">Drop-off pages appear after people leave.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Last page</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dropoffs.map((row) => (
                    <TableRow key={row.path}>
                      <TableCell className="font-medium">{row.path}</TableCell>
                      <TableCell className="text-right">{row.sessions}</TableCell>
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
          <CardTitle>Funnel</CardTitle>
          <CardDescription>How far visitors got toward an order</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {funnel.map((step) => {
            const max = funnel[0]?.sessions || 1;
            const pct = Math.round(((step.sessions || 0) / max) * 100);
            return (
              <div key={step.step} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{step.step}</span>
                  <span className="text-slate-600">
                    {step.sessions} ({pct}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Landing pages</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First page</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {landings.map((row) => (
                  <TableRow key={row.path}>
                    <TableCell>{row.path}</TableCell>
                    <TableCell className="text-right">{row.sessions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Landed</TableHead>
                  <TableHead>Left</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((row) => (
                  <TableRow key={`${row.sid}-${row.started}`}>
                    <TableCell className="whitespace-nowrap text-xs">{row.started}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.source}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{row.landing}</TableCell>
                    <TableCell className="text-xs">{row.exit_page}</TableCell>
                    <TableCell className="text-right text-xs">{formatDuration(row.duration_sec)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
