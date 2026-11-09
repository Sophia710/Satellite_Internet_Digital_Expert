<template>
  <div
    data-component="artifact-toolbar"
    class="ds-atbar"
    :data-tab="artifact.panelMode === 'artifact' ? 'artifact' : 'empty'"
    :data-kind="tab ? tab.kind : 'file'"
    :data-mode="tab ? tab.mode : 'preview'"
  >
    <input
      v-if="renaming"
      ref="renameRef"
      v-model="renameValue"
      type="text"
      class="ds-rename__input ds-atbar__rename"
      aria-label="重命名产物"
      @keydown.enter.prevent="commitRename"
      @keydown.esc.prevent.stop="cancelRename"
      @blur="commitRename"
    />
    <span v-else class="ds-atbar__name" :hidden="!tab">{{ tab ? tab.name : '' }}</span>
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
      type="button"
      class="ds-icon-btn"
      disabled
      aria-disabled="true"
      aria-label="外部打开（原型无真实地址，不可用）"
    >
      <Icon name="external-link" :size="16" />
    </button>

    <button
      type="button"
      class="ds-icon-btn"
      data-action="more"
      aria-haspopup="menu"
      aria-label="更多操作"
      :disabled="!tab"
      @click="openMoreMenu"
    >
      <Icon name="more-horizontal" :size="18" />
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
import { nextTick, ref, watch } from 'vue';
import Icon from '../../shared/ui/Icon.vue';
import { useArtifactStore } from './store';
import { useShellStore } from '../shell/store';
import { openPopover } from '../../shared/ui/popover';

const artifact = useArtifactStore();
const shell = useShellStore();
const props = defineProps({
  tab: { type: Object, default: null }
});

const picking = ref(false);
const renaming = ref(false);
const renameValue = ref('');
const renameRef = ref(null);

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
    renaming.value = false;
  }
);

function startRename() {
  if (!props.tab) return;
  renameValue.value = props.tab.name;
  renaming.value = true;
  nextTick(() => {
    renameRef.value?.focus();
    renameRef.value?.select();
  });
}

function commitRename() {
  if (!renaming.value) return;
  const value = renameValue.value.trim();
  renaming.value = false;
  if (!value || !props.tab) return;
  const tab = artifact.tabs.find((t) => t.id === artifact.activeId);
  if (tab) tab.name = value;
}

function cancelRename() {
  renaming.value = false;
}

/* 展开文件树会占掉 240px；预览区不足 420px 时把右栏撑到每个视口能放下的合理宽度，
   保证「内容在左、文件树在右」同时成立，而不是把表格挤成横向滚动条 */
function toggleTree() {
  const willOpen = !artifact.treeOpen;
  artifact.toggleTree();
  if (willOpen && shell.rightWidth - 240 < 420) {
    shell.setRightWidth(Math.min(shell.maxRightWidth, 240 + 480));
  }
}

function openMoreMenu(event) {
  openPopover({
    anchor: event.currentTarget,
    align: 'end',
    items: [
      { icon: 'copy', label: '下载', action: 'download' },
      { divider: true },
      { icon: 'pencil', label: '重命名', action: 'rename' }
    ],
    onSelect: (action) => {
      if (action === 'rename') startRename();
    }
  });
}
</script>
