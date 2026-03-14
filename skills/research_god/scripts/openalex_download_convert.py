#!/usr/bin/env python3

import argparse
import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional


def _load_local_modules() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)


_load_local_modules()

import openalex_download  # noqa: E402
import openalex_to_prismviz  # noqa: E402


logger = logging.getLogger("openalex_download_convert")


def _as_int_if_possible(value: str) -> Any:
    if value.strip().isdigit():
        try:
            return int(value.strip())
        except ValueError:
            return value
    return value


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        prog="openalex_download_convert",
        description="Download OpenAlex works by multi-keyword search and convert to PrismViz visualization JSON.",
    )

    parser.add_argument("--keyword", action="append", default=[], help="Keyword term. Repeatable.")
    parser.add_argument("--mode", choices=["AND", "OR"], default="AND", help="How to combine keywords.")
    parser.add_argument("--exclude", action="append", default=[], help="Exclude term (NOT). Repeatable.")
    parser.add_argument(
        "--filter",
        default="",
        help="OpenAlex filter string, e.g. from_publication_date:2018-01-01,to_publication_date:2024-12-31",
    )

    parser.add_argument("--per-page", type=int, default=25, help="Results per page (1-100)")
    parser.add_argument("--page", type=int, default=1, help="Page number (1-500)")
    parser.add_argument("--timeout", type=int, default=30, help="HTTP timeout in seconds")

    parser.add_argument(
        "--api-key",
        default=os.environ.get("OPENALEX_API_KEY", ""),
        help="OpenAlex API key (or set OPENALEX_API_KEY)",
    )
    parser.add_argument(
        "--mailto",
        default=os.environ.get("OPENALEX_MAILTO", ""),
        help="Polite pool mailto (optional, or set OPENALEX_MAILTO)",
    )

    parser.add_argument(
        "--raw-output",
        default="",
        help="Optional path to save the raw OpenAlex response JSON (e.g. result.json)",
    )
    parser.add_argument(
        "--viz-output",
        required=True,
        help="Path to write PrismViz visualization JSON (e.g. visualization/openalex.json)",
    )

    parser.add_argument("--topic", required=True, help="Constant topic value to assign to all nodes")
    parser.add_argument(
        "--topic-dist-value",
        type=float,
        default=1.0,
        help="Constant topicDist value to assign to the provided topic key (default: 1.0)",
    )
    parser.add_argument(
        "--keep-external-edges",
        action="store_true",
        help="Keep edges pointing to referenced works not present in the downloaded node set",
    )

    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging level (default: INFO)",
    )

    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="[%(levelname)s] %(message)s",
        stream=sys.stderr,
    )

    if not (1 <= args.per_page <= 100):
        raise SystemExit("--per-page must be between 1 and 100")
    if not (1 <= args.page <= 500):
        raise SystemExit("--page must be between 1 and 500")

    topic_value = _as_int_if_possible(args.topic)

    search = openalex_download.build_search_query(args.keyword, args.mode, args.exclude)
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

    logger.info("Querying OpenAlex works (page=%d per_page=%d)", args.page, args.per_page)

    payload = openalex_download.http_get_json(
        openalex_download.OPENALEX_WORKS_URL,
        params,
        timeout_s=args.timeout,
    )

    if args.raw_output:
        with open(args.raw_output, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
            f.write("\n")
        logger.info("Wrote raw response to %s", args.raw_output)

    output, missing, diagnostics = openalex_to_prismviz.convert_openalex_result(
        payload,
        topic_value=topic_value,
        topic_dist_value=args.topic_dist_value,
        keep_external_edges=args.keep_external_edges,
    )

    meta = payload.get("meta") if isinstance(payload, dict) else None
    if isinstance(meta, dict):
        logger.info("OpenAlex meta: count=%s cost_usd=%s", meta.get("count"), meta.get("cost_usd"))

    logger.info(
        "Converted: nodes=%d edges=%d (raw edges=%d, dropped external=%d)",
        diagnostics.get("nodes"),
        diagnostics.get("edges"),
        diagnostics.get("edges_raw"),
        diagnostics.get("external_edges_dropped"),
    )

    total_works = 0
    if isinstance(payload, dict) and isinstance(payload.get("results"), list):
        total_works = len(payload["results"])
    elif isinstance(payload, list):
        total_works = len(payload)

    if missing.field_missing_counts:
        logger.info(
            "Missing-field summary: %d/%d works have at least one missing field",
            missing.papers_with_any_missing,
            total_works,
        )
        for field, count in missing.field_missing_counts.most_common():
            logger.info("Missing field `%s`: %d works", field, count)

    with open(args.viz_output, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write("\n")

    logger.info("Wrote visualization JSON to %s", args.viz_output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())