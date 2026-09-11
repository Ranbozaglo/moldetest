import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { KitService } from "@/api/entities";
import { useAuth } from "@/contexts/AuthContext";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

const PACKAGE_FALLBACKS = [
  { package_type: "spot_check", display_name: "Spot Check", stripe_payment_link_url: "" },
  { package_type: "extended", display_name: "Extended", stripe_payment_link_url: "" },
  { package_type: "full_house", display_name: "Full House", stripe_payment_link_url: "" },
];

export default function StartNewInspection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [kitPackages, setKitPackages] = useState([]);
  const [kitDownloads, setKitDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const [pkgRes, dlRes] = await Promise.all([
        KitService.getPackages(),
        KitService.myDownloads(user.email),
      ]);
      setKitPackages(pkgRes.packages || []);
      setKitDownloads(dlRes.downloads || []);
    } catch (e) {
      setMessage(e.message || "Could not load kit packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.email]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.email]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-6 text-center">
        <p className="text-slate-600 mb-4">Please sign in to start a new inspection.</p>
        <Button onClick={() => navigate(createPageUrl("SignIn"))}>Sign In</Button>
      </div>
    );
  }

  const openKitCheckout = (paymentUrl) => {
    if (!paymentUrl) return;
    try {
      const u = new URL(paymentUrl);
      if (user.email) u.searchParams.set("prefilled_email", user.email);
      window.open(u.toString(), "_blank");
    } catch {
      window.open(paymentUrl, "_blank");
    }
  };

  const packages = kitPackages.length ? kitPackages : PACKAGE_FALLBACKS;
  const newest = kitDownloads[0];
  const hasPurchase = kitDownloads.length > 0;

  const formatPurchaseDate = (value) => {
    if (!value) return "Date unavailable";
    try {
      return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Date unavailable";
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <Link
            to={createPageUrl("MyInspections")}
            className="inline-flex items-center text-sm text-blue-700 hover:underline mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to My Inspections
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Start new inspection</h1>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">
            Buy a kit to get a new COC and unique prepaid shipping label, then submit the inspection form for this job.
          </p>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        )}

        <Card className="mb-6 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Your path for this new job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">Purchase a kit</h3>
                  <p className="text-sm text-slate-600 mt-1 mb-3">
                    After checkout, your new COC and prepaid label are emailed to{" "}
                    <strong>{user.email}</strong> and also appear below / on My Inspections.
                  </p>
                  {loading ? (
                    <p className="text-sm text-slate-500">Loading packages…</p>
                  ) : (
                    <div className="grid sm:grid-cols-3 gap-3">
                      {packages.map((pkg) => (
                        <Button
                          key={pkg.package_type}
                          disabled={!pkg.stripe_payment_link_url}
                          onClick={() => openKitCheckout(pkg.stripe_payment_link_url)}
                          className="bg-blue-600 hover:bg-blue-700 text-white h-auto py-3"
                        >
                          <Package className="w-4 h-4 mr-2" />
                          {pkg.display_name}
                        </Button>
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 px-0 text-slate-600"
                    onClick={load}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Refresh after purchase
                  </Button>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${hasPurchase ? "bg-green-50/60 border-green-200" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                    hasPurchase ? "bg-green-600" : "bg-slate-300"
                  }`}
                >
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">Get your new COC &amp; shipping label</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Do not reuse an old label. Each purchase creates a new unique prepaid label.
                  </p>
                  {newest ? (
                    <div className="mt-3 rounded-lg border border-green-200 bg-white p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">{newest.package_name}</span>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Newest</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        Purchased {formatPurchaseDate(newest.created_at)}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        {newest.coc_url && (
                          <a href={newest.coc_url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                            Download COC
                          </a>
                        )}
                        {newest.shipping_label_url && (
                          <a
                            href={newest.shipping_label_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 underline"
                          >
                            Download shipping label
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mt-2">No new kit purchase yet for this account.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-sm font-bold text-white">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Collect samples</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Follow the sampling guide, complete the COC, pack samples, and apply the prepaid label.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => navigate(createPageUrl("SamplingGuide"))}
                  >
                    Open sampling guide
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Submit the inspection form</h3>
                  <p className="text-sm text-slate-600 mt-1 mb-3">
                    Enter property and sample details for this job. Submitting the form does not create a new COC/label — purchase does.
                  </p>
                  <Button
                    onClick={() => navigate(createPageUrl("Inspection"))}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Continue to inspection form
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
