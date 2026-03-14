---
name: "research_god"
description: "Builds a literature dataset from OpenAlex and produces PrismViz-ready JSON + a visualization URL. Invoke when user asks for literature search + dataset building + visualization."
---

# Paper Visualization

## Hard Rules

- Do NOT write ad-hoc scripts for JSON processing.
- Do NOT re-implement download/convert logic in the chat.
- MUST use the existing scripts under `skills/research_god/scripts/`.
- If a required script/arg is missing or fails, report the error and fix the existing script instead of creating new code.

## Goal

- Produce reproducible artifacts under `visualization/data/<run_id>/` and return a working URL that loads `data/<run_id>/result/<topic_id>.json`.

## What to Do When Invoked

- For each step: announce start/end, and report outputs and key stats (nodes/edges/cost_usd).

1) Create run directory

- Create a unique `visualization/data/<run_id>/`.
- Layout:
  - `visualization/data/<run_id>/topic.json`
  - `visualization/data/<run_id>/raw/`
  - `visualization/data/<run_id>/result/`

2) Build `topic.json`

- Extract 2-3 topics from user intent.
- For each topic, generate keywords separated by spaces.
- Write to `visualization/data/<run_id>/topic.json`:

```
{
  "0": "image ct brain medical surgical 3d",
  "1": "virtual reality environment augment robot vr haptic ar interaction",
  "2": "protein molecular gene biological analysis cell genome data"
}
```

3) Download and convert

- Execute:

```
python3 ~/GeneticFlowAgent/visualization/skills/research_god/scripts/openalex_batch_download_convert.py \
  --topics ~/GeneticFlowAgent/visualization/data/<run_id>/topic.json \
  --output-dir ~/GeneticFlowAgent/visualization/data/<run_id>/result \
  --raw-output-dir ~/GeneticFlowAgent/visualization/data/<run_id>/raw \
  --mode OR \
  --max-keywords 4 \
  --per-page 5 --page 1 \
  --filter "from_publication_date:2018-01-01,to_publication_date:2024-12-31" \
  --topic-dist-value 1.0 \
  --continue-on-error
```

4) Return visualization URL

- Return:

```
http://localhost:8000/visualization/index.html?data=data/<run_id>/result/0.json
```