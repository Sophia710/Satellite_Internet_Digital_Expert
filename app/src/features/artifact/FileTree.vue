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

      <div class="ds-atree__section" role="group" aria-label="对话产物">
        <div class="ds-atree__section-title">对话产物</div>
        <div class="ds-atree__group">
          <button
            v-for="file in tree.artifacts"
            :key="file.id"
            type="button"
            class="ds-atree__row ds-atree__row--file"
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

      <div class="ds-atree__section ds-atree__section--resources" role="group" aria-label="上传资源">
        <div class="ds-atree__section-title">上传资源</div>
        <div class="ds-atree__group">
          <button
            v-for="file in tree.uploads"
            :key="file.id"
            type="button"
            class="ds-atree__row ds-atree__row--file"
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
    </div>
  </aside>
</template>

<script setup>
import Icon from '../../shared/ui/Icon.vue';
import { useArtifactStore } from './store';
import { FILE_TREE } from '../../services/artifacts';
import { iconForType } from '../../shared/lib/markdown';

const artifact = useArtifactStore();
const tree = FILE_TREE;

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
