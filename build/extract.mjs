// 从成品单 HTML 中提取可移植部件（只读源文件，输出到 build/parts）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const root = 'D:/XW/Project/Satellite_Internet_Digital_Expert';
const src = readFileSync(join(root, 'source/原型-原始.html'), 'utf8');
const out = join(root, 'build/parts');
mkdirSync(out, { recursive: true });

const write = (name, text) => {
  writeFileSync(join(out, name), text, 'utf8');
  return `${name}: ${text.length} chars`;
};

const report = [];

// 1) 全部样式（含 tokens 与组件 CSS），整块保留以避免选择器跨组件失效
const styleMatch = src.match(/<style[^>]*>([\s\S]*?)<\/style>/);
report.push(write('app.css', styleMatch[1].trim() + '\n'));

// 2) sprite：以 svg 开标签为锚，向前找最近的 <svg xmlns（跳过注释里示例的 <svg class="ds-icon">）
const svgStart = src.indexOf('<svg');
let svgBlock = '';
const symbolIdx = src.indexOf('<symbol');
if (symbolIdx > -1) {
  const open = src.lastIndexOf('<svg xmlns', symbolIdx);
  const close = src.indexOf('</svg>', symbolIdx);
  svgBlock = src.slice(open, close + 6);
}
report.push(write('sprite.svg', svgBlock));

// 3) 数据岛：script[type=application/json]
const islandRe = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;
let m;
const islands = [];
while ((m = islandRe.exec(src)) !== null) islands.push(m[0]);
islands.forEach((block, i) => {
  const attr = (block.match(/data-(\w+)-seed/) || [])[1] || `island${i}`;
  const json = block.replace(/^[\s\S]*?>/,'').replace(/<\/script>$/,'').trim();
  report.push(write(`seed-${attr}.json`, json));
});

// 4) 壳层模板：body 全文，先移除所有 script 块（数据岛与业务 JS 已单独抽出）
const bodyStart = src.indexOf('<body');
const bodyEnd = src.indexOf('</body>');
const body = src.slice(bodyStart, bodyEnd).replace(/<script[\s\S]*?<\/script>/g, '<!-- script removed -->');
// 去掉 sprite（已单独抽出），避免模板里重复
const bodyNoSprite = body.replace(svgBlock, '<!-- sprite moved -->');
report.push(write('body.html', bodyNoSprite));

// 5) 原 JS：从第一个 [复制区] 组件JS 到 html 末尾
const jsStart = src.indexOf('/* ===== [复制区] 组件JS');
const jsEnd = src.lastIndexOf('</script>');
report.push(write('app.js', src.slice(jsStart, jsEnd)));

// 6) 结构清单：各组件 CSS/JS 块的行号区间，便于后续定位
const lines = src.split('\n');
const marks = [];
lines.forEach((line, i) => {
  const css = line.match(/\[复制区\] 组件CSS：(\S+)/);
  const js = line.match(/\[复制区\] 组件JS：(\S+)/);
  if (css) marks.push({ kind: 'css', name: css[1], line: i + 1 });
  if (js) marks.push({ kind: 'js', name: js[1], line: i + 1 });
});
writeFileSync(join(out, 'index.json'), JSON.stringify(marks, null, 2), 'utf8');

console.log(report.join('\n'));
console.log('components:', new Set(marks.map((x) => x.name)).size, '| source lines:', lines.length);
