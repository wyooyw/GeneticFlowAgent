---
name: "research_god"
description: "把用户的研究兴趣转成 topic.json，批量从 OpenAlex 拉取论文并转换成 PrismViz 可视化数据。Invoke when user asks for literature search + dataset building + ~/GeneticFlowAgent/visualization."
---

# Paper ~/GeneticFlowAgent/visualization

## Goal

- 给用户一个可以直接打开的可视化链接（`~/GeneticFlowAgent/visualization/index.html?data=...`），并在 `~/GeneticFlowAgent/visualization/data/<run_id>/` 下留下可复现的产物（topic.json、raw、result）。

## What to Do When Invoked

- 对下面每一步：开始时说明“正在做什么 + 为什么”，结束时报告“产物位置 + 关键统计（论文数/边数/cost_usd）”。

1) 创建运行目录

- 在仓库目录 `~/GeneticFlowAgent/visualization/data/` 下创建一个不冲突的目录：`<run_id>/`
- 目录结构：
  - `~/GeneticFlowAgent/visualization/data/<run_id>/topic.json`
  - `~/GeneticFlowAgent/visualization/data/<run_id>/raw/`（每个 topic 的原始 OpenAlex 返回）
  - `~/GeneticFlowAgent/visualization/data/<run_id>/result/`（每个 topic 的可视化 JSON）

2) 从用户描述生成话题与关键词

- 从用户描述中提取 2-3 个科研话题。
- 每个话题生成一串关键词（词与词用空格隔开）。
- 写入 `~/GeneticFlowAgent/visualization/data/<run_id>/topic.json`，格式：

```
{
  "0": "image ct brain medical surgical 3d",
  "1": "virtual reality environment augment robot vr haptic ar interaction",
  "2": "protein molecular gene biological analysis cell genome data"
}
```

3) 批量下载 + 转换

- 执行脚本：

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

4) 给出可视化访问链接

- 可视化服务常驻，不用管。
- 返回给用户链接：

```
http://localhost:80/?data=data/<run_id>/result/0.json
```