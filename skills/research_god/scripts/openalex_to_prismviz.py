#!/usr/bin/env python3

import argparse
import json
import logging
import sys
from collections import Counter
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


logger = logging.getLogger("openalex_to_prismviz")


def _as_int_if_possible(value: Any) -> Any:
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        try:
            return int(value.strip())
        except ValueError:
            return value
    return value


def abstract_from_inverted_index(inverted: Optional[Dict[str, List[int]]]) -> str:
    if not inverted:
        return ""

    pairs: List[Tuple[int, str]] = []
    for token, positions in inverted.items():
        if not isinstance(token, str) or not isinstance(positions, list):
            continue
        for pos in positions:
            if isinstance(pos, int):
                pairs.append((pos, token))

    if not pairs:
        return ""

    pairs.sort(key=lambda x: x[0])
    return " ".join(token for _, token in pairs)


def _get(d: Any, path: str) -> Any:
    cur = d
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _extract_authors(work: Dict[str, Any]) -> str:
    authorships = work.get("authorships")
    if not isinstance(authorships, list) or not authorships:
        return ""

    names: List[str] = []
    for a in authorships:
        if not isinstance(a, dict):
            continue
        author = a.get("author")
        if not isinstance(author, dict):
            continue
        dn = author.get("display_name")
        if isinstance(dn, str) and dn.strip():
            names.append(dn.strip())

    return ", ".join(names)


def _safe_int(value: Any, default: int = 0) -> int:
    if isinstance(value, bool):
        return default
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        try:
            return int(float(value))
        except ValueError:
            return default
    return default


@dataclass
class MissingStats:
    field_missing_counts: Counter
    papers_with_any_missing: int = 0


def _note_missing(missing: MissingStats, field: str) -> None:
    missing.field_missing_counts[field] += 1


def convert_openalex_result(
    payload: Any,
    *,
    topic_value: Any,
    topic_dist_value: float,
    keep_external_edges: bool,
) -> Tuple[Dict[str, Any], MissingStats, Dict[str, int]]:
    if isinstance(payload, dict) and isinstance(payload.get("results"), list):
        works = payload["results"]
    elif isinstance(payload, list):
        works = payload
    else:
        raise ValueError("Unsupported input JSON: expected an object with `results` or a list of works")

    missing = MissingStats(field_missing_counts=Counter())

    nodes: List[Dict[str, Any]] = []
    node_ids: Set[str] = set()

    edges_raw: List[Tuple[str, str]] = []

    required_for_mapping = [
        "id",
        "display_name",
        "publication_year",
        "cited_by_count",
        "referenced_works",
        "referenced_works_count",
        "abstract_inverted_index",
        "primary_location.source.display_name",
        "authorships",
    ]

    dropped_no_id = 0

    for work in works:
        if not isinstance(work, dict):
            missing.papers_with_any_missing += 1
            _note_missing(missing, "__work_not_object__")
            continue

        any_missing_this_work = False
        for key in required_for_mapping:
            if key == "id":
                present = isinstance(work.get("id"), str) and bool(work.get("id"))
            elif key == "display_name":
                present = isinstance(work.get("display_name"), str) and bool(work.get("display_name"))
                if not present:
                    present = isinstance(work.get("title"), str) and bool(work.get("title"))
            elif key == "publication_year":
                present = work.get("publication_year") is not None or isinstance(work.get("publication_date"), str)
            elif key == "authorships":
                present = isinstance(work.get("authorships"), list) and len(work.get("authorships")) > 0
            elif key == "primary_location.source.display_name":
                present = isinstance(_get(work, key), str) and bool(_get(work, key))
            else:
                present = work.get(key) is not None

            if not present:
                any_missing_this_work = True
                _note_missing(missing, key)

        if any_missing_this_work:
            missing.papers_with_any_missing += 1

        work_id = work.get("id")
        if not isinstance(work_id, str) or not work_id.strip():
            dropped_no_id += 1
            continue
        work_id = work_id.strip()

        if work_id in node_ids:
            continue
        node_ids.add(work_id)

        name = work.get("display_name")
        if not isinstance(name, str) or not name.strip():
            title = work.get("title")
            name = title if isinstance(title, str) else ""

        year = work.get("publication_year")
        if year is None:
            pub_date = work.get("publication_date")
            if isinstance(pub_date, str) and len(pub_date) >= 4 and pub_date[:4].isdigit():
                year = int(pub_date[:4])
        year_int = _safe_int(year, default=0)

        venue = _get(work, "primary_location.source.display_name")
        venue_str = venue if isinstance(venue, str) else ""

        abstract = abstract_from_inverted_index(work.get("abstract_inverted_index"))

        cited_by_count = _safe_int(work.get("cited_by_count"), default=0)
        referenced_works_count = _safe_int(
            work.get("referenced_works_count"),
            default=_safe_int(len(work.get("referenced_works") or []), default=0),
        )

        authors_str = _extract_authors(work)

        node = {
            "abstract": abstract,
            "authors": authors_str,
            "citationCount": cited_by_count,
            "id": work_id,
            "name": name,
            "referenceCount": referenced_works_count,
            "survey": False,
            "topic": topic_value,
            "topicDist": {str(topic_value): topic_dist_value},
            "venu": venue_str,
            "year": year_int,
        }
        nodes.append(node)

        referenced = work.get("referenced_works")
        if isinstance(referenced, list):
            for ref in referenced:
                if isinstance(ref, str) and ref.strip():
                    edges_raw.append((work_id, ref.strip()))

    if dropped_no_id:
        logger.warning("Dropped %d works without a valid `id`", dropped_no_id)

    edges_set: Set[Tuple[str, str]] = set()
    edges: List[Dict[str, Any]] = []

    external_edges_dropped = 0
    for s, t in edges_raw:
        if not keep_external_edges and (s not in node_ids or t not in node_ids):
            external_edges_dropped += 1
            continue
        if (s, t) in edges_set:
            continue
        edges_set.add((s, t))
        edges.append({
            "citation_context": None,
            "extends_prob": 1.0,
            "source": s,
            "target": t,
        })

    if external_edges_dropped:
        logger.info("Dropped %d edges whose endpoints are not both in the node set", external_edges_dropped)

    output = {"edges": edges, "nodes": nodes}

    diagnostics = {
        "nodes": len(nodes),
        "edges": len(edges),
        "edges_raw": len(edges_raw),
        "external_edges_dropped": external_edges_dropped,
    }

    _validate_output(output)
    return output, missing, diagnostics


def _validate_output(output: Dict[str, Any]) -> None:
    if not isinstance(output, dict):
        raise ValueError("Output must be a JSON object")

    nodes = output.get("nodes")
    edges = output.get("edges")

    if not isinstance(nodes, list) or not isinstance(edges, list):
        raise ValueError("Output must contain `nodes` (list) and `edges` (list)")

    if not nodes:
        raise ValueError("No nodes produced")

    node_ids: Set[str] = set()
    for i, n in enumerate(nodes):
        if not isinstance(n, dict):
            raise ValueError(f"Node at index {i} is not an object")
        nid = n.get("id")
        if not isinstance(nid, str) or not nid.strip():
            raise ValueError(f"Node at index {i} has invalid `id`")
        if nid in node_ids:
            raise ValueError(f"Duplicate node id: {nid}")
        node_ids.add(nid)

        if "topicDist" not in n or not isinstance(n["topicDist"], dict) or not n["topicDist"]:
            raise ValueError(f"Node {nid} has invalid `topicDist`")
        for k, v in n["topicDist"].items():
            if not isinstance(k, str) or not k:
                raise ValueError(f"Node {nid} has invalid topicDist key")
            if not isinstance(v, (int, float)):
                raise ValueError(f"Node {nid} has invalid topicDist value")

        for key in ["year", "citationCount", "referenceCount"]:
            if key not in n or not isinstance(n[key], int):
                raise ValueError(f"Node {nid} has invalid `{key}`")

    for i, e in enumerate(edges):
        if not isinstance(e, dict):
            raise ValueError(f"Edge at index {i} is not an object")
        s = e.get("source")
        t = e.get("target")
        if not isinstance(s, str) or not isinstance(t, str):
            raise ValueError(f"Edge at index {i} must have string `source` and `target`")
        if not s or not t:
            raise ValueError(f"Edge at index {i} has empty source/target")

        if "extends_prob" not in e or not isinstance(e["extends_prob"], (int, float)):
            raise ValueError(f"Edge {s}->{t} has invalid `extends_prob`")


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Convert an OpenAlex works result JSON into PrismViz visualization JSON (nodes/edges).",
    )
    parser.add_argument("--input", required=True, help="Path to OpenAlex JSON (e.g., result.json)")
    parser.add_argument("--output", required=True, help="Path to output visualization JSON")
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
        help="Keep edges pointing to referenced works not present in the input node set",
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

    topic_value = _as_int_if_possible(args.topic)

    try:
        with open(args.input, "r", encoding="utf-8") as f:
            payload = json.load(f)
    except json.JSONDecodeError as e:
        raise SystemExit(f"Failed to parse JSON from {args.input}: {e}")
    except FileNotFoundError:
        raise SystemExit(f"Input file not found: {args.input}")

    output, missing, diagnostics = convert_openalex_result(
        payload,
        topic_value=topic_value,
        topic_dist_value=args.topic_dist_value,
        keep_external_edges=args.keep_external_edges,
    )

    logger.info(
        "Converted works: nodes=%d edges=%d (raw edges=%d, dropped external=%d)",
        diagnostics["nodes"],
        diagnostics["edges"],
        diagnostics["edges_raw"],
        diagnostics["external_edges_dropped"],
    )

    if missing.field_missing_counts:
        total_works = None
        if isinstance(payload, dict) and isinstance(payload.get("results"), list):
            total_works = len(payload["results"])
        elif isinstance(payload, list):
            total_works = len(payload)

        if total_works is None:
            total_works = 0

        logger.info(
            "Missing-field summary: %d/%d works have at least one missing field",
            missing.papers_with_any_missing,
            total_works,
        )
        for field, count in missing.field_missing_counts.most_common():
            logger.info("Missing field `%s`: %d works", field, count)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write("\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())