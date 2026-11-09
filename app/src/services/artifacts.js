/**
 * 产物演示数据（对应原型的 data-artifact-seed 内容与固定预览稿）。
 * 真后端接入时，这一份换成接口返回即可，视图层不需要改。
 */
import seed from './seeds/artifact.json';
import lineChartHtml from './artifacts/charts/line.html?raw';
import barChartHtml from './artifacts/charts/bar.html?raw';
import radarChartHtml from './artifacts/charts/radar.html?raw';
import delayPng from '../assets/artifacts/delay-distribution.png?inline';

export const artifactSeed = seed;

/** 文件目录：id → 名称 / 类型（产物卡、文件树、深链都查这一份） */
export const ARTIFACT_CATALOG = {
  'art-md': { name: '时延态势与趋势分析.md', type: 'md' },
  'art-docx': { name: '异常链路清单.xlsx', type: 'xlsx' },
  'art-chart-line': { name: '时延趋势折线图.html', type: 'html' },
  'art-chart-bar': { name: '波束质量对比柱状图.html', type: 'html' },
  'art-chart-radar': { name: '链路健康度雷达图.html', type: 'html' },
  'art-png': { name: '链路时延分位分布.png', type: 'png' },
  'tree-file-1': { name: '时延态势与趋势分析.md', type: 'md' },
  'tree-file-2': { name: '异常链路清单.xlsx', type: 'xlsx' },
  'tree-file-3': { name: '7 号链路越限复盘报告.docx', type: 'docx' },
  'tree-file-4': { name: '时延异常链路报告.html', type: 'html' }
};

export function lookupArtifact(id) {
  const entry = ARTIFACT_CATALOG[id];
  if (!entry) return { id: id || '', name: id || '未命名产物', type: 'file' };
  return { id, ...entry };
}

/** Markdown 产物源码：预览由它渲染，编辑也改它（保证同源） */
export const MD_SOURCE = `## 时延态势与趋势分析

> 基于 72 小时承载网时延日志，按轨道与链路聚合分位，定位两段阶跃劣化与一处周期性抖动放大。

### 态势结论

30 条链路中 7 号链路的 P95 明显抬升，越限集中在 21:40 之后；9 号链路出现短时丢包突增，其余链路保持在周期波动范围内。

### 趋势判断

STL 分解显示趋势项自昨夜起单调抬升，与一次切换事件的时间点吻合；残差中没有新的周期异常，因此判为结构性劣化而非轨道周期。
`;

/** HTML（网页）产物源码：预览直接渲染这段结构 */
export const HTML_SOURCE = `<header class="ds-webpage__head">
  <h1 class="ds-webpage__title">时延异常链路报告</h1>
  <p class="ds-webpage__sub">依据 DS-01 构造数据 · 分位与突变点算子输出</p>
</header>
<div class="ds-webpage__hero">
  <span class="ds-webpage__hero-label">核心判断</span>
  <p class="ds-webpage__hero-text">7 号链路自昨夜起结构性劣化，与一次切换事件时间吻合，建议优先核查该链路路由配置。</p>
</div>
<section class="ds-webpage__section">
  <h2 class="ds-webpage__h">一、态势：哪里不好</h2>
  <p class="ds-webpage__lead">按轨道与链路聚合分位，越限集中在少数链路，不做事无巨细的全量告警。</p>
  <div class="ds-webgrid">
    <article class="ds-webcard">
      <header class="ds-webcard__head"><span class="ds-webcard__title">A · 分位态势</span></header>
      <div class="ds-webcard__body">
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
      </div>
    </article>
    <article class="ds-webcard">
      <header class="ds-webcard__head"><span class="ds-webcard__title">B · 越限时长</span></header>
      <div class="ds-webcard__body">
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
      </div>
    </article>
    <article class="ds-webcard">
      <header class="ds-webcard__head"><span class="ds-webcard__title">C · 轨道对比</span></header>
      <div class="ds-webcard__body">
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
      </div>
    </article>
    <article class="ds-webcard">
      <header class="ds-webcard__head"><span class="ds-webcard__title">D · 事件关联</span></header>
      <div class="ds-webcard__body">
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
      </div>
    </article>
  </div>
</section>
<section class="ds-webpage__section">
  <h2 class="ds-webpage__h">二、趋势：会变好还是更差</h2>
  <p class="ds-webpage__lead">用 STL 分解区分周期性规律与结构性漂移，避免把轨道周期误判为劣化。</p>
  <div class="ds-webgrid ds-webgrid--3">
    <article class="ds-webcard">
      <header class="ds-webcard__head"><span class="ds-webcard__title">趋势分解</span></header>
      <div class="ds-webcard__body">
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
      </div>
    </article>
    <article class="ds-webcard">
      <header class="ds-webcard__head"><span class="ds-webcard__title">突变定位</span></header>
      <div class="ds-webcard__body">
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
      </div>
    </article>
    <article class="ds-webcard">
      <header class="ds-webcard__head"><span class="ds-webcard__title">处理建议</span></header>
      <div class="ds-webcard__body">
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
        <div class="ds-webcard__row"><span class="ds-webcard__k">7 号链路</span><span class="ds-webcard__v">P95 抬升</span></div>
      </div>
    </article>
  </div>
</section>`;

/** 文件树：目录 + 文件 */
export const FILE_TREE = {
  workspace: '工作区 #SAT-01',
  folder: '时延分析',
  files: [
    { id: 'tree-file-1', type: 'md', name: '时延态势与趋势分析.md' },
    { id: 'tree-file-2', type: 'xlsx', name: '异常链路清单.xlsx' },
    { id: 'tree-file-3', type: 'docx', name: '7 号链路越限复盘报告.docx' },
    { id: 'tree-file-4', type: 'html', name: '时延异常链路报告.html' },
    { id: 'art-chart-line', type: 'html', name: '时延趋势折线图.html' },
    { id: 'art-chart-bar', type: 'html', name: '波束质量对比柱状图.html' },
    { id: 'art-chart-radar', type: 'html', name: '链路健康度雷达图.html' },
    { id: 'art-png', type: 'png', name: '链路时延分位分布.png' }
  ]
};

/** 网页产物按 id 取源码：图表产物是静态 SVG，不依赖任何图表库 */
const HTML_SOURCES = {
  'art-html': HTML_SOURCE,
  'tree-file-4': HTML_SOURCE,
  'art-chart-line': lineChartHtml,
  'art-chart-bar': barChartHtml,
  'art-chart-radar': radarChartHtml
};

export function htmlSourceFor(id) {
  return HTML_SOURCES[id] || HTML_SOURCE;
}

/** 图片产物：真后端返回图片 URL，这里内联成 data URL 以便单文件离线打开 */
const IMAGE_SOURCES = {
  'art-png': delayPng
};

export function imageSourceFor(id) {
  return IMAGE_SOURCES[id] || '';
}
