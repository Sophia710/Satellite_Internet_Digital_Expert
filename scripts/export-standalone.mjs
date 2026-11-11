/**
 * export-standalone.mjs —— 将 app/dist 的构建产物导出为单文件、可离线打开的 HTML。
 *
 * 与 build-single.mjs 的区别：
 *   1. 额外处理 CSS url() 与 JS 中残留的静态资源路径，统一转成 data URI；
 *   2. 移除 Vite 的 modulepreload polyfill（单文件里没有动态 chunk，不需要 fetch）；
 *   3. 导出后用断言检查是否仍有外链、网络请求或未内联资源。
 *
 * 用法：node scripts/export-standalone.mjs [--out <文件>]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const distDir = resolve(ROOT, 'app/dist');
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const outPath = resolve(ROOT, flag('out', 'dist/卫星互联网数字专家.html'));

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

function walk(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else out.push(relative(base, full).replaceAll('\\', '/'));
  }
  return out;
}

function dataUri(file) {
  const ext = extname(file).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`;
}

if (!existsSync(join(distDir, 'index.html'))) {
  console.error(`FAIL 找不到构建产物：${join(distDir, 'index.html')}（先运行 vite build）`);
  process.exit(1);
}

let html = readFileSync(join(distDir, 'index.html'), 'utf8');

/* 1. 内联样式 */
let cssInlined = 0;
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*>/g, (tag) => {
  const href = /href="([^"]+)"/.exec(tag)?.[1];
  if (!href) return tag;
  const cssPath = join(distDir, href.replace(/^\.?\//, ''));
  if (!existsSync(cssPath)) throw new Error(`样式表不存在：${cssPath}`);
  cssInlined += 1;
  let css = readFileSync(cssPath, 'utf8');
  css = css.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, raw) => {
    if (/^(data:|https?:|#|\/\/)/.test(raw)) return m;
    const assetPath = join(distDir, raw.replace(/^\.?\//, ''));
    if (!existsSync(assetPath)) throw new Error(`样式引用的资源不存在：${assetPath}`);
    return `url(${dataUri(assetPath)})`;
  });
  return `<style>\n${css}\n</style>`;
});

/* 2. 内联脚本，并移除 modulepreload polyfill */
let jsInlined = 0;
html = html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g, (tag, src) => {
  const jsPath = join(distDir, src.replace(/^\.?\//, ''));
  if (!existsSync(jsPath)) throw new Error(`脚本不存在：${jsPath}`);
  let js = readFileSync(jsPath, 'utf8');
  if (/<\/script/i.test(js)) throw new Error('脚本内含字面量 </script>，内联会截断文档');

  /* modulepreload polyfill 的变量名会随压缩结果变化，用特征字符串定位整段 */
  const marker = 'document.createElement("link").relList;';
  const markerAt = js.indexOf(marker);
  if (markerAt >= 0) {
    const start = js.lastIndexOf('(function(){', markerAt);
    const endToken = '}})();';
    const end = js.indexOf(endToken, markerAt);
    if (start < 0 || end < 0) throw new Error('找到 modulepreload polyfill 但无法确定完整边界');
    js = js.slice(0, start) + js.slice(end + endToken.length);
  }
  if (/fetch\(/.test(js)) throw new Error('脚本内仍存在 fetch()，无法保证离线运行');

  const isModule = /type="module"/.test(tag);
  jsInlined += 1;
  return `<script${isModule ? ' type="module"' : ''}>\n${js}\n</script>`;
});

/* 3. 处理 JS 中可能残留的资源路径（当前产物通常已全部内联） */
const assetFiles = walk(distDir).filter((rel) => !/^(index\.html|assets\/(app|style)\.)/.test(rel));
if (assetFiles.length) {
  for (const rel of assetFiles) {
    const uri = dataUri(join(distDir, rel));
    html = html.split(`./${rel}`).join(uri).split(rel).join(uri);
  }
}

/* 4. 外链检查 */
const bad = [];
for (const m of html.matchAll(/<(?:script|link|img|source|iframe)[^>]*(?:src|href)="([^"]+)"[^>]*>/g)) {
  const url = m[1];
  if (!/^(data:|#)/.test(url)) bad.push(url);
}
if (/@import/.test(html)) bad.push('@import');
if (/url\(\s*['"]?(https?:|\/\/)/.test(html)) bad.push('css url(http)');
if (bad.length) {
  console.error(`FAIL 仍存在外部资源引用：${[...new Set(bad)].join(', ')}`);
  process.exit(1);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html, 'utf8');
const bytes = Buffer.byteLength(html, 'utf8');
console.log(JSON.stringify({
  ok: true,
  dist: distDir,
  out: outPath,
  cssInlined,
  jsInlined,
  inlineAssets: assetFiles.length,
  bytes,
  chars: html.length,
  externalRefs: 0,
  fetchCalls: (html.match(/fetch\(/g) || []).length
}, null, 2));
