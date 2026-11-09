/**
 * 纯函数层：Markdown / 产物格式 / 文件类型映射。
 * 逻辑来自原型，保持行为一致，但去掉了 DOM 版本里的容器依赖：
 * serializeMd 接收「源码文本 + 结构描述」由调用方决定，这里只保留源码 ↔ HTML 的互转。
 */

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

export function splitPipes(value) {
  return String(value || '')
    .split('|')
    .map((x) => x.trim());
}

/** Markdown 源码 → 预览排版（标题 / 引用 / 列表 / 行内加粗与代码） */
export function mdToHtml(md) {
  const out = [];
  const inline = (t) =>
    escapeHtml(t)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  let listOpen = null; // 'ul' | 'ol' | null
  const closeList = () => {
    if (!listOpen) return;
    out.push(`</${listOpen}>`);
    listOpen = null;
  };
  String(md || '')
    .replace(/\r/g, '')
    .split('\n')
    .forEach((line) => {
      const t = line.trim();
      const bullet = /^[-*] /.test(t);
      const ordered = /^\d+\. /.test(t);
      if (bullet || ordered) {
        const kind = ordered ? 'ol' : 'ul';
        if (listOpen !== kind) {
          closeList();
          out.push(`<${kind} class="ds-preview__list">`);
          listOpen = kind;
        }
        const text = ordered ? t.replace(/^\d+\.\s*/, '') : t.slice(2);
        out.push(`<li>${inline(text)}</li>`);
        return;
      }
      closeList();
      if (!t) return;
      if (/^#### /.test(t)) out.push(`<h4 class="ds-preview__h">${inline(t.slice(5))}</h4>`);
      else if (/^### /.test(t)) out.push(`<h3 class="ds-preview__h">${inline(t.slice(4))}</h3>`);
      else if (/^## /.test(t)) out.push(`<h2 class="ds-preview__title">${inline(t.slice(3))}</h2>`);
      else if (/^# /.test(t)) out.push(`<h2 class="ds-preview__title">${inline(t.slice(2))}</h2>`);
      else if (/^> /.test(t)) out.push(`<p class="ds-preview__summary">${inline(t.slice(2))}</p>`);
      else out.push(`<p class="ds-preview__p">${inline(t)}</p>`);
    });
  closeList();
  return out.join('');
}

/** 预览 HTML → Markdown 源码：保证预览与源码同源，编辑后仍能正确回排 */
export function serializeMd(articleHtml) {
  const doc = new DOMParser().parseFromString(`<div>${articleHtml}</div>`, 'text/html');
  const nodes = Array.from(doc.body.firstElementChild ? doc.body.firstElementChild.children : []);
  const lines = [];
  nodes.forEach((n) => {
    const cls = String(n.className || '');
    if (n.tagName === 'H2') lines.push(`## ${n.textContent.trim()}`);
    else if (n.tagName === 'H3') {
      lines.push('');
      lines.push(`### ${n.textContent.trim()}`);
    } else if (n.tagName === 'P' && /ds-preview__summary/.test(cls)) {
      lines.push('');
      lines.push(`> ${n.textContent.trim()}`);
    } else if (n.tagName === 'UL') {
      n.querySelectorAll('li').forEach((li) => {
        lines.push(`- ${li.textContent.trim()}`);
      });
    } else if (n.tagName === 'P') {
      lines.push('');
      lines.push(n.textContent.trim());
    }
  });
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

/** HTML 源码渲染：只保留 body 结构，剔除脚本与内联事件 */
export function sanitizeHtml(src) {
  const doc = new DOMParser().parseFromString(String(src || ''), 'text/html');
  doc.querySelectorAll('script').forEach((s) => s.remove());
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((a) => {
      if (/^on/i.test(a.name)) el.removeAttribute(a.name);
    });
  });
  return doc.body.innerHTML;
}

/* ---------------- 产物格式分流 ---------------- */

export const FORMAT_BY_TYPE = {
  md: 'md',
  markdown: 'md',
  mdx: 'md',
  txt: 'md',
  html: 'web',
  htm: 'web',
  web: 'web',
  docx: 'doc',
  doc: 'doc',
  xlsx: 'sheet',
  xls: 'sheet',
  csv: 'sheet',
  pptx: 'slide',
  ppt: 'slide',
  pdf: 'pdf',
  image: 'image',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image'
};

export const READONLY_VIEW = { doc: 'page', sheet: 'sheet', slide: 'slide', pdf: 'page', image: 'image', other: 'unsupported' };

export function formatOfType(type) {
  return FORMAT_BY_TYPE[String(type || '').toLowerCase()] || 'other';
}

export function kindOfType(type) {
  return /^(html|htm|web)$/i.test(type || '') ? 'web' : 'file';
}

export function isEditableFormat(format) {
  return format === 'md' || format === 'web';
}

/** 格式 × 模式 → 具体视图 */
export function viewFor(format, mode) {
  if (format === 'web') return mode === 'edit' ? 'htmledit' : 'web';
  if (format === 'md') return mode === 'edit' ? 'mdedit' : 'doc';
  return READONLY_VIEW[format] || 'doc';
}

const ICON_BY_TYPE = {
  md: 'file-md',
  markdown: 'file-md',
  docx: 'file-text',
  doc: 'file-text',
  txt: 'file-text',
  xlsx: 'file-sheet',
  xls: 'file-sheet',
  csv: 'file-sheet',
  pdf: 'file-pdf',
  html: 'file-code',
  htm: 'file-code',
  web: 'file-code',
  css: 'file-code',
  js: 'file-code',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  image: 'image'
};

export function iconForType(type) {
  return ICON_BY_TYPE[String(type || '').toLowerCase()] || 'file';
}

export function typeFromName(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  if (!m) return 'file';
  const ext = m[1].toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  return ext;
}

export const SHEET_LETTERS = 'ABCDEFGH'.split('');
