<template>
  <div
    data-component="artifact-toolbar"
    class="ds-atbar"
    :data-tab="artifact.panelMode === 'artifact' ? 'artifact' : 'empty'"
    :data-kind="tab ? tab.kind : 'file'"
    :data-mode="tab ? tab.mode : 'preview'"
  >
    <span class="ds-atbar__name" :hidden="!tab">{{ tab ? tab.name : '' }}</span>
    <span class="ds-atbar__saved" :hidden="!artifact.saved">已保存</span>
    <span class="ds-atbar__spacer" aria-hidden="true"></span>

    <button
      v-if="artifact.pickerVisible"
      type="button"
      class="ds-icon-btn ds-apick"
      data-action="pick-element"
      aria-label="选择页面元素"
      :aria-pressed="picking ? 'true' : 'false'"
      @click="picking = !picking"
    >
      <Icon name="pointer" :size="20" />
    </button>

    <button
      v-if="tab && artifact.editable"
      type="button"
      class="ds-amode"
      data-action="mode-toggle"
      :aria-label="tab.mode === 'preview' ? '切换到代码编辑视图' : '切换到预览视图'"
      @click="artifact.toggleMode()"
    >
      <Icon :name="tab.mode === 'preview' ? 'code' : 'play'" :size="16" icon-class="ds-amode__icon" />
      <span class="ds-amode__label">{{ tab.mode === 'preview' ? '编辑' : '预览' }}</span>
    </button>

    <button
      v-if="tab"
      type="button"
      class="ds-amode ds-atbar__download"
      data-action="download"
      aria-label="下载当前产物"
      @click="downloadActive"
    >
      <Icon name="download" :size="16" icon-class="ds-amode__icon" />
      <span class="ds-amode__label">下载</span>
    </button>

    <button
      type="button"
      class="ds-icon-btn"
      data-action="tree-toggle"
      :aria-pressed="artifact.treeOpen ? 'true' : 'false'"
      aria-label="切换文件树"
      @click="toggleTree"
    >
      <Icon name="list-tree" :size="18" />
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import Icon from '../../shared/ui/Icon.vue';
import { useArtifactStore } from './store';
import { useShellStore } from '../shell/store';
import { MD_SOURCE, artifactSeed, htmlSourceFor, imageSourceFor } from '../../services/artifacts';
import { splitPipes } from '../../shared/lib/markdown';

const artifact = useArtifactStore();
const shell = useShellStore();
const props = defineProps({
  tab: { type: Object, default: null }
});

const picking = ref(false);

/* 「已保存」提示 1.6 秒后隐去 */
let savedTimer = null;
watch(
  () => artifact.saved,
  (saved) => {
    clearTimeout(savedTimer);
    if (saved) {
      savedTimer = setTimeout(() => {
        artifact.saved = false;
      }, 1600);
    }
  }
);

watch(
  () => artifact.activeId,
  () => {
    picking.value = false;
  }
);

/* 展开文件树会占掉 240px；预览区不足 420px 时把右栏撑到每个视口能放下的合理宽度，
   保证「内容在左、文件树在右」同时成立，而不是把表格挤成横向滚动条 */
function toggleTree() {
  const willOpen = !artifact.treeOpen;
  artifact.toggleTree();
  if (willOpen && shell.rightWidth - 240 < 420) {
    shell.setRightWidth(Math.min(shell.maxRightWidth, 240 + 480));
  }
}

function baseName(name) {
  return String(name || '产物').replace(/\.[a-z0-9]+$/i, '');
}

function dataUrlToBlob(url) {
  const comma = String(url || '').indexOf(',');
  if (comma < 0) return null;
  const head = url.slice(0, comma);
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'application/octet-stream';
  try {
    const binary = atob(url.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* 原型里没有真实二进制文件：按当前产物格式导出可读副本 */
function downloadActive() {
  const tab = props.tab;
  if (!tab) return;
  let blob = null;
  let name = tab.name;

  if (tab.format === 'md') {
    blob = new Blob([MD_SOURCE], { type: 'text/markdown;charset=utf-8' });
  } else if (tab.format === 'web') {
    blob = new Blob([htmlSourceFor(tab.id)], { type: 'text/html;charset=utf-8' });
  } else if (tab.format === 'image') {
    blob = dataUrlToBlob(imageSourceFor(tab.id));
  } else if (tab.format === 'sheet') {
    const rows = [splitPipes(artifactSeed.sheet.heads), ...artifactSeed.sheet.rows.map(splitPipes)];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    name = `${baseName(tab.name)}.csv`;
    blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  } else if (tab.format === 'doc') {
    name = `${baseName(tab.name)}.txt`;
    blob = new Blob([`${baseName(tab.name)}\n\n${artifactSeed.docx.paras.join('\n\n')}\n`], {
      type: 'text/plain;charset=utf-8'
    });
  }

  if (blob) saveBlob(blob, name);
}
</script>
