/**
 * build-single.mjs —— 把 vite 产物（dist/）内联成一份可离线双击打开的 HTML。
 *
 * 用法：node scripts/build-single.mjs [--dist <目录>] [--out <文件>]
 * 默认：dist = app/dist，out = <交付根>/原型.html
 *
 * 只做机械内联，不改任何业务代码：
 *   - <link rel="stylesheet" href="./assets/style.css"> → <style>…</style>
 *   - <script type="module" src="./assets/app.js">      → <script type="module">…</script>
 * 若产物里仍存在外链（src=/href= 指向 assets），直接失败，避免交付出一个"看起来能开、其实缺文件"的空壳。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const distDir = resolve(ROOT, flag('dist', 'app/dist'));
const outPath = resolve(ROOT, flag('out', '原型.html'));

if (!existsSync(join(distDir, 'index.html'))) {
  console.error(`FAIL 找不到构建产物：${join(distDir, 'index.html')}（先跑 npm run build）`);
  process.exit(1);
}

let html = readFileSync(join(distDir, 'index.html'), 'utf8');

/* 1. 内联样式表 */
let cssInlined = 0;
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*>/g, (tag) => {
  const href = /href="([^"]+)"/.exec(tag)?.[1];
  if (!href) return tag;
  const cssPath = join(distDir, href.replace(/^\.?\//, ''));
  if (!existsSync(cssPath)) throw new Error(`样式表不存在：${cssPath}`);
  cssInlined += 1;
  return `<style>\n${readFileSync(cssPath, 'utf8')}\n</style>`;
});

/* 2. 内联入口脚本（vite 产物是单 chunk） */
let jsInlined = 0;
html = html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g, (tag, src) => {
  const jsPath = join(distDir, src.replace(/^\.?\//, ''));
  if (!existsSync(jsPath)) throw new Error(`脚本不存在：${jsPath}`);
  const js = readFileSync(jsPath, 'utf8');
  if (/<\/script/i.test(js)) {
    throw new Error('产物脚本里含字面 </script>，直接内联会截断文档，需先转义再打包');
  }
  const isModule = /type="module"/.test(tag);
  jsInlined += 1;
  return `<script${isModule ? ' type="module"' : ''}>\n${js}\n</script>`;
});

/* 3. 不许残留外链 */
const leftovers = [
  ...html.matchAll(/<(?:script|link)[^>]*(?:src|href)="([^"]+)"[^>]*>/g)
].map((m) => m[1]).filter((u) => !/^(data:|#|https?:)/.test(u));
if (leftovers.length) {
  console.error(`FAIL 仍存在外链资源：${leftovers.join(', ')}`);
  process.exit(1);
}

writeFileSync(outPath, html, 'utf8');

const bytes = Buffer.byteLength(html, 'utf8');
console.log(
  JSON.stringify(
    {
      ok: true,
      dist: distDir,
      out: outPath,
      cssInlined,
      jsInlined,
      bytes,
      chars: html.length,
      externalRefs: 0
    },
    null,
    2
  )
);
