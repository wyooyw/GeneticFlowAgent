// D3-HSV Color Space Functions
// Extracted and formatted from d3-hsv.min.js

(function() {
    'use strict';

    // HSV Color Constructor
    function Hsv(h, s, v, opacity) {
        this.h = +h;
        this.s = +s;
        this.v = +v;
        this.opacity = +opacity;
    }

    // Create HSV color from various inputs
    function hsv(h, s, v, opacity) {
        if (arguments.length === 1) {
            // Convert from other color formats
            return rgbToHsv(h);
        }
        return new Hsv(h, s, v, opacity == null ? 1 : opacity);
    }

    // Convert RGB to HSV
    function rgbToHsv(color) {
        if (color instanceof Hsv) {
            return new Hsv(color.h, color.s, color.v, color.opacity);
        }
        
        if (!(color instanceof d3.rgb)) {
            color = d3.rgb(color);
        }

        var r = color.r / 255,
            g = color.g / 255,
            b = color.b / 255,
            min = Math.min(r, g, b),
            max = Math.max(r, g, b),
            delta = max - min,
            h = NaN,
            s = delta / max,
            v = max;

        if (delta) {
            if (r === max) {
                h = (g - b) / delta + (g < b ? 6 : 0);
            } else if (g === max) {
                h = (b - r) / delta + 2;
            } else {
                h = (r - g) / delta + 4;
            }
            h *= 60;
        }

        return new Hsv(h, s, v, color.opacity);
    }

    // Helper function for RGB conversion
    function hsvToRgbHelper(c, x, m, opacity) {
        return d3.rgb(
            255 * (c + m),
            255 * (x + m),
            255 * (m),
            opacity
        );
    }

    // Constant function
    function constant(value) {
        return function() {
            return value;
        };
    }

    // Linear interpolation
    function linear(a, b) {
        var delta = b - a;
        return delta ? function(t) { return a + t * delta; } : constant(isNaN(a) ? b : a);
    }

    // Hue interpolation with wrapping
    function hue(a, b) {
        var delta = b - a;
        return delta ? function(t) {
            return a + t * (delta > 180 || delta < -180 ? delta - 360 * Math.round(delta / 360) : delta);
        } : constant(isNaN(a) ? b : a);
    }

    // HSV interpolation factory
    function hsvInterpolate(hueInterpolator) {
        return function(start, end) {
            var h = hueInterpolator((start = hsv(start)).h, (end = hsv(end)).h),
                s = linear(start.s, end.s),
                v = linear(start.v, end.v),
                opacity = linear(start.opacity, end.opacity);
            
            return function(t) {
                start.h = h(t);
                start.s = s(t);
                start.v = v(t);
                start.opacity = opacity(t);
                return start + "";
            };
        };
    }

    // HSV Prototype Methods
    Hsv.prototype = hsv.prototype = Object.create(d3.color.prototype);
    Hsv.prototype.constructor = Hsv;

    // Brighter color
    Hsv.prototype.brighter = function(k) {
        k = k == null ? 1 / 0.7 : Math.pow(1 / 0.7, k);
        return new Hsv(this.h, this.s, this.v * k, this.opacity);
    };

    // Darker color
    Hsv.prototype.darker = function(k) {
        k = k == null ? 0.7 : Math.pow(0.7, k);
        return new Hsv(this.h, this.s, this.v * k, this.opacity);
    };

    // Convert HSV to RGB
    Hsv.prototype.rgb = function() {
        var h = isNaN(this.h) ? 0 : this.h % 360 + 360 * (this.h < 0),
            s = isNaN(this.h) || isNaN(this.s) ? 0 : this.s,
            v = this.v,
            opacity = this.opacity,
            c = v * s,
            x = c * (1 - Math.abs((h / 60) % 2 - 1)),
            m = v - c;

        if (h < 60) return d3.rgb(255 * (c + m), 255 * (x + m), 255 * m, opacity);
        if (h < 120) return d3.rgb(255 * (x + m), 255 * (c + m), 255 * m, opacity);
        if (h < 180) return d3.rgb(255 * m, 255 * (c + m), 255 * (x + m), opacity);
        if (h < 240) return d3.rgb(255 * m, 255 * (x + m), 255 * (c + m), opacity);
        if (h < 300) return d3.rgb(255 * (x + m), 255 * m, 255 * (c + m), opacity);
        return d3.rgb(255 * (c + m), 255 * m, 255 * (x + m), opacity);
    };

    // Check if color is displayable
    Hsv.prototype.displayable = function() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s)) &&
               0 <= this.v && this.v <= 1 &&
               0 <= this.opacity && this.opacity <= 1;
    };

    // String representation
    Hsv.prototype.toString = function() {
        return this.rgb() + "";
    };

    // Interpolators
    var interpolateHsv = hsvInterpolate(hue);
    var interpolateHsvLong = hsvInterpolate(linear);

    // Export to d3 namespace
    if (typeof d3 !== 'undefined') {
        d3.hsv = hsv;
        d3.interpolateHsv = interpolateHsv;
        d3.interpolateHsvLong = interpolateHsvLong;
    }

    // Export for module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            hsv: hsv,
            interpolateHsv: interpolateHsv,
            interpolateHsvLong: interpolateHsvLong
        };
    }
})();

// D3-Tip Tooltip Functions
// Standard implementation for d3-tip
(function() {
    'use strict';

    d3.tip = function() {
        var direction = d3_tip_direction,
            offset = d3_tip_offset,
            html = d3_tip_html,
            node = initNode(),
            svg = null,
            point = null,
            target = null;

        function tip(vis) {
            svg = getSVGNode(vis);
            if (!svg) return;
            point = svg.createSVGPoint();
            document.body.appendChild(node);
        }

        // Public - show the tooltip on the screen
        tip.show = function() {
            var args = Array.prototype.slice.call(arguments);
            if (args[args.length - 1] instanceof SVGElement) target = args.pop();

            var content = html.apply(this, args),
                poffset = offset.apply(this, args),
                dir = direction.apply(this, args),
                nodel = getNodeEl(),
                i = directions.length,
                coords,
                scrollTop = document.documentElement.scrollTop || document.body.scrollTop,
                scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;

            nodel.html(content)
                .style('opacity', 1)
                .style('pointer-events', 'all');

            while (i--) nodel.classed(directions[i], false);
            coords = direction_callbacks.get(dir).apply(this);
            nodel.classed(dir, true)
                .style('top', (coords.top + poffset[0]) + scrollTop + 'px')
                .style('left', (coords.left + poffset[1]) + scrollLeft + 'px');

            return tip;
        };

        // Public - hide the tooltip
        tip.hide = function() {
            var nodel = getNodeEl();
            nodel.style('opacity', 0).style('pointer-events', 'none');
            return tip;
        };

        // Public: Proxy attr calls to the d3 tip container
        tip.attr = function() {
            d3.select(node).attr.apply(d3.select(node), arguments);
            return tip;
        };

        // Public: Proxy style calls to the d3 tip container
        tip.style = function() {
            d3.select(node).style.apply(d3.select(node), arguments);
            return tip;
        };

        // Public: Set or get the direction of the tooltip
        tip.direction = function(v) {
            if (!arguments.length) return direction;
            direction = v == null ? v : functor(v);
            return tip;
        };

        // Public: Sets or gets the offset of the tooltip
        tip.offset = function(v) {
            if (!arguments.length) return offset;
            offset = v == null ? v : functor(v);
            return tip;
        };

        // Public: sets or gets the html value of the tooltip
        tip.html = function(v) {
            if (!arguments.length) return html;
            html = v == null ? v : functor(v);
            return tip;
        };

        // Public: destroys the tooltip and removes it from the DOM
        tip.destroy = function() {
            if (node) {
                getNodeEl().remove();
                node = null;
            }
            return tip;
        };

        function d3_tip_direction() { return 'n'; }
        function d3_tip_offset() { return [0, 0]; }
        function d3_tip_html() { return ' '; }

        var direction_callbacks = d3.map({
            n: direction_n,
            s: direction_s,
            e: direction_e,
            w: direction_w,
            nw: direction_nw,
            ne: direction_ne,
            sw: direction_sw,
            se: direction_se
        });

        var directions = direction_callbacks.keys();

        function direction_n() {
            var bbox = getScreenBBox();
            return {
                top: bbox.n.y - node.offsetHeight,
                left: bbox.n.x - node.offsetWidth / 2
            };
        }

        function direction_s() {
            var bbox = getScreenBBox();
            return {
                top: bbox.s.y,
                left: bbox.s.x - node.offsetWidth / 2
            };
        }

        function direction_e() {
            var bbox = getScreenBBox();
            return {
                top: bbox.e.y - node.offsetHeight / 2,
                left: bbox.e.x
            };
        }

        function direction_w() {
            var bbox = getScreenBBox();
            return {
                top: bbox.w.y - node.offsetHeight / 2,
                left: bbox.w.x - node.offsetWidth
            };
        }

        function direction_nw() {
            var bbox = getScreenBBox();
            return {
                top: bbox.nw.y - node.offsetHeight,
                left: bbox.nw.x - node.offsetWidth
            };
        }

        function direction_ne() {
            var bbox = getScreenBBox();
            return {
                top: bbox.ne.y - node.offsetHeight,
                left: bbox.ne.x
            };
        }

        function direction_sw() {
            var bbox = getScreenBBox();
            return {
                top: bbox.sw.y,
                left: bbox.sw.x - node.offsetWidth
            };
        }

        function direction_se() {
            var bbox = getScreenBBox();
            return {
                top: bbox.se.y,
                left: bbox.se.x
            };
        }

        function initNode() {
            var node = d3.select(document.createElement('div'));
            node.style('position', 'absolute')
                .style('top', 0)
                .style('opacity', 0)
                .style('pointer-events', 'none')
                .style('box-sizing', 'border-box');
            return node.node();
        }

        function getSVGNode(element) {
            var svgNode = element.node();
            if (!svgNode) return null;
            if (svgNode.tagName.toLowerCase() === 'svg') return svgNode;
            return svgNode.ownerSVGElement;
        }

        function getNodeEl() {
            if (node == null) {
                node = initNode();
                document.body.appendChild(node);
            }
            return d3.select(node);
        }

        function getScreenBBox() {
            var targetel = target || d3.event.target;
            while (targetel.getScreenCTM == null && targetel.parentNode != null) {
                targetel = targetel.parentNode;
            }

            var bbox = {},
                matrix = targetel.getScreenCTM(),
                tbbox = targetel.getBBox(),
                width = tbbox.width,
                height = tbbox.height,
                x = tbbox.x,
                y = tbbox.y;

            point.x = x;
            point.y = y;
            bbox.nw = point.matrixTransform(matrix);
            point.x += width;
            bbox.ne = point.matrixTransform(matrix);
            point.y += height;
            bbox.se = point.matrixTransform(matrix);
            point.x -= width;
            bbox.sw = point.matrixTransform(matrix);
            point.y -= height / 2;
            bbox.w = point.matrixTransform(matrix);
            point.x += width;
            bbox.e = point.matrixTransform(matrix);
            point.x -= width / 2;
            point.y -= height / 2;
            bbox.n = point.matrixTransform(matrix);
            point.y += height;
            bbox.s = point.matrixTransform(matrix);

            return bbox;
        }

        function functor(v) {
            return typeof v === 'function' ? v : function() {
                return v;
            };
        }

        return tip;
    };
})();

(function() {
    'use strict';
// Input variables
let authorData;
let globalConfig;
let globalFields;
let viz, vizContext;
// config = {"remove_survey": "1", "remove_isolated": "0","node_prob": 0.5,"edge_prob": 0.5, "topic_prob": 0.55, "node_width": 10, "name": "Visualization","icon": "fas fa-eye icon", "type": "CS Subfield","papers": 75813,"authors": 5015,"links": 88669,"topic": 70, "authorID": "A-1001-2008", "authorName": "John Doe"};

// Prismviz variables
let global_nodes, global_edges, global_paper_field, minYear, maxYear;
let global_colors = {}; // 仅初始化一次，后续有相同不再更新
let global_coauthors = {};
let paperID2topic = {};
let global_keywords = {};
let topic2graph = {};
let STopic = null;
let paperID2year = {};
let TTM = {}, TTMEdges = {};   // topicTransitionMatrix
let graph;
let topicRanges = [];
let matrixg, node2size, egroup, ranks, id2attr, ret, ids, point2key, textElement;
let context, width, context_l, context_r, prefix;

let prismRadius;  // basePrismRadius * global_nodes.length / 100
let prismHeight;
// 速度档位状态 (0x, 1x, 2x, 3x)
let speedLevel = 2;
const speedMultipliers = [0, 1, 2, 3, 4];
let retationSpeedRatio = 2.5;
let rotationSpeed = speedLevel * retationSpeedRatio; // 每帧旋转的角度
let basePrismRadius = 400;
let prismScale;   // basePrismScale * 100 / global_nodes.length
let basePrismScale = 0.9;
let rotationAngleY = 0, rotationAngleX = -25, translationX = 0, translationY = 0;
let isRotating = false; // 用于控制旋转的状态

let dot = '';
let edgeBundling = 1, nodeShape = 3;
let isCollapse = true, regular=true, enlarge=0;
let maxOpacity = 0.8;
let defaultOpacity = 0.9;
let currentIndex = -1;

// global variable (STopic == null)
let toolboxHidden = true, showtag=true, showtagcloud=true;
let hideBackground = false,fullsize=false;

// subgraph variable (global / subgraph, the graph to render)
let svgWidth, svgHeight;
let contextEdgeWeight = 5;
let minCircleSize = 6;

let visType = "GeneticPrism";
let adjacent_ids = [];
let extend_ids = [];
let lastMouseX, lastMouseY; // 上一个鼠标X坐标
let y_focus = 0.5;
let highlighted = [];

let arrangement = [], adjacentMatrix;
let originalCost, bestCost;
let bbox_padding_x=0, bbox_padding_y=50;
// let bbox_padding_x=10, bbox_padding_y=100;
let yearGrid = 2, alpha = 10;
let virtualOpacity = 0.3;
let topicOpacity = 0.25;


let isDetail = false;
let highlightOpacity = 1;
let backgroundOpacity = highlightOpacity * 2 / 3;
let polygenView = false;
let contextEdgeColor = 'lightblue';

// 在函数外部缓存选择结果

let chord_arcs = d3.selectAll(".chord-arc");
let chord_ribbons = d3.selectAll(".chord-ribbon");
let index2chord_element = {};
let activeArea=null;
let Tooltip, tip;

const bookPaths = [
    "M7839 2240c-925,-5 -2039,107 -2730,790l0 4524c695,-556 1874,-651 2730,-642l0 -4672z",
    "M2161 2240l0 4672c950,-10 1934,71 2730,642l0 -4524c-691,-683 -1806,-795 -2730,-790z",
    "M2052 7132c-60,0 -109,-49 -109,-110l0 -3905 -421 60 17 4469c1041,-233 2267,-363 3261,112 -765,-557 -1826,-674 -2748,-626z",
    "M8478 3200l-421 -77 0 3899c0,61 -49,110 -109,110 -908,-47 -2004,71 -2752,628 994,-469 2245,-315 3282,-79l0 -4481z"
];
const bookWidth = 10000;
const bookHeight = 12500;

const tanh = x => Math.tanh(x);
const sech2 = x => 1 / (Math.cosh(x) ** 2);
const inverse = r => Math.sign(r) * Math.acosh(0.5 * r * r + 1);

// 全局配置对象
let filterConfig = {
    node_prob: 0.5,
    edge_prob: 0.5,
    topic_prob: 0.5,
    yearGrid: 2
};

function loadData(data, fields, config, v, vc) {
    globalFields = fields;
    authorData = data;
    globalConfig = config;
    viz = v;
    vizContext = vc;
    // 遍历filterConfig的键，如果globalConfig中有对应的键，则更新filterConfig
    for (let key in filterConfig) {
        if (globalConfig.hasOwnProperty(key)) {
            filterConfig[key] = globalConfig[key];
        }
    }
    checkScreenSize();
    loadAndRender();
    updateSider();

    $('#toolbox').hide();
    // sugiyama(years, nodes, edges);
    addAllListeners();
}

// 提供给外部调用的配置更新接口
function updateNodeProb(value) {
    filterConfig.node_prob = parseFloat(value);
    loadAndRender();
}

function updateEdgeProb(value) {
    filterConfig.edge_prob = parseFloat(value);
    loadAndRender();
}

function updateTopicProb(value) {
    filterConfig.topic_prob = parseFloat(value);
    render();
}

function updateYearGrid(value) {
    yearGrid = parseInt(value);
    render();
}

class Graph {
    constructor() {
        this.adjList = new Map();
        this.nodeProperties = new Map();
    }

    addNode(node, properties = {}) {
        if (!this.adjList.has(node)) {
            this.adjList.set(node, []);
            this.nodeProperties.set(node, properties);
        }
    }

    addEdge(v1, v2) {
        if (!this.adjList.has(v1)) {
            this.addNode(v1);
        }
        if (!this.adjList.has(v2)) {
            this.addNode(v2);
        }
        this.adjList.get(v1).push(v2);
        this.adjList.get(v2).push(v1); // 如果是无向图，则添加此行
    }

    dfs(start) {
        const visited = new Set();
        const stack = [start];

        while (stack.length) {
            const node = stack.pop();
            if (!visited.has(node)) {
                visited.add(node);
                const neighbors = this.adjList.get(node);
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor)) {
                        stack.push(neighbor);
                    }
                }
            }
        }

        return visited;
    }

    findConnectedComponents() {
        const visited = new Set();
        const components = [];

        for (const [node] of this.adjList.entries()) {
            if (!visited.has(node)) {
                const component = this.dfs(node);
                components.push([...component]);
                component.forEach(v => visited.add(v));
            }
        }

        return components;
    }

    findLastNodeInComponent(component) {
        let maxYear = -Infinity;
        let lastNode = null;

        // 遍历连通分量中的每个节点
        component.forEach(nodeId => {
            const nodeData = this.nodeProperties.get(nodeId);
            // 检查年份，找到最大的年份
            if (nodeData.year && nodeData.year > maxYear) {
                maxYear = nodeData.year;
                lastNode = nodeId;
            }
        });

        // 确认找到的最后一个节点是否以 'l' 或 'r' 开头
        if (lastNode && !['l', 'r'].includes(lastNode[0])) {
            return lastNode;
        }

        return null;  // 如果节点以 'l' 或 'r' 开头或未找到合适的节点，返回 null
    }
}

function highlight_node(id, show_node_info=true, append=false) {   // 输入：当前node的 id
    // if (image_switch == 0)  return;
    // reset_node();
    if (append) {
        if (highlighted.includes(id)) {
            highlighted = highlighted.filter(d => d != id);
        } else {
            highlighted.push(id);
        }
    } else {
        highlighted = [id];
    }
    
    // 仅仅显示当前所选topic的extend_ids
    // ids = get_extend(highlighted, topic2graph[STopic]);
    ids = get_neighbor(highlighted, topic2graph[STopic]);
    // console.log('highlighted:', highlighted, 'append:', append)
    ids = ids.concat(highlighted);

    // if (draw_hypertree) draw_hyper_tree(id);

    d3.selectAll('.paper').style('opacity', virtualOpacity).style('stroke', 'none');
    // d3.selectAll(`.paper-${id}`).style('opacity', 1);
    ids.forEach(id => {
        d3.selectAll(`.paper-${id}`).style('opacity', 1);
    });
    highlighted.forEach(id => {
        d3.selectAll(`.paper-${id}`).style('stroke', 'red').style('stroke-width', 5);
    });
    
    d3.selectAll('.egroup').style('opacity', virtualOpacity);
    highlighted.forEach(id => {
        egroup = d3.selectAll(`.egroup_${id}`).style('opacity', 1);
        egroup.selectAll('.epath').style('stroke', 'red');
        egroup.selectAll('.epath-polygon').style('fill', 'red');
    })
    d3.selectAll('.bar')
        .style("opacity", virtualOpacity)
    d3.selectAll(`.bar_${id}`)
        .style("opacity", 0.7)
        .style("stroke", "red")
        .style("stroke-width", 3);
    extend_ids.forEach(id => {
        d3.selectAll(`.bar_${id}`)
            .style("opacity", 0.7);
    });
}

function reset_node() {
    // console.log('reset_node called')

    d3.selectAll('.bar')
        .style('opacity', 0.7)
        .style("stroke", "none");
        
    d3.selectAll('.egroup').style("opacity", 1);
    d3.selectAll('.paper').style('opacity', 1);
    d3.selectAll('.paper').style('stroke', 'none');

    matrixg.selectAll('.epath')
        .style("stroke", d=> d.color)
        .style("stroke-width", d=>d.width)
        .style('opacity', 1);
    matrixg.selectAll('.epath-polygon')
        .style("fill", d=>d.color)
        .style('opacity', 1);
    
    highlighted = [];
    extend_ids = [];
}

function highlight_edge(id) {
    console.log('highlight_edge', id)
    let id_arr = id.split('->');
    var source = id_arr[0], target = id_arr[1];
    highlighted = [id];
}

function highlight_STopic(rotate=true) {
    reset_tag();
    highlight_tag(STopic, true);
    let ix = global_paper_field.findIndex(d => d.id == STopic);
    // console.log('highlight_STopic', ix);
    if (rotate) rotateTo(ix, render); 
    else render();
}

function highlight_tag(topic_id, is_click) {
    if (is_click) {
        if (STopic != null) {
            d3.selectAll(".tag-text")
                .style("opacity", 0.5);
            d3.select(`#text_${topic_id}`)
                .style("opacity", 1);
        } else if (STopic == null) {
            d3.selectAll(".tag-text")
                .style("opacity", 1);
        }
    }
    d3.select(`#text_${topic_id}`)
        .attr('font-weight', 'bold')
        .attr('fill', 'red');
    if (STopic !== null && STopic != topic_id) {
        d3.select(`#rect_${STopic}`)
            .attr("fill-opacity", 1)
        d3.select(`#text_${STopic}`)
            .attr('font-weight', 'bold');
    }
}

function reset_tag() {
    // reset rect color
    // highlight_topic_forceChart(-1);
    // 将所有tag都置为初始状态
    d3.selectAll(".tag-rect")
        .attr("fill-opacity", 0.6)
    d3.selectAll(".tag-text")
        .attr('font-weight', 'normal')
        .attr('fill', 'black');
    if (STopic !== null) {
        d3.select(`#rect_${STopic}`)
            .attr("fill-opacity", 1)
        d3.select(`#text_${STopic}`)
            .attr('font-weight', 'bold')
            .attr('fill', 'red');
    }
}

function selectorById(id) {
    if (id.indexOf('->'))
        return 'e' + id.replace('->', '_');

    return 'n' + id;
}

function calculateRadiiSteven(perceivedAreas) {
    let actualAreas = perceivedAreas.map(perceivedToActualArea);
    let totalActualArea = actualAreas.reduce((a, b) => a + b, 0);
    let maxRadius = Math.sqrt(totalActualArea / Math.PI);

    let radii = [];
    let currentArea = totalActualArea;

    for (let i = 0; i < actualAreas.length; i++) {
        let radius = Math.sqrt(currentArea / Math.PI);
        radii.push(radius);
        currentArea -= actualAreas[i];
    }

    // Normalize radii so that the outermost radius is 1
    let normalizedRadii = radii.map(r => r / maxRadius);
    return normalizedRadii;
}

function calculateRadii(weigths) {
    // 最外圈为1，按照权重直接线性缩放
    //      如(1,1,1,1)，那么半径为(1,0.75,0.5,0.25)
    //      如(1,2,3,4)，那么半径为(1, 0.9, 0.7, 0.4)

    let total = weigths.reduce((a, b) => a + b, 0);
    let current = total;
    let radii = []
    weigths.forEach(w => {
        radii.push(current / total);
        current -= w;
    })
    return radii;
}

function hsvToColor(color, sat=0.4) {
    // return d3.hsv(d.color[0], d.color[1] * 0.5 + 0.5, d.color[2]);
    return d3.hsv(color[0], sat, color[2]) //  color[1]
}

function topic2color(topic, sat=undefined) {
    // console.log('Initial topic:', topic);    null
    // console.log('typeof topic:', typeof topic);  string

    let c = d3.hsv(d3.color("#d9d9d9"));
    if (!isNull(topic)) {
        topic = parseInt(topic);
        c = global_colors[topic];
    }
    c = [c.h, c.s, c.v];
    
    return sat == undefined? hsvToColor(c): hsvToColor(c, sat);
}

function createDot(graph) {
    /*
    Generates a DOT graph representation.

    Inputs:
        graph['nodes']: A list of node objects, each with 'id', 'citationCount', 'year' attributes.
        graph['edges']: A list of edge objects, each with 'source' and 'target' attributes.
        minYear: The minimum year among the graph['nodes'].
        maxYear: The maximum year among the graph['nodes'].
    */
    let size = '';
    if (graph['width']!=undefined && graph['height']!=undefined) {
        size = `size="${graph['width']},${graph['height']}"\nratio="fill"`;
    }

    // ${getEdgeBundlingStr()}\n
    let dot = `digraph G {\n${size}\n`; // \nnode [shape=circle]
    let yearDic = {};

    for (let year = minYear; year <= maxYear; year++) {
        dot += `year${year} [label="${year}"]\n`;
        yearDic[year] = [`year${year}`]
    }
    graph['nodes'].forEach(node => {
        // const label = node.name.replace(/"/g, '\\"'); // 转义名称中的双引号
        let suffix = '';
        // if (isCollapse && node.citationCount < 10) {
        //     suffix = 'shape=point';
        // } else {
        if (nodeShape == 1 || nodeShape == 2) suffix = 'shape=box';
        else if (nodeShape == 3) suffix = 'shape=hexagon';

        if (isCollapse) {
            if (node.citationCount < 50) suffix += ' fontsize=15';
            else if (node.citationCount < 100) suffix += ' fontsize=20';
            else suffix += ' fontsize=25';
        }
        if (regular) suffix += ' regular=true';

        dot += `${node.id} [label=${node.citationCount} ${suffix}]\n`;
        // 对于每个年份，收集节点ID
        yearDic[node.year].push(node.id);
    });
    // 对每个年份的节点使用rank=same来强制它们在同一层
    for (let year of Object.keys(yearDic)) 
        dot += `{ rank=same ${yearDic[year].join(' ')} }\n`;
    for (let year = minYear; year < maxYear; year++) 
        dot += `year${year}->year${year+1}\n`;

    graph['edges'].forEach(edge => {
        dot += `${edge.source}->${edge.target}\n`;
    });

    dot += '}';
    graph['dot'] = dot
}

function processDotContext(graph) {
    /*
    Processes a dot graph to adjust and filter graph['nodes'] and graph['edges'] based on context graph['edges'] and a yearGrid system.

    Inputs:
        dot: A string containing the dot graph.
        graph['contextEdges']: Dictionary where keys are 'lxxxx->rxxxx' edge strings and values are attributes like weight.
        yearGrid: Integer value representing the yearGrid size for adjusting years in node labels.
        graph['virtualEdges']: virtual graph['edges'] connecting the components 

    Returns:
        output: A string containing the processed dot graph with graph['nodes'] and graph['edges'] adjusted based on the context.
    */
    let l = minYear;
    let r = maxYear;
    let labels = '';
    let focusEdgesStr = '';
    ranks = '';

    // 解析 .dot 输入以分类行并更新年份
    graph['dot'].split('\n').forEach(line => {
        if (line.includes('year')) {
            if (line.includes('rank')) {
                ranks += line + '\n';
            }
        } else if (line.includes('label')) {
            labels += '\t' + line + '\n';
        } else if (line.includes('->')) {
            focusEdgesStr += '\t' + line + '\n';
        }
    });

    // 替换年份标签
    let newRanks = [];
    ranks.split('\n').forEach(line => {
        let match = /year(\d+)/.exec(line);
        if (match && parseInt(match[1], 10) >=l && parseInt(match[1], 10) <= r) {
            newRanks.push(line.replace(/year(\d+)/, (match, p1) => `l${p1} r${p1}`));
        }
    });
    ranks = newRanks.join('\n');

    // 生成左右节点的链
    let leftNodes = Array.from({ length: r - l + 1 }, (_, i) => `l${l + i}`).join('->');
    let rightNodes = Array.from({ length: r - l + 1 }, (_, i) => `r${l + i}`).join('->');

    // 处理并合并contextEdges，可能把多年合并到一年
    graph['combinedContextEdges'] = {};
    Object.entries(graph['contextEdges']).forEach(([edge, edgeList]) => {
        let weight = edgeList.length;
        let newEdge = transfromEdgeName(edge);
        graph['combinedContextEdges'][newEdge] = graph['combinedContextEdges'][newEdge] || 
            { topics:{}, name: newEdge, edges: [], weight: 0, penwidth: 0, port: newEdge[0] === 'l' ? 'tailport=e' : 'headport=w' };
        
        graph['combinedContextEdges'][newEdge].weight += weight;
        graph['combinedContextEdges'][newEdge].penwidth += weight;  // 假设 penwidth 是累积的
        for (let edge of edgeList) {
            graph['combinedContextEdges'][newEdge].edges.push(edge);
            let topic = newEdge[0] == 'l'? paperID2topic[edge.source]: paperID2topic[edge.target];
            graph['combinedContextEdges'][newEdge].topics[topic] = (graph['combinedContextEdges'][newEdge].topics[topic] || 0) + 1;
        }
    });

    // 生成上下文边字符串
    let contextEdgesStr = Object.entries(graph['combinedContextEdges']).map(([edge, data]) =>
        `${edge} [color="lightgray", ${data.port}, weight=${data.weight}, penwidth=${data.penwidth}]`
    ).join('\n');
    let virtualEdgesStr = graph['virtualEdges'] ? graph['virtualEdges'].map(edge => `${edge} [style="invis"]`).join('\n') : '';

    let size = '';
    if (graph['width']!=undefined && graph['height']!=undefined) {
        size = `size="${graph['width']},${graph['height']}"\nratio="fill"`;
        console.log('size', size);
    }

    // 生成最终输出 DOT 字符串 node [shape=circle]
    graph['dotContext'] = `digraph G {
${size}
crossing_type=1
${getEdgeBundlingStr()}

subgraph left {
    style=filled
    color=lightgrey
    node [style=filled,color=lightblue]
${leftNodes} [weight=10000]
    label = "left"
}

subgraph focus{
    edge [weight=${alpha}]
${labels}
${focusEdgesStr}
}

subgraph right {
    style=filled
    color=lightgrey
    node [style=filled,color=lightgrey]
${rightNodes} [weight=10000]
    label = "right"
}

${ranks}
${contextEdgesStr}
l${l}->r${l} [style="invis"]
${virtualEdgesStr}
}`;
}

function parseSVG(graph) {
    graph['id2attr'] = {};
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    // 解析节点
    graph['svgElement'].querySelectorAll('g.node').forEach(node => {
        const title = node.querySelector('title').textContent;
        const shape = node.querySelector('ellipse, polygon, rect'); // 支持椭圆或多边形
        const text = node.querySelector('text');

        let cx, cy, rx, ry;

        if (shape.tagName === 'ellipse') {
            cx = parseFloat(shape.getAttribute('cx'));
            cy = parseFloat(shape.getAttribute('cy'));
            rx = parseFloat(shape.getAttribute('rx'));
            ry = parseFloat(shape.getAttribute('ry'));
        } else if (shape.tagName === 'rect') {
            const x = parseFloat(shape.getAttribute('x'));
            const y = parseFloat(shape.getAttribute('y'));
            const width = parseFloat(shape.getAttribute('width'));
            const height = parseFloat(shape.getAttribute('height'));

            cx = x + width / 2;
            cy = y + height / 2;
            rx = width / 2;
            ry = height / 2;
        } else if (shape.tagName === 'polygon') {
            // 根据多边形的具体形状解析
            const points = shape.getAttribute('points').split(' ').map(point => point.split(',').map(Number));
            const xs = points.map(point => point[0]);
            const ys = points.map(point => point[1]);
            cx = (Math.min(...xs) + Math.max(...xs)) / 2;
            cy = (Math.min(...ys) + Math.max(...ys)) / 2;
            rx = (Math.max(...xs) - Math.min(...xs)) / 2;
            ry = (Math.max(...ys) - Math.min(...ys)) / 2;
        }

        minX = Math.min(minX, cx - rx);
        maxX = Math.max(maxX, cx + rx);
        minY = Math.min(minY, cy - ry);
        maxY = Math.max(maxY, cy + ry);
        
        graph['id2attr'][title] = {
            id: title,
            fill: shape.getAttribute('fill'),
            stroke: shape.getAttribute('stroke'),
            x: cx,
            y: cy,
            rx: rx,
            ry: ry,
            label: text ? text.textContent : ''
        };
    });

    // 解析边
    graph['svgElement'].querySelectorAll('g.edge').forEach(edge => {
        // dismiss port
        const title = edge.querySelector('title').textContent.replace(/:w|:e/g, '');;
        const paths = edge.querySelectorAll('path');
        const polygon = edge.querySelector('polygon');

        let edgePaths = Array.from(paths).map(path => ({
            fill: path.getAttribute('fill'),
            stroke: path.getAttribute('stroke'),
            d: path.getAttribute('d'),
            s: getEndPoint(path.getAttribute('d'), 's'),
            t: getEndPoint(path.getAttribute('d'), 't')
        })).sort((a, b) => {
            const distanceA = Math.sqrt(Math.pow(a.t.x - b.s.x, 2) + Math.pow(a.t.y - b.s.y, 2));
            const distanceB = Math.sqrt(Math.pow(b.t.x - a.s.x, 2) + Math.pow(b.t.y - a.s.y, 2));
            return distanceA - distanceB; // 排序，使得路径首位相连
        });

        graph['id2attr'][title] = {
            id: title,
            name: title,
            path: edgePaths,
            polygon: polygon ? {
                fill: polygon.getAttribute('fill'),
                stroke: polygon.getAttribute('stroke'),
                points: polygon.getAttribute('points')
            } : null
        };
    });
    // graph['viewBox'] = graph['svgElement'].getAttribute('viewBox');
    // let viewBoxHeight = parseFloat(graph['viewBox'].split(' ')[3]);
    // let transform = `translate(0,${viewBoxHeight})`;
    // graph['transform'] = graph['svgElement'].getAttribute('transform');

    graph['viewBox'] = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
    graph['transform'] = `translate(0,${maxY - minY})`;

    graph['nodes'].forEach(node => {
        Object.assign(node, graph['id2attr'][node.id]);
    });
    graph['edges'].forEach(edge => {
        let edgeKey = edge.source + '->' + edge.target;
        Object.assign(edge, graph['id2attr'][edgeKey]);  // 合并边的属性
    });
}

// 获取路径的起点或终点
function getEndPoint(d, type) {
    let points = d.match(/([0-9.-]+),([0-9.-]+)/g);
    if (!points) return { x: 0, y: 0 };
    points = points.map(pt => {
        const coords = pt.split(',');
        return { x: parseFloat(coords[0]), y: parseFloat(coords[1]) };
    });
    return type === 's' ? points[0] : points[points.length - 1];
}

function probToOpacity(prob, a=0.2) {
    // 将透明度从[0.3, 0.8]映射到 [a, 1] 范围
    const opacity = Math.min(Math.max((prob - 0.3) / (0.8 - 0.3), 0), 1);
    return a + (maxOpacity - a) * opacity;
}

function probToWidth(prob, a=1, b=4) {
    const opacity = Math.min(Math.max((prob - 0.3) / (0.8 - 0.3), 0), 1);
    let ret = a + opacity * (b - a);
    return ret;
}

function init_graph(graph, context=true) {
    if (graph['topic'] == null) context = false;
    else {
        Object.keys(graph['contextEdges']).forEach(name => {
            let edges = graph['contextEdges'][name];
            if (name[0] == 'l') {
                let nodeId = name.split('->')[1];
                let node = graph['nodes'].find(node => node.id == nodeId);
                let topics = edges.map(edge => paperID2topic[edge.source]); // context节点的话题
                topics.forEach(topic => {
                    if (node.topicDist[topic]) node.influx = topic;
                })
            } else {
                let nodeId = name.split('->')[0];
                let node = graph['nodes'].find(node => node.id == nodeId);
                let topics = edges.map(edge => paperID2topic[edge.target]); // context节点的话题
                topics.forEach(topic => {
                    if (node.topicDist[topic]) node.efflux = topic;
                })
            }
        })
    }

    createDot(graph);
    if (graph['topic'] !== null && context) {
        // subgraph + context
        processDotContext(graph);
        graph['svgElement'] = vizContext.renderSVGElement(graph['dotContext']);
    } else {
        graph['svgElement'] = viz.renderSVGElement(graph['dot']);
    }
    
    parseSVG(graph);
    // console.log(graph['svgElement'], graph);

    // 创建一个无主的SVG元素
    let svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    // let viewBoxHeight = parseFloat(graph['viewBox'].split(' ')[3]);
    // let transform = `translate(0,${viewBoxHeight})`;
    svgElement.setAttribute('viewBox', graph['viewBox']);
    // svgElement.setAttribute('transform', graph['transform']);

    let svg = d3.select(svgElement);
    matrixg = svg.append('g');
    graph['g'] = matrixg;

    if (context) drawContextEdges(graph);

    // 绘制每条边的所有路径
    // 为每条边创建一个独立的group元素
    const edgeGroups = matrixg.selectAll('.egroup')
        .data(graph['edges']) // 使用edges数组，每个元素代表一条边
        .enter()
        .append('g')
        .attr('class', d => `egroup egroup_${d.source} egroup_${d.target} 
            egroup_${paperID2topic[d.source]} egroup_${paperID2topic[d.target]}`);

    // 在每个group中为每条边添加path元素
    edgeGroups.each(function(edge) {
        const edgeGroup = d3.select(this);

        if (edge.path == undefined) {
            console.log('edge path undefined', edge);
            return true;
        }
        // console.log('draw edge', edge, probToOpacity(edge.extends_prob), probToWidth(edge.extends_prob))
        edgeGroup.selectAll('.epath')
            .data(edge.path) // 绑定每条边的路径数组
            .enter()
            .append('path')
            .attr('d', d=>{
                d.width = probToWidth(edge.extends_prob);
                d.color = 'black';
                return d.d
            })
            .style("fill", 'none')
            .style("stroke", 'black')
            .style('stroke-opacity', probToOpacity(edge.extends_prob))
            .style('stroke-width', probToWidth(edge.extends_prob))
            .attr('class', 'epath')
            .attr('id', selectorById(edge.name))
            .on('mouseover', function () {
                mouseoverEdge(edge.name);
                tip.show({name: edge.name});
            })
            .on('click', function () {
                highlight_edge(edge.name);
                clickEdge(edge.name);
            })
            .on('mouseout', function () {
                mouseoutEdge(edge.name);
                tip.hide({name: edge.name});
            });
            
        if (!edge.polygon) {
            return true;
        }
        edgeGroup.append('polygon')
            .attr('points', edge.polygon.points)
            .style('stroke', 'none')
            .style('fill', d=>{
                d.color = 'black';
                return 'black'
            })
            .style("fill-opacity", probToOpacity(edge.extends_prob))
            .attr('class', 'epath-polygon')
            .attr('id', selectorById(edge.name) + '_polygon')
            .on('mouseover', function () {
                mouseoverEdge(edge.name);
                tip.show(edge);
            })
            .on('click', function () {
                highlight_edge(edge.name);
                clickEdge(edge.name);
            })
            .on('mouseout', function () {
                mouseoutEdge(edge.name);
                tip.hide(edge);
            });
    });

    let circle;
    let enlarge_ratio = {0: 1, 1: 1.5, 2: 2}[enlarge % 3]
    if (nodeShape == 0)
        circle = matrixg.selectAll('paper').data(graph['nodes']).enter().append('g')
            .each(function(d) {
                let topics, radii;
                if (graph['topic'] == null) {
                    topics = [d.topic];
                    radii = [1];
                } else {
                    topics = [d.influx, graph['topic'], d.efflux].filter(t => t !== undefined);
                    radii = calculateRadii(topics.map(t => d.topicDist[t]));
                }
                // 从外向内绘制同心圆
                for (let i = 0; i < topics.length; i++) {
                    d3.select(this).append('ellipse')
                        .attr('cx', d.x)
                        .attr('cy', d.y)
                        .attr('rx', d.rx * radii[i] * enlarge_ratio)
                        .attr('ry', d.ry * radii[i] * enlarge_ratio)
                        .style("fill", topic2color(topics[i]));
                }
            });
    if(nodeShape == 1)
        circle = matrixg.selectAll('paper').data(graph['nodes']).enter().append('g')
            .each(function(d) {
                let topics, radii;
                if (graph['topic'] == null) {
                    topics = [d.topic];
                    radii = [1];
                } else {
                    topics = [d.influx, graph['topic'], d.efflux].filter(t => t !== undefined);
                    radii = calculateRadii(topics.map(t => d.topicDist[t]));
                }
                // 从外向内绘制同心矩形
                for (let i = 0; i < topics.length; i++) {
                    d3.select(this).append('rect')
                        .attr('x', d.x - d.rx * radii[i] * enlarge_ratio)
                        .attr('y', d.y - d.ry * radii[i] * enlarge_ratio)
                        .attr('width', d.rx * 2 * radii[i] * enlarge_ratio)
                        .attr('height', d.ry * 2 * radii[i] * enlarge_ratio)
                        .style("fill", topic2color(topics[i]));
                }
            });

    if (nodeShape == 2) 
        circle = matrixg.selectAll('paper').data(graph['nodes']).enter().append('g')
            .attr('transform', d => {
                let w = d.rx * 3;
                let h = d.ry * 5;
                return `translate(${d.x - w / 2}, ${d.y - h * 0.4}) scale(${w / bookWidth}, ${h / bookHeight})`;
            })
            .each(function(d) {
                bookPaths.forEach(path => {
                    d3.select(this).append('path')
                        .attr('d', path)
                        .style('fill-opacity', 0.4)
                        .style('fill', updateOutlineColor(d.isKeyPaper, d.citationCount));
                });
            })
    if (nodeShape == 3)
        circle = matrixg.selectAll('paper').data(graph['nodes']).enter().append('g')
            .each(function(d) {
                let topics, radii;
                if (graph['topic'] == null) {
                    topics = [d.topic];
                    radii = [1];
                } else {
                    topics = [d.influx, graph['topic'], d.efflux].filter(t => t !== undefined);
                    radii = calculateRadii(topics.map(t => d.topicDist[t]));
                }
                // 从外向内绘制同心多边形
                for (let i = 0; i < topics.length; i++) {
                    d3.select(this).append('polygon')
                        .attr('points', function(d) {
                            const rx = d.rx * radii[i] * enlarge_ratio;
                            const ry = d.ry * radii[i] * enlarge_ratio;
                            const x = d.x;
                            const y = d.y;
                            return [
                                [x + rx, y].join(','),
                                [x + rx / 2, y + ry].join(','),
                                [x - rx / 2, y + ry].join(','),
                                [x - rx, y].join(','),
                                [x - rx / 2, y - ry].join(','),
                                [x + rx / 2, y - ry].join(',')
                            ].join(' ');
                        })
                        .style("fill", topic2color(topics[i]));
                }
            });

    
    if (!isCollapse && (nodeShape == 0 || nodeShape == 1 || nodeShape == 3))
        circle.style("stroke", d => updateOutlineColor(d.isKeyPaper, d.citationCount))
            .style('stroke-width', d => d.citationCount >= 50? 5: 0);
    
    circle
        .attr('id', d => d.id)
        .attr('class', d => {
            let c = `paper paper-${d.id}`;
            global_paper_field.forEach(field => {
                if (hasTopic(d, field.id)) {
                    c += ` paper-t${field.id}`;
                }
            })
            return c;
        }).on('mouseover', function (d) {
            d3.select(this).attr('cursor', 'pointer');
            tip.show(d);
            if (!highlighted.includes(d.id)) {
                // console.log('node!', id, graph['contextEdges'])
                d3.selectAll(`.paper-${d.id}`).style('stroke', 'red').style('stroke-width', 5);
                
                let flux_pairs = [];
                Object.entries(graph['combinedContextEdges']).forEach(([edgeId, value]) => {
                    if (edgeId.indexOf(d.id) !== -1) {
                        mouseoverEdge(edgeId, width=null);
                        let dir = edgeId[0] == 'l'? 'l': 'r';
                        Object.keys(value['topics']).forEach(topic => {
                            flux_pairs.push([dir, topic]);
                        });
                    }
                });
                console.log('flux_pairs', flux_pairs);
                mouseOverFluxes(flux_pairs);
            }
        })
        .on('click', function (d) {
            console.log('click node', d.id);
            highlight_node(d.id, true, true);
        })
        .on('mouseout', function (d) {
            tip.hide(d);
            if (!highlighted.includes(d.id)) {
                d3.selectAll(`.paper-${d.id}`).style('stroke-width', 0);
                Object.keys(graph['combinedContextEdges']).forEach(edgeId => {
                    if (edgeId.indexOf(d.id) !== -1) {
                        mouseoutEdge(edgeId);
                    }
                });
                mouseleaveFlux();
            }
        });

    node2size = function(d) {
        if (!isCollapse) return 30;
        let ret = d.citationCount < 50? 30: (d.citationCount < 100? 40: 50);
        // return ret;
        return Math.sqrt(ret) * 7;
    }
    matrixg.selectAll('.text1')
        .data(graph['nodes'])
        .enter().append('text')
        .attr('x', d => d.x)
        .attr('y', d => d.y + node2size(d) / 3)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Archivo Narrow')
        .attr('font-size', d => node2size(d))
        .attr('class', 'text1')
        .attr("pointer-events", "none")
        .text(d => String(d.citationCount));
        // !isCollapse || d.citationCount>=10? String(d.citationCount): ''
        
        // .each(function(d) {
        //     // let text = d.text === undefined? d.text1 + '\n' + d.text2 : String(d.citationCount)
        //     let text = d.label;
        //     var lines = text.split('\n');
        //     for (var i = 0; i < lines.length; i++) {
        //         d3.select(this).append('tspan')
        //             .attr('x', d.x)
        //             .attr('dy', 10)  // Adjust dy for subsequent lines
        //             .text(lines[i]);
        //     }
        // });
    
    

    graph['svg'] = svgElement;
    if (graph['topic'] == null) {
        // 添加背景坐标轴
        let bbox = {};
        bbox.x = parseFloat(graph['viewBox'].split(' ')[0]);
        bbox.width = parseFloat(graph['viewBox'].split(' ')[2]);
        id2attr = graph['id2attr'];

        let prefix = 'year';
        let maxY = id2attr[prefix + maxYear].y;
        for (let year = maxYear + 1; year < maxYear + yearGrid; year++) {
            maxY += id2attr[prefix + maxYear].y - id2attr[prefix + (maxYear-1)].y;
            id2attr[prefix + year] = {"y": maxY};
        }
        var y = d3.scaleOrdinal()
            .domain(d3.range(minYear, maxYear + yearGrid))
            .range(d3.range(minYear, maxYear + yearGrid).map(year => id2attr[prefix + year].y));
        
        // minYear, maxYear
        var years = d3.range(minYear, maxYear + 1);
        var tickValues = years.filter(year => year % yearGrid === 0);
        let streamSize = bbox.width / 3;

        Tooltip = matrixg
            .append("text")
            .attr("x", bbox.x + bbox.width + 80)
            .attr("y",  y(minYear))
            .attr('font-family', 'Archivo Narrow')
            .style("opacity", 0)
            .style("font-size", 48)
        matrixg.append("g")
            .call(d3.axisLeft(y).tickSize(- bbox.width - streamSize).tickValues(tickValues))
            .select(".domain").remove();
        matrixg.selectAll(".tick line")
            .attr("stroke", "#b8b8b8")
        matrixg.selectAll(".tick text")
            .attr("x", bbox.x + bbox.width + 60)
            .attr("dy", 10)
            .attr('font-family', 'Archivo Narrow')
            .style("font-size", 48)

        let context = {};
        graph['nodes'].forEach(d=>{
            if (context[d.topic] == undefined) {
                context[d.topic] = {"total": 0};
                for (let year of years) context[d.topic][year] = [];
            }
            context[d.topic][d.year].push(d);
            context[d.topic]["total"] += 1;
        graph['context'] = context;
        })
        drawStreamgraph(matrixg, context, y, [bbox.x + bbox.width + 80, bbox.x + bbox.width + streamSize], 'm');
    }
}


function countKeywords(text, keywords) {
    // 初始化一个对象来存储关键词的计数
    const keywordCount = {};
    
    // 将所有关键词初始化为0
    keywords.forEach(keyword => {
        keywordCount[keyword] = 0;
    });

    // 将输入的文本转换为小写并分割为单词数组
    const words = text.toLowerCase().split(/\W+/);

    // 遍历单词数组，统计每个关键词的出现次数
    words.forEach(word => {
        if (keywordCount.hasOwnProperty(word)) {
            keywordCount[word]++;
        }
    });

    return keywordCount;
}

function calculateTFIDF(text, keywords, allDocuments) {
    // 初始化一个对象来存储关键词的TF-IDF值
    const tfidfValues = {};
    
    // 初始化一个对象来存储关键词的计数
    const keywordCount = {};
    keywords.forEach(keyword => {
        keywordCount[keyword] = 0;
    });

    // 将输入的文本转换为小写并分割为单词数组
    const words = text.toLowerCase().split(/\W+/);
    const totalWords = words.length;

    // 计算TF（词频）
    words.forEach(word => {
        if (keywordCount.hasOwnProperty(word)) {
            keywordCount[word]++;
        }
    });

    const tfValues = {};
    keywords.forEach(keyword => {
        tfValues[keyword] = keywordCount[keyword] / totalWords;
    });

    // 计算每个文档中包含的关键词集合，用于计算IDF
    const docContainsKeyword = {};
    keywords.forEach(keyword => {
        docContainsKeyword[keyword] = 0;
    });

    allDocuments.forEach(doc => {
        // type doc is Set?
        if (typeof doc === 'string') doc = new Set(doc.toLowerCase().split(/\W+/));
        keywords.forEach(keyword => {
            if (doc.has(keyword)) {
                docContainsKeyword[keyword]++;
            }
        });
    });

    // 计算IDF（逆文档频率）
    const documentCount = allDocuments.length;
    const idfValues = {};
    keywords.forEach(keyword => {
        idfValues[keyword] = Math.log(documentCount / (docContainsKeyword[keyword] + 1));
    });

    // 计算TF-IDF
    keywords.forEach(keyword => {
        tfidfValues[keyword] = tfValues[keyword] * idfValues[keyword];
    });

    return tfidfValues;
}

function isNull(value) {
    return value == undefined || value == null || value == 'null' || value == '' || value == NaN;
}

function sortTopicsBy(topics, keywordCount) {
    // 将话题字符串分割为单词数组
    const topicArray = topics.split(' ');
    
    // 根据关键词计数进行排序
    topicArray.sort((a, b) => {
        const countA = keywordCount[a] || 0;
        const countB = keywordCount[b] || 0;
        return countB - countA; // 降序排列
    });

    // 将排序后的数组重新拼接成字符串
    return topicArray.join(' ');
}

function generateTTM() {
    TTM = {};
    TTMEdges = {};
    // 填充矩阵（因为是外部转移矩阵，不计相同话题的转移）
    // 注意，存在部分话题只有转入，没有转出，所以不再keys里面
    // 注意TTM相同的node只取一个，不是m*n，而是m+n

    function addEdge(src, tgt) {
        if (src == tgt) return;
        if(!TTM[src]) TTM[src] = {};
        if(!TTM[src][tgt]) TTM[src][tgt] = 0;
        TTM[src][tgt]++;
    }

    global_edges.forEach(edge => {
        let sourceNode = global_nodes.find(node => node.id === edge.source);
        let targetNode = global_nodes.find(node => node.id === edge.target);
        let sourceTopicList = getTopicList(sourceNode);
        let targetTopicList = getTopicList(targetNode);
        // 去除相同元素，不能相继filter
        let sourceTopicListCopy = [...sourceTopicList];
        sourceTopicList = sourceTopicList.filter(topic => !targetTopicList.includes(topic));
        targetTopicList = targetTopicList.filter(topic => !sourceTopicListCopy.includes(topic));
        
        sourceTopicList.forEach(src => {
            addEdge(src, targetNode.topic);
        })
        targetTopicList.forEach(tgt => {
            addEdge(sourceNode.topic, tgt);
        })
    });
}

function getAllTopics(matrix) {
    let topics = new Set();
    for (let src in matrix) {
        for (let tgt in matrix[src]) {
            topics.add(src);
            topics.add(tgt);
        }
    }
    let arr = Array.from(topics);
    arr.sort((a, b) => a - b);
    return arr;
}
    
// 计算解决方案的成本
function calculateCost(matrix, solution) {
    let cost = 0;
    solution.forEach((topic, i) => {
        solution.forEach((innerTopic, j) => {
            const distance = Math.abs(i - j);
            if (matrix[topic] && matrix[topic][innerTopic])
                cost += matrix[topic][innerTopic] * distance; // 假设成本与距离成正比
        });
    });
    return cost;
}

// 接受概率
function acceptanceProbability(currentCost, newCost, temperature) {
    if (newCost < currentCost) {
        return 1.0;
    }
    return Math.exp((currentCost - newCost) / temperature);
}

function loadTopicGraph(STopic) {
    // global_nodes.map(d=>Object.keys(d.topicDist).length)
    // new Set(global_nodes.map(d=>d.topic)) // 有多少个topic
    // 1. 将所有topicDist = {}的节点设置为最后一个topic
    // 2. 将所有topic总数小的节点设置为最后一个topic
    graph = {}
    graph['topic'] = STopic;
    graph['nodes'] = JSON.parse(JSON.stringify(global_nodes));
    graph['edges'] = JSON.parse(JSON.stringify(global_edges));

    if (STopic !== null) {
        graph['nodes'] = graph['nodes'].filter(d => hasTopic(d, STopic));
        // global_paper_field.find(d => d.id == STopic).size = graph['nodes'].length;
        // if (graph['nodes'].length == 0) {
        //     console.log('No node found in the selected topic', STopic);
        //     return;
        // }

        let nodeSet = new Set(graph['nodes'].map(node => node.id));
        graph['edges'] = graph['edges'].filter(edge => nodeSet.has(edge.source) && nodeSet.has(edge.target));
        let edgeStrs = graph['edges'].map(edge => edge.source + '->' + edge.target); 

        let G = new Graph();
        graph['nodes'].forEach(node => {
            G.addNode(node.id, node);
        });
        graph['edges'].forEach(edge => {
            G.addEdge(edge.source, edge.target);
        });
        for (let year = minYear; year <= maxYear; year++) {
            G.addNode(`l${year}`, {year: year});
            G.addNode(`r${year}`, {year: year});
        }
        for (let year = minYear; year < maxYear; year++) {
            G.addEdge(`l${year}`, `l${year+1}`);
            G.addEdge(`r${year}`, `r${year+1}`);
        }

        // 处理上下文边
        graph['contextEdges'] = {};
        global_edges.forEach(edge => {
            if (!edgeStrs.includes(`${edge.source}->${edge.target}`)) {
                let sourceNode = global_nodes.find(node => node.id === edge.source);
                let targetNode = global_nodes.find(node => node.id === edge.target);

                if (hasTopic(sourceNode, STopic)) {
                    let key = `${sourceNode.id}->r${targetNode.year}`;
                    if (!graph['contextEdges'][key]) graph['contextEdges'][key] = [];
                    graph['contextEdges'][key].push(edge);
                    G.addEdge(sourceNode.id, `r${targetNode.year}`);
                }
                if (hasTopic(targetNode, STopic)) {
                    let key = `l${sourceNode.year}->${targetNode.id}`;
                    if (!graph['contextEdges'][key]) graph['contextEdges'][key] = [];
                    graph['contextEdges'][key].push(edge);
                    G.addEdge(`l${sourceNode.year}`, targetNode.id);
                }
            }
        });

        graph['virtualEdges'] = [];
        let components = G.findConnectedComponents();
        components.forEach(component => {
            let node = G.findLastNodeInComponent(component);
            if (node) {
                // console.log('findLastNodeInComponent', G.nodeProperties.get(node));
                let nodeYear = G.nodeProperties.get(node).year;
                graph['virtualEdges'].push(`${node}->r${nodeYear}`);
            }
        });
    }
    
    graph['paper_field'] = [];    //该学者个人的field信息
    graph['nodes'].forEach(node => {
        let topic = node.topic;
        if (isNull(topic)) return true;
        let ix = graph['paper_field'].findIndex(d => d.id == topic);
        if (ix == -1) {
            // 如果没有统计，在paper_field中新建k-v
            // console.log(topic)
            graph['paper_field'].push({
                id: topic,
                num: 1,
                name: globalFields[topic],
            });
        } else {
            graph['paper_field'][ix].num += 1;
        }
    })

    topic2graph[STopic] = graph
}

function hasTopic(node, topic) {
    // if (node.hasOwnProperty('topicDist'))
    //     return Object.keys(node['topicDist']).includes(topic);
    // return node['topic'] == topic;
    // console.log('hasTopic: node', node, 'topic', topic)
    if (node == undefined) {
        console.log('hasTopic: node', node, 'topic', topic)
    }

    let threshold = filterConfig['topic_prob'];
    if (parseInt(node.topic) == topic) return true;
    if (node.hasOwnProperty('topicDist') && node.topicDist[topic] >= threshold) return true;
    return false;
}

function loadGlobalData() {
    let node_prob = filterConfig["node_prob"];
    let edge_prob = filterConfig["edge_prob"];
    let filteredEdges = authorData['edges'].filter(d => d.extends_prob >= edge_prob);
    let filteredNodes = authorData['nodes'].filter(d => d.isKeyPaper >= node_prob && d.year > 1900);
    
    filteredNodes = JSON.parse(JSON.stringify(filteredNodes));
    filteredEdges = JSON.parse(JSON.stringify(filteredEdges));

    let topics = new Set(filteredNodes.map(d => d.topic));
    if (topics.length == 0) {
        console.log('No topics found in the data');
        return;
    }
    if (filteredNodes.length == 0) {
        print('No node found in the data! Try to adjust the node probability threshold');
        return;
    }
    
    let ln = filteredNodes.length, le = filteredEdges.length;
    let modeValue = document.getElementById('mode').value;
    let surveyValue = document.getElementById('remove-survey').value;
    
    if (surveyValue == '1') filteredNodes = filteredNodes.filter(node => !node.survey);
    let lnr = filteredNodes.length;
    // Compute indegree, outdegree, and total degree
    let indegree = {}, outdegree = {}, alldegree = {};
    // set other graph['nodes'] in filteredNodes outdegree/indegree =0
    filteredNodes.forEach(node => {
        outdegree[node.id] = 0;
        indegree[node.id] = 0;
        alldegree[node.id] = 0;
    })
    let nodeSet = new Set(filteredNodes.map(node => node.id));
    
    let connectedEdges = [];
    filteredEdges.forEach(edge => {
        let src = String(edge.source);
        let tgt = String(edge.target);
        if (nodeSet.has(src) && nodeSet.has(tgt)) {
            outdegree[src] += 1;
            indegree[tgt] += 1;
            alldegree[src] += 1;
            alldegree[tgt] += 1;
            connectedEdges.push(edge);
        }
    });

    if (modeValue == '1') {
        // remove isolated
        filteredNodes = filteredNodes.filter(node => alldegree[node.id] > 0);
    } else if (modeValue == '2') {
        // partially remove, high citationCount papers are not removed
        filteredNodes = filteredNodes.filter(node => alldegree[node.id] > 0 || node.citationCount >= 50);
    }
    filteredEdges = connectedEdges;

    // 注意year的计算在selectedTopic之前，但是在过滤之后
    minYear = Math.min(...filteredNodes.map(node => node.year));
    maxYear = Math.max(...filteredNodes.map(node => node.year));

    console.log('original data:', authorData, 
        '#node:', authorData['nodes'].length, ln, lnr, filteredNodes.length, 
        '#edge:', authorData['edges'].length, le, filteredEdges.length);
    console.log(filteredNodes, filteredEdges);
    
    //  / ${lnr}(rm survey)     rm isolated) / ${ln}(       rm unconnected) / ${le}(
    $('#node-num').text(`${filteredNodes.length} (filter) / ${authorData['nodes'].length}`);
    $('#edge-num').text(`${filteredEdges.length} (filter) / ${authorData['edges'].length}`);
    $("#node-value").text(filteredNodes.length);
    $("#edge-value").text(filteredEdges.length);
    
    global_nodes = filteredNodes;
    global_edges = filteredEdges.map(edge => {
        return {
            name: `${edge.source}->${edge.target}`,
            ...edge
        };
    });

    global_nodes = global_nodes.map(d=>{
        if (d.topicDist === undefined || Object.keys(d.topicDist)==0) {
            d.topic = globalFields.length - 1;
        }
        // 注意global_nodes的topic可能有更新，所以不能在这里更新paperID2topic
        // paperID2topic[d.id] = d.topic;
        paperID2year[d.id] = d.year;
        return d;
    });

    global_paper_field = {};    //该学者个人的field信息
    Object.keys(globalFields).forEach(topicId => {
        global_paper_field[topicId] = {
            id: topicId,
            num: 0,
            size: 0,
            name: globalFields[topicId],  // 直接取 name
        };
    });

    global_nodes.forEach(node => {
        let topic = parseInt(node.topic || 0);
        let topicDist = Object.keys(node.topicDist || {});

        global_paper_field[topic].num += 1;
        topicDist.forEach(field => {
            if (hasTopic(node, field)) global_paper_field[field].size += 1;
        });
    })
    global_paper_field = Object.values(global_paper_field);
    
    global_paper_field.sort(op('size'));
    console.log('original global_paper_field', JSON.parse(JSON.stringify(global_paper_field)))
    let minSize = Math.max(5, (global_paper_field[10] || {size: 0}).size);    // 话题的最小值是5
    global_paper_field = global_paper_field.filter(item => item.size >= minSize);
    console.log('global_paper_field parse complete', JSON.parse(JSON.stringify(global_paper_field)), minSize);
    
    let time = new Date().getTime();
    let all_documents = global_nodes.map(d=>[d.name,d.name,d.name, d.abstract].join(' '));
    let all_documents_set = all_documents.map(doc => new Set(doc.toLowerCase().split(/\W+/)))
    let text = all_documents.join(' ');
    let keywords = global_paper_field.map(d=>d.name).join(' ').split(' ');
    global_keywords = countKeywords(text, keywords);
    // global_paper_field.forEach(d=>d.name=sortTopicsBy(d.name, global_keywords))
    global_paper_field.forEach(d=> {
        d.text = global_nodes.filter(node => hasTopic(node, d.id)).map(d => [d.name,d.name,d.name, d.abstract].join(' ')).join(' ');
        d.tfidf = calculateTFIDF(d.text, d.name.split(' '), all_documents_set);
        d.name = sortTopicsBy(d.name, d.tfidf);
    })
    console.log('calculateTFIDF complete', new Date().getTime()-time);

    if (global_paper_field.length == 0) {
        alert('No topic found in the data! Please change another scholar.');
        return;
    }
    let sizes = global_paper_field.map(d=>d.size);
    let totalSize = sizes.reduce((a, b) => a + b, 0);
    minSize = Math.min(...sizes);
    let maxSize = Math.max(...sizes);
    // let colors = [];
    // let cumulativeSize = 0;
    
    // for (let i = 0; i < global_paper_field.length; i++) {
    //     let size = global_paper_field[i].size;
    //     let startHue = (cumulativeSize / totalSize) * 360;
    //     let endHue = ((cumulativeSize + size) / totalSize) * 360;
    //     cumulativeSize += size;
        
    //     let hue = (startHue * 2 + endHue) / 3;
    //     colors.push(hsvToColor([hue, 1, 1]));
    // }
    let colors = [
        "#fdb462", // Orange
        "#b3de69", // Light Green
        "#fccde5", // Pink
        "#8dd3c7", // Teal
        "#ffffb3", // Yellow
        "#bebada", // Lavender
        "#fb8072", // Coral
        "#80b1d3", // Sky Blue
        "#bc80bd", // Purple
        "#ccebc5", // Light Teal
        
        "#a6cee3", // Light Blue
        "#33a02c", // Dark Green
        "#e31a1c", // Red
        "#fdbf6f", // Peach
        "#8c510a", // Dark Brown
        "#d73027", // Bright Red
    ];
    colors = colors.map(d=>d3.hsv(d3.color(d)));
    console.log(colors);

    // global_colors = {}
    
    global_paper_field.forEach((topic, i)=>{
        // let shortName = topic.name.split(' ').slice(0, 3).join(' ');
        // if (topic.size / maxSize < 0.2) {
        //     shortName = topic.name.split(' ').slice(0, 2).join(' ');
        // }
        let length = topic.size / maxSize < 0.2? 2: 3;
        let names = [];
        console.log('names', names)
        let ix = 0;
        while (names.length < length && ix < topic.name.split(' ').length) {
            let name = topic.name.split(' ')[ix];
            console.log(ix, name)
            let i=0;
            for (; i < names.length; i++) {
                if (names[i].includes(name)) break;
                else if (name.includes(names[i])) {names[i] = name; break;}
            }
            if (i == names.length) names.push(name);
            ix += 1;
        }

        topic.shortName = names.join(' ');
        
        if (!global_colors.hasOwnProperty(topic.id)) {
            ix = Object.entries(global_colors).length % colors.length;
            global_colors[topic.id] = colors[ix];
        }
        topic.color = global_colors[topic.id];
    
    })
    global_nodes.forEach(node => {
        // 由于最高topic可能已经不在global_paper_field中，所以需要重新计算
        let topics = [parseInt(node.topic), ...Object.keys(node.topicDist)];
        topics = topics.filter(topic => global_paper_field.find(d => d.id == topic));
        if (topics.length == 0) {
            // console.log('no topic found for node:', node);
            node.topic = null;
        } else {
            let topic = topics[0];
            node.topic = topic;
        }
        // 一定要更新paperID2topic
        paperID2topic[node.id] = node.topic;
    })

    let ratio = Math.pow(global_nodes.length / 10, 1/12);
    prismRadius = basePrismRadius * ratio;
    prismScale = basePrismScale / ratio;
    console.log('prismRadius:', prismRadius, 'prismScale:', prismScale);

    console.log('global_paper_field sort complete', JSON.parse(JSON.stringify(global_paper_field)));
    
    generateTTM();
    adjacentMatrix = getAdjacentMatrix();
    // 加载所有话题图
    loadTopicGraph(null);
    global_paper_field.forEach(d => {
        loadTopicGraph(d.id);
    })
}

function op(key){
    return function(value1, value2){
    // 对属性的访问，obj["key"]与obj.key都是可以的，不过，如果key值并不确定，而是一个变量的时候，则只能通过obj[key]的方式访问。
        var val1 = value1[key];//这块用.key数组没有发生变化
        var val2 = value2[key];
        return val2 - val1;
    }
}

function getTopicList(node) {
    if (node.hasOwnProperty('topicDist')) {
        let topicList = [];
        let threshold = filterConfig['topic_prob'];
        for (let key in node.topicDist) {
            if (node.topicDist[key] >= threshold)  topicList.push(key);
        }
        if (!topicList.includes(node.topic))  topicList.push(node.topic);
        return topicList;
    }
    return [node.topic];
}

function getAdjacentMatrix(arrangement=null) {
    if (arrangement === null) {
        arrangement = global_paper_field.map(d => d.id);
    }
    let matrix = [];
    arrangement.forEach((src, i) => {
        matrix.push([]);
        arrangement.forEach((tgt, j) => {
            matrix[i].push(TTM[src] && TTM[src][tgt] ? TTM[src][tgt] : 0);
        });
    }
    );
    return matrix;
}

function polarToCartesian(radius, angle) {
    return {
        x: radius * Math.cos(angle - Math.PI / 2),
        y: radius * Math.sin(angle - Math.PI / 2)
    };
}

function lineIntersection(angle, point1, point2) {
    // console.log('intersect', angle, point1, point2);

    // 通过给定角度计算直线的斜率和截距
    const m1 = Math.tan(angle - Math.PI / 2);
    const b1 = 0;  // 给定角度的直线通过原点

    // 通过两个点计算另一条直线的斜率和截距
    const m2 = (point2.y - point1.y) / (point2.x - point1.x);
    const b2 = point1.y - m2 * point1.x;

    // 如果两条直线平行，则没有交点
    if (m1 === m2) {
        return null;
    }

    // 计算交点
    const intersectX = (b2 - b1) / (m1 - m2);
    const intersectY = m1 * intersectX;

    // console.log('intersect', intersectX, intersectY);

    return {
        x: intersectX,
        y: intersectY
    };
}

function sumRowsAndColumns(matrix) {
    let rowSums = matrix.map(row => row.reduce((a, b) => a + b, 0));
    let colSums = matrix[0].map((_, colIndex) => matrix.reduce((sum, row) => sum + row[colIndex], 0));

    return { rowSums, colSums }; // 返回一个对象
}

function adjustWeight(weights) {
    let minimalRatio = 1 / weights.length / 2; // 最小比例
    // 定义一个函数来判断是否满足条件
    function satisfiesCondition(alpha) {
        let newWeights = weights.map(weight => weight + alpha);
        let newTotalWeight = d3.sum(newWeights);
        return newWeights.every(weight => (weight / newTotalWeight) > minimalRatio);
    }
    // 采用二分查找法找到满足条件的最小 alpha
    function findAlpha() {
        let left = 0, right = 1000; // 初始化搜索范围
        let precision = 1e-6;      // 精度设置

        while ((right - left) > precision) {
            let mid = (left + right) / 2;
            if (satisfiesCondition(mid)) right = mid;
            else left = mid;
        }
        return left; // 或者 return right，最终两者会趋近
    }
    let alpha = findAlpha();
    return weights.map(weight => weight + alpha);
}

function init_chord(isPolygenView=false, 
        allowInteraction=true, 
        drawRibbon=true,
        outonly=true,
        allowReaction=true
    ) {
    // 创建一个无主的SVG元素
    let width = prismRadius * 2;
    let height = width;
    let svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgElement.setAttribute("width", width);
    svgElement.setAttribute("height", height);
    svgElement.setAttribute("viewBox", [-width / 2, -height / 2, width, height]);

    let svg = d3.select(svgElement)
        .attr("style", "width: 100%; height: auto; font: 10px Archivo Narrow;");


    let outerRadius = Math.min(width, height) * 0.5;
    if (!isPolygenView) outerRadius*=0.8
    let innerRadius = outerRadius - 20;
    let { rowSums: outdegree, colSums: indegree } = sumRowsAndColumns(adjacentMatrix); // 解构赋值
    console.log('loadData chord', adjacentMatrix, outdegree, indegree);

    let sizes = global_paper_field.map(d => d.size);
    let names = global_paper_field.map(d => d.shortName),
        colors = global_paper_field.map(d => topic2color(d.id));
    
    // 使用outdegree而不是size/num作为权重
    let originalWeights = outonly? outdegree: sizes;
    let weights = JSON.parse(JSON.stringify(originalWeights));
    if (isPolygenView) weights = adjustWeight(weights);

    let degree = outdegree.map((d, i) => d + indegree[i]);

    let totalWeight = d3.sum(weights);
    let interval = 0;
    if (!isPolygenView){
        interval = totalWeight / 100;
        totalWeight += interval * names.length;
    }
    console.log(weights, totalWeight, interval);

    console.log('degree', degree);
    const angleScale = d3.scaleLinear().domain([0, totalWeight]).range([0, 2 * Math.PI]);
    let cumulativeAngle = 2 * Math.PI;
    const nodeAngles = weights.map((weight, ix) => {
        const endAngle = cumulativeAngle;
        cumulativeAngle -= angleScale(weight);
        const startAngle = cumulativeAngle;
        cumulativeAngle -= angleScale(interval);
        return {
            index: ix,
            startAngle: startAngle,
            endAngle: endAngle,
            weight: weight
        };
    });

    const chords = [];
    let angles = JSON.parse(JSON.stringify(nodeAngles));
    adjacentMatrix.forEach((row, i) => {
        row.forEach((value, j) => {
            if (outonly) {
                let rvalue = adjacentMatrix[j][i]
                if (i < j && value + rvalue > 0) {
                    const source = nodeAngles[i];
                    const target = nodeAngles[j];
                    let sourceAngle = angleScale(value / originalWeights[i] * source.weight);
                    let targetAngle = angleScale(rvalue / originalWeights[j] * target.weight);
                    chords.push({
                        source: {
                            index: i,
                            startAngle: source.startAngle,
                            endAngle: source.startAngle + sourceAngle,
                            value: value
                        },
                        target: {
                            index: j,
                            startAngle: target.endAngle - targetAngle,
                            endAngle: target.endAngle,
                            value: rvalue
                        }
                    });
                    source.startAngle += sourceAngle;
                    target.endAngle -= targetAngle;
                }

            } else if (value > 0) {
                const source = nodeAngles[i];
                const target = nodeAngles[j];
                chords.push({
                    source: {
                        index: i,
                        startAngle: source.startAngle,
                        endAngle: source.startAngle + angleScale(value / degree[i] * source.weight),
                        value: value
                    },
                    target: {
                        index: j,
                        startAngle: target.endAngle - angleScale(value / degree[j] * target.weight),
                        endAngle: target.endAngle,
                        value: value
                    }
                });
                source.startAngle += angleScale(value / degree[i] * source.weight);
                target.endAngle -= angleScale(value / degree[j] * target.weight);
            }
        });
    });
    angles.forEach((d, i) => d.splitAngle = nodeAngles[i].startAngle)
    console.log('angles', angles)
    console.log('chords', chords)

    function highlight_arc(index) {
        chord_arcs.style("opacity", defaultOpacity / 3);
        chord_ribbons.style("opacity", defaultOpacity / 3);
    
        chord_arcs.filter(`.chord-arc-${index}`).style("opacity", 1);
        chord_ribbons.filter(`.chord-ribbon-from-${index}`).style("opacity", 1);
        chord_ribbons.filter(`.chord-ribbon-to-${index}`).style("opacity", 1);
    
        let s = `${names[index]}(#paper: ${sizes[index]}, out: ${outdegree[index]}, in: ${indegree[index]})`
        tip.show({name: s})
    }

    function highlight_ribbon(d) {
        const sourceIndex = d.source.index;
        const targetIndex = d.target.index;
        // 将所有元素透明度设为默认值的一半 .transition()
        chord_arcs.style("opacity", defaultOpacity / 3);
        chord_ribbons.style("opacity", defaultOpacity / 3);
    
        // 高亮特定元素
        chord_arcs.filter(`.chord-arc-${sourceIndex}, .chord-arc-${targetIndex}`)
            .style("opacity", 1);
        chord_ribbons.filter(`.chord-ribbon-${sourceIndex}-${targetIndex}`)
            .style("opacity", 1);

        let s = `${names[d.source.index]}(${d.source.value}) ⇒ ${names[d.target.index]}`
        if (outonly) s = `${names[d.source.index]}(${d.source.value}) ⇔ ${names[d.target.index]}(${d.target.value}) `
        tip.show({name: s})
    }
    
    function mouseout() {
        // 将所有元素的透明度恢复为默认值
        if (currentIndex != -1) {
            chord_arcs.style("opacity", defaultOpacity / 3);
            chord_ribbons.style("opacity", defaultOpacity / 3);
            chord_arcs.filter(`.chord-arc-${currentIndex}`).style("opacity", 1);
            chord_ribbons.filter(`.chord-ribbon-from-${currentIndex}, .chord-ribbon-to-${currentIndex}`).style("opacity", 1);
        } else {
            chord_arcs.style("opacity", defaultOpacity);
            chord_ribbons.style("opacity", defaultOpacity);
        }

        tip.hide()
    }

    if (outonly) {
        let defs = svg.append("defs");
        chords.forEach((d, i) => {
            let gradient = defs.append("linearGradient")
                .attr("id", `chordgradient-${i}`)
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", Math.cos(d.source.startAngle - Math.PI / 2) * innerRadius)
                .attr("y1", Math.sin(d.source.startAngle - Math.PI / 2) * innerRadius)
                .attr("x2", Math.cos(d.target.startAngle - Math.PI / 2) * innerRadius)
                .attr("y2", Math.sin(d.target.startAngle - Math.PI / 2) * innerRadius);
        
            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", colors[d.source.index]);
        
            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", colors[d.target.index]);
        });
    }

    if (isPolygenView) {
        // 计算多边形的顶点。添加多边形蒙版。
        const polygonPoints = angles.map(d => {
            const startPoint = polarToCartesian(innerRadius - 5, d.startAngle);
            const endPoint = polarToCartesian(innerRadius - 5, d.endAngle);
            return [endPoint, startPoint];
        }).flat();

        const polygonChunks = angles.map(d => {
            const innerStart = polarToCartesian(innerRadius, d.startAngle);
            const innerEnd = polarToCartesian(innerRadius, d.endAngle);
            const outerStart = polarToCartesian(outerRadius, d.startAngle);
            const outerEnd = polarToCartesian(outerRadius, d.endAngle);
            const intersect = lineIntersection(d.splitAngle, innerStart, innerEnd);
            let ret = [innerStart, innerEnd, outerEnd, outerStart];

            Object.assign(ret, {
                radius: Math.sqrt(intersect.x ** 2 + intersect.y ** 2),
                splitAngle: d.splitAngle,
            })
            return ret;
        });
        
        // 创建蒙版
        const mask = svg.append("defs")
            .append("mask")
            .attr("id", "polygon-mask");
        
        mask.append("polygon")
            .attr("points", polygonPoints.map(d => `${d.x},${d.y}`).join(" "))
            .attr("fill", "white");
        
        // 给svg添加一个背景
        svg.append("rect")
            .attr("x", -width / 2)
            .attr("y", -height / 2)
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "white")
            .attr("mask", "url(#polygon-mask)");
        // 应用蒙版到chords
        if (drawRibbon)
        svg.append("g")
            .attr("fill-opacity", defaultOpacity)
            .selectAll("path")
            .data(chords)
            .join("path")
            .attr("mask", "url(#polygon-mask)")  // 应用蒙版
            .style("mix-blend-mode", "multiply")
            // .attr("fill", d => colors[d.source.index])
            .attr("fill", (d, i) => outonly? `url(#chordgradient-${i})`: colors[d.source.index])
            .attr('class', d => `chord-ribbon chord-ribbon-from-${d.source.index} chord-ribbon-to-${d.target.index} chord-ribbon-${d.source.index}-${d.target.index}`)
            .attr("d", d3.ribbon()
                .radius(innerRadius - 5)
            )
            .on("mouseover", allowInteraction? highlight_ribbon: null)
            .on("mouseout", allowInteraction? mouseout: null)
            .append("title")
            .text(d => `\n${d.target.value} ${names[d.source.index]} → ${names[d.target.index]}`);
        
        polygonChunks.forEach((chunk, ix) => {
            // console.log('chunk', chunk)
            svg.append("polygon")
                .style("opacity", defaultOpacity)
                .attr('class', 'chord-arc chord-arc-' + ix)
                .attr("points", chunk.map(d => `${d.x},${d.y}`).join(" "))
                .attr("fill", d => {
                    let c = colors[ix];
                    return hsvToColor([c.h, c.s, c.v], 0.8)
                })
                .on("mouseover", allowInteraction? d=>highlight_arc(ix): null)
                .on("mouseout", allowInteraction? mouseout: null);
        });
    } else {
        const group = svg.append("g")
            .selectAll("g")
            .data(angles)
            .join("g");

        group.append("path")
            .attr("fill", d => {
                let c = colors[d.index];
                return hsvToColor([c.h, c.s, c.v], 0.8)
            })
            .attr("d", d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(d=>{
                    if (!outonly) return outerRadius;
                    let size = global_paper_field.map(d => d.size)[d.index];
                    return innerRadius + size;
                })
                .startAngle(d => d.startAngle)
                .endAngle(d => d.endAngle)
            )
            .style("opacity", defaultOpacity)
            .attr('class', d => 'chord-arc chord-arc-' + d.index)
            .on("mouseover", allowInteraction? d=> highlight_arc(d.index): null)
            .on("mouseout", allowInteraction? mouseout: null);
        
        group.append("text")
            .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr("dy", ".35em")
            .attr("transform", d => `
                rotate(${(d.angle * 180 / Math.PI - 90)})
                translate(${outerRadius})
                ${(d.angle > Math.PI ? "rotate(180)" : "")}
            `)
            .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
            .text(d => names[d.index].split(' ')[0])
            .style("font-size", d=>Math.cbrt(sizes[d.index]) * 20 + 'px')
            .style("fill", "#000");


        if (!outonly)
        group.append("path")
            .attr("fill", d => {
                let c = colors[d.index];
                return hsvToColor([c.h, c.s, c.v], 0.8)
            })
            .attr("d", d3.arc()
                .innerRadius(innerRadius-10)
                .outerRadius(outerRadius+10)
                .startAngle(d => d.splitAngle - 0.003)
                .endAngle(d => d.splitAngle + 0.003)
            )
            .attr('class', d => 'chord-arc chord-arc-' + d.index)
            .on("mouseover", allowInteraction? d=> highlight_arc(d.index): null)
            .on("mouseout", allowInteraction? mouseout: null);
        
        if (drawRibbon)
        svg.append("g")
            .attr("opacity", defaultOpacity)
            .selectAll("path")
            .data(chords)
            .join("path")
            .style("mix-blend-mode", "multiply")
            .attr('class', d => `chord-ribbon chord-ribbon-from-${d.source.index} chord-ribbon-to-${d.target.index} chord-ribbon-${d.source.index}-${d.target.index}`)
            .attr("fill", (d, i) => outonly? `url(#chordgradient-${i})`: colors[d.source.index])
            .attr("d", d3.ribbon()
                .radius(innerRadius - 5)
            )
            .on("mouseover", allowInteraction? highlight_ribbon: null)
            .on("mouseout", allowInteraction? mouseout: null)
        
    }

    // 每次生成新的SVG元素时，我们都需要更新选择器
    return svgElement;
}


async function saveall() {
    let svgDataList = [];
    const svgElement2 = document.querySelector('#tagcloud svg');
    let svgData2 = new XMLSerializer().serializeToString(svgElement2);
    svgDataList.push(svgData2);
    
    const sortedData = global_paper_field.sort((a, b) => b.size - a.size);
    sortedData.forEach(data => {
        topic = data.id;
        console.log('save topic', topic);
        STopic = topic;
        showGeneticFlow()
        const svgElement = document.querySelector('#GeneticFlow svg');
        let svgData = new XMLSerializer().serializeToString(svgElement);
        svgDataList.push(svgData);
    })
    STopic = null;
    showGeneticFlow()
    const svgElement = document.querySelector('#GeneticFlow svg');
    let svgData = new XMLSerializer().serializeToString(svgElement);
    svgDataList.push(svgData);
    // 在最底下重复一次tagcloud
    svgDataList.push(svgData2);

    // 直接以时间戳命名
    let timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    combineAndDownloadSVG(svgDataList, `${timestamp}.svg`);
}

function dicToPrettyString(dic) {
    let items = Object.entries(dic);
    items.sort((a, b) => b[1] - a[1]);
    let s = items.map(d => `${d[0]}: ${d[1]}`).join('\n');
    return s;
}

function draw_tagcloud() {
    let ele = d3.select("#tagcloud").node();
    d3.select("#tagcloud").selectAll("*").remove();
    let svg = d3.select("#tagcloud").append("svg")
        .attr("width", ele.getBoundingClientRect().width)
        .attr("height", ele.getBoundingClientRect().height) ;

    tip = d3.tip()
        .attr("class", "d3-tip")
        .html(d => d.name);
    svg.call(tip);

    // let paper_field_filter = global_paper_field.filter(item => item.size >= min && item.size <= max);
    let sortedData = global_paper_field.sort((a, b) => b.size - a.size);
    const wordCloud = svg.append("g");
        // .attr("transform", "translate(10, 10)");
    console.log('[draw_tagcloud]sortedData', sortedData);

    let maxFontSize = 60;
    let wordPosition = null;
    while ((wordPosition=calculateWordPosition(sortedData, maxFontSize)) === null) {
        maxFontSize *= 0.95;
    }

    /* TODO
     * 当nodes没有节点时，下面的wordPosition会因为访问了未知属性`.y`出错
     */
    if (Array.isArray(wordPosition) && wordPosition.length == 1 && Array.isArray(wordPosition[0]) && wordPosition[0].length == 0) {
        return;
    }
    
    const words = wordCloud.selectAll("g")
        .data(wordPosition)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(0, ${d[0].y})`);

    words.selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("class", "tag-rect")
        .attr("x", d => d.x)
        .attr("y", d => 0)
        .attr("id", d => `rect_${d.id}`)
        .attr("width", d => d.width)
        .attr("height", d => d.height)
        .attr("rx", d => maxFontSize * 0.1 * d.ratio)
        .attr("ry", d => maxFontSize * 0.1 * d.ratio)
        .style("fill", d => topic2color(d.id)) 
        //rgba(15, 161, 216, ${d.opacity})
        //`rgb(${d.rgb[0]}, ${d.rgb[1]}, ${d.rgb[2]})`
        .style("fill-opacity", 0.6)
        .on('mouseover', function(d) {
            highlight_field(d.id);
            tip.show(d);
            d3.select(this).attr('cursor', 'pointer');
        })
        .on('mouseout', reset_field)
        .on('click',  function(d) {
            let rotate = STopic == null;
            STopic = STopic == d.id? null: d.id
            tip.hide(d)
            highlight_STopic(rotate)
        })

    words.selectAll("text")
        .data(d => d)
        .enter()
        .append("text")
        .text(d => d.shortName)
        .attr("x", d => d.x + d.width * 0.5)  // Adjusted to the center of the rectangle
        .attr("y", d => d.height / 2) // Adjusted to the center of the rectangle
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")        // Center the text horizontally
        .style("font-family", "Archivo Narrow")
        // .attr("dominant-baseline", "middle")  // Center the text vertically
        .attr("class", "tag-text")
        .attr("id", d => `text_${d.id}`)
        .attr("font-size", d => d.size + "px")
        .style("fill", d => `rgb(0,0,0)`)
        .attr("pointer-events", "none");
        // .on('mouseout', reset_field);

    draw_chord();
    if (STopic != null) highlight_tag(STopic, true);
}

function calculateWordPosition(sortedData, maxFontSize) {
    let ele = d3.select("#tagcloud").node();
    let svgWidth = ele.getBoundingClientRect().width;
    let svgHeight = ele.getBoundingClientRect().height;
    let lineHeight = maxFontSize * 1.2;
    let emptySpace = maxFontSize * 0.1;
    let wordPosition = [];
    let currentLine = [];
    let currentLineWidth = 0;
    let currentLineHeight = 0;
    let minFontSize = 8;

    for (const d of sortedData) {
        let ratio = Math.sqrt(d.size / sortedData[0].size);
        if (ratio * maxFontSize < minFontSize) {
            ratio = minFontSize / maxFontSize;
        }
        let size = ratio * maxFontSize;
        let height = ratio * lineHeight;
        let opacity = ratio * 0.8 + 0.1;
        // let width = size * shortName.length * 0.5;
        let width = textSize(d.shortName, size).width * 0.9;
        // let width = d.shortName.length * size * 0.4;
        if (currentLineWidth + width > svgWidth) {
            if (currentLine.length == 0) return null
            for (const word of currentLine) {
                word.x += (svgWidth - currentLineWidth) / 2;
            }
            currentLineHeight += currentLine[0].height + emptySpace;
            if (currentLineHeight + height > svgHeight) return null;
            wordPosition.push(currentLine);
            currentLine = [];
            currentLineWidth = 0;
        }
        currentLine.push({
            id: d.id,
            size: size,
            width: width,
            height: height,
            name: d.name,
            ratio: ratio,
            shortName: d.shortName,
            opacity: opacity,
            x: currentLineWidth,
            y: currentLineHeight
        });
        currentLineWidth += width + emptySpace;
    }

    for (const word of currentLine) {
        word.x += (svgWidth - currentLineWidth) / 2;
    }
    wordPosition.push(currentLine);
    return wordPosition;
}

function textSize(text, size) {
    let container = d3.select('body').append('svg');
    container.append('text')
      .style("font-size", size + "px")      // todo: these need to be passed to the function or a css style
      .style("font-family", "sans-serif")
      .text(text);
  
    let sel = container.selectAll('text').node();
    let width = sel.getComputedTextLength();
    let height = sel.getExtentOfChar(0).height;
    container.remove();
    return {width, height};
}

function hideAll() {
    $("#GeneticFlow").hide();
    $("#GeneticPrism").hide();
}

function showGeneticFlow() {
    hideAll()
    rotationSpeed = 0;
    $("#GeneticFlow").show();
    graph = topic2graph[STopic];
    console.log('current graph:', graph);
    if (fullsize) {
        const svgElement = d3.select("#GeneticFlow").node();
        // 将宽度和高度从像素转换为英寸，然后再转换为pt
        graph['width'] = svgElement.clientWidth / 72;
        graph['height'] = svgElement.clientHeight / 72;
    } else {
        graph['width'] = graph['height'] = undefined
    }
    
    init_graph(graph, !hideBackground);
    bindSVGToElement(graph, 'svg', "#GeneticFlow");
    
    if (graph['topic'] != null) {
        console.log('context', graph)
        draw_bbox(graph);
        draw_context(graph);
    }
}

function update_chord_element() {
    chord_arcs = d3.selectAll(".chord-arc");
    chord_ribbons = d3.selectAll(".chord-ribbon");
    index2chord_element = {};
    chord_arcs.each(function() {
        const element = d3.select(this);
        const classes = element.attr("class").split(" ");
        classes.forEach(cls => {
            if (cls.startsWith('chord-arc-')) {
                const index = cls.split('-').pop();
                if (!index2chord_element[index]) {
                    index2chord_element[index] = [];
                }
                index2chord_element[index].push(element);
            }
        });
    });
    
    chord_ribbons.each(function() {
        const element = d3.select(this);
        const classes = element.attr("class").split(" ");
        classes.forEach(cls => {
            if (cls.startsWith('chord-ribbon-from-') || cls.startsWith('chord-ribbon-to-')) {
                const index = cls.split('-').pop();
                if (!index2chord_element[index]) {
                    index2chord_element[index] = [];
                }
                index2chord_element[index].push(element);
            }
        });
    });
}

function guidence() {
    if (!localStorage.getItem('guidanceShown')) {
        document.getElementById('overlay').style.display = 'block';
        document.getElementById('info').classList.add('highlight');
        document.getElementById('info-text').style.display = 'inline';

        document.getElementById('overlay').addEventListener('click', function() {
            this.style.display = 'none';
            document.getElementById('info').classList.remove('highlight');
            document.getElementById('info-text').style.display = 'none';

            // 在localStorage中设置标记
            localStorage.setItem('guidanceShown', 'true');
        });
    }
};

function checkScreenSize() {
    if (window.innerWidth <= 800) {
        document.getElementById('screen-size-warning').style.display = 'block';
    } else {
        document.getElementById('screen-size-warning').style.display = 'none';
    }
}

function addAllListeners() {
    $("#topic-slider").change(function () {
        var topic_r = $("#topic-slider").val();
        d3.selectAll(".topic-map")
            .transition()
            .duration(300)
            .attr("r", d => Math.sqrt(d.num) * 10 * topic_r);
        $("#topic-label").text(topic_r);
    });

    // 添加 switch-mode 按钮事件
    $("#switch-mode").click(function() {
        visType = visType == "GeneticFlow"? "GeneticPrism": "GeneticFlow";
        $(this).attr("data-tooltip", `View Mode: ${visType}`);
        STopic = null;
        render();
    });

    // 添加 speed 按钮事件
    $("#speed").click(function() {
        speedLevel = (speedLevel + 1) % 5; // 循环 0, 1, 2, 3
        const speed = speedMultipliers[speedLevel];
        // 更新按钮提示文本
        $(this).attr("data-tooltip", `Speed: ${speed}x`);
        rotationSpeed = speedLevel * retationSpeedRatio;
        console.log(`Speed changed to: ${rotationSpeed}`);
    });

    $("#save").click(function () {
        // var GeneticFlow = getZoomSvg('#GeneticFlow', '#maingroup');
        // var tagcloud = getZoomSvg('#tagcloud', null);
        // var fileName = `${name} (${fieldType}) GeneticFlow profile.jpg`;
        // downloadSvg([GeneticFlow, tagcloud], fileName);
        if (STopic != null || visType=='GeneticFlow') {
            const svgElement = document.querySelector('#GeneticFlow svg');
            let svgData = new XMLSerializer().serializeToString(svgElement);
            const svgElement2 = document.querySelector('#tagcloud svg');
            let svgData2 = new XMLSerializer().serializeToString(svgElement2);

            combineAndDownloadSVG([svgData, svgData2], 'download.svg');
        } else {
            console.log('Please select a topic or switch to GeneticFlow view to save the full graph.');
        }   
        
    });
    $("#saveall").click(saveall);
    $("#fullscreen").click(toggleFullscreen)
    $("#restore").click(render);
    

    // 初始设置，第一个按钮加粗，透明度为1，其他按钮透明度为0.5
    $(".address-text button:first").css({ 'font-weight': 'bold', 'opacity': 1 });

    // 点击按钮时的事件处理
    $(".address-text button").click(function () {
        // 将所有按钮的字体设为正常，透明度为0.5
        $(".address-text button").css({ 'font-weight': 'normal', 'opacity': 0.5 });

        // 将点击的按钮加粗，透明度为1
        $(this).css({ 'font-weight': 'bold', 'opacity': 1 });
    });

    window.addEventListener('resize', onFullscreenChange);
    window.onload = checkScreenSize;
    // guidence();

    $(document).click(function(event) {
        // console.log(event.target, $(event.target).parent().parent());
        let grandma = $(event.target).parent().parent();
        if (grandma.is('#draw-area') || $(event.target).is('#background'))
            reset_node(true);
    });

    document.getElementById('toggle-polygen').addEventListener('click', function() {
        polygenView = !polygenView;
        this.textContent = polygenView ? 'Chord View' : 'Polygen View';
        draw_chord();
    });

    $("#mode, #node-width, #remove-survey").on('change', d=>loadAndRender());
    $("#edge-filter").on('change', function() {
        const value = this.value;
        if (value == 0) {
            d3.selectAll('.link').style('display', 'block');
        } else if (value == 1) {
            d3.selectAll('.link').style('display', 'none');
            d3.selectAll('.link_true').style('display', 'block');
        } else if (value == 2) {
            d3.selectAll('.link').style('display', 'none');
            d3.selectAll('.link_false').style('display', 'block');
        } else if (value == 3) {
            d3.selectAll('.link').style('display', 'none');
        }
    });

    $("#collapse").click(function() {
        isCollapse = !isCollapse;
        render();
    })

    $("#hide-background").click(function() {
        hideBackground = !hideBackground;
        render();
    })

    $("#regular").click(function() {
        regular = !regular;
        render();
    })

    $("#fullsize").click(function() {
        fullsize = !fullsize;
        render();
    })

    $("#enlarge").click(function() {
        enlarge += 1;
        render();
    })

    $("#edge-bundling").on('change', function() {
        edgeBundling = parseInt(this.value);
        render();
    })

    $("#node-shape").on('change', function() {
        nodeShape = parseInt(this.value);
        render();
    })

    $('#toggle-hide').click(function() {
        console.log('toggle-hide');
        if (toolboxHidden) {
            $('#toggle-hide').html('<i class="fa-solid fa-chevron-up"></i>');
            $('#toolbox').show();
        } else {
            $('#toggle-hide').html('<i class="fa-solid fa-chevron-down"></i>');
            $('#toolbox').hide();
        }
        toolboxHidden = !toolboxHidden;
    })

    $('#showtag').click(function() {
        showtag = !showtag;
        if (showtag) {
            d3.selectAll('.text1').style('display', 'block');
        } else {
            d3.selectAll('.text1').style('display', 'none');
        }
    })

    $('#showtagcloud').click(function() {
        showtagcloud = !showtagcloud;
        if (showtagcloud) {
            $('#tagcloud').show();
        } else {
            $('#tagcloud').hide();
        }
    })

    $("#zoom-in").click(function() {
        if (visType == "GeneticPrism"  && STopic === null) {
            prismScale = prismScale * 0.5 ** (-0.1);
        } else {
            zoom(STopic, 1.1);
        }
        
    });
    $("#zoom-out").click(function() {
        if (visType == "GeneticPrism" && STopic === null) {
            prismScale = prismScale * 0.5 ** 0.1;
        } else {
            zoom(STopic, 0.9);
        }
    });
}

function getCurrentScale(g) {
    const transform = g.attr("transform");  // 获取 transform 属性
    if (!transform) return 1;
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);  // 匹配 scale
    return scaleMatch ? parseFloat(scaleMatch[1]) : 1;  // 如果有匹配，返回 scale 值，否则返回 1
}

function getCurrentTranslate(g) {
    const transform = g.attr("transform");  // 获取 transform 属性
    if (!transform) return [0, 0]; 
    const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);  // 匹配 translate
    return translateMatch ? [parseFloat(translateMatch[1]), parseFloat(translateMatch[2])] : [0, 0];
}

function updateTransform(g, newScale) {
    const [translateX, translateY] = getCurrentTranslate(g);  // 获取当前的平移
    const newTransform = `translate(${translateX}, ${translateY}) scale(${newScale})`;  // 构造新的 transform
    g.attr("transform", newTransform);  // 更新 g 的 transform 属性
}

function zoom(topic, scale) {
    let g = topic2graph[topic].g;
    const currentScale = getCurrentScale(g);  // 读取当前 scale
    const newScale = currentScale * scale;  // 放大 1.2 倍
    updateTransform(g, newScale);
}

function toggleFullscreen() {
    const container = document.getElementsByClassName("middle-column")[0];

    // 检查是否已经处于全屏状态
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

    if (!isFullscreen) {
        // 进入全屏
        if (container.requestFullscreen) {
            container.requestFullscreen().then(() => {
                document.addEventListener("fullscreenchange", onFullscreenChange);
                document.addEventListener("keydown", onEscKeyPressed);
            }).catch(error => {
                console.error('Error entering fullscreen:', error);
            });
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen().then(() => {
                document.addEventListener("webkitfullscreenchange", onFullscreenChange);
                document.addEventListener("keydown", onEscKeyPressed);
            }).catch(error => {
                console.error('Error entering fullscreen:', error);
            });
        }
    } else {
        // 退出全屏
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

function onFullscreenChange() {
    // 在这里执行其他操作
    checkScreenSize();
    render();
    draw_tagcloud();
    updateSider();
}

function onEscKeyPressed(event) {
    if (event.key === "Escape") {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

function reset_graph() {
    $("#description").hide();
    $("#tagcloud").show();
    $("#GeneticFlow").show();
    d3.select('#GeneticFlow').transition().duration(500).call(zoom.transform, d3.zoomIdentity);
}

function getCookie(name) {
    var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
    return r ? r[1] : undefined;
}


function updateSider (nodes=global_nodes) {
    // feat: 在不选择话题的情况下，显示所有的节点
    if (STopic == null) nodes = authorData['nodes'];
    let totalHeight = 0;
    $(".navigation").each(function() {
        totalHeight += $(this).outerHeight(true); // 包含 padding 和 margin
    });
    var height = ($("body").height() - totalHeight) * 0.9;
    $("#timeline").css("height", height);
    $("#timeline").empty();
    $("#timeline").append(content = `
        <div style="float: left;">
            <i style="width: 10px; height: 10px; border-radius: 50%; background-color: white; display: inline-block;"></i>
        </div>
        <div style="margin-left: 7%; margin-bottom: 2%; display: flex; justify-content: space-between;">
            <b style="margin-left: 0%; font-size:16px;">Paper Name</b>
            <b style="margin-right: 1%; margin-left: 5%; font-size:16px;">#Citation</b>
        </div>`
    );
    
    nodes = nodes.sort(op("citationCount"));
    for (let i = 0; i < nodes.length; i++) {
        const paperName = String(nodes[i].name);
        const paperVenu = String(nodes[i].venu);
        const paperYear = String(nodes[i].year);

        var paperAuthors = String(nodes[i].authors);
        // hsvToHex(graph['nodes'][i].color[0], 0.7, graph['nodes'][i].color[2]);
        // var color = topic2color(nodes[i].topic, 0.7) 
        var color = topic2color(paperID2topic[nodes[i].id], 0.7)
        var nodeId = nodes[i].id;
        var citationCount = nodes[i].citationCount;
        if (nodes[i].citationCount == '-1') {
            citationCount = "not available";
        }
        var content = `
        <div style="float: left;">
            <i style="width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; display: inline-block;"></i>
        </div>
        <div style="margin-left: 5%; margin-right: 3%; padding: 3%; margin-top: -3%; border-radius: 5px"; class="paperNode" onmouseover="d3.prismViz.highlight_node('${nodeId}', false, false)" onmouseleave="d3.prismViz.reset_node()">
            <div style="display: flex; justify-content: space-between; margin-bottom: 1%;">
                <span style="margin-left: 0%;">${paperName}</span>
                <span style="margin-right: 2%; margin-left: 5%;">${citationCount}</span>
            </div>
            <span style="color: #808080;">
                ${paperAuthors}
            </span>
            <br>
            <span style="color: #808080;">${paperVenu} ${paperYear}</span>
        </div>
        `;
        
        $("#timeline").append(content);
    }
    $("#paper-list").show();
}

// Function to convert HSV to RGB
function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r, g, b;

    if (h >= 0 && h < 60) {
        [r, g, b] = [c, x, 0];
    } else if (h >= 60 && h < 120) {
        [r, g, b] = [x, c, 0];
    } else if (h >= 120 && h < 180) {
        [r, g, b] = [0, c, x];
    } else if (h >= 180 && h < 240) {
        [r, g, b] = [0, x, c];
    } else if (h >= 240 && h < 300) {
        [r, g, b] = [x, 0, c];
    } else {
        [r, g, b] = [c, 0, x];
    }

    const rgbColor = [(r + m) * 255, (g + m) * 255, (b + m) * 255];
    return rgbColor;
}

function hsvToHex(h, s, v) {
    let rgbColor = hsvToRgb(h, s, v);
    let r = Math.round(rgbColor[0]);
    let g = Math.round(rgbColor[1]);
    let b = Math.round(rgbColor[2]);

    // 将RGB值转换为十六进制字符串
    const toHex = (value) => {
        const hex = value.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    const red = toHex(r);
    const green = toHex(g);
    const blue = toHex(b);

    return "#" + red + green + blue;
}

function textSize(text, size) {
    let container = d3.select('body').append('svg');
    container.append('text')
      .style("font-size", size + "px")      // todo: these need to be passed to the function or a css style
      .style("font-family", "sans-serif")
      .text(text);
  
    let sel = container.selectAll('text').node();
    let width = sel.getComputedTextLength();
    let height = sel.getExtentOfChar(0).height;
    container.remove();
    return {width, height};
}

function calculateWordPosition(sortedData, maxFontSize) {
    let ele = d3.select("#tagcloud").node();
    let svgWidth = ele.getBoundingClientRect().width;
    let svgHeight = ele.getBoundingClientRect().height;
    let lineHeight = maxFontSize * 1.2;
    let emptySpace = maxFontSize * 0.1;
    let wordPosition = [];
    let currentLine = [];
    let currentLineWidth = 0;
    let currentLineHeight = 0;
    let minFontSize = 8;

    for (const d of sortedData) {
        let ratio = Math.sqrt(d.size / sortedData[0].size);
        if (ratio * maxFontSize < minFontSize) {
            ratio = minFontSize / maxFontSize;
        }
        let size = ratio * maxFontSize;
        let height = ratio * lineHeight;
        let opacity = ratio * 0.8 + 0.1;
        // let width = size * shortName.length * 0.5;
        let width = textSize(d.shortName, size).width * 0.88;
        // let width = d.shortName.length * size * 0.4;
        if (currentLineWidth + width > svgWidth) {
            if (currentLine.length == 0) return null
            for (const word of currentLine) {
                word.x += (svgWidth - currentLineWidth) / 2;
            }
            currentLineHeight += currentLine[0].height + emptySpace;
            if (currentLineHeight + height > svgHeight) return null;
            wordPosition.push(currentLine);
            currentLine = [];
            currentLineWidth = 0;
        }
        currentLine.push({
            id: d.id,
            size: size,
            width: width,
            height: height,
            name: d.name,
            ratio: ratio,
            shortName: d.shortName,
            opacity: opacity,
            x: currentLineWidth,
            y: currentLineHeight
        });
        currentLineWidth += width + emptySpace;
    }

    for (const word of currentLine) {
        word.x += (svgWidth - currentLineWidth) / 2;
    }
    wordPosition.push(currentLine);
    return wordPosition;
}

function topic2order(topic) {
    return topic;
}

function draw_chord() {
    // let ele = d3.select(".address-text").node();
    // d3.select("#chord-content").selectAll("*").remove();
    // let height = ele.getBoundingClientRect().width;
    // let width = ele.getBoundingClientRect().width;

    let svgElement = init_chord(polygenView, true);
    // set background to red
    d3.select("#chord-content").style("background-color", "#f5fafa");
    // "#chord-content" set size: width=width(#left-column), height=height(#left-column) - height(#basic-info)
    let chordContent = document.getElementById('chord-content');
    if (chordContent == null) return;
    chordContent.style.width = document.getElementsByClassName('left-column')[0].getBoundingClientRect().width + 'px';
    chordContent.style.height = chordContent.style.width;
    bindSVG(svgElement, "#chord-content");
    update_chord_element();
}

function highlight_arc_with_cash(index, oldIndex) {
    // 有缓存的方法，能够节约一半的时间 
    // console.log('highlight arc', index);
    if (index2chord_element[oldIndex]) {
        index2chord_element[oldIndex].forEach(element => element.style("opacity", defaultOpacity / 3));
    }
    if (index2chord_element[index]) {
        index2chord_element[index].forEach(element => element.style("opacity", 1));
    }
}

function create_svg(viewBox=undefined, transform=undefined) {
    let ele = d3.select("#GeneticFlow").node();
    d3.select("#GeneticFlow").selectAll("*").remove();
    svgWidth = ele.getBoundingClientRect().width;
    svgHeight = ele.getBoundingClientRect().height;
    if (!viewBox) {
        viewBox = `0 0 ${svgWidth} ${svgHeight}`;
    }

    let viewBoxWidth = parseFloat(viewBox.split(' ')[2]);
    let viewBoxHeight = parseFloat(viewBox.split(' ')[3]);
    if (!transform) {
        transform = `translate(0,${viewBoxHeight})`;
    }

    svg = d3.select("#GeneticFlow").append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .attr("viewBox", viewBox);

    //获取viewBox的宽度
    let moveDistance_r = Math.max(viewBoxWidth, viewBoxWidth / 2 +  svgWidth * viewBoxHeight / svgHeight / 2) * 0.95;
    let moveDistance_l = Math.min(0, viewBoxWidth / 2 -  svgWidth * viewBoxHeight / svgHeight / 2) * 0.95;

    let fixedXTranslation_r = "translate(" + moveDistance_r + ",0)"; // 将fixedX作为X方向的平移，Y方向保持为0
    let fixedXTranslation_l = "translate(" + moveDistance_l + ",0)"; // 将fixedX作为X方向的平移，Y方向保持为0

    matrixg = svg.append('g')
        .attr('transform', transform)
        .attr('id', 'maingroup');
    gr = svg.append('g')
        .attr('transform', transform + fixedXTranslation_r)
        .attr('id', 'fixedgroup_r');
    gl = svg.append('g')
        .attr('transform', transform + fixedXTranslation_l)
        .attr('id', 'fixedgroup_l');
    
    zoom = d3.zoom()
        .scaleExtent([0.05, 10])
        .on("zoom", function() {
        let currentTransform = d3.event.transform;
    
        // 应用当前的变换到主要元素组g
        matrixg.attr("transform", currentTransform.toString() + " " + transform);
    
        // 为了在Y方向上保持GeneticFlow元素的同步移动，我们需要提取当前变换的平移和缩放值
        // 并仅将这些应用到Y坐标，而X坐标保持不变（假定fixedX为X坐标的固定值）
        
        let yTranslation = "translate(0," + currentTransform.y + ")"; // 应用当前Y方向的平移
        let yScale = "scale(1," + currentTransform.k + ")"; // 在Y方向上应用缩放，X方向保持1
    
        // 将上述变换组合并应用到GeneticFlow
        // 注意这里我们使用了空格来分隔不同的变换指令
        gr.attr("transform", yTranslation + yScale + transform + fixedXTranslation_r);
        gl.attr("transform", yTranslation + yScale + transform + fixedXTranslation_l);
    });
    svg.call(zoom);
}


function mouseoverEdge(id, width=10, color='red') {
    d3.selectAll('#' + selectorById(id))
        .style("stroke", color)
        .style("stroke-width", d => width || d.width)
        .attr('cursor', 'pointer');
    d3.selectAll('#' + selectorById(id) + '_polygon')
        .style("fill", color)
        .attr('cursor', 'pointer');
}

function mouseoutEdge(id) {
    if (!highlighted.includes(id)) {
        // TODO: why d is undefined???
        d3.selectAll('#' + selectorById(id)).filter(d=>d !== undefined)
            .style("stroke", d=> d.color)   // {console.log(d); return
            .style("stroke-width", d=>d.width);
        d3.selectAll('#' + selectorById(id) + '_polygon').filter(d=>d !== undefined)
            .style("fill", d=>d.color);
    }
}

function clickEdge(id, width=10) {
    highlighted = [id];
    matrixg.selectAll('.epath')
        .style("stroke", d=> d.color)
        .style("stroke-width", d=>d.width)
        .style('opacity', virtualOpacity);
    matrixg.selectAll('.epath-polygon')
        .style("fill", d=>d.color)
        .style('opacity', virtualOpacity);
    d3.selectAll('#' + selectorById(id))
        .style("stroke", "red")
        .style("stroke-width", d => width || d.width)
        .style('opacity', 1);
    d3.selectAll('#' + selectorById(id) + '_polygon')
        .style("fill", "red")
        .style("opacity", 1);
}

function perceivedToActualArea(perceived) {
    return Math.pow(perceived, 1 / 0.7);
}

function resetElementAttr(svgElement) {
    requestAnimationFrame(() => {
        let svg = d3.select(svgElement);
        let bbox = svg.node().getBBox();
        let x = bbox.x;
        let y = bbox.y;
        let width = bbox.width;
        let height = bbox.height;

        let offsetX = -x;
        let offsetY = -y;

        console.log('reset', svg, x, y, width, height, offsetX, offsetY);

        // 重设 viewBox 和 transform
        svgElement.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
        svgElement.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);
    });
}



function draw_context(graph) {
    // draw context bar

    context_l = {};
    context_r = {}; 
    // topicID: {"2011": [edge1, edge2, ...], "2012": [], "total": 50}

    
    if (hideBackground) {
        processDotContext(graph);
    }
    let bbox = graph['g'].node().getBBox();
    let all_years_l = [], all_years_r = [];
    let totalWidth = bbox.width;
    for (let edge of Object.values(graph['combinedContextEdges'])) {
        let years = edge.name.split('->');
        if (edge.name[0] == "l") {
            all_years_l.push(years[0].substring(1));
        } else {
            all_years_r.push(years[1].substring(1));
        }
    }
    all_years_l = Array.from(new Set(all_years_l));
    all_years_r = Array.from(new Set(all_years_r));
    console.log('all_years', all_years_l, all_years_r);


    for (let edge of Object.values(graph['combinedContextEdges'])) {
        if (edge.name[0] == "l") {
            let year = edge.name.split('->')[0].substring(1);
            for (let e of edge.edges) {
                let topic = paperID2topic[e.source];
                if (context_l[topic] == undefined) {
                    context_l[topic] = {"total": 0};
                    for (let y of all_years_l) context_l[topic][y] = [];
                }
                context_l[topic][year].push(e);
                context_l[topic]["total"] += 1;
            }
        } else {
            let year = edge.name.split('->')[1].substring(1);
            for (let e of edge.edges) {
                let topic = paperID2topic[e.target];
                if (context_r[topic] == undefined) {
                    context_r[topic] = {"total": 0};
                    for (let y of all_years_r) context_r[topic][y] = [];
                }
                context_r[topic][year].push(e);
                context_r[topic]["total"] += 1;
            }
        }
    }
    console.log('context l/r', context_l, context_r);

    let totalSize_l = Object.values(context_l).reduce((acc, val) => acc + val.total, 0);
    let totalSize_r = Object.values(context_r).reduce((acc, val) => acc + val.total, 0);
    // let width_l = totalSize_l * totalWidth / (totalSize_l + totalSize_r);
    // let width_r = totalSize_r * totalWidth / (totalSize_l + totalSize_r);

    // draw_context_bar(graph, context_l, totalSize_l * totalWidth / (totalSize_l + totalSize_r), 'l');
    // draw_context_bar(graph, context_r, totalSize_r * totalWidth / (totalSize_l + totalSize_r), 'r');
    
    let g = graph['g'];
    let id2attr = graph['id2attr'];
    let lx = bbox.x - bbox_padding_x;
    let rx = bbox.x + bbox.width + bbox_padding_x;

    // var y = d3.scaleLinear()
    //     .domain([minYear, maxYear])
    //     .range([id2attr['l' + minYear].y, id2attr['l' + maxYear].y]);
    // 避免未定义，延伸年份
    let prefix = id2attr['l' + maxYear]? 'l' : 'year';
    let maxY = id2attr[prefix + maxYear].y;
    for (let year = maxYear + 1; year < maxYear + yearGrid; year++) {
        maxY += id2attr[prefix + maxYear].y - id2attr[prefix + (maxYear-1)].y;
        id2attr[prefix + year] = {"y": maxY};
    }
    var y = d3.scaleOrdinal()
        .domain(d3.range(minYear, maxYear + yearGrid))
        .range(d3.range(minYear, maxYear + yearGrid).map(year => id2attr[prefix + year].y));
    
    // minYear, maxYear
    var years = d3.range(minYear, maxYear + 1);
    let miny = graph.nodes.reduce((acc, val) => Math.min(acc, val.year), maxYear);
    let maxy = graph.nodes.reduce((acc, val) => Math.max(acc, val.year), minYear);
    var tickValues = years.filter(year => year % yearGrid === 0 && year >= miny && year <= maxy);
    console.log('tickValues', tickValues, miny, maxy);

    let barHeight = Math.cbrt(bbox.width * bbox.height) / 2;
    let barWidth = bbox.width + barHeight * 2;
    let streamSize = barHeight * 2 + barWidth / 5;

    g.append("g")
        .call(d3.axisLeft(y).tickSize(- totalWidth - streamSize * 2).tickValues(tickValues))
        .select(".domain").remove();
    g.selectAll(".tick line")
        .attr("stroke", "#b8b8b8")
        // .attr("transform", `translate(${-width_l},0)`);
        .attr("transform", `translate(${-streamSize + barHeight},0)`);
    // font
    g.selectAll(".tick text")
        .attr("x", rx + streamSize + 20)
        .attr("dy", 10)
        .attr('font-family', 'Archivo Narrow')
        .style("font-size", 48)

    Tooltip = g
        .append("text")
        .attr("x", lx)
        .attr("y",  bbox.y - bbox_padding_y - barHeight)
        .attr('font-family', 'Archivo Narrow')
        .style("opacity", 0)
        .style("font-size", 48)
    
    let width_l = streamSize * totalSize_l / Math.max(totalSize_l, totalSize_r);
    let width_r = streamSize * totalSize_r / Math.max(totalSize_l, totalSize_r);
    drawStreamgraph(g, context_l, y, [lx, lx - width_l], 'l');
    drawStreamgraph(g, context_r, y, [rx, rx + width_r], 'r');
    let barHeight_l = barHeight * totalSize_l / Math.max(totalSize_l, totalSize_r);
    let barHeight_r = barHeight * totalSize_r / Math.max(totalSize_l, totalSize_r);
    draw_scrollbar(g, context_l, [lx - barHeight, bbox.y - barHeight_l], barWidth, barHeight_l, barHeight, 'l');
    draw_scrollbar(g, context_r, [lx - barHeight, bbox.y + bbox.height], barWidth, barHeight_r, barHeight, 'r');
}

function mouseoverFlux(dir, topic_id, context) {
    if(activeArea) return;
    // Tooltip.style("opacity", 1);
    let topic = getTopic(topic_id);
    let info = `${topic.shortName}, ${dir=='l'?'Influx': (dir == 'm'? 'Total': 'Efflux')}: ${context[topic_id].total}`;
    tip.show({name: info})
    Tooltip.text(info);
    d3.selectAll(".myArea").style("opacity", .2)
    d3.select(`.myArea${dir}T${topic_id}`)
        .style("stroke", "black")
        .style("opacity", 1)
    d3.selectAll(".scroll-segmentl, .scroll-segmentr" ).style("opacity", .2)
    d3.select(`.scroll-segment${dir}T${topic_id}`).style("opacity", 1)

    // highlightContextEdge(topic_id, dir)
    if (STopic != null && STopic != topic_id) {
        drawContextEdgesByTopic(topic2graph[STopic], topic_id, dir);
    }
}

function mouseOverFluxes(flux_pairs) {
    // 仅当mouseOverNode时，与该node所有相关的fluxes高亮
    if(activeArea) return;
    d3.selectAll(".myArea").style("opacity", .2)
    d3.selectAll(".scroll-segmentl, .scroll-segmentr" ).style("opacity", .2)
    flux_pairs.forEach(pair => {
        let [dir, topic_id] = pair;
        d3.select(`.myArea${dir}T${topic_id}`)
            .style("stroke", "black")
            .style("opacity", 1)
        d3.select(`.scroll-segment${dir}T${topic_id}`).style("opacity", 1)
    });
}

function getTopic(id) {
    ret = global_paper_field.find(field => field.id == id);
    if (ret == undefined) return {
        "shortName": "null",
        "name": "null"
    }
    return ret;
}

function mouseleaveFlux() {
    if(activeArea) return;
    tip.hide();
    Tooltip.style("opacity", 0)
    d3.selectAll(".myArea").style("opacity", 1).style("stroke", "none")
    d3.selectAll(".scroll-segmentl, .scroll-segmentr" ).style("opacity", 1)

    d3.selectAll(".egroup-context-topic").remove();
}

function drawStreamgraph(svg, context, y, xRange, dir='l', selected=null) {
    console.log('dir', dir, 'selected', selected);

    svg.selectAll(".myArea" + dir)
        .remove();

    let keys = Object.entries(context)
        .sort((a, b) => b[1].total - a[1].total)
        .map(entry => entry[0]);
    keys = JSON.parse(JSON.stringify(keys));
        let data = {};
    keys.forEach(function(key) {
        let details = context[key];
        for (var year in details) {
            if (year == 'total') continue;
            if (data[year] == undefined) data[year] = {};
            data[year][key] = details[year].length;
        }
    })
    // console.log('dataMap', JSON.parse(JSON.stringify(data)));
    data = Object.keys(data).map(function(year) {
        return {
            year: +year,
            ...data[year]
        };
    });
    if (data.length == 0) return;

    const years = data.map(d => d.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const dataKeys = Object.keys(data[0]).filter(key => key !== 'year');
    // 创建具有所有键和值为 0 的新对象
    const createZeroData = (year) => {
        let zeroData = { year: year };
        dataKeys.forEach(key => {
            zeroData[key] = 0;
        });
        return zeroData;
    };
    // 添加最小年份-1 和最大年份+1 的数据
    data.unshift(createZeroData(minYear - 1));
    data.push(createZeroData(maxYear + 1));
    

    var xScale = d3.scaleLinear()
        .domain([0, d3.max(data, function(d) {
        return d3.sum(keys, function(key) { return d[key]; });
        })])
        .range(xRange);

    var areaGenerator = d3.area()
        .curve(d3.curveBasis)
        .y(function(d) { return y(d.data.year); })
        .x0(function(d) { return xScale(d[0]); })
        .x1(function(d) { return xScale(d[1]); });

    console.log('data', data);
    let sortedKeys = JSON.parse(JSON.stringify(keys));
    if (selected) {
        sortedKeys = sortedKeys.filter(function(key) { return key != keys[selected]; });
        sortedKeys.unshift(keys[selected]);
    }
    
    var stackedData = d3.stack().keys(sortedKeys)(data);
    console.log('sortedKeys', sortedKeys, stackedData);
    
    
    var clickArea = function(d, i) {
        if (activeArea === dir && i == 0) {
            // 取消高亮
            activeArea = null;
            Tooltip.style("opacity", 0);
            // d3.selectAll(".myArea").style("opacity", 1).style("stroke", "none");
            // 移除点阵和连线
            svg.selectAll(".paperIcon").remove();
            drawStreamgraph(svg, context, y, xRange, dir);
        } else if(activeArea === null) {
            activeArea = dir;
            drawStreamgraph(svg, context, y, xRange, dir, selected=i);
        }
    }

    // var mousemove = function(d, i) {
    //     var grp = sortedKeys[i];
    //     // var year = y.invert(d3.mouse(this)[1]).toFixed(0);
    //     // 由于 d3.scaleOrdinal 不支持 invert 方法，你可以通过手动查找最近的年份来代替 y.invert。
    //     var mouseY = d3.mouse(this)[1];
    //     var closestYear = d3.range(minYear, maxYear + 1).reduce((prev, curr) => {
    //         return (Math.abs(y(curr) - mouseY) < Math.abs(y(prev) - mouseY) ? curr : prev);
    //     });

    //     var year = closestYear.toFixed(0);
    //     if (dir == 'l' && year % yearGrid == 0 || dir == 'r' && year % yearGrid == yearGrid-1 || year == minYear || year == maxYear || dir == 'm') {
    //         var value = d3.sum(stackedData[i], function(layer) {
    //             return layer.data.year === +year ? (layer[1] - layer[0]) : 0;
    //         }).toFixed(0);
    //         let info = `${getTopic(grp).shortName}, ${dir=='l'?'Influx': (dir == 'm'? 'Total': 'Efflux')}: ${context[grp].total}, Year: ${year}, Value: ${value}`
    //         tip.show({name: info});
    //         Tooltip.text(info);
    //     } else {
    //         tip.hide();
    //         Tooltip.style("opacity", 0);
    //     }
    // }

    // Show the areas
    svg.selectAll(".myArea" + dir)
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", d=>`myArea myArea${dir} myArea${dir}T${d.key}`)
        .style("fill", d=>topic2color(d.key))
        .style("fill-opacity", .8)
        .attr("d", areaGenerator)
        .on("mouseover", d=>mouseoverFlux(dir, d.key, context))
        // .on("mousemove", mousemove)
        .on("mouseleave", mouseleaveFlux)
        .on("click", clickArea);

    // Add X axis
    // svg.append("g")
    //     .call(d3.axisBottom(xScale))
    //     .select(".domain").remove();
    
    if (selected!==null) {
        d3.selectAll(".myArea").style("opacity", .2);
        d3.selectAll(`.myArea${dir}T${keys[selected]}`)
            .style("stroke", "black")
            .style("opacity", 1);
        // 显示点阵和连线

        if (dir == 'm') return;
        let selectedKey = keys[selected];
        var contextData = context[selectedKey];
        console.log('contextData', contextData);
        for (var year in contextData) {
            if(year == 'total') continue;
            var details = contextData[year];
            var value = stackedData[0].find(function(layer) {
                return layer.data.year === +year;
            });
            var yPosition = y(+year);
            // 计算每个点的x坐标，使其在 (0, maxXPosition) 内均匀分布
            let papers = {}
            details.forEach(d=>{
                let paper = dir=='l'? d.source: d.target
                papers[paper] = papers[paper] === undefined? 1: papers[paper] + 1;
            })
            // sort by value
            papers = Object.entries(papers).sort((a, b) => b[1] - a[1]);
            let sqrtSize = papers.map(d=>Math.sqrt(d[1])).reduce((acc, val) => acc + val, 0);
            let size = 0;
            var xPositions = papers.map(d => {
                size += Math.sqrt(d[1]) / 3; 
                let ret = xScale(value[1] * size / sqrtSize);
                size += Math.sqrt(d[1]) / 3;
                return ret;
            });
            // console.log('papers', year, value, sqrtSize, papers, xScale(0), xPositions);
            
            // 绘制图标
            svg.selectAll(`.paperIcon${year}`)
                .data(papers)
                .enter()
                .append("g")
                .attr("class", `paperIcon paperIcon${year}`)
                .each(function(d, i) {
                    let w = h = Math.sqrt(d[1]) * 56;
                    d = global_nodes.find(n=>n.id==d[0]); 
                    bookPaths.forEach(path => {
                        d3.select(this).append('path')
                            .attr('d', path)
                            .style('fill-opacity', 0.4)
                            .style('fill', 'red')    // updateOutlineColor(d.isKeyPaper, d.citationCount)
                            .attr('transform', `translate(${xPositions[i] - w / 2}, ${yPosition - h * 0.4}) scale(${w / bookWidth}, ${h / bookHeight})`);
                    });
                    d3.select(this).append('text')
                        .attr('x', xPositions[i])
                        .attr('y', yPosition + h * 0.1)
                        .attr('text-anchor', 'middle')
                        .attr('font-family', 'Archivo Narrow')
                        .attr('font-size', 30)
                        .attr('fill', 'black')
                        .attr("pointer-events", "none")
                        .text(d.citationCount);
                })
                .on("mouseover", function(d) {
                    tip.show({name: global_nodes.find(n=>n.id==d[0]).name + ' ' + d[1]});
                    // cursor
                    d3.select(this).attr('cursor', 'pointer');
                })
                .on("mouseout", function() {
                    tip.hide();
                })
                .on("click", d=>highlight_node(d[0]))
        }
    }
}

function draw_scrollbar(svg, context, startPoint, width, height, baseHeight, dir='l') {
    // scroll的宽和高
    // const width = 800;
    // const height = 50;
    let currentContext = JSON.parse(JSON.stringify(context));
    let keys = Object.entries(currentContext)
        .sort((a, b) => b[1].total - a[1].total)
        .map(entry => entry[0]);
    // 根据total排序，如果是右边的scrollbar，按照total降序排列
    if (dir == 'l') {
        keys = keys.reverse();
    } 
    const barWidth = width / 5;
    let segmentColors = [],  segmentPositionX = [], segmentWidth = [];
    let startX = 0;
    let totalSize = Object.values(currentContext).reduce((acc, val) => acc + val.total, 0);
    keys.forEach(function(key) {
        let c = topic2color(key);
        segmentColors.push(c); // hsvToColor([c.h, 0.4, 1])
        segmentPositionX.push(startX);
        segmentWidth.push(width * currentContext[key].total / totalSize);
        startX += width * currentContext[key].total / totalSize;
    });

    // Draw the end bars
    const endBarWidth = barWidth / 5;
    const endBarHeight = baseHeight * 2;
    const triangleHeight = baseHeight * 1.5;
    let radius = triangleHeight / 3;
    let rectRadius = 10;

    // console.log(barWidth, barWidth)
    // console.log('context', currentContext, segmentColors);

    const gradientDefinitions = svg.append("defs");
    // Create gradient for each segment
    segmentColors.forEach((color, i) => {
        const gradient = gradientDefinitions.append("linearGradient")
            .attr("id", `gradient${dir}${i}`)
            .attr("x1", "0%")
            .attr("x2", "0%")
            .attr("y1", "0%")
            .attr("y2", "100%");
        
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("style", `stop-color:${color};stop-opacity:1`);

        gradient.append("stop")
            .attr("offset", "50%")
            .attr("style", `stop-color:white;stop-opacity:1`);

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("style", `stop-color:${color};stop-opacity:1`);
    });

    svg.selectAll(".scroll-segment" + dir)
        .data(segmentColors)
        .enter()
        .append("rect")
        .attr("class", (d, i) => `scroll-segment${dir} scroll-segment${dir}T${keys[i]}`)
        .attr("x", (d, i) => startPoint[0] + segmentPositionX[i])
        .attr("y", startPoint[1])
        .attr("width", (d, i) => segmentWidth[i])
        .attr("height", height)
        // .attr("rx", 10)
        // .attr("ry", 10)
        .attr("fill", (d, i) => `url(#gradient${dir}${i})`)
        .on("mouseover", function () {
            d3.select(this).attr("opacity", 0.8);
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 1);
        })
        .on("mouseover", (d, i) => mouseoverFlux(dir, keys[i], context))
        .on("mouseleave", mouseleaveFlux)

    svg.selectAll(".scroll-count" + dir)
        .data(segmentColors)
        .enter()
        .append("text")
        .attr("class", `scroll-count${dir}`)
        .attr("x", (d, i) => startPoint[0] + segmentPositionX[i] + segmentWidth[i] / 2)
        .attr("y", startPoint[1] + height / 2)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .attr("font-family", "Archivo Narrow")
        .attr("font-size", height)
        .attr("opacity", 0.7)
        .attr("fill", "black")
        .attr("dy", 5)
        .attr("pointer-events", "none")
        .text((d, i) => context[keys[i]].total == 1? '': context[keys[i]].total)
    
    svg.selectAll(".scroll-label" + dir)
        .data(segmentColors)
        .enter()
        .append("text")
        .attr("class", `scroll-label${dir}`)
        .attr("x", (d, i) => startPoint[0] + segmentPositionX[i] + segmentWidth[i] / 2)
        .attr("y", startPoint[1] + height / 2 + (dir=='l'? -height: height) * 1.5)
        .attr("transform", (d, i) => `rotate(${dir=='l'? -15: 15}, ${startPoint[0] + segmentPositionX[i] + segmentWidth[i] / 2}, ${startPoint[1] + height / 2 + (dir=='l'? -height: height)})`)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .attr("font-family", "Archivo Narrow")
        .attr("font-size", height)
        .attr("opacity", 0.7)
        .attr("fill", "black")
        .attr("dy", 5)
        .attr("pointer-events", "none")
        .text((d, i) => context[keys[i]].total <= totalSize/15? '': getTopic(keys[i]).shortName.split(' ')[0].replace('null', 'misc.'))
        

    const createEndBarGradient = (id) => {
        const gradient = gradientDefinitions.append("linearGradient")
            .attr("id", id)
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "100%");
    
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("style", "stop-color:#8B4513;stop-opacity:1"); // 左侧暗部
    
        gradient.append("stop")
            .attr("offset", "25%")
            .attr("style", "stop-color:#A0522D;stop-opacity:1"); // 左侧过渡
    
        gradient.append("stop")
            .attr("offset", "50%")
            .attr("style", "stop-color:#CD853F;stop-opacity:1"); // 中间亮部（哑光效果）
    
        gradient.append("stop")
            .attr("offset", "75%")
            .attr("style", "stop-color:#A0522D;stop-opacity:1"); // 右侧过渡
    
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("style", "stop-color:#8B4513;stop-opacity:1"); // 右侧暗部
    };

    createEndBarGradient("leftBarGradient");
    createEndBarGradient("rightBarGradient");

    // Left trapezoid
    let centerHeight = startPoint[1] + height / 2;
    svg.append("path")
        .attr("d", `
            M${0},${centerHeight - triangleHeight/2 + radius}
            A${radius},${radius} 0 0 1 ${radius},${centerHeight - triangleHeight/2}
            L${barWidth},${centerHeight}
            L${radius},${centerHeight + triangleHeight/2}
            A${radius},${radius} 0 0 1 ${0},${centerHeight + triangleHeight/2 - radius}
            Z
        `)
        .attr("fill", "url(#leftBarGradient)")
        .attr('transform', `translate(${startPoint[0] - barWidth}, 0)`);

    // Right trapezoid
    svg.append("path")
        .attr("d", `
            M${width},${centerHeight - triangleHeight/2 + radius}
            A${radius},${radius} 0 0 0 ${width - radius},${centerHeight - triangleHeight/2}
            L${width - barWidth},${centerHeight}
            L${width - radius},${centerHeight + triangleHeight/2}
            A${radius},${radius} 0 0 0 ${width},${centerHeight + triangleHeight/2 - radius}
            Z
        `)
        .attr("fill", "url(#rightBarGradient)")
        .attr('transform', `translate(${startPoint[0] + barWidth}, 0)`);

    // Left end bar
    svg.append("rect")
        .attr("x", startPoint[0] - endBarWidth)
        .attr("y", centerHeight - endBarHeight/2)
        .attr("width", endBarWidth)
        .attr("height", endBarHeight)
        .attr("rx", rectRadius)
        .attr("ry", rectRadius)
        .attr("fill", "url(#leftBarGradient)");

    svg.append("rect")
        .attr("x", startPoint[0] - endBarWidth - endBarWidth / 4)
        .attr("y", centerHeight - baseHeight / 2)
        .attr("width", endBarWidth / 4)
        .attr("height", baseHeight)
        .attr("rx", rectRadius)
        .attr("ry", rectRadius)
            .attr("fill", "url(#leftBarGradient)");

    // Right end bar
    svg.append("rect")
        .attr("x", startPoint[0] + width)
        .attr("y", centerHeight - endBarHeight/2)
        .attr("width", endBarWidth)
        .attr("height", endBarHeight)
        .attr("rx", rectRadius)
        .attr("ry", rectRadius)
        .attr("fill", "url(#rightBarGradient)");

    svg.append("rect")
        .attr("x", startPoint[0] + width + endBarWidth)
        .attr("y", centerHeight - baseHeight/2)
        .attr("width", endBarWidth / 4)
        .attr("height", baseHeight)
        .attr("rx", rectRadius)
        .attr("ry", rectRadius)
        .attr("fill", "url(#rightBarGradient)");
}

function draw_context_bar(graph, context, width, dir='l') {
    let sorted_keys = Object.entries(context).sort((a, b) => b[1].total - a[1].total).map(entry => entry[0]);
    console.log('context for', dir,  context);
    let totalSize = sorted_keys.reduce((acc, key) => acc + context[key].total, 0);
    let bbox = graph['bbox'];
    let g = graph['g'];

    const squareSize = 50; // 正方形大小
    let processedData = [];
    let margin = 5; // 方块之间的间隔
    const xPositions = {};
    sorted_keys.forEach(topicID => {
        Object.keys(context[topicID]).forEach(year => {
            if (year === 'total') return;
            if (!xPositions[year]) xPositions[year] = (dir == 'l'? bbox.x - bbox_padding_x: bbox.x + bbox.width + bbox_padding_x);
            
            let nodeCount = 0;
            context[topicID][year].forEach((edge, index) => {
                let nodeID = dir == 'l'? edge.source: edge.target;
                let leftX = dir == 'l'? xPositions[year] - squareSize * (index + 1) - margin * nodeCount: 
                                        xPositions[year] + squareSize * index + margin * nodeCount;
                if (processedData.length > 0 && processedData[processedData.length - 1].id == nodeID) {
                    processedData[processedData.length - 1].edge.push(edge);
                    if (dir == 'l') processedData[processedData.length - 1].x = leftX + margin;
                } else {
                    nodeCount += 1;
                    processedData.push({
                        id: nodeID,
                        node: global_nodes.find(n => n.id == nodeID),
                        topic: topicID,
                        year: year,
                        y: graph['id2attr']['l' + year].y - squareSize / 2,
                        x: leftX,
                        edge: [edge]
                    });
                }
            });
            
            let tmp = xPositions[year];
            if (dir == 'l') xPositions[year] -= squareSize * context[topicID][year].length + margin * nodeCount;
            else xPositions[year] += squareSize * context[topicID][year].length + margin * nodeCount;
            context[topicID][year].m = Math.min(xPositions[year], tmp);
            context[topicID][year].M = Math.max(xPositions[year], tmp);
        });
    });

    console.log('processedData', processedData);

    // 创建多边形路径数据
    let topicPaths = {};
    let startX = (dir == 'l'? bbox.x - bbox_padding_x: bbox.x + bbox.width + bbox_padding_x);
    sorted_keys.forEach(topicID => {
        if (!topicPaths[topicID]) {
            topicPaths[topicID] = [];
        }

        // 添加顶部方块
        let tmp = startX + (dir == 'l'? - 1: 1) * context[topicID].total / totalSize  * width;
        // let tmp = startX + (dir == 'l'? - 1: 1) * context[topicID].total  * squareSize / 4;
        let m = Math.min(startX, tmp);
        let M = Math.max(startX, tmp);
        startX = tmp;

        topicPaths[topicID].m = m;
        topicPaths[topicID].M = M;
        if (dir == 'l') {
            topicPaths[topicID].r = (bbox.x - bbox_padding_x) - M;
            topicPaths[topicID].R = (bbox.x - bbox_padding_x) - m;
        } else {
            topicPaths[topicID].r = m - (bbox.x + bbox.width + bbox_padding_x);
            topicPaths[topicID].R = M - (bbox.x + bbox.width + bbox_padding_x);
        }

        let y = bbox.y - bbox_padding_y;
        topicPaths[topicID].push([M, y]); 
        topicPaths[topicID].unshift([m, y]); 

        Object.keys(context[topicID]).forEach(year => {
            if (year === 'total') return true;
            // 先添加右侧点
            topicPaths[topicID].push([context[topicID][year].M, graph['id2attr']['l' + year].y - squareSize /2]); // 右上
            topicPaths[topicID].push([context[topicID][year].M, graph['id2attr']['l' + year].y + squareSize /2]); // 右下
            
            // 然后添加左侧点
            topicPaths[topicID].unshift([context[topicID][year].m, graph['id2attr']['l' + year].y - squareSize /2]); // 左上
            topicPaths[topicID].unshift([context[topicID][year].m, graph['id2attr']['l' + year].y + squareSize /2]); // 左下
            
        })
    });

    console.log('topicPaths', topicPaths);

    let center = dir == 'l'? [bbox.x - bbox_padding_x, bbox.y - bbox_padding_y]
                            : [bbox.x + bbox.width + bbox_padding_x, bbox.y - bbox_padding_y];
    let suffix = dir=='l'? 'o': 'i';
    let resuffix  = dir=='l'? 'i': 'o';

    const arcGenerator = d3.arc()
        .innerRadius(d => d.r)
        .outerRadius(d => d.R)  // 控制厚度，使其看起来像一个填充的椭圆
        .startAngle(-Math.PI / 2)  // 开始角度
        .endAngle(Math.PI / 2)    // 结束角度
        .cornerRadius(0);

    // 绘制多边形
    Object.keys(topicPaths).forEach(topicID => {
        g.append("path")
           .datum(topicPaths[topicID])
           .attr("fill", topic2color(topicID))
           .attr("fill-opacity", topicOpacity)
           .attr("class", "context-polygon context-polygon_" + topicID)
        //    .attr("stroke", topic2color(topicID))
        //    .attr("stroke-width", 2)
           .attr("d", d3.line()
                        .x(d => d[0])
                        .y(d => d[1])
                        .curve(d3.curveLinearClosed))
            .on('mouseover', function() {
                let field = getTopic(topicID);
                highlight_field(topicID);
                tip.show({name: field.name + '\n' + context[topicID].total});
                d3.select(this).attr('cursor', 'pointer');
            })
            .on('mouseout', reset_field);

        let field = getTopic(topicID);
        
        g.append("path")
              .datum(topicPaths[topicID])
              .attr("fill", topic2color(topicID))
              .attr("fill-opacity", topicOpacity)
              .attr("class", "context-ellipse context-ellipse_" + topicID)
              .attr("d", d=> arcGenerator(d))
              .attr("transform", `translate(${center[0]}, ${center[1]})  scale(1, 0.5)`)
              .on('mouseover', function() {
                highlight_field(topicID);
                tip.show({name: field.name + ':\n' + context[topicID].total});
                d3.select(this).attr('cursor', 'pointer');
            })
            .on('mouseout', reset_field);
            
        let y = (topicPaths[topicID].r + topicPaths[topicID].R) / 4;
        g.append("text")
            .attr("x", center[0])
            .attr("y", center[1] - y)
            .attr("text-anchor", "middle")
            // 垂直居中
            .attr("dominant-baseline", "middle")
            .attr("font-family", "Archivo Narrow")
            .attr("font-size", Math.sqrt(context[topicID].total) * 20)
            .attr("class", "context-text context-text_" + topicID)
            // 逆时针旋转45度
            // .attr("transform", `rotate(-45, ${x}, ${center[1]})`)
            .text(field.shortName)
            .attr("pointer-events", "none");
    });

    g.append("rect")
        .attr("x", dir =='l'? center[0]: center[0] - width)
        .attr("y", center[1])
        .attr("width", width)
        .attr("height", squareSize)
        .attr("fill", topic2color(STopic))
        .attr("fill-opacity", topicOpacity)
        .attr("class", "context-polygon context-polygon_" + STopic)
        .on('mouseover', function() {
            highlight_field(STopic);
            tip.show({name: (dir=='l'? 'Influx': 'Efflux') + ':\n' + totalSize});
            d3.select(this).attr('cursor', 'pointer');
        })
        .on('mouseout', reset_field);

    g.append("text")
        .attr("x", dir == 'l'? center[0] + width / 2: center[0] - width / 2)
        .attr("y", center[1] + squareSize/2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-family", "Archivo Narrow")
        .attr("font-size", Math.sqrt(totalSize) * 10)
        .attr("class", "context-text context-text_" + STopic)
        .text(dir=='l'? 'Influx': 'Efflux') // dir=='l'? STopic + '→': '→' + STopic
        .attr("pointer-events", "none");

    // 绘制方块
    g.selectAll("rect_" + dir)
       .data(processedData)
       .enter()
       .append("rect")
       .attr("x", d => d.x)
       .attr("y", d => d.y)
       .attr("width", d => squareSize * d.edge.length)
       .attr("height", squareSize)
       .attr('id', d => d.id)
       .attr('class', "rect_" + dir)
       .attr("fill", d => topic2color(d.topic))
       .on("mouseover", function(d) {  
            // 使用 function 关键字而不是箭头函数
            d3.select(this)
            .attr("cursor", "pointer")
            .style("stroke", "red")
            .style("stroke-width", 2);
            tip.show(d.node);
       })
        .on("mouseout", function(d) {
            d3.select(this)
            .attr("cursor", "default")
            .style("stroke", "none");

            tip.hide(d.node);
        })
        .on("click", d => {
            highlight_node(d.id);
        })
}

function distance(p1, p2) {
    return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
}

function getStartPoints(key, id2attr) {
    // 如果有多个路径，确保第一个和第二个路径首位相接：修改第一个路径的终止点，使其与第二个路径的起始点相接
    let startPoint = [];
    id2attr[key].path.forEach(function(path) {
        startPoint.push(path.d.split('C')[0].split('M')[1]);  
        // 起始节点字符串，如：67.03,-810
    })
    if (startPoint.length > 1) {
        for (let i = 1; i < startPoint.length; i++) {
            let p1 = id2attr[key].path[i - 1].d.split(' ').pop();
            let p2 = startPoint[i];
            let d = distance(p1.split(','), p2.split(','));
            if (d > 10) {
                alert('Not connected!', d, p1, p2);
            }
            id2attr[key].path[i - 1].d = id2attr[key].path[i - 1].d.replace(p1, p2);
        }
    }
    return startPoint;
}

function startPointAdjustment(contextEdges, id2attr) {
    if (contextEdges.length <= 1) return;
    // console.log('startPointAdjustment', contextEdges)

    let point2key = {}  // 起始节点字符串到 (context edge key, index) 的反向映射
    let pointTree = {}  // 起始节点的层次树，指向父节点

    contextEdges.forEach(function(key) {
        let lastPoint = null;
        getStartPoints(key, id2attr).forEach(function(p, i) {
            if (point2key[p] == null) point2key[p] = [];
            if (pointTree[p] == null) pointTree[p] = lastPoint;
            point2key[p].push([key, i]);
            lastPoint = p;
        })
    })

    // 拓扑搜索，找到从下到上（pointTree指向）遍历的顺序
    let order = [];
    let allPoints = new Set(Object.keys(pointTree));
    let visited = new Set();
    function dfs(node) {
        if (visited.has(node)) return;
        visited.add(node);
        if (pointTree[node] != null) dfs(pointTree[node]);
        order.push(node);
    }
    for (let p of allPoints) dfs(p);
    order.reverse();
    console.log('[startPointAdjustment]', contextEdges, pointTree, point2key, order);

    // layout adjustment
    order.forEach(function(p) {
        let keys = point2key[p];
        let totalWidth = keys.map(([key, i]) => id2attr[key].path[i].width).reduce((acc, val) => acc + val, 0);
        let baseKey = keys.filter(([key, i]) => i != 0);
        if (baseKey.length == 0) baseKey = keys[0];
        else {
            // 更新baseKey的前驱路径的宽度
            baseKey = baseKey[0];
            id2attr[baseKey[0]].path[baseKey[1] - 1].width = totalWidth;
        }
        // 更新宽度之后再判断
        if (keys.length <= 1) return;   
        let basePath = id2attr[baseKey[0]].path[baseKey[1]].d;
        let [p0, p1, p2, p3] = parseBezierCurve(basePath);
        let tangent = bezierTangent(p0, p1, p2, p3, 0);
        let baseNormal = perpendicular(normalize(tangent));

        // console.log('point', p, keys, baseNormal, totalWidth)


        let pointX = parseFloat(p.split(',')[0]), pointY = parseFloat(p.split(',')[1]);
        // point -= baseNormal * totalWidth / 2
        pointX -= baseNormal.x * totalWidth / 2;
        pointY -= baseNormal.y * totalWidth / 2;

        // 计算每条曲线的加权角度
        let angles = keys.map(([key, i]) => {
            let [p0, p1, p2, p3] = parseBezierCurve(id2attr[key].path[i].d);
            let angle1 = getAngleBetweenPoints(p0, p1);
            let angle2 = getAngleBetweenPoints(p0, p2);
            let angle3 = getAngleBetweenPoints(p0, p3);
            // 这里采用加权平均法来计算总的角度
            let totalAngle = angle1 * 0.5 + angle2 * 0.3 + angle3 * 0.2;
            return {key: [key, i], angle: totalAngle};
        });

        // console.log('angles', angles);
        angles.sort((a, b) => a.angle - b.angle);

        angles.map(a => a.key).forEach(([key, i]) => {
            let w = id2attr[key].path[i].width;
            pointX += baseNormal.x * w / 2;
            pointY += baseNormal.y * w / 2;
            id2attr[key].path[i].d = id2attr[key].path[i].d.replace(p, `${pointX},${pointY}`);
            pointX += baseNormal.x * w / 2;
            pointY += baseNormal.y * w / 2;
        });
    });
}

function endPointAdjustment(contextEdges, id2attr) {
    if (contextEdges.length <= 1) return;
    // console.log('endPointAdjustment', contextEdges)

    point2key = {}
    contextEdges.forEach(function(key) {
        let paths = id2attr[key].path;
        let endPoint = paths[paths.length - 1].d.split(' ').pop();
        Object.keys(point2key).forEach(function(p) {
            let d = distance(p.split(','), endPoint.split(','));
            if (d < 10) {
                paths[paths.length - 1].d = paths[paths.length - 1].d.replace(endPoint, p);
                endPoint = p;
            }
        })
        if (point2key[endPoint] == null) point2key[endPoint] = [];
        point2key[endPoint].push(key);
    })
    // console.log(point2key)

    // layout adjustment
    Object.keys(point2key).forEach(function(p) {
        let keys = point2key[p];
        if (keys.length <= 1) return;
        let totalWidth = keys.map(key => id2attr[key].path[id2attr[key].path.length - 1].width).reduce((acc, val) => acc + val, 0);
        let baseNormal = {x: 0, y: -1};

        // console.log('point', p, keys, baseNormal, totalWidth)
        let pointX = parseFloat(p.split(',')[0]), pointY = parseFloat(p.split(',')[1]);
        // point -= baseNormal * totalWidth / 2
        pointX -= baseNormal.x * totalWidth / 2;
        pointY -= baseNormal.y * totalWidth / 2;

        // 计算每条曲线的加权角度
        let angles = keys.map(key => {
            let path = id2attr[key].path;
            // 注意这里是最后4个！！！！
            let [p0, p1, p2, p3] = parseBezierCurveReverse(path[path.length - 1].d);
            let angle1 = getAngleBetweenPoints(p3, p2);
            let angle2 = getAngleBetweenPoints(p3, p1);
            let angle3 = getAngleBetweenPoints(p3, p0); // 注意第端点应该在前面
            // 这里采用加权平均法来计算总的角度
            let totalAngle = angle1 * 0.5 + angle2 * 0.3 + angle3 * 0.2;
            return {key: key, angle: totalAngle, angle1: angle1, angle2: angle2, angle3: angle3, points: [p0, p1, p2, p3]};
        });

        // console.log('angles', angles);
        angles.sort((a, b) => a.angle - b.angle);

        angles.map(a => a.key).forEach(key => {
            let path = id2attr[key].path;
            let w = path[path.length - 1].width;
            pointX += baseNormal.x * w / 2;
            pointY += baseNormal.y * w / 2;
            path[path.length - 1].d = path[path.length - 1].d.replace(p, `${pointX},${pointY}`);
            pointX += baseNormal.x * w / 2;
            pointY += baseNormal.y * w / 2;
        });
    });
}

function searchBundling(context, id2attr) {
    // start point adjustment
    let year2context = {}, node2context = {};  // 从左边年份/中心节点出发的context边
    Object.keys(context).forEach(function(key) {
        if (key[0] == 'l') {
            let year = key.split('->')[0];
            if (year2context[year] == null) year2context[year] = [];
            year2context[year].push(key);
        } else {
            let node = key.split('->')[0];
            if (node2context[node] == null) node2context[node] = [];
            node2context[node].push(key);
        }
    })

    Object.keys(year2context).forEach(function(year) {
        startPointAdjustment(year2context[year], id2attr);
    })
    Object.keys(node2context).forEach(function(node) {
        startPointAdjustment(node2context[node], id2attr);
    })


    // end point adjustment
    year2context = {}, node2context = {};  // 到达右边年份/中心节点的context边
    Object.keys(context).forEach(function(key) {
        if (key[0] == 'l') {
            let node = key.split('->')[1];
            if (node2context[node] == null) node2context[node] = [];
            node2context[node].push(key);
        } else {
            let year = key.split('->')[1];
            if (year2context[year] == null) year2context[year] = [];
            year2context[year].push(key);
        }
    })
    // 只调节目标为年份的context边，确定normal为y方向
    Object.keys(year2context).forEach(function(year) {
        endPointAdjustment(year2context[year], id2attr);
    })
    // Object.keys(node2context).forEach(function(node) {
    //     endPointAdjustment(graph, node2context[node]);
    // })
}

function getAngle(tangent) {
    return Math.atan2(tangent.y, tangent.x);
}

function getAngleBetweenPoints(p1, p2) {
    ret = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    return ret < 0? ret + Math.PI * 2: ret;
}

function bezierTangent(p0, p1, p2, p3, t = 0) {
    let x = 3 * (1 - t) * (1 - t) * (p1.x - p0.x) +
            6 * (1 - t) * t * (p2.x - p1.x) +
            3 * t * t * (p3.x - p2.x);
    
    let y = 3 * (1 - t) * (1 - t) * (p1.y - p0.y) +
            6 * (1 - t) * t * (p2.y - p1.y) +
            3 * t * t * (p3.y - p2.y);
    
    return {x: x, y: y};
}

function normalize(vector) {
    let length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    return {x: vector.x / length, y: vector.y / length};
}

function perpendicular(vector) {
    return {x: -vector.y, y: vector.x};
}

function parseBezierCurve(curveStr) {
    let points = curveStr.match(/[-]?\d*\.\d+|\d+/g).map(Number);
    return [
        {x: points[0], y: points[1]},  // 起点
        {x: points[2], y: points[3]},  // 控制点1
        {x: points[4], y: points[5]},  // 控制点2
        {x: points[6], y: points[7]}   // 终点
    ];
}

function parseBezierCurveReverse(curveStr) {
    // 返回最后4个点
    let points = curveStr.match(/[-]?\d*\.\d+|\d+/g).map(Number);
    let l = points.length;
    return [
        {x: points[l - 8], y: points[l - 7]},  // 起点
        {x: points[l - 6], y: points[l - 5]},  // 控制点1
        {x: points[l - 4], y: points[l - 3]},  // 控制点2
        {x: points[l - 2], y: points[l - 1]}   // 终点
    ];
}

function drawContextEdgesByTopic(graph, topic_id, dir=null) {
    // 绘制与指定topic相关的context边
    console.log('[drawContextEdgesByTopic]', topic_id, dir)
    context = {}
    Object.entries(graph['combinedContextEdges']).forEach(([key, value]) => {
        if (dir == null || dir == 'l' && key[0] == 'l' || dir == 'r' && key[0] != 'l') {
            if (Object.keys(value.topics).includes(topic_id)) {
                context[key] = JSON.parse(JSON.stringify(value));
            }
        }
    })
    drawContextEdges(graph, context, 'egroup-context-topic');
}


function drawContextEdges(graph, context=null, classname='egroup-context') {
    if (context == null) context = graph['combinedContextEdges'];
    console.log('[drawContextEdges]', classname, context);
    let color = (classname == 'egroup-context-topic'? 'red': contextEdgeColor);

    // draw context graph['edges']:
    // - edge id in Object.keys(graph['contextEdges'])
    // - using graph['id2attr'][edge]  to get the Path
    // - using graph['contextEdges'][edge].length to get width
    // - using all graph['edges'] in graph['contextEdges'][edge], find the target and use topic of target to get color

    // make flowmap based on edge bundling
    id2attr = {}    // 保存一个新的id2attr，不改变原来的id2attr
    Object.keys(context).forEach(function(edge) {
        if (!Object.keys(graph['id2attr']).includes(edge)) {
            console.log('[drawContextEdges] context edge not found, maybe flat-edges, removing edge from context', edge, graph['id2attr'][edge], context[edge])
            delete context[edge];
            return true;    // continue
        } else {
            id2attr[edge] = JSON.parse(JSON.stringify(graph['id2attr'][edge]));
        }
        let obj = context[edge];
        id2attr[edge].path.forEach(d=>{
            d.width = obj.weight  * contextEdgeWeight;
            d.color = color;
        })
    })
    searchBundling(context, id2attr);


    const edgeGroups = graph['g'].selectAll('.' + classname)
        .data(Object.keys(context)) // 使用edges数组，每个元素代表一条边
        .enter()
        .append('g')
        .attr('class', classname);

    // 在每个group中为每条边添加path元素
    edgeGroups.each(function(edge) {
        // if (!Object.keys(id2attr).includes(edge)) return true;
        const edgeGroup = d3.select(this);

        // console.log(edgeGroup, id2attr[edge].path)
        let paths = id2attr[edge].path;
        edgeGroup.selectAll('.epath')
            .data(paths)
            .enter()
            .append('path')
            .attr('d', d=>d.d)
            .style("fill", 'none')
            .style("stroke", d=>d.color)
            .style('stroke-opacity', 0.5)
            .style('stroke-width', d=>d.width)
            .attr('class', 'epath')
            .attr('id', selectorById(edge))
            .on('mouseover', function () {
                mouseoverEdge(edge, width=null);
                tip.show({name: edge});
            })
            .on('click', function () {
                // if (context[edge].weight == 1) {
                let e = context[edge].edges[0];
                highlight_edge(`${e.source}->${e.target}`);
                // }
                clickEdge(edge, width=null);
            })
            .on('mouseout', function () {
                mouseoutEdge(edge);
                tip.hide(edge);
            });

        if (edge[0] != 'l') return true; 

        // Add arrowhead to the last path
        let lastPath = paths[paths.length - 1];
        let { endPoint, tangentVector } = calculateArrowheadParams(lastPath.d);
        let normalVector = perpendicular(tangentVector);
        let arrowLength = 20;
        let arrowWidth = lastPath.width;
        let arrowPoints = [
            { x: endPoint.x + arrowLength * tangentVector.x, y: endPoint.y + arrowLength * tangentVector.y},
            { x: endPoint.x + arrowWidth / 2 * normalVector.x, y: endPoint.y + arrowWidth / 2 * normalVector.y },
            { x: endPoint.x - arrowWidth / 2 * normalVector.x, y: endPoint.y - arrowWidth / 2 * normalVector.y }
        ];

        edgeGroup.append('polygon')
            // .attr('class', 'epath-polygon')
            // .attr('id', selectorById(edge) + '_polygon')
            .attr('points', arrowPoints.map(p => `${p.x},${p.y}`).join(' '))
            .style('fill', color)
            .style('fill-opacity', 0.5);
    });
}   

function calculateArrowheadParams(d) {
    let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    let pathLength = path.getTotalLength();
    let endPoint = path.getPointAtLength(pathLength);
    let tangentPoint = path.getPointAtLength(pathLength - 1);
    let tangentVector = {
        x: endPoint.x - tangentPoint.x,
        y: endPoint.y - tangentPoint.y
    };
    let length = Math.sqrt(tangentVector.x * tangentVector.x + tangentVector.y * tangentVector.y);
    tangentVector.x /= length;
    tangentVector.y /= length;
    return { endPoint, tangentVector };
}

function draw_bbox(graph) {
    let g = graph['g'];
    let bbox = g.node().getBBox();
    graph['bbox'] = bbox;

    const defs = g.append('defs');
    const filter = defs.append('filter')
        .attr('id', 'drop-shadow')
        .attr('x', '-20%')
        .attr('y', '-20%')
        .attr('width', '140%') // 增大过滤器的尺寸以包含阴影
        .attr('height', '140%');

    filter.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', 10) // 增大模糊半径
        .attr('result', 'blur');

    filter.append('feOffset')
        .attr('in', 'blur')
        .attr('dx', 0) // 减少水平偏移
        .attr('dy', 0) // 减少垂直偏移
        .attr('result', 'offsetBlur');

    // 使用feFlood创建阴影颜色
    const feFlood = filter.append('feFlood')
        .attr('flood-color', 'black')
        .attr('flood-opacity', 0.5)
        .attr('result', 'color');

    // 使用feComposite将阴影颜色与模糊效果合并
    filter.append('feComposite')
        .attr('in', 'color')
        .attr('in2', 'offsetBlur')
        .attr('operator', 'in')
        .attr('result', 'shadow');

    // 使用feMerge将原图形与阴影效果合并显示
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode')
        .attr('in', 'shadow');
    feMerge.append('feMergeNode')
        .attr('in', 'SourceGraphic');

    // 绘制g元素的外框
    g.insert('rect', ':first-child')
        .attr('x', bbox.x - bbox_padding_x)
        .attr('y', bbox.y - bbox_padding_y)
        .attr('width', bbox.width + bbox_padding_x * 2)
        .attr('height', bbox.height + bbox_padding_y * 2)
        .style("fill", 'white')
        .style("stroke", topic2color(graph['topic'], 1))
        .style("stroke-width", 5)
        .attr('filter', 'url(#drop-shadow)')
        .attr('id', 'background');

    // 在外框底部中心添加标题
    let topic = global_paper_field.find(d => d.id == graph['topic'])
    let sqrtSize = Math.sqrt(bbox.width * bbox.height);
    textElement = g.append('text')
        .attr('x', bbox.x + bbox.width / 2)
        .attr('y', bbox.y + sqrtSize * 0.1)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'text-before-edge')
        .style('font-family', 'Archivo Narrow')
        .style('font-size', sqrtSize * 0.06 + 'px')
        // .text(topicData.shortName)
        .attr('id', 'title')
        // .style('stroke', 'white')
        // .style('stroke-width', 1)
        .on('click', function() {
            // hide text
            d3.select(this).style('display', 'none');
        });

    textElement.append("tspan")
        .attr('x', bbox.x + bbox.width / 2)
        .attr("dy", "-1em")
        .text(topic.shortName.split(' ')[0]);
    textElement.append("tspan")
        .attr('x', bbox.x + bbox.width / 2)
        .attr("dy", "1em")
        .text(topic.shortName.split(' ')[1]);
}

function generateD3Path(points, curve = false) {
    // 使用D3的线条生成器，根据curve参数决定是否使用curveBasis
    const lineGenerator = d3.line();
    if (curve) {
        lineGenerator.curve(d3.curveBasis);
    }

    const pathData = lineGenerator(points);
    return pathData;
}

function convertToPointsArray(pathString) {
    // 从路径字符串中提取坐标点
    const points = pathString.split(' ')
        .slice(1) // 去除路径字符串开头的 "e," 或其他字符
        .map(pair => {
            const cleanedPair = pair.trim().replace(/ +/g, ',');
            const coords = cleanedPair.split(',');
            if (coords.length === 2 && !isNaN(parseFloat(coords[0])) && !isNaN(parseFloat(coords[1]))) {
                return [parseFloat(coords[0]), -parseFloat(coords[1])]; // 注意：转换y坐标为负值以适应SVG坐标系统
            }
            return null;
        })
        .filter(p => p !== null); // 过滤掉任何无效坐标点

    return points;
}




function transformNodeName(name) {
    // 根据yearGrid调整节点名称
    let match = /^([lr])(\d+)$/.exec(name);
    if (match) {
        let prefix = match[1];
        let number = parseInt(match[2]);
        if (prefix === 'l') {
            return `l${Math.max((Math.floor(number / yearGrid) * yearGrid), minYear)}`;
        } else if (prefix === 'r') {
            return `r${Math.min(((Math.floor(number / yearGrid) + 1) * yearGrid) - 1, maxYear)}`;
        }
    }
    return name;
}

function transfromEdgeName(name) {
    // 根据yearGrid调整边名称
    let [src, dst] = name.split('->');
    return `${transformNodeName(src)}->${transformNodeName(dst)}`;
}

function getEdgeBundlingStr() {
    return edgeBundling == 6? '': 
    `concentrate=true
concentrate_type=${edgeBundling}`;
}



function bindSVGToElement(graph, key, elementId) {
    let svgElement = graph[key];
    let {svg: svg, g: g} = bindSVG(svgElement, elementId);

    graph[key] = svg; // 更新 svgElement 为新的 SVG 元素
    if (key === 'svg') graph['g'] = g;
}

function adjustViewBox(originalViewBox, scaleFactor = 1.3) {
    try {
        // 解析 viewBox 属性
        let viewBoxValues = originalViewBox.split(' ').map(Number);
        let viewBoxX = viewBoxValues[0];
        let viewBoxY = viewBoxValues[1];
        let viewBoxWidth = viewBoxValues[2];
        let viewBoxHeight = viewBoxValues[3];

        // 增加 viewBox 的宽度和高度，使内容显示缩小
        let newViewBoxWidth = viewBoxWidth * scaleFactor;
        let newViewBoxHeight = viewBoxHeight * scaleFactor;

        // 调整 viewBox 的 x 和 y，使内容居中
        let newViewBoxX = viewBoxX - (newViewBoxWidth - viewBoxWidth) / 2;
        let newViewBoxY = viewBoxY - (newViewBoxHeight - viewBoxHeight) / 2;

        // 重新设置 viewBox 属性
        let newViewBox = `${newViewBoxX} ${newViewBoxY} ${newViewBoxWidth} ${newViewBoxHeight}`;
        
        return newViewBox;
    } catch (error) {
        console.error("Error adjusting viewBox:", error);
        return originalViewBox;
    }
}


function bindSVG(svgElement, elementId) {
    let ele = d3.select(elementId).node();
    d3.select(elementId).selectAll("*").remove();

    let wasHidden = $(ele).is(':hidden');
    if (wasHidden) $(ele).show();

    let svgWidth = ele.getBoundingClientRect().width || $(elementId).width();
    let svgHeight = ele.getBoundingClientRect().height || $(elementId).height();

    const svg = d3.select(elementId).append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .attr("overflow", "visible");

    let g = svg.append("g");

    d3.select(svgElement).selectAll('*').filter(function() {
        return this.parentNode === svgElement;
    }).each(function() {
        g.node().appendChild(this);
    });

    let svgbbox = svgElement.getBBox();
    let svgViewBox = svgElement.getAttribute("viewBox");
    let x, y, width, height;
    let lis = svgViewBox.split(' ').map(Number);
    x = lis[0];
    y = lis[1];
    width = lis[2];
    height = lis[3];
    console.log('[bindSVG] svgbbox', svgbbox, svgViewBox, y);

    // 确保元素可见后计算包围盒
    // let rect = g.node().getBoundingClientRect();
    // let bbox = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    let bbox = g.node().getBBox();
    let viewBox = `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`;
    console.log('[bindSVG] bbox', bbox, viewBox, bbox.y);

    // 超级难受的硬编码
    svg.attr("viewBox", 
        elementId == '#GeneticFlow' && STopic? adjustViewBox(viewBox): viewBox)
       .attr("preserveAspectRatio", "xMidYMid meet"); // 确保内容居中并等比缩放

    // 添加缩放和拖拽功能
    const zoom = d3.zoom()
        .scaleExtent([0.01, 100])
        .wheelDelta(() => -d3.event.deltaY * 0.001) 
        .on("zoom", () => {
            g.attr("transform", d3.event.transform);
        });

    svg.call(zoom);

    // 所有渲染完成后恢复原始隐藏状态
    if (wasHidden) $(ele).hide();

    return {svg, g};
}

function drawGeneticPrism() {
    let container = document.getElementById('prism-container');
    // container.replaceWith(container.cloneNode(true));
    // container = document.getElementById('prism-container');

    let prism = document.getElementById("prism");
    prism.innerHTML = ''; // 清空现有内容
    // TODO: 清除 prism 所有的动画，脚本，事件

    let lastMouseX, lastMouseY;
    currentIndex = 0;
    // prism.style.transform = `scale(${scale})`
    
    // container.style
    prismHeight = container.offsetHeight;
    const prismWidth = container.offsetWidth;
    let prismUpperMargin = 100;
    const style = window.getComputedStyle(container);
    let perspectiveDistance = parseFloat(style.perspective);
    prism.style.transform = `scale(${prismScale}) rotateX(${rotationAngleX}deg)`;
    let topics = JSON.parse(JSON.stringify(global_paper_field));

    // const totalSize = d3.sum(topics, d => d.size);
    let { rowSums: outdegree, colSums: indegree } = sumRowsAndColumns(adjacentMatrix);
    let weights = adjustWeight(outdegree);
    // let sizes = global_paper_field.map(d => d.size);
    // weights = adjustWeight(weights.map((d, ix) => Math.sqrt(d * sizes[ix])));
    const totalSize = d3.sum(weights);
    let currentAngle = 0;

    topics.forEach((topic, i) => {
        console.log('prism topic', topic)
        // const topicAngle = (topic.size / totalSize) * 360;
        const topicAngle = (weights[i] / totalSize) * 360;
        const startAngle = currentAngle;
        currentAngle += topicAngle / 2;
        // const theta = (topic.size / totalSize) * 2 * Math.PI;
        const theta = (weights[i] / totalSize) * 2 * Math.PI;
        
        const width = 2 * prismRadius * Math.sin(theta / 2);
        const distance = prismRadius * Math.cos(theta / 2);

        let svgWrapper = d3.select("#prism").append("div")
            .attr("id", `svg-wrapper-${topic.id}`)
            .attr("class", "svg-wrapper")
            .style("transform", `rotateY(${currentAngle}deg) translateZ(${distance}px) translateX(${prismWidth/2}px)`);

        // height 与 svg-wrapper 的高度一致
        // const height = svgWrapper._groups[0][0].offsetHeight;

        let graph = topic2graph[topic.id];
        graph['width'] = width / 72;    // 英寸转为pt
        graph['height'] = (prismHeight - prismUpperMargin) / 72;
        init_graph(graph, false);   // 不绘制context信息
        let svgElement = graph['svg'];
        console.log(graph);

        const svg = svgWrapper.append("svg")
            .style("overflow", "visible")
            .attr('id', `svg-${topic.id}`);

        svg.append("rect")
            .attr("id", "rect_" + i)
            .attr("x", -width / 2)
            .attr("y", 0)
            .attr("width", width)
            .attr("height", prismHeight)
            .attr("fill", d3.hsv(topic2color(graph['topic']).h, 0.05, 1))
            // .attr("stroke", topic2color(graph['topic'], 1))
            .attr("fill-opacity", graph['topic'] == global_paper_field[0].id? highlightOpacity: backgroundOpacity)
            .attr("stroke", graph['topic'] == global_paper_field[0].id? topic2color(graph['topic'], 1): 'none')

        let textElement = svg.append("text")
            .attr("x", 0)
            .attr("y", prismHeight / 15) // - (i % 2) * prismHeight / 30
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-family", "Archivo Narrow")
            .attr("font-size", Math.cbrt(width) * 5 + "px")
            .attr("fill", "black")
        
        textElement.append("tspan")
            .attr("x", 0)
            .attr("dy", "0em")
            .text(topic.shortName.split(' ')[0]);
        textElement.append("tspan")
            .attr("x", 0)
            .attr("dy", "1.2em")
            .text(topic.shortName.split(' ')[1]);


        // 创建一个新的嵌套 svg 元素并设置 viewBox 和 transform
        let nestedSvg = svg.append("svg")
            .attr("x", -width / 2)
            .attr("y", prismUpperMargin)
            .attr("width", width)
            .attr("height", prismHeight - prismUpperMargin)
            .attr("viewBox", graph['viewBox']) // 设置 viewBox
            .attr("transform", graph['transform'])
            .attr('id', `nestedSvg-${topic.id}`); // 设置 transform

        // 将 svgElement 的子元素移动到嵌套的 svg 元素中
        // d3.select(svgElement).selectAll('*').filter(function() {
        //     return this.parentNode === svgElement;
        // }).each(function() {
        //     nestedSvg.node().appendChild(this);
        // });
        
        // 好处是无法交互
        Array.from(svgElement.childNodes).forEach(node => {
            nestedSvg.node().appendChild(node.cloneNode(true));
        });

        currentAngle += topicAngle / 2;
        const endAngle = currentAngle;
        topicRanges.push({ startAngle, endAngle });
    });

    // 绘制topview弦图
    let svgWrapper = d3.select("#prism").append("div")
        .attr("id", `svg-wrapper-chord`)
        .attr("class", "svg-wrapper")
        .style("transform", `rotateX(90deg) translateZ(${prismHeight/2}px) rotateZ(180deg) translate(${prismWidth/2}px, ${prismHeight/2}px)`);
    let svg = svgWrapper.append("svg")
        .style("overflow", "visible")
        .attr('id', `svg-chord`);

    let svgElement = init_chord(true, false);
    d3.select(svgElement).selectAll('*').filter(function() {
        return this.parentNode === svgElement;
    }).each(function() {
        svg.node().appendChild(this);
    });

    // 底部加一个一样的边框
    svgWrapper = d3.select("#prism").append("div")
        .attr("id", `svg-wrapper-chord-bottom`)
        .attr("class", "svg-wrapper")
        .style("transform", `rotateX(90deg) translateZ(${-prismHeight/2}px) rotateZ(180deg) translate(${prismWidth/2}px, ${prismHeight/2}px)`);
    svg = svgWrapper.append("svg")
        .style("overflow", "visible")
        .attr('id', `svg-chord-bottom`);
    svgElement = init_chord(true, false, false);
    d3.select(svgElement).selectAll('*').filter(function() {
        return this.parentNode === svgElement;
    }).each(function() {
        svg.node().appendChild(this);
    });
    update_chord_element();
    // function rotate() {
    //     // 通过移除帧率限制，你可以让 requestAnimationFrame 在浏览器的自然刷新率下更好地同步，减少 dropped frames 和 partially presented frames 的问题。
    //     if (rotationSpeed>0) { // 控制旋转速度，每秒30帧  && elapsed > 1000 / 30
    //         rotationAngleY -= 0.04 * rotationSpeed;
    //         if (rotationAngleY <= 0) rotationAngleY += 360;
    //         prism.style.transform = `scale(${prismScale}) translate(${translationX}px, ${translationY}px) rotateX(${rotationAngleX}deg) rotateY(${rotationAngleY}deg)`
    //         // prism.style.transform = `rotateY(${rotationAngleY}deg)`; 
    //         updateOpacity();
    //         requestAnimationFrame(rotate);
    //     }
    // }

    // 通过控制动画的更新频率来“模拟”不同的帧率。虽然不能直接改变刷新率，但你可以让你的动画以较低的帧率运行，从而适应不同的显示器刷新率。
    let lastTime = 0;
    const fps = 30;  // 想要的帧率

    function rotate(timestamp) {
        if (rotationSpeed==0) {
            requestAnimationFrame(rotate);
            return;
        }
        if (!lastTime) lastTime = timestamp;
        const elapsed = timestamp - lastTime;

        // 只在达到目标帧率时才更新
        if (elapsed > 1000 / fps) {
            lastTime = timestamp;
            // 更新动画逻辑
            rotationAngleY -= 0.1 * rotationSpeed;
            if (rotationAngleY <= 0) rotationAngleY += 360;
            prism.style.transform = `scale(${prismScale}) translate(${translationX}px, ${translationY}px) rotateX(${rotationAngleX}deg) rotateY(${rotationAngleY}deg)`;
            updateOpacity();
        }

        requestAnimationFrame(rotate);
    }
    
    function startRotation() {
        chord_arcs.style("opacity", defaultOpacity / 3);
        chord_ribbons.style("opacity", defaultOpacity / 3);
        isRotating = true;
        requestAnimationFrame(rotate);
    }

    container.addEventListener('mousedown', function(event) {
        console.log('mousedown', event.button)
        if (event.button === 0) { // 左键
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', function onMouseUp() {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', onMouseUp);
            });
        } else if (event.button === 2) { // 右键
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            document.addEventListener('mousemove', rightMouseMoveHandler);
            document.addEventListener('mouseup', function onMouseUp() {
                document.removeEventListener('mousemove', rightMouseMoveHandler);
                document.removeEventListener('mouseup', onMouseUp);
            });
        }
    });

    container.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });

    function mouseMoveHandler(event) {
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        rotationAngleY += deltaX / 5;
        rotationAngleX -= deltaY / 5;
        rotationAngleX = Math.max(-90, Math.min(90, rotationAngleX));
        requestAnimationFrame(() => {
            prism.style.transform = `scale(${prismScale}) translate(${translationX}px, ${translationY}px) rotateX(${rotationAngleX}deg) rotateY(${rotationAngleY}deg)`;
            updateOpacity()
        });
    }

    function rightMouseMoveHandler(event) {
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        translationX += deltaX;
        translationY += deltaY;
        requestAnimationFrame(() => {
            prism.style.transform = `scale(${prismScale}) translate(${translationX}px, ${translationY}px)  rotateX(${rotationAngleX}deg) rotateY(${rotationAngleY}deg)`;
        });
    }
    

    container.addEventListener('wheel', function(event) {
    //   perspectiveDistance += event.deltaY * 2;
    //   container.style.perspective = `${perspectiveDistance}px`;
        prismScale = prismScale * 0.5 ** (event.deltaY / 1000);
        prism.style.transform = `scale(${prismScale}) translate(${translationX}px, ${translationY}px) rotateX(${rotationAngleX}deg) rotateY(${rotationAngleY}deg)`;
    });

    startRotation(); // 初始化时开始旋转
}

function updateOpacity() {
    if(Math.abs(rotationAngleX) > 80) {
        d3.selectAll('rect').attr("fill-opacity", highlightOpacity);
        currentIndex = -1;
        return;
    } else {
        if (currentIndex == -1)
            d3.selectAll('rect').attr("fill-opacity", backgroundOpacity);
    }

    const activeAngle = (720 - rotationAngleY) % 360;
    let newIndex = -1;
    for (let i = 0; i < topicRanges.length; i++) {
        const { startAngle, endAngle } = topicRanges[i];
        if (startAngle <= activeAngle && activeAngle < endAngle) {
        newIndex = i;
        break;
        }
    }

    if (newIndex !== currentIndex) {
        // console.time('highlight_arc');
        highlight_arc_with_cash(newIndex, currentIndex);
        d3.selectAll('rect').attr("fill-opacity", backgroundOpacity)
            .attr("stroke", 'none');

        if (newIndex !== -1) {
            d3.select('#rect_' + newIndex).attr("fill-opacity", highlightOpacity)
            .attr("stroke", topic2color(global_paper_field[newIndex].id, 1));
        }
        currentIndex = newIndex;
        // console.timeEnd('highlight_arc');
    }
}

function loadAndRender() {
    loadGlobalData();
    draw_tagcloud();
    render();
}


function rotateTo(index, callback=undefined) {
    const prism = document.getElementById("prism");
    if (prism == undefined || topicRanges[index] == undefined) {
        if (callback) callback();
        return;
    }
    let rotationSpeedBackup = rotationSpeed;
    rotationSpeed = 0;
    // 计算目标角度
    let targetAngle = 360 - (topicRanges[index].startAngle + topicRanges[index].endAngle) / 2;
    const startAngle = rotationAngleY;

    // 确保目标角度和当前角度在同一范围内
    if (targetAngle - startAngle > 180) {
        targetAngle -= 360;
    } else if (startAngle - targetAngle > 180) {
        targetAngle += 360;
    }
    console.log('targetAngle', targetAngle)
    console.log('startAngle', startAngle)

    // 缓动动画参数
    const duration = 800; // 动画时长 1s
    const startTime = performance.now();
    function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    // 动画帧更新函数
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeInOut(progress);
        rotationAngleY = startAngle + (targetAngle - startAngle) * easedProgress;
        prism.style.transform = `scale(${prismScale}) translate(${translationX}px, ${translationY}px) rotateX(${rotationAngleX}deg) rotateY(${rotationAngleY}deg)`;
        updateOpacity();
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            rotationSpeed = rotationSpeedBackup;
            if (callback) callback();
        }
    }

    // 启动动画
    requestAnimationFrame(animate);
}

function render() {
    yearGrid = $("#yearGrid").val();
    // alpha = $("#alphaSlider").val();
    // $("#yearGridValue").text(yearGrid);
    // $("#alphaValue").text(alpha);
    
    if (STopic != null || visType=='GeneticFlow') {
        showGeneticFlow()
        updateSider(graph.nodes);
        return
    }

    updateSider();
    rotationSpeed = speedLevel * retationSpeedRatio;
    if (visType=="GeneticPrism") {
        hideAll()
        $("#GeneticPrism").show();
        const centerMarker = document.createElement('div');
        centerMarker.className = 'center-marker';
        document.getElementById("prism").appendChild(centerMarker);
        
        drawGeneticPrism();
    }
}

function highlight_field(topic_id) {
    let duration = 200;
    // tip.show(d);
    // d3.select(that).attr('cursor', 'pointer');
    // highlight_topic_forceChart(topic_id);

    d3.selectAll('.paper').style('opacity', virtualOpacity);
    d3.selectAll(`.paper-t${topic_id}`).style('opacity', 1);
    
    // =========================context-polygen=========================
    d3.selectAll(".context-polygon_" + topic_id)
        .style("fill-opacity", Math.min(1, topicOpacity * 2));
    d3.selectAll(".context-ellipse_" + topic_id)
        .style("fill-opacity", Math.min(1, topicOpacity * 2));

    // =========================tagcloud=========================
    highlight_tag(topic_id);

    // =========================arc & egroup=========================
    d3.selectAll(".arc")
        .attr("fill-opacity", virtualOpacity)
        .style("stroke", "none");
    d3.selectAll(`.arc_${topic_id}`)
        .attr("fill-opacity", 1)

    d3.selectAll(".egroup").style("opacity", virtualOpacity); // virtualOpacity
    egroup = d3.selectAll(`.egroup_${topic_id}`)
        .style("opacity", 1);
    egroup.selectAll('.epath').style('stroke', 'red');
    egroup.selectAll('.epath-polygon').style('fill', 'red');
    
    // =========================cell=========================
    d3.selectAll(".topic-string")
        .style("opacity", virtualOpacity);
    d3.selectAll(`.topic-string_${topic_id}`)
        .style("opacity", 1);


    // =========================topic map=========================
    // 有了duration之后，如果鼠标滑动较快，则没法恢复
    d3.selectAll(".topic-map")
        .attr("fill-opacity", 0.2)
        .style("stroke", "none");
    d3.select("#circle" + topic_id)
        // .transition()
        // .duration(duration)
        .attr("fill-opacity", 1)
        .style("stroke", "black");

    // =========================bar & bar_egroup=========================
    d3.selectAll(".bar")
        .style("opacity", virtualOpacity);
    d3.selectAll(`.bar_${topic_id}`)
        .style("opacity", 0.7);

    // $("#GeneticFlow").attr("style", "background-color: #FAFAFA;");
    // 在 Stopic 面上展示所有highlight 的 edge
    // highlightContextEdge(topic_id);
    // if (STopic != null && STopic != topic_id) {
    //     drawContextEdgesByTopic(topic2graph[STopic], topic_id);
    // }
}

function highlightContextEdge(topic_id, dir=null) {
    if (STopic == null) return;
    Object.entries(topic2graph[STopic]['combinedContextEdges']).forEach(([key, value]) => {
        if (dir == null || dir == 'l' && key[0] == 'l' || dir == 'r' && key[0] != 'l') {
            if (Object.keys(value.topics).includes(topic_id)) {
                mouseoverEdge(key, width=value.topics[topic_id] * contextEdgeWeight, color=topic2color(topic_id));
            }
        }
    })
}


function reset_field(d) {
    reset_tag();

    d3.selectAll('.egroup').style("opacity", 1);
    d3.selectAll('.paper').style('opacity', 1);

    d3.selectAll(".context-polygon")
        .style("fill-opacity", topicOpacity);
    d3.selectAll(".context-ellipse")
        .style("fill-opacity", topicOpacity);

    // =========================arc=========================
    d3.selectAll(".arc")
        .attr("fill-opacity", 1)
        .style("stroke", "none");
    d3.selectAll(`.topic-string`)
        .style("opacity", 1);
    
    // =========================topic map=========================
    tip.hide(d);

    d3.selectAll(".topic-map")
        // .transition()
        // .duration(200)
        .attr("fill-opacity", 0.6)
        .style("stroke", `rgba(0,0,0,0.5)`);

        
    // $("#GeneticFlow").attr("style", "background-color: white;");
    d3.selectAll(".bar").style("opacity", 0.7);
    // d3.selectAll(".bar_egroup").style("opacity", 1);

    matrixg.selectAll('.epath')
        .style("stroke", d=> d.color)
        .style("stroke-width", d=>d.width)
        .style('opacity', 1);
    matrixg.selectAll('.epath-polygon')
        .style("fill", d=>d.color)
        .style('opacity', 1);
}

function find_child_nodes(id, graph) { 
    var ids = [];
    for (let i = 0; i < graph['edges'].length; i++) {
        if (id == graph['edges'][i].source) {
            ids.push(graph['edges'][i].target);
        }
    }
    return ids;

}

function find_parent_nodes(id, graph) {
    var ids = [];
    for (let i = 0; i < graph['edges'].length; i++) {
        if (id == graph['edges'][i].target) {
            ids.push(graph['edges'][i].source);
        }
    }
    return ids;
}

function get_neighbor(ids, graph) {
    var neighbor_ids = [];
    for (let i = 0; i < ids.length; i++) {
        neighbor_ids = neighbor_ids.concat(find_child_nodes(ids[i], graph));
        neighbor_ids = neighbor_ids.concat(find_parent_nodes(ids[i], graph));
    }
    neighbor_ids = Array.from(new Set(neighbor_ids));
    return neighbor_ids;
}
function updateOutlineColor(isKeyPaper, citationCount) {
    let outlineColorVal = $("#outline-color").val();
    if (outlineColorVal == 0)  return 'black';
    if (outlineColorVal == 1)  return isKeyPaper >= 0.5? 'red': 'black';
    
    // outlineColorVal == 2
    if (citationCount < 50)   return '#2271E0'; // back
    else if (citationCount < 100) return 'DarkOrange';
    return 'red';
}

function downloadSVGElement(elementId) {
    // 获取 SVG 元素
    const svgElement = document.getElementById(elementId);

    // 确保元素存在
    if (svgElement) {
        // 将 SVG 元素序列化为字符串
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svgElement);

        // 创建 Blob 对象
        const svgBlob = new Blob(['<?xml version="1.0" standalone="no"?>\r\n' + source], { type: 'image/svg+xml;charset=utf-8' });

        // 创建 URL 对象
        const url = URL.createObjectURL(svgBlob);

        // 创建临时下载链接
        const downloadegroup = document.createElement('a');
        downloadegroup.href = url;
        downloadegroup.download = elementId + '.svg';

        // 触发下载
        document.body.appendChild(downloadegroup);
        downloadegroup.click();

        // 清理临时链接和 URL 对象
        document.body.removeChild(downloadegroup);
        URL.revokeObjectURL(url);
    } else {
        console.error(`SVG element with id "${elementId}" not found.`);
    }
}


function downloadSvg(svgList, fileName) {
    var totalWidth = 0;
    svgList.forEach(svg => {
        totalWidth += svg.width.baseVal.value;
    });
    var averageWidth = totalWidth / svgList.length;
    var maxWidth = Math.max(...svgList.map(svg => svg.width.baseVal.value));

    var imagesLoaded = 0;
    var canvasList = [];

    var ratio = 1;
    svgList.forEach((svg, index) => {
        const localCnt = index; // 为每个索引创建一个局部变量
        const svgString = new XMLSerializer().serializeToString(svg);
        var source = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;

        var image = new Image();
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);

        image.onload = function() {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = maxWidth;

            var scale = maxWidth / svg.width.baseVal.value;
            canvas.height = svg.height.baseVal.value * scale;
            if (localCnt >= 1) ratio = ratio * 0.5;

            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (svg.width.baseVal.value < averageWidth) {
                // 放大并居中
                ctx.drawImage(image, 0, 0, svg.width.baseVal.value * scale, canvas.height);
            } else {
                // 直接居中
                ctx.drawImage(image, (maxWidth - svg.width.baseVal.value * scale) / 2, 0, svg.width.baseVal.value * scale, canvas.height);
            }

            canvasList.push(canvas);
            imagesLoaded++;

            if (imagesLoaded === svgList.length) {
                combineCanvases(canvasList, fileName);
            }
        };
    });
}

function combineCanvases(canvasList, fileName) {
    var totalHeight = canvasList.reduce((sum, canvas) => sum + canvas.height, 0);
    var maxWidth = Math.max(...canvasList.map(canvas => canvas.width));

    var finalCanvas = document.createElement('canvas');
    finalCanvas.width = maxWidth;
    finalCanvas.height = totalHeight;
    var ctx = finalCanvas.getContext('2d');

    var currentY = 0;
    canvasList.forEach(canvas => {
        ctx.drawImage(canvas, 0, currentY, canvas.width, canvas.height);
        currentY += canvas.height;
    });

    var imgSrc = finalCanvas.toDataURL("image/png");

    downloadFile(fileName, dataURLtoBlob(imgSrc));
}

function downloadFile(fileName, blob) {
    var a = document.createElement('a');
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}


function getZoomSvg(svgIdName, groupIdName) {
    var svg = d3.select(svgIdName).node();
    //得到svg的真实大小
    var box = svg.getBBox(),
        x = box.x,
        y = box.y,
        width = box.width,
        height = box.height;
    if(groupIdName) {
        //查找group
        var group = d3.select(groupIdName).node();
        if(!group) {
            alert('svg中group不存在');
            return false;
        }
        /* 这里是处理svg缩放的 */
        var transformObj = group.getAttribute('transform');
        if(transformObj) {
            /* 下面捕获由d3.event自动引起的svg移动 */
            var translateObj = transformObj.match(/translate\((\d+\.?\d*) (\d+\.?\d*)\)/),
                scaleObj = transformObj.match(/scale\((\d+(\.\d+)?)(?:\s+|\s*,\s*)(\d+(\.\d+)?)\)/);
            if(translateObj && scaleObj) {               // 匹配到平移和缩放
                var translateX = translateObj[1],
                    translateY = translateObj[2],
                    scale = scaleObj[1];
                x = (box.x - translateX) / scale;
                y = (box.y - translateY) / scale;
                width = box.width / scale;
                height = box.height / scale;
            }
            /* 下面捕获初始时手动设置的translate */
            var translateManual = transformObj.match(/translate\(([^,]+),\s*([^\)]+)\)/);
            if (translateManual) {                      // 如果svg的移动不单靠d3.event捕获的，初始时也有一个手动translate，需要将它捕获并减掉
                x = x - parseFloat(translateManual[1]);
                y = y - parseFloat(translateManual[2]);
            }
        }
    }
    //克隆svg
    var cloneSvg = svg.cloneNode(true);
    //重新设置svg的width,height,viewbox
    cloneSvg.setAttribute('width', width);
    cloneSvg.setAttribute('height', height);
    cloneSvg.setAttribute('viewBox', [x, y, width, height]);
    if(group) {
        var cloneGroup = cloneSvg.getElementById(groupIdName.replace(/\#/g, ''));
        /*------清楚缩放元素的缩放--------*/
        cloneGroup.setAttribute('transform', 'translate(0,0) scale(1)');
    }
    return cloneSvg;
}

async function fetchFontAsBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}


function combineAndDownloadSVG(svgDataArray, fileName) {
// 嵌入 Base64 字体
fetchFontAsBase64('ArchivoNarrow-Regular.ttf').then(base64Font => {
        // 创建一个新的 SVG 容器并开始拼接
    let yOffset = 0; // 用于累积每个 SVG 的 Y 轴偏移
    let combinedHeight = 0; // 用于计算所有 SVG 合并后的总高度
    let maxSvgWidth = 0; // 用于计算所有 SVG 中的最大宽度
    let combinedSvgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="###WIDTH###" height="###HEIGHT###" viewBox="0 0 ###WIDTH### ###HEIGHT###">
            <style type="text/css">
                @font-face {
                    font-family: 'Archivo Narrow';
                    src: url('${base64Font}') format('truetype');
                }
                text {
                    font-family: 'Archivo Narrow';
                }
            </style>
    `;

    // 遍历所有 SVG 数据，依次拼接并平移
    svgDataArray.forEach((data, index) => {
        // 从 SVG 数据中提取宽度和高度
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data;
        const svgElement = tempDiv.querySelector('svg');

        // 获取当前 SVG 的高度
        const svgHeight = svgElement.getAttribute('height');
        const svgWidth = svgElement.getAttribute('width');
        maxSvgWidth = Math.max(maxSvgWidth, parseFloat(svgWidth));

        // 添加到组合的 SVG 并平移
        combinedSvgContent += `
            <g id="svgGroup${index}" transform="translate(0, ${yOffset})">
                ${data}
            </g>
        `;
        
        // 更新 Y 轴的偏移量
        yOffset += parseFloat(svgHeight);
        combinedHeight += parseFloat(svgHeight);
    });

    // 闭合 SVG 标签，并将计算后的总高度应用到 SVG 的 viewBox 和高度属性中
    combinedSvgContent += `</svg>`;
    combinedSvgContent = combinedSvgContent.replace('###HEIGHT###', combinedHeight);
    combinedSvgContent = combinedSvgContent.replace('###WIDTH###', maxSvgWidth);
        
    // 转换为 Blob 并下载
    const blob = new Blob([combinedSvgContent], { type: 'image/svg+xml;charset=utf-8' });
    downloadFile(fileName, blob);
})
}


// ============ 组件绑定函数 ============

/**
 * 绑定和弦图面板
 * @param {string} elementId - 容器元素的ID
 */
function bindChordPanel(elementId = "chord") {
    const container = d3.select(`#${elementId}`);
    
    if (container.empty()) {
        console.error(`Element #${elementId} not found`);
        return;
    }
    
    // 创建 Polygen View 切换按钮
    container.append("button")
        .attr("id", "toggle-polygen")
        .style("position", "absolute")
        .style("top", "10px")
        .style("left", "20px")
        .style("padding", "5px 10px")
        .text("Polygen View")
        .on("click", function() {
            polygenView = !polygenView;
            d3.select(this).text(polygenView ? "Normal View" : "Polygen View");
            draw_chord();
        });
    
    // 创建和弦图内容容器
    container.append("div")
        .attr("id", "chord-content");
}

/**
 * 绑定主可视化面板
 * @param {string} elementId - 容器元素的ID
 */
function bindMainPanel(elementId = "middle-column") {
    const container = d3.select(`#${elementId}`);
    
    if (container.empty()) {
        console.error(`Element #${elementId} not found`);
        return;
    }
    
    // 创建工具提示
    container.append("div")
        .attr("id", "tag-tooltip")
        .attr("class", "tooltip");
    
    // 创建顶部工具栏
    const topToolbar = container.append("div")
        .style("z-index", "9")
        .style("position", "absolute")
        .style("right", "10px")
        .style("top", "10px")
        .style("display", "flex")
        .style("gap", "10px")
        .style("align-items", "center");
    
    // 定义顶部工具栏按钮
    const topButtons = [
        { id: "zoom-in", icon: "fa-solid fa-plus", tooltip: "Zoom In" },
        { id: "zoom-out", icon: "fa-solid fa-minus", tooltip: "Zoom Out" },
        { id: "fullscreen", icon: "fa-solid fa-maximize", tooltip: "Fullscreen" },
        { id: "saveall", icon: "fa-solid fa-download", tooltip: "Download SVG" },
        { id: "switch-mode", icon: "fa-solid fa-repeat", tooltip: "View Mode: GeneticFlow" },
        { id: "speed", icon: "fa-solid fa-gauge", tooltip: "Rotation Speed: 2x" },
        { id: "toggle-hide", icon: "fa-solid fa-chevron-down", tooltip: "More Tools" }
    ];
    
    topButtons.forEach(btn => {
        const button = topToolbar.append("button")
            .attr("id", btn.id)
            .attr("class", "icon-button")
            .attr("data-tooltip", btn.tooltip);
        
        button.append("i")
            .attr("class", `${btn.icon} icon`);
    });
    
    topToolbar.append("span")
        .attr("id", "info-text")
        .text("Visualization Guide");
    
    // 创建工具箱
    const toolbox = container.append("div")
        .attr("id", "toolbox")
        .style("z-index", "9")
        .style("position", "absolute")
        .style("top", "60px")
        .style("right", "10px")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("gap", "10px");
    
    // 定义工具箱按钮
    const toolboxButtons = [
        { id: "restore", icon: "fa-solid fa-rotate-right", tooltip: "Refresh" },
        { id: "showtag", icon: "fa-solid fa-tag", tooltip: "Show Tag" },
        { id: "regular", icon: "fa-solid fa-circle", tooltip: "Regular Node Shape" },
        { id: "hide-background", icon: "fa-solid fa-eye-slash", tooltip: "Hide FlowMap" },
        { id: "collapse", icon: "fa-solid fa-equals", tooltip: "Collapse" },
        { id: "fullsize", icon: "fa-solid fa-expand", tooltip: "Full Size" },
        { id: "enlarge", icon: "fa-solid fa-magnifying-glass", tooltip: "Enlarge Node" },
        { id: "showtagcloud", icon: "fa-solid fa-tags", tooltip: "Show Tag Cloud" }
    ];
    
    toolboxButtons.forEach(btn => {
        const button = toolbox.append("button")
            .attr("id", btn.id)
            .attr("class", "icon-button")
            .attr("data-tooltip", btn.tooltip);
        
        button.append("i")
            .attr("class", `${btn.icon} icon`);
    });
    
    // 创建主绘图区域
    const drawArea = container.append("div")
        .attr("id", "draw-area")
        .style("display", "grid")
        .style("height", "100%")
        .style("position", "relative");
    
    // 创建 GeneticFlow 容器
    drawArea.append("div")
        .attr("id", "GeneticFlow")
        .style("height", "100%");
    
    // 创建 GeneticPrism 容器
    const prismDiv = drawArea.append("div")
        .attr("id", "GeneticPrism")
        .style("display", "none")
        .style("height", "100%");
    
    const prismContainer = prismDiv.append("div")
        .attr("id", "prism-container")
        .style("width", "100%")
        .style("height", "100%");
    
    prismContainer.append("div")
        .attr("id", "prism");
    
    // 创建标签云容器
    drawArea.append("div")
        .attr("id", "tagcloud")
        .style("position", "absolute")
        .style("height", "20%")
        .style("width", "100%")
        .style("bottom", "0px");
}

/**
 * 绑定论文列表面板
 * @param {string} elementId - 容器元素的ID
 */
function bindListPanel(elementId = "timeline") {
    const container = d3.select(`#${elementId}`);
    
    if (container.empty()) {
        console.error(`Element #${elementId} not found`);
        return;
    }
    
    // 设置容器样式
    container
        .style("overflow", "auto")
        .style("background-color", "#f5fafa")
        .style("color", "#333")
        .style("padding-top", "3%")
        .style("padding-left", "6%");
}

d3.prismViz = {
    loadData: loadData,
    updateNodeProb: updateNodeProb,
    updateEdgeProb: updateEdgeProb,
    updateTopicProb: updateTopicProb,
    updateYearGrid: updateYearGrid,
    bindChordPanel: bindChordPanel,
    bindMainPanel: bindMainPanel,
    bindListPanel: bindListPanel,
    highlight_node: highlight_node,
    reset_node: reset_node,
    // 只暴露需要的功能
};

})();