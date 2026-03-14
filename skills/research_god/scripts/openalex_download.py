#!/usr/bin/env python3

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional


OPENALEX_WORKS_URL = "https://api.openalex.org/works"


def _quote_phrase(term: str) -> str:
    term = term.strip()
    if not term:
        return ""
    if any(ch.isspace() for ch in term):
        term = term.replace('"', '\\"')
        return f'"{term}"'
    return term


def build_search_query(keywords: List[str], mode: str, exclude: List[str]) -> str:
    terms = [_quote_phrase(k) for k in keywords if k.strip()]
    terms = [t for t in terms if t]
    if not terms:
        raise ValueError("No keywords provided")

    joiner = " AND " if mode.upper() == "AND" else " OR "
    expr = joiner.join(terms)
    if len(terms) > 1:
        expr = f"({expr})"

    if exclude:
        ex = [_quote_phrase(k) for k in exclude if k.strip()]
        ex = [t for t in ex if t]
        if ex:
            ex_expr = " OR ".join(ex)
            if len(ex) > 1:
                ex_expr = f"({ex_expr})"
            expr = f"{expr} NOT {ex_expr}"

    return expr


def http_get_json(url: str, params: Dict[str, str], timeout_s: int = 30) -> Any:
    qs = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    full_url = f"{url}?{qs}"
    req = urllib.request.Request(full_url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        data = resp.read().decode("utf-8")
    return json.loads(data)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(prog="openalex_download")
    parser.add_argument("--keyword", action="append", default=[], help="Keyword term. Repeatable.")
    parser.add_argument("--mode", choices=["AND", "OR"], default="AND", help="How to combine keywords.")
    parser.add_argument("--exclude", action="append", default=[], help="Exclude term (NOT). Repeatable.")
    parser.add_argument("--filter", default="", help="OpenAlex filter string, e.g. publication_year:2024,open_access.is_oa:true")
    parser.add_argument("--per-page", type=int, default=25, help="Results per page (1-100)")
    parser.add_argument("--page", type=int, default=1, help="Page number (1-500)")
    parser.add_argument("--api-key", default=os.environ.get("OPENALEX_API_KEY", ""), help="OpenAlex API key (or set OPENALEX_API_KEY)")
    parser.add_argument("--mailto", default=os.environ.get("OPENALEX_MAILTO", ""), help="Polite pool mailto (optional)")
    parser.add_argument("--output", default="result.json", help="Where to write the response JSON")
    args = parser.parse_args(argv)

    if not (1 <= args.per_page <= 100):
        raise SystemExit("--per-page must be between 1 and 100")
    if not (1 <= args.page <= 500):
        raise SystemExit("--page must be between 1 and 500")

    search = build_search_query(args.keyword, args.mode, args.exclude)

    params: Dict[str, str] = {
        "search": search,
        "per_page": str(args.per_page),
        "page": str(args.page),
    }
    if args.filter:
        params["filter"] = args.filter
    if args.api_key:
        params["api_key"] = args.api_key
    if args.mailto:
        params["mailto"] = args.mailto

    try:
        payload = http_get_json(OPENALEX_WORKS_URL, params)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if hasattr(e, "read") else ""
        raise SystemExit(f"HTTPError {e.code}: {body}")
    except urllib.error.URLError as e:
        raise SystemExit(f"URLError: {e}")
    except json.JSONDecodeError as e:
        raise SystemExit(f"Failed to parse JSON response: {e}")

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")

    meta = payload.get("meta") if isinstance(payload, dict) else None
    if isinstance(meta, dict):
        count = meta.get("count")
        cost = meta.get("cost_usd")
        sys.stderr.write(f"count={count} cost_usd={cost} output={args.output}\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())