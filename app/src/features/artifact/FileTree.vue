<template>
  <aside
    data-component="file-tree"
    class="ds-atree"
    role="tree"
    aria-label="文件树"
    :data-open="artifact.treeOpen ? 'true' : 'false'"
  >
    <div class="ds-atree__inner">
      <div class="ds-atree__head">
        <span class="ds-atree__head-id">{{ tree.workspace }}</span>
        <button type="button" class="ds-icon-btn ds-icon-btn--sm" aria-label="搜索文件">
          <Icon name="search" :size="16" />
        </button>
        <button type="button" class="ds-icon-btn ds-icon-btn--sm" aria-label="工作区更多操作">
          <Icon name="more-horizontal" :size="16" />
        </button>
      </div>

      <button
        type="button"
        class="ds-atree__row ds-atree__row--folder"
        role="treeitem"
        :aria-expanded="expanded ? 'true' : 'false'"
        @click="expanded = !expanded"
      >
        <Icon :name="expanded ? 'chevron-down' : 'chevron-right'" :size="16" icon-class="ds-atree__chev" />
        <Icon :name="expanded ? 'folder-open' : 'folder'" :size="16" icon-class="ds-atree__folder-ic" />
        <span class="ds-atree__label">{{ tree.folder }}</span>
      </button>

      <div v-show="expanded" class="ds-atree__group" role="group">
        <button
          v-for="file in tree.files"
          :key="file.id"
          type="button"
          class="ds-atree__row ds-atree__row--file ds-atree__row--indent"
          :class="{ 'is-current': isCurrent(file) }"
          role="treeitem"
          :aria-current="isCurrent(file) ? 'page' : undefined"
          :data-id="file.id"
          :data-type="file.type"
          @click="openFile(file)"
        >
          <Icon :name="iconForType(file.type)" :size="16" />
          <span class="ds-atree__label">{{ file.name }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue';
import Icon from '../../shared/ui/Icon.vue';
import { useArtifactStore } from './store';
import { FILE_TREE } from '../../services/artifacts';
import { iconForType } from '../../shared/lib/markdown';

const artifact = useArtifactStore();
const tree = FILE_TREE;
const expanded = ref(true);

/** 同一个文件可能从对话卡（art-md）或文件树（tree-file-1）打开，按文件名回指当前项 */
function isCurrent(file) {
  const tab = artifact.activeTab;
  if (!tab) return false;
  return tab.id === file.id || tab.name === file.name;
}

function openFile(file) {
  artifact.open({ id: file.id, name: file.name, type: file.type });
}
</script>
