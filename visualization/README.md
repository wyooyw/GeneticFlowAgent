# PrismViz.js

一个用于学术论文网络可视化的 JavaScript 库，提供基因流图（GeneticFlow）和基因棱镜（GeneticPrism）两种可视化模式。

## 概述

PrismViz.js 是一个封装完整的可视化库，通过 `d3.prismViz` 命名空间提供简洁的 API 接口。它可以将学者的论文数据转换为交互式的时间线可视化，支持主题分析、合作关系展示和引用网络探索。

在线演示见`example`目录，在该目录下运行http服务器即可访问：`python -m http.server 8000`

<img width="2560" height="1274" alt="image" src="https://github.com/user-attachments/assets/3e50be99-a13c-4ab1-909a-fc013051859f" />


## 目录

- [快速开始](#快速开始)
- [依赖项](#依赖项)
- [API 文档](#api-文档)
- [数据格式](#数据格式)
- [完整示例](#完整示例)
- [常见问题](#常见问题)

## 快速开始

### 1. 引入依赖

在 HTML 文件中按顺序引入以下文件：

```html
<!DOCTYPE HTML>
<html>
<head>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.0/css/all.min.css">
    <link rel='stylesheet' type='text/css' href="style.css">
    
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://d3js.org/d3.v5.min.js"></script>
    <script src="viz-standalone.js"></script>
    <script src="viz-context.js"></script>
    <script src="prismviz.js"></script>
</head>
<body>
    <!-- 你的内容 -->
</body>
</html>
```

### 2. 准备 HTML 容器

创建三个主要的可视化区域：

```html
<div class="container-fluid">
    <!-- 左侧：和弦图面板 -->
    <div class="left-column">
        <div id="chord"></div>
    </div>
    
    <!-- 中间：主可视化区域 -->
    <div id="middle-column" class="middle-column"></div>
    
    <!-- 右侧：论文列表 -->
    <div class="right-column">
        <div id="timeline"></div>
    </div>
</div>
```

### 3. 初始化可视化

```javascript
$(function () {
    // 绑定三个面板
    d3.prismViz.bindChordPanel("chord");
    d3.prismViz.bindMainPanel("middle-column");
    d3.prismViz.bindListPanel("timeline");
    
    // 准备主题字段数据（id: name 格式）
    const fields = {
        "0": "Visualization",
        "1": "Human-Computer Interaction",
        "2": "Machine Learning",
        // ... 更多主题
    };
    
    // 配置对象
    const config = {
        "authorName": "Daniel A. Keim",
        "authorID": "2147343253",
        "node_prob": 0.5,
        "edge_prob": 0.5,
        "topic_prob": 0.55,
        "remove_survey": "1",
        "remove_isolated": "0"
    };

    // 初始化 Viz.js 并加载数据
    Viz.instance().then(function(v) {
        VizContext.instance().then(function(vc) {
            d3.json(`data.json`).then(data => {
                d3.prismViz.loadData(data, fields, config, v, vc);
            });
        });
    });
});
```

## 依赖项

### 必需的库

已经通过头文件引入（注意noUiSlider和Bootstrap非依赖项，不必引入）：

| 库名称 | 版本 | CDN 链接 | 说明 |
|--------|------|----------|------|
| jQuery | 3.7.1+ | `https://code.jquery.com/jquery-3.7.1.min.js` | DOM 操作 |
| D3.js | v5.x | `https://d3js.org/d3.v5.min.js` | ⚠️ 必须使用 v5 |
| Font Awesome | 6.1.0+ | `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.0/css/all.min.css` | 图标 |
| Viz.js | 2.x | `viz-standalone.js` & `viz-context.js` | Graphviz 引擎 |

### 本地文件

- `prismviz.js` - 核心库文件
- `style.css` - 样式文件
- `viz-standalone.js` - Graphviz 渲染引擎
- `viz-context.js` - Graphviz 上下文

⚠️ **重要提示**：必须使用 D3.js v5 版本，不兼容 v6 及以上版本。

## API 文档

PrismViz.js 通过 `d3.prismViz` 命名空间暴露以下公共接口：

### 核心函数

#### `d3.prismViz.loadData(data, fields, config, viz, vizContext)`

加载数据并初始化可视化。

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `data` | Object | 学者的论文和引用数据 |
| `fields` | Object | 主题字段映射 `{id: name}` |
| `config` | Object | 配置对象 |
| `viz` | Viz | Viz.js 实例 |
| `vizContext` | VizContext | VizContext 实例 |

**示例：**

```javascript
Viz.instance().then(viz => {
    VizContext.instance().then(vizContext => {
        d3.json("data.json").then(data => {
            const fields = {"0": "Visualization", "1": "HCI"};
            const config = {
                authorName: "John Doe",
                node_prob: 0.5,
                edge_prob: 0.5
            };
            
            d3.prismViz.loadData(data, fields, config, viz, vizContext);
        });
    });
});
```


### 面板绑定函数

这三个函数用于创建和初始化可视化的三个主要面板。

#### `d3.prismViz.bindChordPanel(elementId)`

创建和弦图面板，用于展示主题之间的关系。

**参数：**
- `elementId` (string): 容器元素的 DOM ID

**功能：**
- 创建和弦图容器
- 添加 Polygon View 切换按钮
- 初始化主题关系可视化

**示例：**

```javascript
d3.prismViz.bindChordPanel("chord");
```

**所需 HTML：**

```html
<div id="chord" style="min-height: 400px;"></div>
```

#### `d3.prismViz.bindMainPanel(elementId)`

创建主可视化面板，包含 GeneticFlow 和 GeneticPrism 两种视图。

**参数：**
- `elementId` (string): 容器元素的 DOM ID

**功能：**
- 创建顶部工具栏（缩放、全屏、下载、速度控制等）
- 创建可折叠工具箱（刷新、显示选项、形状设置等）
- 初始化两种可视化模式的绘图区域
- 创建标签云容器
- 绑定所有交互事件

**工具栏功能：**

| 按钮 | 图标 | 功能 |
|------|------|------|
| Zoom In | fa-plus | 放大视图 |
| Zoom Out | fa-minus | 缩小视图 |
| Fullscreen | fa-maximize | 全屏显示 |
| Download | fa-download | 下载当前视图为 SVG |
| Switch Mode | fa-repeat | 切换 GeneticFlow/GeneticPrism |
| Speed | fa-gauge | 调整旋转速度（0-4档） |
| Toggle Toolbox | fa-chevron-down | 显示/隐藏工具箱 |

**工具箱选项：**

| 按钮 | 功能 |
|------|------|
| Restore | 刷新当前视图 |
| Show Tag | 显示/隐藏论文标签 |
| Regular | 切换节点形状（圆形/六边形） |
| Hide Background | 隐藏背景流图 |
| Collapse | 折叠/展开时间线 |
| Full Size | 全尺寸显示 |
| Enlarge | 放大节点尺寸 |
| Show Tag Cloud | 显示/隐藏标签云 |

**示例：**

```javascript
d3.prismViz.bindMainPanel("middle-column");
```

**所需 HTML：**

```html
<div id="middle-column" class="middle-column" 
     style="position: relative; width: 55%; height: 100vh;">
</div>
```

#### `d3.prismViz.bindListPanel(elementId)`

创建论文列表面板，按时间顺序展示论文信息。

**参数：**
- `elementId` (string): 容器元素的 DOM ID

**功能：**
- 初始化可滚动的论文列表容器
- 准备接收动态更新的论文数据
- 提供论文详情的悬停和点击交互

**示例：**

```javascript
d3.prismViz.bindListPanel("timeline");
```

**所需 HTML：**

```html
<div id="timeline" style="overflow-y: auto; height: 100vh;"></div>
```

### 过滤更新函数

这些函数用于动态调整可视化的过滤阈值。

#### `d3.prismViz.updateNodeProb(value)`

更新节点显示的概率阈值，只显示概率大于此值的论文。

**参数：**
- `value` (number): 0.0 ~ 1.0 之间的数值

**使用场景：**
- 过滤掉不重要的论文节点
- 减少视图复杂度
- 聚焦高质量论文

**示例：**

```javascript
// 与 noUiSlider 结合使用
nodeSlider.noUiSlider.on("change", function () {
    const value = nodeSlider.noUiSlider.get();
    d3.prismViz.updateNodeProb(value);
    $("#node-value").text("≥" + value);
});

// 直接调用
d3.prismViz.updateNodeProb(0.7);  // 只显示概率 ≥ 0.7 的论文
```

#### `d3.prismViz.updateEdgeProb(value)`

更新引用边显示的概率阈值，只显示概率大于此值的引用关系。

**参数：**
- `value` (number): 0.0 ~ 1.0 之间的数值

**使用场景：**
- 过滤弱引用关系
- 突出重要的学术传承
- 简化引用网络

**示例：**

```javascript
edgeSlider.noUiSlider.on("change", function () {
    const value = edgeSlider.noUiSlider.get();
    d3.prismViz.updateEdgeProb(value);
    $("#edge-value").text("≥" + value);
});
```

#### `d3.prismViz.updateTopicProb(value)`

更新主题相似度阈值，控制主题筛选的严格程度。

**参数：**
- `value` (number): 0.0 ~ 1.0 之间的数值

**使用场景：**
- 过滤跨主题的论文
- 聚焦单一研究领域
- 调整主题分类的精细度

**示例：**

```javascript
topicSlider.noUiSlider.on("change", function () {
    const value = topicSlider.noUiSlider.get();
    d3.prismViz.updateTopicProb(value);
    $("#topic-value").text("≥" + value);
});
```


#### `d3.prismViz.updateYearGrid(value)`

更新年份分组的间隔，控制时间轴的粒度。

**参数：**
- `value` (number): 1 ~ 5 之间的整数（通常为 1, 2, 3, 5）

**使用场景：**
- 调整时间线的分组密度
- 适应不同时间跨度的数据
- 优化可视化性能

**示例：**

```javascript
d3.select("#yearGrid").on("change", function() {
    const value = parseInt(this.value);
    d3.prismViz.updateYearGrid(value);
});

// HTML 选择器
// <select id="yearGrid">
//   <option value="1">1 Year</option>
//   <option value="2">2 Years</option>
//   <option value="3">3 Years</option>
//   <option value="5">5 Years</option>
// </select>
```

## 数据格式

### 输入数据结构

#### `data` 对象

```javascript
{
    "nodes": [
        {
            "id": "paper_001",              // 必需：论文唯一标识
            "title": "Paper Title",         // 必需：论文标题
            "authors": "A, B, C",           // 必需：作者列表
            "year": 2020,                   // 必需：发表年份
            "venue": "Conference",          // 可选：发表会议/期刊
            "citationCount": 150,           // 可选：引用次数
            "topic": "0",                   // 必需：主题 ID（字符串）
            "topicDist": {                  // 可选：主题分布
                "0": 0.8,
                "1": 0.2
            },
            "prob": 0.85,                   // 必需：节点概率（用于过滤）
            "keywords": ["vis", "graph"]    // 可选：关键词列表
        }
        // ... 更多论文
    ],
    "edges": [
        {
            "source": "paper_001",          // 必需：引用来源论文 ID
            "target": "paper_002",          // 必需：被引论文 ID
            "prob": 0.75                    // 必需：边概率（用于过滤）
        }
        // ... 更多引用关系
    ]
}
```

#### `fields` 对象

简单的 ID 到名称的映射：

```javascript
{
    "0": "Visualization",
    "1": "Human-Computer Interaction",
    "2": "Machine Learning",
    "3": "Computer Graphics",
    // ... 更多主题
}
```

#### `config` 对象

```javascript
{
    // ===== 必需字段 =====
    "authorName": "Daniel A. Keim",     // 学者姓名
    "authorID": "2147343253",           // 学者 ID
    
    // ===== 过滤阈值 =====
    "node_prob": 0.5,                   // 节点概率阈值 (0.0-1.0)
    "edge_prob": 0.5,                   // 边概率阈值 (0.0-1.0)
    "topic_prob": 0.55,                 // 主题相似度阈值 (0.0-1.0)
    
    // ===== 过滤选项 =====
    "remove_survey": "1",               // 是否移除综述论文 ("0" 或 "1")
    "remove_isolated": "0",             // 是否移除孤立节点 ("0" 或 "1")
    
    // ===== 可选字段（用于显示） =====
    "name": "Visualization",            // 研究领域名称
    "icon": "fas fa-eye",               // Font Awesome 图标类
    "type": "CS Subfield",              // 领域类型
    "papers": 75813,                    // 论文总数
    "authors": 5015,                    // 作者总数
    "links": 88669,                     // 引用关系总数
    "topic": 70,                        // 主题总数
    "node_width": 10                    // 节点宽度
}
```

## 常见问题

### 1. D3.js 版本错误

**问题：** `d3.hsv is not a function`

**原因：** 使用了 D3.js v6+ 版本

**解决：**
```html
<!-- ❌ 错误 -->
<script src="https://d3js.org/d3.v7.min.js"></script>

<!-- ✅ 正确 -->
<script src="https://d3js.org/d3.v5.min.js"></script>
```

### 2. Viz.js 未加载

**问题：** `Viz.instance is not a function`

**原因：** 缺少 `viz-standalone.js` 或 `viz-context.js`

**解决：**
```html
<!-- 两个文件都必须引入 -->
<script src="viz-standalone.js"></script>
<script src="viz-context.js"></script>
```

### 3. 面板不显示

**问题：** 调用 `bindXXXPanel()` 后没有内容

**原因：** 容器元素没有设置高度

**解决：**
```css
#chord, #middle-column, #timeline {
    min-height: 400px;  /* 或其他合适的高度 */
}
```

### 4. 数据格式错误

**问题：** 可视化显示异常或报错

**原因：** 数据格式不符合要求

**解决：**
```javascript
// 检查必需字段
const requiredNodeFields = ["id", "title", "authors", "year", "topic", "prob"];
const requiredEdgeFields = ["source", "target", "prob"];

data.nodes.forEach(node => {
    requiredNodeFields.forEach(field => {
        if (!(field in node)) {
            console.error(`Missing field: ${field} in node`, node);
        }
    });
});
```

### 5. 滑块不工作

**问题：** 移动滑块没有反应

**原因：** 未正确引入 noUiSlider 或事件绑定时机错误

**解决：**
```javascript
// 确保在 loadData() 之后绑定滑块事件
Viz.instance().then(viz => {
    VizContext.instance().then(vizContext => {
        d3.json("data.json").then(data => {
            d3.prismViz.loadData(data, fields, config, viz, vizContext);
            
            // ✅ 在这里绑定滑块事件
            nodeSlider.noUiSlider.on("change", function() {
                d3.prismViz.updateNodeProb(this.get());
            });
        });
    });
});
```

### 6. 性能问题

**问题：** 数据量大时渲染缓慢

**解决方案：**
```javascript
// 方法 1: 提高过滤阈值
config.node_prob = 0.7;  // 显示更少的节点
config.edge_prob = 0.7;  // 显示更少的边

// 方法 2: 预处理数据（在服务器端）
// 只发送符合阈值的数据

// 方法 3: 分批加载大数据集
```


## 技术支持

如有问题或建议，请提交 Issue 或 Pull Request。

**最后更新：** 2025年12月22日
