#!/usr/bin/env python3
"""
WordPress REST API helper (Application Password auth).

Setup (one time in WordPress):
  1. Log into wp-admin as an Administrator (or Editor).
  2. Users → Profile (or Users → your user).
  3. Scroll to "Application Passwords".
  4. Name it e.g. "Cursor" → Add New Application Password.
  5. Copy the password (spaces are OK; this script strips them).

Put these in backend/.env (never commit real values):
  WORDPRESS_URL=https://your-wordpress-site.com
  WORDPRESS_USER=your_wp_username
  WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

Examples:
  python tools/wordpress_api.py ping
  python tools/wordpress_api.py list-posts --status draft
  python tools/wordpress_api.py create-post --title "Hello" --content "<p>Body</p>" --status draft
  python tools/wordpress_api.py update-post --id 123 --title "New title"
  python tools/wordpress_api.py list-pages
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
ENV_CANDIDATES = [
    ROOT / "backend" / ".env",
    ROOT / ".env",
]


def load_dotenv() -> None:
    for path in ENV_CANDIDATES:
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip("'").strip('"')
            if key and key not in os.environ:
                os.environ[key] = val


def cfg() -> Dict[str, str]:
    load_dotenv()
    url = (os.getenv("WORDPRESS_URL") or "").rstrip("/")
    user = (os.getenv("WORDPRESS_USER") or "").strip()
    password = (os.getenv("WORDPRESS_APP_PASSWORD") or "").replace(" ", "").strip()
    if not url or not user or not password:
        raise SystemExit(
            "Missing WORDPRESS_URL / WORDPRESS_USER / WORDPRESS_APP_PASSWORD.\n"
            "Add them to backend/.env (see tools/wordpress_api.py header)."
        )
    return {"url": url, "user": user, "password": password}


def api_request(
    method: str,
    path: str,
    *,
    query: Optional[Dict[str, Any]] = None,
    body: Optional[Dict[str, Any]] = None,
) -> Any:
    c = cfg()
    base = c["url"] + "/wp-json/wp/v2/"
    url = urljoin(base, path.lstrip("/"))
    if query:
        url += ("&" if "?" in url else "?") + urlencode(query, doseq=True)

    token = base64.b64encode(f"{c['user']}:{c['password']}".encode("utf-8")).decode("ascii")
    headers = {
        "Authorization": f"Basic {token}",
        "Accept": "application/json",
        "User-Agent": "TotalTesting-WordPressHelper/1.0",
    }
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = Request(url, data=data, headers=headers, method=method.upper())
    try:
        with urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"WordPress API {e.code} {method} {url}\n{err_body}") from e
    except URLError as e:
        raise SystemExit(f"Could not reach WordPress at {c['url']}: {e}") from e


def cmd_ping(_: argparse.Namespace) -> None:
    # /wp/v2/users/me requires auth — good credential check
    me = api_request("GET", "users/me", query={"context": "edit"})
    print(
        json.dumps(
            {
                "ok": True,
                "site": cfg()["url"],
                "user_id": me.get("id"),
                "name": me.get("name"),
                "roles": me.get("roles"),
            },
            indent=2,
        )
    )


def cmd_list_posts(args: argparse.Namespace) -> None:
    items = api_request(
        "GET",
        "posts",
        query={
            "per_page": args.limit,
            "status": args.status,
            "orderby": "date",
            "order": "desc",
            "context": "edit",
        },
    )
    out = [
        {
            "id": p.get("id"),
            "status": p.get("status"),
            "title": (p.get("title") or {}).get("raw") or (p.get("title") or {}).get("rendered"),
            "link": p.get("link"),
            "modified": p.get("modified"),
        }
        for p in items or []
    ]
    print(json.dumps(out, indent=2))


def cmd_list_pages(args: argparse.Namespace) -> None:
    items = api_request(
        "GET",
        "pages",
        query={
            "per_page": args.limit,
            "status": args.status,
            "orderby": "modified",
            "order": "desc",
            "context": "edit",
        },
    )
    out = [
        {
            "id": p.get("id"),
            "status": p.get("status"),
            "title": (p.get("title") or {}).get("raw") or (p.get("title") or {}).get("rendered"),
            "link": p.get("link"),
            "modified": p.get("modified"),
        }
        for p in items or []
    ]
    print(json.dumps(out, indent=2))


def cmd_get(args: argparse.Namespace) -> None:
    item = api_request("GET", f"{args.type}/{args.id}", query={"context": "edit"})
    print(json.dumps(item, indent=2))


def cmd_create_post(args: argparse.Namespace) -> None:
    content = args.content
    if args.content_file:
        content = Path(args.content_file).read_text(encoding="utf-8")
    payload: Dict[str, Any] = {
        "title": args.title,
        "content": content or "",
        "status": args.status,
    }
    if args.excerpt:
        payload["excerpt"] = args.excerpt
    if args.slug:
        payload["slug"] = args.slug
    created = api_request("POST", "posts", body=payload)
    print(
        json.dumps(
            {
                "id": created.get("id"),
                "status": created.get("status"),
                "link": created.get("link"),
                "title": (created.get("title") or {}).get("raw"),
            },
            indent=2,
        )
    )


def cmd_update_post(args: argparse.Namespace) -> None:
    payload: Dict[str, Any] = {}
    if args.title:
        payload["title"] = args.title
    if args.content is not None:
        payload["content"] = args.content
    if args.content_file:
        payload["content"] = Path(args.content_file).read_text(encoding="utf-8")
    if args.status:
        payload["status"] = args.status
    if args.excerpt is not None:
        payload["excerpt"] = args.excerpt
    if args.slug:
        payload["slug"] = args.slug
    if not payload:
        raise SystemExit("Nothing to update — pass --title/--content/--status/etc.")
    updated = api_request("POST", f"posts/{args.id}", body=payload)
    print(
        json.dumps(
            {
                "id": updated.get("id"),
                "status": updated.get("status"),
                "link": updated.get("link"),
                "title": (updated.get("title") or {}).get("raw"),
            },
            indent=2,
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="WordPress REST API helper")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("ping", help="Verify credentials")
    p.set_defaults(func=cmd_ping)

    p = sub.add_parser("list-posts", help="List posts")
    p.add_argument("--status", default="any", help="draft|publish|any|…")
    p.add_argument("--limit", type=int, default=20)
    p.set_defaults(func=cmd_list_posts)

    p = sub.add_parser("list-pages", help="List pages")
    p.add_argument("--status", default="any")
    p.add_argument("--limit", type=int, default=20)
    p.set_defaults(func=cmd_list_pages)

    p = sub.add_parser("get", help="Get one post or page as JSON")
    p.add_argument("--type", choices=["posts", "pages"], default="posts")
    p.add_argument("--id", type=int, required=True)
    p.set_defaults(func=cmd_get)

    p = sub.add_parser("create-post", help="Create a post (default: draft)")
    p.add_argument("--title", required=True)
    p.add_argument("--content", default="")
    p.add_argument("--content-file", help="HTML/text file for post body")
    p.add_argument("--excerpt", default="")
    p.add_argument("--slug", default="")
    p.add_argument("--status", default="draft", help="draft|publish|pending")
    p.set_defaults(func=cmd_create_post)

    p = sub.add_parser("update-post", help="Update an existing post")
    p.add_argument("--id", type=int, required=True)
    p.add_argument("--title")
    p.add_argument("--content")
    p.add_argument("--content-file")
    p.add_argument("--excerpt")
    p.add_argument("--slug")
    p.add_argument("--status")
    p.set_defaults(func=cmd_update_post)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
