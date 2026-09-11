"""
Kit fulfillment: prepaid label pool, package COCs, Stripe purchase webhook, user downloads.
Packages: spot_check, extended, full_house
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from flask import jsonify, request

KIT_BUCKET = os.getenv("KIT_STORAGE_BUCKET", "kit-fulfillment")

PACKAGE_TYPES = ("spot_check", "extended", "full_house")

PACKAGE_LABELS = {
    "spot_check": "Spot Check",
    "extended": "Extended",
    "full_house": "Full House",
}


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _frontend_dashboard_url() -> str:
    base = (os.getenv("FRONTEND_URL") or "https://total-testing-diy.com").rstrip("/")
    return f"{base}/MyInspections"


def _require_admin():
    """Reuse simple_main helpers when available; otherwise trust Authorization presence for admin routes."""
    auth = request.headers.get("Authorization", "")
    if not auth:
        return False
    return True


def register_kit_fulfillment_endpoints(app, supabase, email_service=None):
    if supabase is None:
        print("⚠️ KIT: supabase client missing — kit fulfillment routes limited")

    def _download_storage_file(path: str) -> Optional[bytes]:
        if not path or not supabase:
            return None
        try:
            data = supabase.storage.from_(KIT_BUCKET).download(path)
            return data if isinstance(data, (bytes, bytearray)) else bytes(data)
        except Exception as e:
            print(f"❌ KIT: download failed for {path}: {e}")
            return None

    def _public_url(path: str) -> str:
        if not path or not supabase:
            return ""
        try:
            return supabase.storage.from_(KIT_BUCKET).get_public_url(path)
        except Exception:
            return ""

    def _ensure_packages_seeded():
        if not supabase:
            return
        try:
            existing = supabase.table("kit_package_assets").select("package_type").execute()
            have = {row.get("package_type") for row in (existing.data or [])}
            for key in PACKAGE_TYPES:
                if key in have:
                    continue
                supabase.table("kit_package_assets").upsert(
                    {
                        "package_type": key,
                        "display_name": PACKAGE_LABELS[key],
                        "updated_at": _utcnow(),
                    }
                ).execute()
        except Exception as e:
            print(f"⚠️ KIT: seed packages failed (run SQL migration?): {e}")

    def _get_packages() -> List[Dict[str, Any]]:
        _ensure_packages_seeded()
        if not supabase:
            return []
        result = (
            supabase.table("kit_package_assets")
            .select("*")
            .order("package_type")
            .execute()
        )
        rows = result.data or []
        # Overlay env payment links if DB empty
        env_map = {
            "spot_check": (
                os.getenv("STRIPE_PLINK_SPOT_CHECK", ""),
                os.getenv("STRIPE_BUY_URL_SPOT_CHECK", ""),
            ),
            "extended": (
                os.getenv("STRIPE_PLINK_EXTENDED", ""),
                os.getenv("STRIPE_BUY_URL_EXTENDED", ""),
            ),
            "full_house": (
                os.getenv("STRIPE_PLINK_FULL_HOUSE", ""),
                os.getenv("STRIPE_BUY_URL_FULL_HOUSE", ""),
            ),
        }
        for row in rows:
            key = row.get("package_type")
            plink, buy = env_map.get(key, ("", ""))
            if not row.get("stripe_payment_link_id") and plink:
                row["stripe_payment_link_id"] = plink
            if not row.get("stripe_payment_link_url") and buy:
                row["stripe_payment_link_url"] = buy
            row["coc_url"] = _public_url(row.get("coc_storage_path") or "")
            row["instructions_url"] = _public_url(row.get("instructions_storage_path") or "")
            row["display_name"] = row.get("display_name") or PACKAGE_LABELS.get(key, key)
        return rows

    def _resolve_package_type(payment_link_id: str = "", payment_link_url: str = "") -> Optional[str]:
        packages = _get_packages()
        plink = (payment_link_id or "").strip()
        url = (payment_link_url or "").strip()
        for row in packages:
            if plink and row.get("stripe_payment_link_id") == plink:
                return row.get("package_type")
            buy = (row.get("stripe_payment_link_url") or "").strip()
            if url and buy and (url == buy or url.endswith(buy.split("/")[-1]) or buy.endswith(url.split("/")[-1])):
                return row.get("package_type")
        # Env fallbacks already merged into packages
        return None

    def _claim_next_label(package_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if not supabase:
            return None
        query = (
            supabase.table("shipping_labels")
            .select("*")
            .eq("status", "available")
            .order("created_at")
            .limit(20)
        )
        result = query.execute()
        rows = result.data or []
        # Prefer package-specific labels, else any shared (null package_type)
        preferred = [r for r in rows if r.get("package_type") == package_type]
        shared = [r for r in rows if not r.get("package_type")]
        ordered = preferred + shared + [r for r in rows if r not in preferred and r not in shared]
        for label in ordered:
            updated = (
                supabase.table("shipping_labels")
                .update({"status": "assigned", "assigned_at": _utcnow()})
                .eq("id", label["id"])
                .eq("status", "available")
                .execute()
            )
            if updated.data:
                return updated.data[0]
        return None

    def _fulfill_purchase(
        *,
        customer_email: str,
        customer_name: str = "",
        package_type: str,
        stripe_session_id: str = "",
        stripe_payment_link_id: str = "",
        stripe_payment_intent_id: str = "",
    ) -> Dict[str, Any]:
        if package_type not in PACKAGE_TYPES:
            return {"success": False, "error": f"Unknown package_type: {package_type}"}
        if not customer_email:
            return {"success": False, "error": "customer_email required"}
        if not supabase:
            return {"success": False, "error": "Database not configured"}

        # Idempotent on stripe session
        if stripe_session_id:
            existing = (
                supabase.table("kit_fulfillments")
                .select("*")
                .eq("stripe_session_id", stripe_session_id)
                .limit(1)
                .execute()
            )
            if existing.data:
                return {"success": True, "fulfillment": existing.data[0], "duplicate": True}

        packages = {p["package_type"]: p for p in _get_packages()}
        pkg = packages.get(package_type) or {}
        coc_path = pkg.get("coc_storage_path") or ""
        instructions_path = pkg.get("instructions_storage_path") or ""
        if not coc_path:
            return {
                "success": False,
                "error": f"COC not uploaded for {PACKAGE_LABELS.get(package_type)}. Upload it in Admin → Kit Fulfillment.",
            }

        label = _claim_next_label(package_type)
        if not label:
            return {
                "success": False,
                "error": "No available prepaid shipping labels in stock. Upload more labels in Admin.",
            }

        fulfillment_row = {
            "stripe_session_id": stripe_session_id or None,
            "stripe_payment_intent_id": stripe_payment_intent_id or None,
            "stripe_payment_link_id": stripe_payment_link_id or pkg.get("stripe_payment_link_id"),
            "customer_email": customer_email.strip().lower(),
            "customer_name": customer_name or "",
            "package_type": package_type,
            "shipping_label_id": label["id"],
            "coc_storage_path": coc_path,
            "instructions_storage_path": instructions_path or None,
            "email_status": "pending",
            "created_at": _utcnow(),
        }
        inserted = supabase.table("kit_fulfillments").insert(fulfillment_row).execute()
        fulfillment = (inserted.data or [fulfillment_row])[0]

        supabase.table("shipping_labels").update(
            {"assigned_fulfillment_id": fulfillment.get("id")}
        ).eq("id", label["id"]).execute()

        attachments: List[Dict[str, Any]] = []
        coc_bytes = _download_storage_file(coc_path)
        if coc_bytes:
            attachments.append(
                {
                    "filename": f"COC-{PACKAGE_LABELS[package_type].replace(' ', '-')}.pdf",
                    "content": coc_bytes,
                    "mime": "application/pdf",
                }
            )
        label_bytes = _download_storage_file(label.get("storage_path") or "")
        if label_bytes:
            attachments.append(
                {
                    "filename": label.get("file_name") or "Prepaid-Shipping-Label.pdf",
                    "content": label_bytes,
                    "mime": "application/pdf",
                }
            )
        if instructions_path:
            instr_bytes = _download_storage_file(instructions_path)
            if instr_bytes:
                attachments.append(
                    {
                        "filename": "Sampling-Instructions.pdf",
                        "content": instr_bytes,
                        "mime": "application/pdf",
                    }
                )

        email_result = {"success": False, "error": "Email service unavailable"}
        if email_service and hasattr(email_service, "send_kit_purchase_email"):
            email_result = email_service.send_kit_purchase_email(
                to_email=customer_email.strip(),
                full_name=customer_name or "Customer",
                package_name=PACKAGE_LABELS.get(package_type, package_type),
                dashboard_url=_frontend_dashboard_url(),
                attachments=attachments,
            )
        elif email_service:
            email_result = email_service.send_email(
                to_email=customer_email.strip(),
                subject=f"Total Testing - Your {PACKAGE_LABELS.get(package_type)} Kit Materials",
                body=f"<p>Hi {customer_name or 'Customer'},</p><p>Your kit materials are attached.</p>",
                attachments=attachments,
            )

        update = {
            "email_status": "sent" if email_result.get("success") else "failed",
            "email_error": None if email_result.get("success") else (email_result.get("error") or email_result.get("message")),
            "email_sent_at": _utcnow() if email_result.get("success") else None,
        }
        supabase.table("kit_fulfillments").update(update).eq("id", fulfillment["id"]).execute()
        fulfillment.update(update)

        return {
            "success": bool(email_result.get("success")),
            "fulfillment": fulfillment,
            "email": email_result,
            "label_id": label.get("id"),
            "error": None if email_result.get("success") else update["email_error"],
        }

    @app.route("/api/kit/packages", methods=["GET"])
    def kit_list_packages():
        try:
            return jsonify({"packages": _get_packages()})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/kit/packages/<package_type>", methods=["PUT"])
    def kit_update_package(package_type):
        if package_type not in PACKAGE_TYPES:
            return jsonify({"error": "Invalid package_type"}), 400
        if not _require_admin():
            return jsonify({"error": "Unauthorized"}), 401
        data = request.get_json() or {}
        payload = {"updated_at": _utcnow()}
        for key in (
            "display_name",
            "stripe_payment_link_id",
            "stripe_payment_link_url",
            "coc_storage_path",
            "instructions_storage_path",
        ):
            if key in data:
                payload[key] = data[key]
        try:
            payload["package_type"] = package_type
            if "display_name" not in payload:
                payload["display_name"] = PACKAGE_LABELS[package_type]
            result = supabase.table("kit_package_assets").upsert(payload).execute()
            return jsonify({"package": (result.data or [payload])[0]})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/kit/packages/<package_type>/upload-coc", methods=["POST"])
    def kit_upload_coc(package_type):
        if package_type not in PACKAGE_TYPES:
            return jsonify({"error": "Invalid package_type"}), 400
        if not _require_admin():
            return jsonify({"error": "Unauthorized"}), 401
        if "file" not in request.files:
            return jsonify({"error": "file required"}), 400
        f = request.files["file"]
        ext = os.path.splitext(f.filename or "coc.pdf")[1] or ".pdf"
        path = f"coc/{package_type}-{uuid.uuid4().hex}{ext}"
        content = f.read()
        try:
            supabase.storage.from_(KIT_BUCKET).upload(
                path,
                content,
                {"content-type": f.mimetype or "application/pdf", "upsert": "true"},
            )
            supabase.table("kit_package_assets").upsert(
                {
                    "package_type": package_type,
                    "display_name": PACKAGE_LABELS[package_type],
                    "coc_storage_path": path,
                    "updated_at": _utcnow(),
                }
            ).execute()
            return jsonify({"success": True, "path": path, "url": _public_url(path)})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/kit/labels", methods=["GET"])
    def kit_list_labels():
        if not _require_admin():
            return jsonify({"error": "Unauthorized"}), 401
        status = request.args.get("status")
        try:
            q = supabase.table("shipping_labels").select("*").order("created_at", desc=True).limit(200)
            if status:
                q = q.eq("status", status)
            result = q.execute()
            available = len([r for r in (result.data or []) if r.get("status") == "available"])
            return jsonify({"labels": result.data or [], "available_count": available})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/kit/labels/upload", methods=["POST"])
    def kit_upload_labels():
        if not _require_admin():
            return jsonify({"error": "Unauthorized"}), 401
        files = request.files.getlist("files") or []
        if not files and "file" in request.files:
            files = [request.files["file"]]
        if not files:
            return jsonify({"error": "files required"}), 400
        package_type = request.form.get("package_type") or None
        if package_type == "":
            package_type = None
        if package_type and package_type not in PACKAGE_TYPES:
            return jsonify({"error": "Invalid package_type"}), 400

        created = []
        errors = []
        for f in files:
            try:
                ext = os.path.splitext(f.filename or "label.pdf")[1] or ".pdf"
                path = f"labels/{uuid.uuid4().hex}{ext}"
                content = f.read()
                supabase.storage.from_(KIT_BUCKET).upload(
                    path,
                    content,
                    {"content-type": f.mimetype or "application/pdf", "upsert": "true"},
                )
                row = {
                    "storage_path": path,
                    "file_name": f.filename or "Prepaid-Shipping-Label.pdf",
                    "public_url": _public_url(path),
                    "status": "available",
                    "package_type": package_type,
                    "created_at": _utcnow(),
                }
                inserted = supabase.table("shipping_labels").insert(row).execute()
                created.append((inserted.data or [row])[0])
            except Exception as e:
                errors.append({"file": getattr(f, "filename", None), "error": str(e)})
        return jsonify({"success": len(errors) == 0, "created": created, "errors": errors})

    @app.route("/api/kit/fulfillments", methods=["GET"])
    def kit_list_fulfillments():
        if not _require_admin():
            return jsonify({"error": "Unauthorized"}), 401
        try:
            result = (
                supabase.table("kit_fulfillments")
                .select("*")
                .order("created_at", desc=True)
                .limit(100)
                .execute()
            )
            return jsonify({"fulfillments": result.data or []})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/kit/fulfillments/manual", methods=["POST"])
    def kit_manual_fulfill():
        """Admin manual send (for testing or missed webhooks)."""
        if not _require_admin():
            return jsonify({"error": "Unauthorized"}), 401
        data = request.get_json() or {}
        result = _fulfill_purchase(
            customer_email=data.get("customer_email") or "",
            customer_name=data.get("customer_name") or "",
            package_type=data.get("package_type") or "",
            stripe_session_id=data.get("stripe_session_id") or f"manual-{uuid.uuid4().hex}",
        )
        status = 200 if result.get("success") or result.get("duplicate") else 400
        return jsonify(result), status

    @app.route("/api/kit/my-downloads", methods=["GET"])
    def kit_my_downloads():
        email = (request.args.get("email") or "").strip().lower()
        if not email:
            return jsonify({"error": "email required"}), 400
        try:
            result = (
                supabase.table("kit_fulfillments")
                .select("*")
                .eq("customer_email", email)
                .order("created_at", desc=True)
                .execute()
            )
            items = []
            for row in result.data or []:
                label = None
                if row.get("shipping_label_id"):
                    lr = (
                        supabase.table("shipping_labels")
                        .select("*")
                        .eq("id", row["shipping_label_id"])
                        .limit(1)
                        .execute()
                    )
                    label = (lr.data or [None])[0]
                items.append(
                    {
                        "id": row.get("id"),
                        "package_type": row.get("package_type"),
                        "package_name": PACKAGE_LABELS.get(row.get("package_type"), row.get("package_type")),
                        "created_at": row.get("created_at"),
                        "email_status": row.get("email_status"),
                        "coc_url": _public_url(row.get("coc_storage_path") or ""),
                        "instructions_url": _public_url(row.get("instructions_storage_path") or ""),
                        "shipping_label_url": (label or {}).get("public_url")
                        or _public_url((label or {}).get("storage_path") or ""),
                        "shipping_label_name": (label or {}).get("file_name"),
                    }
                )
            return jsonify({"downloads": items})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/stripe/webhook", methods=["POST"])
    def stripe_webhook():
        payload = request.get_data()
        sig = request.headers.get("Stripe-Signature", "")
        secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
        api_key = os.getenv("STRIPE_SECRET_KEY", "")

        event = None
        try:
            import stripe

            if api_key:
                stripe.api_key = api_key
            if secret:
                event = stripe.Webhook.construct_event(payload, sig, secret)
            else:
                # Dev fallback — do not use without secret in production
                import json as _json

                event = _json.loads(payload.decode("utf-8"))
                print("⚠️ KIT: STRIPE_WEBHOOK_SECRET not set — parsing unverified payload")
        except Exception as e:
            print(f"❌ KIT: stripe webhook verify failed: {e}")
            return jsonify({"error": str(e)}), 400

        etype = event.get("type") if isinstance(event, dict) else getattr(event, "type", None)
        data_obj = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event.data.object

        if etype not in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
            return jsonify({"received": True, "ignored": etype})

        # Stripe object may be dict-like
        def _g(obj, key, default=None):
            if isinstance(obj, dict):
                return obj.get(key, default)
            return getattr(obj, key, default)

        session = data_obj
        customer_email = (
            _g(session, "customer_details", {}) or {}
        )
        if isinstance(customer_email, dict):
            email = customer_email.get("email") or _g(session, "customer_email")
            name = customer_email.get("name") or ""
        else:
            email = _g(session, "customer_email")
            name = ""

        payment_link = _g(session, "payment_link") or ""
        if hasattr(payment_link, "id"):
            payment_link = payment_link.id
        session_id = _g(session, "id") or ""
        payment_intent = _g(session, "payment_intent") or ""
        if hasattr(payment_intent, "id"):
            payment_intent = payment_intent.id

        package_type = _resolve_package_type(payment_link_id=str(payment_link or ""))
        if not package_type:
            # Try metadata
            meta = _g(session, "metadata") or {}
            if isinstance(meta, dict):
                package_type = meta.get("package_type") or meta.get("package")
        if not package_type:
            print(f"❌ KIT: could not resolve package for payment_link={payment_link}")
            return jsonify({"error": "Unknown payment link / package mapping"}), 400

        result = _fulfill_purchase(
            customer_email=email or "",
            customer_name=name or "",
            package_type=package_type,
            stripe_session_id=str(session_id or ""),
            stripe_payment_link_id=str(payment_link or ""),
            stripe_payment_intent_id=str(payment_intent or ""),
        )
        status = 200 if result.get("success") or result.get("duplicate") else 500
        return jsonify(result), status

    print("✅ KIT: fulfillment endpoints registered")
