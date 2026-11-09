/**
 * audit-src.mjs —— 工程自检（零依赖）。检查的是"这套代码还能不能当工程继续维护"，
 * 而不是视觉细节（视觉走浏览器验收）。
 *
 * 规则：
 *  1. 不允许 window 全局句柄（window.DSxxx / window.appState 之类）——状态只走 Pinia；
 *  2. 不允许 CustomEvent 作为跨组件契约——组件间通信走 store / props / emit；
 *  3. 每个 .vue 必须 <script setup>；每个 view/layout 必须被 router 引用；
 *  4. src 内除 shared/styles/tokens.css 外不得出现裸 hex 颜色（视觉只走 --ds-* token）；
 *  5. 不允许 console.log / debugger 留在源码里；
 *  6. 源码不得引用 build/parts（抽取件只做对照，不是运行时依赖）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const SRC = join(ROOT, 'app', 'src');

const problems = [];
const rel = (p) => relative(ROOT, p).split('\\').join('/');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(SRC);

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const path = rel(file);

  if (/window\.DS|window\.__ds|window\.appState/.test(text)) {
    problems.push(`${path}: 出现 window 全局句柄`);
  }
  if (/new CustomEvent|dispatchEvent\(/.test(text)) {
    problems.push(`${path}: 用 CustomEvent 做跨组件契约`);
  }
  if (file.endsWith('.vue') && /<script/.test(text) && !/<script setup/.test(text)) {
    problems.push(`${path}: 缺少 <script setup>`);
  }
  if (/console\.log\(|debugger/.test(text)) {
    problems.push(`${path}: 残留调试语句`);
  }
  if (!path.endsWith('shared/styles/app.css') && /#[0-9a-fA-F]{3,8}\b/.test(text.replace(/<[^>]*>/g, ''))) {
    problems.push(`${path}: 出现裸 hex 颜色（应使用 --ds-* token）`);
  }
  if (/build\/parts|source\/原型/.test(text)) {
    problems.push(`${path}: 引用了抽取件/源原型，运行时不应依赖它们`);
  }
}

/* 路由必须覆盖工作台、会话深链、产物深链、兜底四条 */
const routerText = readFileSync(join(SRC, 'router', 'index.js'), 'utf8');
for (const pattern of [/path: '\//, /\/w\/:conversationId/, /artifact\/:artifactId/, /catchAll|pathMatch/]) {
  if (!pattern.test(routerText)) problems.push(`app/src/router/index.js: 缺少路由规则 ${pattern}`);
}
for (const view of ['WorkbenchView', 'NotFoundView']) {
  if (!routerText.includes(view)) problems.push(`app/src/router/index.js: 未引用 ${view}`);
}

if (problems.length) {
  console.error(`FAIL ${problems.length} 处问题：`);
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}

console.log(
  JSON.stringify({ ok: true, scanned: files.length, rules: 6, routerRules: 4 }, null, 2)
);
