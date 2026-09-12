import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { KitService } from "@/api/entities";
import { useAuth } from "@/contexts/AuthContext";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package, Plus, ArrowLeft, RefreshCw, Loader2, ExternalLink, X } from "lucide-react";
import { motion } from "framer-motion";

const PACKAGE_ORDER = ["spot_check", "extended", "full_house"];

const PACKAGE_FALLBACKS = [
  { package_type: "spot_check", display_name: "Spot Check", stripe_payment_link_url: "" },
  { package_type: "extended", display_name: "Extended", stripe_payment_link_url: "" },
  { package_type: "full_house", display_name: "Full House", stripe_payment_link_url: "" },
];

function sortPackages(list) {
  return [...(list || [])].sort((a, b) => {
    const ai = PACKAGE_ORDER.indexOf(a.package_type);
    const bi = PACKAGE_ORDER.indexOf(b.package_type);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function formatPurchaseDate(value) {
  if (!value) return "Date unavailable";
  try {
    return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return "Date unavailable";
  }
}

function loadStripeJs() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Stripe) return Promise.resolve(window.Stripe);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://js.stripe.com/v3/"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Stripe));
      existing.addEventListener("error", () => reject(new Error("Failed to load Stripe.js")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => resolve(window.Stripe);
    script.onerror = () => reject(new Error("Failed to load Stripe.js"));
    document.head.appendChild(script);
  });
}

export default function StartNewInspection() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [kitPackages, setKitPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [waitingForPurchase, setWaitingForPurchase] = useState(false);
  const [newPurchase, setNewPurchase] = useState(null);
  const [selectedPackageName, setSelectedPackageName] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [embeddedSession, setEmbeddedSession] = useState(null);

  const baselineIdsRef = useRef(new Set());
  const checkoutStartedAtRef = useRef(null);
  const pollTimerRef = useRef(null);
  const embeddedCheckoutRef = useRef(null);
  const checkoutMountRef = useRef(null);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const destroyEmbeddedCheckout = () => {
    try {
      embeddedCheckoutRef.current?.destroy?.();
    } catch {
      /* ignore */
    }
    embeddedCheckoutRef.current = null;
  };

  const fetchDownloads = async () => {
    if (!user?.email) return [];
    const dlRes = await KitService.myDownloads(user.email);
    return dlRes.downloads || [];
  };

  const findNewPurchase = (downloads) => {
    const startedAt = checkoutStartedAtRef.current
      ? new Date(checkoutStartedAtRef.current).getTime() - 15000
      : null;
    return (
      downloads.find((d) => {
        if (!baselineIdsRef.current.has(d.id)) return true;
        if (!startedAt || !d.created_at) return false;
        return new Date(d.created_at).getTime() >= startedAt;
      }) || null
    );
  };

  const refreshForNewPurchase = async () => {
    try {
      const downloads = await fetchDownloads();
      const found = findNewPurchase(downloads);
      if (found) {
        setNewPurchase(found);
        setWaitingForPurchase(false);
        setMessage("New COC and shipping label are ready.");
        stopPolling();
        setCheckoutOpen(false);
        destroyEmbeddedCheckout();
        return true;
      }
    } catch (e) {
      console.warn("Download refresh failed:", e);
    }
    return false;
  };

  const startPolling = () => {
    stopPolling();
    setWaitingForPurchase(true);
    refreshForNewPurchase();
    pollTimerRef.current = setInterval(() => {
      refreshForNewPurchase();
    }, 4000);
    setTimeout(() => {
      stopPolling();
      setWaitingForPurchase((stillWaiting) => {
        if (stillWaiting) {
          setMessage(
            "Still waiting for Stripe to finish. Click Refresh if you already completed checkout."
          );
        }
        return stillWaiting;
      });
    }, 10 * 60 * 1000);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.email) return;
      setPackagesLoading(true);
      try {
        const [pkgRes, downloads] = await Promise.all([
          KitService.getPackages(),
          fetchDownloads(),
        ]);
        if (cancelled) return;
        setKitPackages(pkgRes.packages || []);
        baselineIdsRef.current = new Set(downloads.map((d) => d.id));
        setNewPurchase(null);
      } catch (e) {
        if (!cancelled) setMessage(e.message || "Could not load kit packages");
      } finally {
        if (!cancelled) setPackagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      stopPolling();
      destroyEmbeddedCheckout();
    };
  }, [user?.email]);

  // After Stripe embedded checkout redirects back with ?checkout=success
  useEffect(() => {
    if (!user?.email) return;
    if (searchParams.get("checkout") !== "success") return;
    if (!checkoutStartedAtRef.current) {
      checkoutStartedAtRef.current = new Date().toISOString();
    }
    setMessage("Payment received — preparing your new COC and shipping label…");
    startPolling();
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    next.delete("session_id");
    setSearchParams(next, { replace: true });
  }, [user?.email, searchParams]);

  useEffect(() => {
    const onFocus = () => {
      if (waitingForPurchase || checkoutStartedAtRef.current) {
        refreshForNewPurchase();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [waitingForPurchase, user?.email]);

  // Mount Stripe Embedded Checkout once the modal + session are ready
  useEffect(() => {
    if (!checkoutOpen || !embeddedSession?.client_secret || !embeddedSession?.publishable_key) {
      return undefined;
    }
    let cancelled = false;

    (async () => {
      try {
        const StripeCtor = await loadStripeJs();
        if (cancelled) return;
        destroyEmbeddedCheckout();
        const stripe = StripeCtor(embeddedSession.publishable_key);
        const checkout = await stripe.initEmbeddedCheckout({
          clientSecret: embeddedSession.client_secret,
        });
        if (cancelled) {
          checkout.destroy?.();
          return;
        }
        embeddedCheckoutRef.current = checkout;
        const el = checkoutMountRef.current;
        if (el) {
          el.innerHTML = "";
          checkout.mount(el);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("Stripe mount failed:", e);
          setCheckoutError(e.message || "Could not load embedded checkout.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkoutOpen, embeddedSession]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-6 text-center">
        <p className="text-slate-600 mb-4">Please sign in to start a new inspection.</p>
        <Button onClick={() => navigate(createPageUrl("SignIn"))}>Sign In</Button>
      </div>
    );
  }

  const buildPaymentUrl = (pkg) => {
    const paymentUrl = pkg?.stripe_payment_link_url;
    if (!paymentUrl) return "";
    try {
      const u = new URL(paymentUrl);
      if (user.email) u.searchParams.set("prefilled_email", user.email);
      return u.toString();
    } catch {
      return paymentUrl;
    }
  };

  const openFallbackCheckout = (url) => {
    if (!url) return;
    setEmbeddedSession(null);
    setFallbackUrl(url);
    setCheckoutError(
      "Embedded checkout is unavailable. Use the secure Stripe link below (opens in a new tab)."
    );
    setCheckoutOpen(true);
    startPolling();
  };

  const openKitCheckout = async (pkg) => {
    setSelectedPackageName(pkg.display_name || pkg.package_type);
    setNewPurchase(null);
    setMessage("");
    setCheckoutError("");
    setFallbackUrl("");
    setEmbeddedSession(null);
    checkoutStartedAtRef.current = new Date().toISOString();
    destroyEmbeddedCheckout();
    setCheckoutOpen(true);
    setCheckoutLoading(true);

    const paymentUrl = buildPaymentUrl(pkg);

    try {
      const res = await KitService.createEmbeddedCheckout({
        packageType: pkg.package_type,
        email: user.email,
      });
      setEmbeddedSession({
        client_secret: res.client_secret,
        publishable_key: res.publishable_key,
      });
      startPolling();
    } catch (e) {
      console.warn("Embedded checkout failed, falling back:", e);
      if (paymentUrl) {
        openFallbackCheckout(paymentUrl);
      } else {
        setCheckoutError(e.message || "Could not start checkout. Try again or contact support.");
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  const closeCheckoutModal = (open) => {
    if (!open) {
      destroyEmbeddedCheckout();
      setEmbeddedSession(null);
      setCheckoutOpen(false);
      // Keep polling if payment may still complete
    } else {
      setCheckoutOpen(true);
    }
  };

  const packages = sortPackages(kitPackages.length ? kitPackages : PACKAGE_FALLBACKS);
  const hasNewPurchase = Boolean(newPurchase);

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
                    Checkout opens in an embedded window on this page. Keep this tab open — your new COC/label
                    appears in step 2 automatically (emailed to <strong>{user.email}</strong>).
                  </p>
                  {packagesLoading ? (
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading packages…
                    </p>
                  ) : (
                    <div className="grid sm:grid-cols-3 gap-3">
                      {packages.map((pkg) => (
                        <Button
                          key={pkg.package_type}
                          disabled={
                            (!pkg.stripe_payment_link_url && !pkg.stripe_payment_link_id) ||
                            checkoutLoading
                          }
                          onClick={() => openKitCheckout(pkg)}
                          className="bg-blue-600 hover:bg-blue-700 text-white h-auto py-3"
                        >
                          <Package className="w-4 h-4 mr-2" />
                          {pkg.display_name}
                        </Button>
                      ))}
                    </div>
                  )}
                  {!packagesLoading &&
                    !packages.some((p) => p.stripe_payment_link_url || p.stripe_payment_link_id) && (
                      <p className="text-xs text-slate-500 mt-2">
                        Package buy links are not configured yet (Admin → Kit Fulfillment).
                      </p>
                    )}
                </div>
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 ${
                hasNewPurchase ? "bg-green-50/60 border-green-200" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                    hasNewPurchase ? "bg-green-600" : waitingForPurchase ? "bg-blue-500" : "bg-slate-300"
                  }`}
                >
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">Get your new COC &amp; shipping label</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Previous purchases stay on My Inspections. This step only shows a label from the purchase you just made.
                  </p>

                  {hasNewPurchase ? (
                    <div className="mt-3 rounded-lg border border-green-200 bg-white p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">{newPurchase.package_name}</span>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">New for this job</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        Purchased {formatPurchaseDate(newPurchase.created_at)}
                        {newPurchase.shipping_label_name
                          ? ` · Label file: ${newPurchase.shipping_label_name}`
                          : ""}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        {newPurchase.coc_url && (
                          <a
                            href={newPurchase.coc_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 underline"
                          >
                            Download COC
                          </a>
                        )}
                        {newPurchase.shipping_label_url && (
                          <a
                            href={newPurchase.shipping_label_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 underline"
                          >
                            Download shipping label
                          </a>
                        )}
                        {newPurchase.instructions_url && (
                          <a
                            href={newPurchase.instructions_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 underline"
                          >
                            Download instructions
                          </a>
                        )}
                      </div>
                    </div>
                  ) : waitingForPurchase ? (
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                      <div className="flex items-center gap-2 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Waiting for your {selectedPackageName || "kit"} checkout to finish…
                      </div>
                      <p className="mt-1 text-blue-800">
                        Complete payment in the checkout window. This box updates automatically when the new COC and
                        label are ready.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => refreshForNewPurchase()}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Check now
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mt-2">
                      No new purchase for this job yet. Buy a kit in step 1 first.
                    </p>
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
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                    hasNewPurchase ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Submit the inspection form</h3>
                  <p className="text-sm text-slate-600 mt-1 mb-3">
                    Enter property and sample details for this job. Submitting the form does not create a new COC/label —
                    purchase does.
                  </p>
                  <Button
                    onClick={() => navigate(createPageUrl("Inspection"))}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!hasNewPurchase}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Continue to inspection form
                  </Button>
                  {!hasNewPurchase && (
                    <p className="text-xs text-slate-500 mt-2">
                      Available after your new COC and shipping label appear in step 2.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={checkoutOpen} onOpenChange={closeCheckoutModal}>
        <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Checkout — {selectedPackageName || "Kit"}</DialogTitle>
            <DialogDescription>
              Complete payment below. When Stripe finishes, this page updates with your new COC and shipping label.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            {checkoutLoading && (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading secure checkout…
              </div>
            )}
            {checkoutError && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {checkoutError}
                {fallbackUrl && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => window.open(fallbackUrl, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Stripe checkout
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div ref={checkoutMountRef} id="tt-embedded-checkout" className="min-h-[420px]" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3 w-full text-slate-500"
              onClick={() => closeCheckoutModal(false)}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Close checkout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
