<template>
  <section
    data-component="artifact-panel"
    class="ds-arti"
    :data-tab="artifact.panelMode"
  >
    <div class="ds-atabs" role="tablist" aria-label="产物文件页签">
      <div
        v-for="tab in artifact.tabs"
        :key="tab.id"
        class="ds-atab"
        :class="{ 'is-active': !artifact.launcher && artifact.activeId === tab.id }"
        role="tab"
        :data-tab-id="tab.id"
        :aria-selected="!artifact.launcher && artifact.activeId === tab.id ? 'true' : 'false'"
        :tabindex="!artifact.launcher && artifact.activeId === tab.id ? 0 : -1"
        @click="activateTab(tab)"
        @keydown="onTabKeydown($event, tab)"
      >
        <Icon :name="iconForType(tab.type)" :size="16" />
        <span class="ds-atab__label">{{ tab.name }}</span>
        <button
          type="button"
          class="ds-atab__close"
          tabindex="-1"
          :aria-label="`关闭页签：${tab.name}`"
          @click.stop="closeTab(tab)"
        >
          <Icon name="x" :size="16" />
        </button>
      </div>

      <div
        v-if="artifact.launcher"
        class="ds-atab ds-atab--launch is-active"
        role="tab"
        data-tab-id=":launcher:"
        aria-selected="true"
        tabindex="0"
        @keydown.esc.prevent="closeLauncher"
      >
        <Icon name="plus" :size="16" />
        <span class="ds-atab__label">新标签页</span>
        <button type="button" class="ds-atab__close" tabindex="-1" aria-label="关闭页签：新标签页" @click.stop="closeLauncher">
          <Icon name="x" :size="16" />
        </button>
      </div>

      <span class="ds-atabs__spacer" aria-hidden="true"></span>
      <button type="button" class="ds-icon-btn ds-icon-btn--sm" data-action="tab-new" aria-label="新建标签页" @click="newTab">
        <Icon name="plus" :size="16" />
      </button>
    </div>

    <ArtifactToolbar :tab="artifact.launcher ? null : artifact.activeTab" />

    <div class="ds-acontent">
      <div v-show="artifact.panelMode === 'empty'" class="ds-aempty">
        <Icon name="file" :size="24" />
        <p class="ds-aempty__text">产物将在此出现</p>
      </div>

      <DocumentPreview
        v-if="artifact.panelMode === 'artifact' && artifact.activeTab"
        :key="artifact.activeTab.id"
        :tab="artifact.activeTab"
        @saved="artifact.markSaved()"
      />

      <!-- 文件树与预览并排，贴在产物区右侧（240px，可折叠） -->
      <FileTree />
    </div>

    <!-- 新标签页启动页：位于内容区之外，data-tab=launcher 时内容区整体隐藏 -->
    <div v-show="artifact.panelMode === 'launcher'" class="ds-alaunch">
      <div class="ds-alaunch__inner">
        <div class="ds-launch-row ds-launch-row--input">
          <Icon name="search" :size="20" />
          <input
            type="text"
            class="ds-launch-row__field"
            placeholder="搜索或输入网址"
            aria-label="搜索或输入网址（原型占位，不跳转）"
          />
        </div>
        <button type="button" class="ds-launch-row">
          <Icon name="folder" :size="20" />
          <span>打开项目文件夹</span>
        </button>
        <button type="button" class="ds-launch-row">
          <Icon name="cloud" :size="20" />
          <span>打开云盘文件</span>
        </button>
        <button type="button" class="ds-launch-row">
          <Icon name="plus" :size="20" />
          <span>新建文件</span>
        </button>
        <button type="button" class="ds-launch-row">
          <Icon name="terminal" :size="20" />
          <span>打开终端</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { nextTick } from 'vue';
import Icon from '../../shared/ui/Icon.vue';
import ArtifactToolbar from './ArtifactToolbar.vue';
import DocumentPreview from './DocumentPreview.vue';
import FileTree from './FileTree.vue';
import { useArtifactStore } from './store';
import { iconForType } from '../../shared/lib/markdown';

const emit = defineEmits(['navigate']);
const artifact = useArtifactStore();

function activateTab(tab) {
  artifact.activate(tab.id);
  emit('navigate', tab.id);
}

function closeTab(tab) {
  const idx = artifact.tabs.findIndex((t) => t.id === tab.id);
  artifact.close(tab.id);
  const next = artifact.tabs[idx - 1] || artifact.tabs[idx] || null;
  emit('navigate', next ? next.id : null);
  nextTick(() => {
    const el = next
      ? document.querySelector(`.ds-atab[data-tab-id="${next.id}"]`)
      : document.querySelector('[data-action="tab-new"]');
    el?.focus();
  });
}

function newTab() {
  artifact.newTab();
  emit('navigate', null);
}

function closeLauncher() {
  artifact.close(':launcher:');
  artifact.openDefault();
  emit('navigate', artifact.activeId);
}

function onTabKeydown(event, tab) {
  const tabs = artifact.tabs;
  const idx = tabs.findIndex((t) => t.id === tab.id);
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    const next = (idx + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    artifact.activate(tabs[next].id);
    emit('navigate', tabs[next].id);
    nextTick(() => document.querySelector(`.ds-atab[data-tab-id="${tabs[next].id}"]`)?.focus());
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activateTab(tab);
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    closeTab(tab);
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    const target = event.key === 'Home' ? tabs[0] : tabs[tabs.length - 1];
    if (!target) return;
    artifact.activate(target.id);
    emit('navigate', target.id);
    nextTick(() => document.querySelector(`.ds-atab[data-tab-id="${target.id}"]`)?.focus());
  }
}
</script>
