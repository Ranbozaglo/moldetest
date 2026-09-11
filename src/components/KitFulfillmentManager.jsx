import React, { useEffect, useState } from "react";
import { KitService } from "@/api/entities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Upload, Mail, RefreshCw, Trash2 } from "lucide-react";

const PACKAGE_ORDER = ["spot_check", "extended", "full_house"];

function naturalLabelSort(a, b) {
  const as = String(a?.file_name || "");
  const bs = String(b?.file_name || "");
  return as.localeCompare(bs, undefined, { numeric: true, sensitivity: "base" });
}

export default function KitFulfillmentManager() {
  const [packages, setPackages] = useState([]);
  const [labels, setLabels] = useState([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [fulfillments, setFulfillments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [manual, setManual] = useState({
    customer_email: "",
    customer_name: "",
    package_type: "spot_check",
  });

  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const [pkgRes, labelRes, fulRes] = await Promise.all([
        KitService.getPackages(),
        KitService.listLabels(),
        KitService.listFulfillments(),
      ]);
      const pkgList = pkgRes.packages || [];
      pkgList.sort(
        (a, b) => PACKAGE_ORDER.indexOf(a.package_type) - PACKAGE_ORDER.indexOf(b.package_type)
      );
      setPackages(pkgList);
      const sortedLabels = [...(labelRes.labels || [])].sort(naturalLabelSort);
      setLabels(sortedLabels);
      setAvailableCount(labelRes.available_count || 0);
      setFulfillments(fulRes.fulfillments || []);
    } catch (e) {
      setMessage(e.message || "Failed to load kit fulfillment data. Did you run the SQL migration?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const savePackageLinks = async (pkg) => {
    try {
      await KitService.updatePackage(pkg.package_type, {
        stripe_payment_link_id: pkg.stripe_payment_link_id || "",
        stripe_payment_link_url: pkg.stripe_payment_link_url || "",
      });
      setMessage(`Saved payment link settings for ${pkg.display_name}`);
      load();
    } catch (e) {
      setMessage(e.message || "Save failed");
    }
  };

  const onUploadCoc = async (packageType, file) => {
    if (!file) return;
    try {
      await KitService.uploadCoc(packageType, file);
      setMessage(`COC uploaded for ${packageType}`);
      load();
    } catch (e) {
      setMessage(e.message || "COC upload failed");
    }
  };

  const onUploadLabels = async (fileList) => {
    if (!fileList?.length) return;
    setUploadingLabels(true);
    setMessage(`Uploading ${fileList.length} label PDF(s)… please wait`);
    try {
      const res = await KitService.uploadLabels(fileList);
      const uploaded = res.uploaded ?? (res.created || []).length;
      const skipped = (res.skipped || []).length;
      const errCount = (res.errors || []).length;
      setMessage(
        `Uploaded ${uploaded}` +
          (skipped ? `, skipped ${skipped} duplicate(s)` : "") +
          (errCount ? `, ${errCount} failed` : "")
      );
      await load();
    } catch (e) {
      setMessage(e.message || "Label upload failed — click Refresh; some files may still have saved");
      await load();
    } finally {
      setUploadingLabels(false);
    }
  };

  const onChangeStatus = async (labelId, status) => {
    try {
      await KitService.updateLabelStatus(labelId, status);
      setMessage(`Label status set to ${status}`);
      await load();
    } catch (e) {
      setMessage(e.message || "Failed to update status");
    }
  };

  const onDeleteLabel = async (label) => {
    if (!window.confirm(`Delete ${label.file_name}? This cannot be undone.`)) return;
    try {
      await KitService.deleteLabel(label.id);
      setMessage(`Deleted ${label.file_name}`);
      await load();
    } catch (e) {
      setMessage(e.message || "Delete failed");
    }
  };

  const onDedupe = async () => {
    if (!window.confirm("Remove duplicate filenames (keeps one of each)?")) return;
    try {
      const res = await KitService.dedupeLabels();
      setMessage(`Removed ${res.deleted_count || 0} duplicate label(s)`);
      await load();
    } catch (e) {
      setMessage(e.message || "Dedupe failed");
    }
  };

  const onManualSend = async () => {
    try {
      const res = await KitService.manualFulfill(manual);
      if (res.success || res.duplicate) {
        setMessage(res.duplicate ? "Already fulfilled for that session" : "Kit pack emailed successfully");
      } else {
        setMessage(res.error || "Manual send failed");
      }
      load();
    } catch (e) {
      setMessage(e.message || "Manual send failed");
    }
  };

  const onSyncStripe = async () => {
    setSyncing(true);
    setMessage("Scanning recent Stripe checkouts…");
    try {
      const res = await KitService.syncStripeFulfillments();
      const recovered = res.recovered || [];
      const failed = res.failed || [];
      const skipped = res.skipped || [];
      setMessage(
        `Stripe sync done. Scanned ${res.scanned || 0}. Recovered ${recovered.length}. ` +
          `Already OK ${skipped.length}. Failed ${failed.length}.` +
          (failed[0]?.error ? ` First error: ${failed[0].error}` : "") +
          (recovered[0]?.email ? ` Latest recovered: ${recovered[0].email} (${recovered[0].package_type || recovered[0].action})` : "")
      );
      await load();
    } catch (e) {
      setMessage(e.message || "Stripe sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="text-slate-600 p-4">Loading kit fulfillment…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Kit Fulfillment</h2>
          <p className="text-sm text-slate-600">
            Upload 3 COCs (Spot Check / Extended / Full House), stock prepaid labels, map Stripe payment links.
            Purchases auto-email COC + unique label after Stripe checkout.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSyncStripe} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Recover missed Stripe sales"}
          </Button>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Packages & COC
          </CardTitle>
          <CardDescription>
            One fixed COC per package. Paste each Stripe Payment Link ID (<code>plink_…</code>) and buy URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {packages.map((pkg) => (
            <div key={pkg.package_type} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{pkg.display_name}</h3>
                <Badge variant={pkg.coc_storage_path ? "default" : "secondary"}>
                  {pkg.coc_storage_path ? "COC ready" : "COC missing"}
                </Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Stripe Payment Link ID (plink_…) or Product ID (prod_…)</Label>
                  <Input
                    value={pkg.stripe_payment_link_id || ""}
                    onChange={(e) =>
                      setPackages((prev) =>
                        prev.map((p) =>
                          p.package_type === pkg.package_type
                            ? { ...p, stripe_payment_link_id: e.target.value }
                            : p
                        )
                      )
                    }
                    placeholder="plink_... or prod_..."
                  />
                  {(pkg.stripe_payment_link_id || "").startsWith("prod_") && (
                    <p className="text-xs text-amber-700 mt-1">
                      Product ID detected — webhook can match this. Prefer Payment Link ID (plink_…) if you have it.
                    </p>
                  )}
                  {(pkg.stripe_payment_link_id || "").startsWith("plink_") === false &&
                    (pkg.stripe_payment_link_id || "") &&
                    !(pkg.stripe_payment_link_id || "").startsWith("prod_") && (
                    <p className="text-xs text-red-600 mt-1">
                      Expected an ID starting with plink_ or prod_. Buy URL alone goes in the field on the right.
                    </p>
                  )}
                </div>
                <div>
                  <Label>Buy URL (buy.stripe.com/…)</Label>
                  <Input
                    value={pkg.stripe_payment_link_url || ""}
                    onChange={(e) =>
                      setPackages((prev) =>
                        prev.map((p) =>
                          p.package_type === pkg.package_type
                            ? { ...p, stripe_payment_link_url: e.target.value }
                            : p
                        )
                      )
                    }
                    placeholder="https://buy.stripe.com/..."
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" onClick={() => savePackageLinks(pkg)}>
                  Save links
                </Button>
                <Label className="cursor-pointer inline-flex items-center gap-2 text-sm text-blue-700">
                  <Upload className="w-4 h-4" />
                  Upload COC PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => onUploadCoc(pkg.package_type, e.target.files?.[0])}
                  />
                </Label>
                {pkg.coc_url && (
                  <a href={pkg.coc_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">
                    View COC
                  </a>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prepaid label stock</CardTitle>
          <CardDescription>
            Labels are ordered by file name (1, 2, 10…). Duplicate filenames are blocked on upload.
            Available: <strong>{availableCount}</strong> · Total: <strong>{labels.length}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label
              className={`cursor-pointer inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white ${
                uploadingLabels ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <Upload className="w-4 h-4" />
              {uploadingLabels ? "Uploading labels…" : "Upload label PDFs"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                disabled={uploadingLabels}
                className="hidden"
                onChange={(e) => {
                  onUploadLabels(e.target.files);
                  e.target.value = "";
                }}
              />
            </Label>
            <Button type="button" variant="outline" size="sm" onClick={onDedupe}>
              Remove duplicates
            </Button>
            <select
              className="h-9 rounded-md border border-slate-200 px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="void">Void</option>
            </select>
          </div>
          <div className="max-h-96 overflow-auto text-sm border border-slate-100 rounded-md">
            <div className="grid grid-cols-[1fr_140px_90px] gap-2 px-3 py-2 bg-slate-50 font-medium text-slate-600 sticky top-0">
              <span>File</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {labels
              .filter((l) => statusFilter === "all" || l.status === statusFilter)
              .map((l) => (
                <div
                  key={l.id}
                  className="grid grid-cols-[1fr_140px_90px] gap-2 px-3 py-2 border-t border-slate-100 items-center"
                >
                  <span className="truncate" title={l.file_name}>
                    {l.file_name}
                  </span>
                  <select
                    className="h-8 rounded border border-slate-200 px-2 text-xs"
                    value={l.status || "available"}
                    onChange={(e) => onChangeStatus(l.id, e.target.value)}
                  >
                    <option value="available">available</option>
                    <option value="assigned">assigned</option>
                    <option value="void">void</option>
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => onDeleteLabel(l)}
                    title="Delete label"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            {!labels.length && <p className="text-slate-500 p-3">No labels uploaded yet.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Manual send (test)
          </CardTitle>
          <CardDescription>Send kit pack without Stripe — uses next available label.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Email</Label>
            <Input
              value={manual.customer_email}
              onChange={(e) => setManual({ ...manual, customer_email: e.target.value })}
            />
          </div>
          <div>
            <Label>Name</Label>
            <Input
              value={manual.customer_name}
              onChange={(e) => setManual({ ...manual, customer_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Package</Label>
            <select
              className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm"
              value={manual.package_type}
              onChange={(e) => setManual({ ...manual, package_type: e.target.value })}
            >
              {PACKAGE_ORDER.map((k) => (
                <option key={k} value={k}>
                  {packages.find((p) => p.package_type === k)?.display_name || k}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={onManualSend}>Send kit pack</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent fulfillments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {fulfillments.slice(0, 20).map((f) => (
            <div key={f.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 py-2">
              <div className="min-w-0 flex-1">
                <div>
                  {f.customer_email} · {f.package_type}
                </div>
                {f.email_error && (
                  <div className="mt-1 text-xs text-red-600 break-words">{f.email_error}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={f.email_status === "sent" ? "default" : "destructive"}>
                  {f.email_status || "unknown"}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setMessage("");
                    try {
                      const res = await KitService.resendFulfillment(f.id);
                      if (res?.success) {
                        setMessage(`Resent kit email to ${f.customer_email}`);
                        load();
                      } else {
                        setMessage(res?.error || res?.email?.error || "Resend failed");
                        load();
                      }
                    } catch (err) {
                      setMessage(err?.message || "Resend failed");
                    }
                  }}
                >
                  Resend email
                </Button>
              </div>
            </div>
          ))}
          {!fulfillments.length && <p className="text-slate-500">No purchases fulfilled yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
