#!/usr/bin/env python3

import argparse
import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional, Tuple


def _load_local_modules() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)


_load_local_modules()

import openalex_download  # noqa: E402
import openalex_to_prismviz  # noqa: E402


logger = logging.getLogger("openalex_batch_download_convert")


def _as_int_if_possible(value: str) -> Any:
    if value.strip().isdigit():
        try:
            return int(value.strip())
        except ValueError:
            return value
    return value


def _parse_topic_keywords(raw: Any, max_keywords: int) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        parts = [p for p in raw.strip().split() if p]
        return parts[:max_keywords]
    if isinstance(raw, list):
        parts = [str(p).strip() for p in raw if str(p).strip()]
        return parts[:max_keywords]
    return []


def _sort_topic_items(d: Dict[str, Any]) -> List[Tuple[str, Any]]:
    def key_fn(item: Tuple[str, Any]) -> Tuple[int, str]:
        k = item[0]
        if isinstance(k, str) and k.isdigit():
            return (0, f"{int(k):020d}")
        return (1, str(k))

    return sorted(d.items(), key=key_fn)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        prog="openalex_batch_download_convert",
        description="Batch download OpenAlex works for each topic in topic.json and convert to PrismViz JSON.",
    )

    parser.add_argument("--topics", required=True, help="Path to topic.json mapping topic_id -> keywords")
    parser.add_argument("--output-dir", required=True, help="Directory to write per-topic PrismViz JSON")
    parser.add_argument("--raw-output-dir", default="", help="Optional directory to write raw OpenAlex responses")

    parser.add_argument("--mode", choices=["AND", "OR"], default="OR", help="How to combine topic keywords")
    parser.add_argument("--exclude", action="append", default=[], help="Exclude term (NOT). Repeatable.")
    parser.add_argument("--max-keywords", type=int, default=8, help="Max keywords used per topic (default: 8)")

    parser.add_argument("--filter", default="", help="OpenAlex filter string")
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
        "--topic-dist-value",
        type=float,
        default=1.0,
        help="Constant topicDist value to assign to the topic key (default: 1.0)",
    )
    parser.add_argument(
        "--keep-external-edges",
        action="store_true",
        help="Keep edges pointing to referenced works not present in the downloaded node set",
    )

    parser.add_argument(
        "--continue-on-error",
        action="store_true",
        help="Continue processing other topics if one topic fails",
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
    if args.max_keywords <= 0:
        raise SystemExit("--max-keywords must be > 0")

    try:
        with open(args.topics, "r", encoding="utf-8") as f:
            topics_payload = json.load(f)
    except json.JSONDecodeError as e:
        raise SystemExit(f"Failed to parse JSON from {args.topics}: {e}")
    except FileNotFoundError:
        raise SystemExit(f"Topic file not found: {args.topics}")

    if not isinstance(topics_payload, dict):
        raise SystemExit("topic.json must be a JSON object mapping topic_id to keywords")

    os.makedirs(args.output_dir, exist_ok=True)
    if args.raw_output_dir:
        os.makedirs(args.raw_output_dir, exist_ok=True)

    total = 0
    ok = 0
    failed = 0

    for topic_id, raw_keywords in _sort_topic_items(topics_payload):
        total += 1
        topic_value = _as_int_if_possible(str(topic_id))
        keywords = _parse_topic_keywords(raw_keywords, args.max_keywords)
        if not keywords:
            msg = f"Topic {topic_id}: no keywords, skipping"
            if args.continue_on_error:
                logger.warning(msg)
                failed += 1
                continue
            raise SystemExit(msg)

        try:
            search = openalex_download.build_search_query(keywords, args.mode, args.exclude)
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

            logger.info("Topic %s: querying OpenAlex with %d keywords", topic_id, len(keywords))
            payload = openalex_download.http_get_json(
                openalex_download.OPENALEX_WORKS_URL,
                params,
                timeout_s=args.timeout,
            )

            if args.raw_output_dir:
                raw_path = os.path.join(args.raw_output_dir, f"{topic_id}.result.json")
                with open(raw_path, "w", encoding="utf-8") as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)
                    f.write("\n")

            output, missing, diagnostics = openalex_to_prismviz.convert_openalex_result(
                payload,
                topic_value=topic_value,
                topic_dist_value=args.topic_dist_value,
                keep_external_edges=args.keep_external_edges,
            )

            out_path = os.path.join(args.output_dir, f"{topic_id}.json")
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
                f.write("\n")

            meta = payload.get("meta") if isinstance(payload, dict) else None
            if isinstance(meta, dict):
                logger.info(
                    "Topic %s: meta count=%s cost_usd=%s nodes=%d edges=%d",
                    topic_id,
                    meta.get("count"),
                    meta.get("cost_usd"),
                    diagnostics.get("nodes"),
                    diagnostics.get("edges"),
                )
            else:
                logger.info(
                    "Topic %s: nodes=%d edges=%d",
                    topic_id,
                    diagnostics.get("nodes"),
                    diagnostics.get("edges"),
                )

            total_works = 0
            if isinstance(payload, dict) and isinstance(payload.get("results"), list):
                total_works = len(payload["results"])
            elif isinstance(payload, list):
                total_works = len(payload)

            if missing.field_missing_counts:
                logger.info(
                    "Topic %s: missing-field summary: %d/%d works have at least one missing field",
                    topic_id,
                    missing.papers_with_any_missing,
                    total_works,
                )
                for field, count in missing.field_missing_counts.most_common():
                    logger.info("Topic %s: missing field `%s`: %d works", topic_id, field, count)

            ok += 1
        except Exception as e:
            failed += 1
            if args.continue_on_error:
                logger.error("Topic %s failed: %s", topic_id, e)
                continue
            raise

    logger.info("Done. topics=%d ok=%d failed=%d output_dir=%s", total, ok, failed, args.output_dir)
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())