"""
Kit fulfillment: prepaid label pool, package COCs, Stripe purchase webhook, user downloads.
Packages: spot_check, extended, full_house
"""
from __future__ import annotations

import os
import re
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

LABEL_STATUSES = ("available", "assigned", "void")


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _natural_sort_key(name: str):
    text = str(name or "")
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", text)]


def _normalize_label_filename(name: str) -> str:
    base = os.path.basename(str(name or "").strip()) or "Prepaid-Shipping-Label.pdf"
    return re.sub(r"\s+", " ", base)


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
        # Spot Check → Extended → Full House (not alphabetical)
        order_index = {key: i for i, key in enumerate(PACKAGE_TYPES)}
        rows.sort(key=lambda r: order_index.get(r.get("package_type"), 99))
        return rows

    def _extract_buy_slug(url: str) -> str:
        raw = (url or "").strip()
        if not raw:
            return ""
        try:
            # buy.stripe.com/<slug> or payment links hosted URLs
            path = raw.split("?")[0].rstrip("/").split("/")[-1]
            return path
        except Exception:
            return ""

    def _g(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    def _collect_session_product_ids(session_obj) -> List[str]:
        """Best-effort product ids from a Checkout Session (expanded or via Stripe API)."""
        ids: List[str] = []

        def _walk_line_items(items):
            for item in items or []:
                price = _g(item, "price") if not isinstance(item, dict) else item.get("price")
                if price is None:
                    continue
                product = _g(price, "product") if not isinstance(price, dict) else price.get("product")
                if hasattr(product, "id"):
                    product = product.id
                if isinstance(product, str) and product:
                    ids.append(product)

        # Already expanded on the event object
        line_items = _g(session_obj, "line_items")
        if isinstance(line_items, dict):
            _walk_line_items(line_items.get("data") or [])
        elif line_items is not None and hasattr(line_items, "data"):
            _walk_line_items(getattr(line_items, "data", None))

        # Fetch from Stripe when missing (common for webhook payloads)
        if not ids:
            session_id = _g(session_obj, "id") or ""
            api_key = os.getenv("STRIPE_SECRET_KEY", "")
            if session_id and api_key:
                try:
                    import stripe

                    stripe.api_key = api_key
                    full = stripe.checkout.Session.retrieve(
                        session_id,
                        expand=["line_items.data.price.product"],
                    )
                    data = []
                    if getattr(full, "line_items", None) is not None:
                        data = getattr(full.line_items, "data", None) or []
                    _walk_line_items(data)
                except Exception as e:
                    print(f"⚠️ KIT: could not load session line_items: {e}")
        return ids

    def _resolve_package_type(
        payment_link_id: str = "",
        payment_link_url: str = "",
        product_ids: Optional[List[str]] = None,
        session_obj=None,
    ) -> Optional[str]:
        packages = _get_packages()
        plink = (payment_link_id or "").strip()
        url = (payment_link_url or "").strip()
        products = set(product_ids or [])

        # If we only have a plink id, resolve its public buy URL from Stripe
        if plink.startswith("plink_") and not url:
            api_key = os.getenv("STRIPE_SECRET_KEY", "")
            if api_key:
                try:
                    import stripe

                    stripe.api_key = api_key
                    pl = stripe.PaymentLink.retrieve(plink)
                    url = getattr(pl, "url", None) or ""
                except Exception as e:
                    print(f"⚠️ KIT: PaymentLink.retrieve failed for {plink}: {e}")

        if session_obj is not None and not products:
            products = set(_collect_session_product_ids(session_obj))

        url_slug = _extract_buy_slug(url)

        for row in packages:
            stored_id = (row.get("stripe_payment_link_id") or "").strip()
            buy = (row.get("stripe_payment_link_url") or "").strip()
            buy_slug = _extract_buy_slug(buy)

            # Exact payment-link id match
            if plink and stored_id and plink == stored_id:
                return row.get("package_type")

            # Admin sometimes pasted Product ID (prod_…) into the plink field
            if products and stored_id and stored_id in products:
                return row.get("package_type")

            # Match buy.stripe.com URL / slug
            if url and buy and (url == buy or (url_slug and buy_slug and url_slug == buy_slug)):
                return row.get("package_type")
            if plink and buy and plink in buy:
                return row.get("package_type")

        return None

    def _claim_next_label(package_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if not supabase:
            return None
        result = (
            supabase.table("shipping_labels")
            .select("*")
            .eq("status", "available")
            .limit(500)
            .execute()
        )
        rows = result.data or []
        # Prefer package-specific labels, else shared; always in filename order.
        preferred = [r for r in rows if r.get("package_type") == package_type]
        shared = [r for r in rows if not r.get("package_type")]
        other = [r for r in rows if r not in preferred and r not in shared]
        ordered = sorted(
            preferred + shared + other,
            key=lambda r: _natural_sort_key(r.get("file_name") or r.get("storage_path") or ""),
        )
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

    def _existing_label_names() -> set:
        result = supabase.table("shipping_labels").select("file_name").limit(2000).execute()
        return {_normalize_label_filename(r.get("file_name")) for r in (result.data or []) if r.get("file_name")}

    def _sort_labels(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        status_rank = {"available": 0, "assigned": 1, "void": 2}
        return sorted(
            rows,
            key=lambda r: (
                status_rank.get(r.get("status"), 9),
                _natural_sort_key(r.get("file_name") or ""),
                r.get("created_at") or "",
            ),
        )

    def _build_fulfillment_attachments(fulfillment: Dict[str, Any]) -> List[Dict[str, Any]]:
        package_type = fulfillment.get("package_type") or ""
        attachments: List[Dict[str, Any]] = []
        coc_path = fulfillment.get("coc_storage_path") or ""
        instructions_path = fulfillment.get("instructions_storage_path") or ""

        coc_bytes = _download_storage_file(coc_path) if coc_path else None
        if coc_bytes:
            attachments.append(
                {
                    "filename": f"COC-{PACKAGE_LABELS.get(package_type, package_type).replace(' ', '-')}.pdf",
                    "content": coc_bytes,
                    "mime": "application/pdf",
                }
            )

        label = None
        label_id = fulfillment.get("shipping_label_id")
        if label_id:
            lr = (
                supabase.table("shipping_labels")
                .select("*")
                .eq("id", label_id)
                .limit(1)
                .execute()
            )
            label = (lr.data or [None])[0]
        if label:
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
        return attachments

    def _email_existing_fulfillment(fulfillment: Dict[str, Any]) -> Dict[str, Any]:
        """Send/resend kit email for an existing fulfillment (does not claim a new label)."""
        if not fulfillment or not fulfillment.get("id"):
            return {"success": False, "error": "fulfillment missing"}

        package_type = fulfillment.get("package_type") or ""
        to_email = (fulfillment.get("customer_email") or "").strip()
        if not to_email:
            return {"success": False, "error": "customer_email missing on fulfillment"}

        attachments = _build_fulfillment_attachments(fulfillment)
        if not attachments:
            print(f"⚠️ KIT: fulfillment {fulfillment.get('id')} has no PDF attachments to email")

        email_result = {"success": False, "error": "Email service unavailable"}
        if email_service and hasattr(email_service, "send_kit_purchase_email"):
            email_result = email_service.send_kit_purchase_email(
                to_email=to_email,
                full_name=fulfillment.get("customer_name") or "Customer",
                package_name=PACKAGE_LABELS.get(package_type, package_type),
                dashboard_url=_frontend_dashboard_url(),
                attachments=attachments,
            )
        elif email_service:
            email_result = email_service.send_email(
                to_email=to_email,
                subject=f"Total Testing - Your {PACKAGE_LABELS.get(package_type)} Kit Materials",
                body=f"<p>Hi {fulfillment.get('customer_name') or 'Customer'},</p><p>Your kit materials are attached.</p>",
                attachments=attachments,
            )

        update = {
            "email_status": "sent" if email_result.get("success") else "failed",
            "email_error": None
            if email_result.get("success")
            else (email_result.get("error") or email_result.get("message")),
            "email_sent_at": _utcnow() if email_result.get("success") else None,
        }
        supabase.table("kit_fulfillments").update(update).eq("id", fulfillment["id"]).execute()
        fulfillment.update(update)
        print(
            f"{'✅' if email_result.get('success') else '❌'} KIT: email to {to_email} "
            f"status={update['email_status']} err={update.get('email_error')}"
        )
        return {
            "success": bool(email_result.get("success")),
            "fulfillment": fulfillment,
            "email": email_result,
            "error": None if email_result.get("success") else update["email_error"],
        }

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

        # Idempotent on stripe session — but retry email if prior attempt failed
        if stripe_session_id:
            existing = (
                supabase.table("kit_fulfillments")
                .select("*")
                .eq("stripe_session_id", stripe_session_id)
                .limit(1)
                .execute()
            )
            if existing.data:
                row = existing.data[0]
                if row.get("email_status") == "sent":
                    return {"success": True, "fulfillment": row, "duplicate": True}
                print(
                    f"🔁 KIT: retrying email for existing fulfillment {row.get('id')} "
                    f"(was {row.get('email_status')})"
                )
                emailed = _email_existing_fulfillment(row)
                emailed["duplicate"] = True
                return emailed

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

        emailed = _email_existing_fulfillment(fulfillment)
        emailed["label_id"] = label.get("id")
        return emailed

    @app.route("/api/kit/packages", methods=["GET"])
    def kit_list_packages():
        try:
            return jsonify({"packages": _get_packages()})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def _resolve_price_id_for_package(package_type: str) -> str:
        """Map kit package → Stripe Price ID (from prod_… / plink_… / price_…)."""
        import stripe

        api_key = os.getenv("STRIPE_SECRET_KEY", "")
        if not api_key:
            raise RuntimeError("STRIPE_SECRET_KEY not configured on server")
        stripe.api_key = api_key

        packages = _get_packages()
        row = next((p for p in packages if p.get("package_type") == package_type), None)
        if not row:
            raise ValueError("Unknown package_type")

        stored = (row.get("stripe_payment_link_id") or "").strip()
        if stored.startswith("price_"):
            return stored

        if stored.startswith("prod_"):
            product = stripe.Product.retrieve(stored)
            default_price = getattr(product, "default_price", None)
            if hasattr(default_price, "id"):
                return default_price.id
            if isinstance(default_price, str) and default_price.startswith("price_"):
                return default_price
            prices = stripe.Price.list(product=stored, active=True, limit=10)
            for price in getattr(prices, "data", None) or []:
                price_id = getattr(price, "id", None)
                if price_id:
                    return price_id
            raise ValueError(f"No active price found for product {stored}")

        if stored.startswith("plink_"):
            items = stripe.PaymentLink.list_line_items(stored, limit=5)
            data = getattr(items, "data", None) or []
            if not data:
                raise ValueError(f"Payment link {stored} has no line items")
            price = getattr(data[0], "price", None)
            if hasattr(price, "id"):
                return price.id
            if isinstance(price, str) and price.startswith("price_"):
                return price
            raise ValueError(f"Could not read price from payment link {stored}")

        raise ValueError(
            "Configure a Product ID (prod_…), Payment Link ID (plink_…), or Price ID (price_…) "
            "for this package in Admin → Kit Fulfillment"
        )

    @app.route("/api/kit/checkout/embedded", methods=["POST"])
    def kit_create_embedded_checkout():
        """Create a Stripe Embedded Checkout Session for in-page kit purchase."""
        data = request.get_json() or {}
        package_type = (data.get("package_type") or "").strip()
        customer_email = (data.get("email") or "").strip().lower()
        promotion_code = (data.get("promotion_code") or data.get("coupon") or "").strip()

        if package_type not in PACKAGE_TYPES:
            return jsonify({"error": "Invalid package_type"}), 400

        publishable_key = (
            os.getenv("STRIPE_PUBLISHABLE_KEY")
            or os.getenv("STRIPE_PUBLISHABLE")
            or ""
        ).strip()
        if not publishable_key:
            return jsonify(
                {
                    "error": "STRIPE_PUBLISHABLE_KEY not configured on server",
                    "fallback": True,
                }
            ), 503

        try:
            import stripe

            stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
            price_id = _resolve_price_id_for_package(package_type)

            frontend = (os.getenv("FRONTEND_URL") or "https://total-testing-diy.com").rstrip("/")
            return_url = (
                f"{frontend}/StartNewInspection"
                f"?checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
            )

            session_params = {
                "ui_mode": "embedded",
                "mode": "payment",
                "line_items": [{"price": price_id, "quantity": 1}],
                "return_url": return_url,
                "metadata": {"package_type": package_type},
            }
            if customer_email:
                session_params["customer_email"] = customer_email

            # Stripe: cannot combine discounts[] with allow_promotion_codes.
            # Prefer an explicit code from our UI; otherwise show Stripe's promo field.
            if promotion_code:
                promos = stripe.PromotionCode.list(code=promotion_code, active=True, limit=1)
                promo = (getattr(promos, "data", None) or [None])[0]
                if not promo:
                    return jsonify(
                        {
                            "error": (
                                f"Coupon code “{promotion_code}” was not found or is inactive. "
                                "In Stripe, open your Coupon → create a Promotion code customers can type."
                            )
                        }
                    ), 400
                session_params["discounts"] = [{"promotion_code": promo.id}]
                session_params["metadata"]["promotion_code"] = promotion_code
            else:
                session_params["allow_promotion_codes"] = True

            session = stripe.checkout.Session.create(**session_params)
            return jsonify(
                {
                    "client_secret": session.client_secret,
                    "session_id": session.id,
                    "publishable_key": publishable_key,
                    "package_type": package_type,
                    "promotion_applied": bool(promotion_code),
                }
            )
        except Exception as e:
            print(f"❌ KIT: embedded checkout create failed: {e}")
            return jsonify({"error": str(e), "fallback": True}), 500

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
            q = supabase.table("shipping_labels").select("*").limit(2000)
            if status:
                q = q.eq("status", status)
            result = q.execute()
            rows = _sort_labels(result.data or [])
            available = len([r for r in rows if r.get("status") == "available"])
            assigned = len([r for r in rows if r.get("status") == "assigned"])
            voided = len([r for r in rows if r.get("status") == "void"])
            return jsonify(
                {
                    "labels": rows,
                    "available_count": available,
                    "assigned_count": assigned,
                    "void_count": voided,
                    "total_count": len(rows),
                }
            )
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

        existing_names = _existing_label_names()
        seen_batch = set()
        created = []
        skipped = []
        errors = []
        for f in files:
            try:
                file_name = _normalize_label_filename(f.filename or "Prepaid-Shipping-Label.pdf")
                if file_name in existing_names or file_name in seen_batch:
                    skipped.append({"file": file_name, "reason": "duplicate filename"})
                    continue
                seen_batch.add(file_name)

                ext = os.path.splitext(file_name)[1] or ".pdf"
                path = f"labels/{uuid.uuid4().hex}{ext}"
                content = f.read()
                if not content:
                    errors.append({"file": file_name, "error": "empty file"})
                    continue
                supabase.storage.from_(KIT_BUCKET).upload(
                    path,
                    content,
                    {"content-type": f.mimetype or "application/pdf", "upsert": "true"},
                )
                row = {
                    "storage_path": path,
                    "file_name": file_name,
                    "public_url": _public_url(path),
                    "status": "available",
                    "package_type": package_type,
                    "created_at": _utcnow(),
                }
                inserted = supabase.table("shipping_labels").insert(row).execute()
                created_row = (inserted.data or [row])[0]
                created.append(created_row)
                existing_names.add(file_name)
            except Exception as e:
                errors.append({"file": getattr(f, "filename", None), "error": str(e)})
        return jsonify(
            {
                "success": len(errors) == 0,
                "created": created,
                "skipped": skipped,
                "errors": errors,
            }
        )

    @app.route("/api/kit/labels/dedupe", methods=["POST"])
    def kit_dedupe_labels():
        """Keep one row per filename, delete extras + storage files."""
        if not _require_admin():
            return jsonify({"error": "Unauthorized"}), 401
        try:
            result = supabase.table("shipping_labels").select("*").limit(2000).execute()
            rows = result.data or []
            by_name: Dict[str, List[Dict[str, Any]]] = {}
            for row in rows:
                key = _normalize_label_filename(row.get("file_name") or row.get("id"))
                by_name.setdefault(key, []).append(row)

            deleted = []
            for _name, group in by_name.items():
                if len(group) < 2:
                    continue
                assigned = [r for r in group if r.get("status") == "assigned"]
                if assigned:
                    keep = sorted(assigned, key=lambda r: r.get("created_at") or "")[0]
                else:
                    keep = sorted(group, key=lambda r: r.get("created_at") or "")[0]
                for dup in group:
                    if dup.get("id") == keep.get("id"):
                        continue
                    path = dup.get("storage_path")
                    if path:
                        try:
                            supabase.storage.from_(KIT_BUCKET).remove([path])
                        except Exception as e:
                            print(f"⚠️ KIT: dedupe storage delete failed: {e}")
                    supabase.table("shipping_labels").delete().eq("id", dup["id"]).execute()
                    deleted.append(dup.get("id"))

            remaining = supabase.table("shipping_labels").select("*").limit(2000).execute()
            return jsonify(
                {
                    "success": True,
                    "deleted_count": len(deleted),
                    "deleted_ids": deleted,
                    "labels": _sort_labels(remaining.data or []),
                }
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/kit/labels/<label_id>", methods=["PATCH"])
    def kit_update_label(label_id):
        if not _require_admin():
            return jsonify({"error": "Unauthorized"}), 401
        data = request.get_json() or {}
        status = str(data.get("status") or "").strip().lower()
        if status not in LABEL_STATUSES:
            return jsonify({"error": f"status must be one of {', '.join(LABEL_STATUSES)}"}), 400
        try:
            payload = {"status": status}
            if status == "available":
                payload["assigned_at"] = None
                payload["assigned_fulfillment_id"] = None
            elif status == "assigned":
                payload["assigned_at"] = _utcnow()
            updated = (
                supabase.table("shipping_labels")
                .update(payload)
                .eq("id", label_id)
                .execute()
            )
            if not updated.data:
                return jsonify({"error": "Label not found"}), 404
            return jsonify({"label": updated.data[0]})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/kit/labels/<label_id>", methods=["DELETE"])
    def kit_delete_label(label_id):
        if not _require_admin():
            return jsonify({"error": "Unauthorized"}), 401
        try:
            existing = (
                supabase.table("shipping_labels")
                .select("*")
                .eq("id", label_id)
                .limit(1)
                .execute()
            )
            row = (existing.data or [None])[0]
            if not row:
                return jsonify({"error": "Label not found"}), 404
            if row.get("status") == "assigned" and row.get("assigned_fulfillment_id"):
                return jsonify(
                    {
                        "error": "Label is assigned to a fulfillment. Set status to void instead of deleting.",
                    }
                ), 400

            path = row.get("storage_path")
            if path:
                try:
                    supabase.storage.from_(KIT_BUCKET).remove([path])
                except Exception as e:
                    print(f"⚠️ KIT: storage delete failed for {path}: {e}")

            supabase.table("shipping_labels").delete().eq("id", label_id).execute()
            return jsonify({"success": True, "deleted_id": label_id})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

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

    @app.route("/api/kit/fulfillments/sync-stripe", methods=["POST"])
    def kit_sync_stripe_fulfillments():
        """
        Recover missed Stripe checkouts: pull recent completed Checkout Sessions
        and fulfill any that are not already in kit_fulfillments.
        """
        if not _require_admin():
            return jsonify({"error": "Unauthorized"}), 401
        api_key = os.getenv("STRIPE_SECRET_KEY", "")
        if not api_key:
            return jsonify({"error": "STRIPE_SECRET_KEY not configured on server"}), 500
        try:
            import stripe

            stripe.api_key = api_key
            data = request.get_json(silent=True) or {}
            limit = int(data.get("limit") or 30)
            limit = max(1, min(limit, 100))

            sessions = stripe.checkout.Session.list(limit=limit, status="complete")
            created = []
            skipped = []
            failed = []

            for session in sessions.data or []:
                # Only walk the first page (limit) — auto_paging could be huge
                session_id = getattr(session, "id", None) or ""
                if not session_id:
                    continue

                existing = (
                    supabase.table("kit_fulfillments")
                    .select("id,email_status")
                    .eq("stripe_session_id", session_id)
                    .limit(1)
                    .execute()
                )
                if existing.data:
                    row = existing.data[0]
                    if row.get("email_status") == "sent":
                        skipped.append({"session_id": session_id, "reason": "already_sent"})
                        continue
                    # Retry email for existing failed/pending fulfillment
                    full = (
                        supabase.table("kit_fulfillments")
                        .select("*")
                        .eq("id", row["id"])
                        .limit(1)
                        .execute()
                    )
                    if full.data:
                        emailed = _email_existing_fulfillment(full.data[0])
                        if emailed.get("success"):
                            created.append(
                                {
                                    "session_id": session_id,
                                    "action": "email_retried",
                                    "email": full.data[0].get("customer_email"),
                                }
                            )
                        else:
                            failed.append(
                                {
                                    "session_id": session_id,
                                    "error": emailed.get("error") or "email retry failed",
                                }
                            )
                    continue

                payment_link = getattr(session, "payment_link", None) or ""
                if hasattr(payment_link, "id"):
                    payment_link = payment_link.id

                details = getattr(session, "customer_details", None)
                email = ""
                name = ""
                if details is not None:
                    email = getattr(details, "email", None) or ""
                    name = getattr(details, "name", None) or ""
                if not email:
                    email = getattr(session, "customer_email", None) or ""
                email = (email or "").strip().lower()
                name = (name or "").strip()

                package_type = _resolve_package_type(
                    payment_link_id=str(payment_link or ""),
                    session_obj=session,
                )
                if not package_type:
                    meta = getattr(session, "metadata", None) or {}
                    if isinstance(meta, dict):
                        package_type = meta.get("package_type") or meta.get("package")
                if not package_type:
                    failed.append(
                        {
                            "session_id": session_id,
                            "email": email,
                            "error": f"Could not map payment_link={payment_link} to a package",
                        }
                    )
                    continue
                if not email:
                    failed.append(
                        {
                            "session_id": session_id,
                            "error": "Checkout session has no customer email",
                        }
                    )
                    continue

                payment_intent = getattr(session, "payment_intent", None) or ""
                if hasattr(payment_intent, "id"):
                    payment_intent = payment_intent.id

                result = _fulfill_purchase(
                    customer_email=email,
                    customer_name=name,
                    package_type=package_type,
                    stripe_session_id=session_id,
                    stripe_payment_link_id=str(payment_link or ""),
                    stripe_payment_intent_id=str(payment_intent or ""),
                )
                if result.get("success") or result.get("duplicate"):
                    created.append(
                        {
                            "session_id": session_id,
                            "email": email,
                            "package_type": package_type,
                            "action": "fulfilled" if result.get("success") else "duplicate",
                            "email_status": (result.get("fulfillment") or {}).get("email_status"),
                        }
                    )
                else:
                    failed.append(
                        {
                            "session_id": session_id,
                            "email": email,
                            "package_type": package_type,
                            "error": result.get("error") or "fulfill failed",
                        }
                    )

            return jsonify(
                {
                    "success": True,
                    "scanned": len(sessions.data or []),
                    "recovered": created,
                    "skipped": skipped,
                    "failed": failed,
                }
            )
        except Exception as e:
            print(f"❌ KIT: sync-stripe failed: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/kit/fulfillments/<fulfillment_id>/resend", methods=["POST"])
    def kit_resend_fulfillment_email(fulfillment_id):
        """Resend COC + label email for an existing sale (no new label assigned)."""
        if not _require_admin():
            return jsonify({"error": "Unauthorized"}), 401
        try:
            existing = (
                supabase.table("kit_fulfillments")
                .select("*")
                .eq("id", fulfillment_id)
                .limit(1)
                .execute()
            )
            if not existing.data:
                return jsonify({"error": "Fulfillment not found"}), 404
            result = _email_existing_fulfillment(existing.data[0])
            status = 200 if result.get("success") else 400
            return jsonify(result), status
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/kit/my-downloads", methods=["GET"])
    def kit_my_downloads():
        email = (request.args.get("email") or "").strip().lower()
        if not email:
            return jsonify({"error": "email required"}), 400
        try:
            # All purchases for this email (any package) land on the same account list.
            # Prefer exact lowercase match; also include legacy mixed-case rows.
            result = (
                supabase.table("kit_fulfillments")
                .select("*")
                .eq("customer_email", email)
                .order("created_at", desc=True)
                .execute()
            )
            rows = list(result.data or [])
            if not rows:
                # Case-insensitive fallback for older rows
                all_rows = (
                    supabase.table("kit_fulfillments")
                    .select("*")
                    .order("created_at", desc=True)
                    .limit(500)
                    .execute()
                )
                rows = [
                    r
                    for r in (all_rows.data or [])
                    if str(r.get("customer_email") or "").strip().lower() == email
                ]
            items = []
            for row in rows:
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
                        "customer_email": row.get("customer_email"),
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
        session = data_obj

        customer_details = _g(session, "customer_details", {}) or {}
        if isinstance(customer_details, dict):
            email = customer_details.get("email") or _g(session, "customer_email")
            name = customer_details.get("name") or ""
        else:
            email = _g(session, "customer_email")
            name = ""
        # Always normalize so repeat purchases with the same address attach to one account
        email = (email or "").strip().lower()
        name = (name or "").strip()

        payment_link = _g(session, "payment_link") or ""
        if hasattr(payment_link, "id"):
            payment_link = payment_link.id
        session_id = _g(session, "id") or ""
        payment_intent = _g(session, "payment_intent") or ""
        if hasattr(payment_intent, "id"):
            payment_intent = payment_intent.id

        package_type = _resolve_package_type(
            payment_link_id=str(payment_link or ""),
            session_obj=session,
        )
        if not package_type:
            # Try metadata
            meta = _g(session, "metadata") or {}
            if isinstance(meta, dict):
                package_type = meta.get("package_type") or meta.get("package")
        if not package_type:
            print(
                f"❌ KIT: could not resolve package for payment_link={payment_link} "
                f"session={session_id} email={email}"
            )
            return jsonify({"error": "Unknown payment link / package mapping"}), 400

        result = _fulfill_purchase(
            customer_email=email or "",
            customer_name=name or "",
            package_type=package_type,
            stripe_session_id=str(session_id or ""),
            stripe_payment_link_id=str(payment_link or ""),
            stripe_payment_intent_id=str(payment_intent or ""),
        )
        # Only ack Stripe when email actually succeeded (or already sent earlier).
        # Returning 500 lets Stripe retry, which now re-attempts failed emails.
        status = 200 if result.get("success") else 500
        print(
            f"{'✅' if result.get('success') else '❌'} KIT: webhook fulfill "
            f"package={package_type} email={email} success={result.get('success')} "
            f"dup={result.get('duplicate')} err={result.get('error')}"
        )
        return jsonify(result), status

    print("✅ KIT: fulfillment endpoints registered")
