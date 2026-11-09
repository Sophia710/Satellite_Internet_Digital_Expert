<template>
  <div
    data-component="document-preview"
    class="ds-aviews"
    :data-kind="tab.kind"
    :data-format="tab.format"
    :data-mode="tab.mode"
    data-state="ready"
  >
    <!-- 网页预览 -->
    <div v-if="view === 'web'" class="ds-aview ds-aview--web" data-view="web">
      <div class="ds-webpage">
        <article class="ds-webpage__page" v-html="renderedHtml"></article>
      </div>
    </div>

    <!-- 未登记格式：宁可提示不支持，也不要把 Markdown 正文显示在别的产物标题下 -->
    <div v-else-if="view === 'unsupported'" class="ds-aview ds-aview--unsupported" data-view="unsupported">
      <p class="ds-unsupported__text">此格式暂不支持预览</p>
    </div>

    <!-- Markdown / 文档预览（只读视图） -->
    <div v-else-if="view === 'doc'" class="ds-aview ds-aview--doc" data-view="doc">
      <article class="ds-preview" v-html="renderedMd"></article>
    </div>

    <!-- Markdown 源码编辑 -->
    <div v-else-if="view === 'mdedit'" class="ds-aview ds-aview--edit" data-view="mdedit">
      <div class="ds-editor">
        <div class="ds-editor__bar">
          <span class="ds-editor__name">Markdown 源码</span>
          <span class="ds-editor__hint">输入即自动保存，切到预览查看排版效果</span>
        </div>
        <textarea
          v-model="mdDraft"
          class="ds-editor__area"
          spellcheck="false"
          aria-label="Markdown 源码编辑区"
          @input="scheduleSave"
        ></textarea>
      </div>
    </div>

    <!-- HTML 源码编辑 -->
    <div v-else-if="view === 'htmledit'" class="ds-aview ds-aview--edit" data-view="htmledit">
      <div class="ds-editor">
        <div class="ds-editor__bar">
          <span class="ds-editor__name">HTML 源码</span>
          <span class="ds-editor__hint">输入即自动保存，切到预览查看渲染效果</span>
        </div>
        <textarea
          v-model="htmlDraft"
          class="ds-editor__area"
          spellcheck="false"
          aria-label="HTML 源码编辑区"
          @input="scheduleSave"
        ></textarea>
      </div>
    </div>

    <!-- 图片产物（只读） -->
    <div v-else-if="view === 'image'" class="ds-aview ds-aview--image" data-view="image">
      <figure class="ds-image">
        <div class="ds-image__canvas">
          <img class="ds-image__img" :src="imageSrc" :alt="tab.name" />
        </div>
        <figcaption class="ds-image__bar">
          <span class="ds-image__name">{{ tab.name }}</span>
          <span class="ds-image__meta">PNG · 1200 × 760 · 只读预览</span>
        </figcaption>
      </figure>
    </div>

    <!-- 表格预览 -->
    <div v-else-if="view === 'sheet'" class="ds-aview ds-aview--sheet" data-view="sheet">
      <div class="ds-sheet">
        <div class="ds-sheet__bar">
          <span class="ds-sheet__name">{{ sheetName }}</span>
          <span class="ds-sheet__range">{{ sheetRange }}</span>
        </div>
        <div class="ds-sheet__scroll">
          <table class="ds-sheet__grid" aria-label="表格预览">
            <thead>
              <tr>
                <th aria-hidden="true"></th>
                <th v-for="(head, i) in sheetHeads" :key="head + i" scope="col">{{ SHEET_LETTERS[i] }} · {{ head }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, r) in sheetRows" :key="r">
                <td class="ds-sheet__rowhead">{{ r + 1 }}</td>
                <td v-for="(cell, c) in row" :key="c" :class="{ 'ds-sheet__flag': c === row.length - 1 }">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="ds-sheet__tabs">
          <span class="ds-sheet__tab is-active">{{ sheetName }}</span>
          <span class="ds-sheet__tab ds-sheet__tab--sum">汇总</span>
        </div>
      </div>
    </div>

    <!-- Word 文档只读预览 -->
    <div v-else-if="view === 'page'" class="ds-aview ds-aview--page" data-view="page">
      <article class="ds-page">
        <h2 class="ds-page__title">{{ pageTitle }}</h2>
        <p class="ds-page__meta">时延专项 · 2026-11-08 · 内部</p>
        <div class="ds-page__body">
          <p v-for="(para, i) in docParas" :key="i" class="ds-page__p">{{ para }}</p>
        </div>
        <p class="ds-page__note">Word 文档在此只读预览，编辑与导出请在 Office 中完成。</p>
      </article>
    </div>

    <!-- 演示文稿只读预览 -->
    <div v-else-if="view === 'slide'" class="ds-aview ds-aview--slide" data-view="slide">
      <div class="ds-slide-wrap">
        <article class="ds-slide">
          <span class="ds-slide__eyebrow">时延专项 · 周例会</span>
          <h2 class="ds-slide__title">{{ slideTitle }}</h2>
          <ul class="ds-slide__list">
            <li v-for="(bullet, i) in slideBullets" :key="i">{{ bullet }}</li>
          </ul>
        </article>
        <p class="ds-slide__note">演示文稿在此只读预览，编辑请在 PowerPoint 中完成。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { mdToHtml, sanitizeHtml, splitPipes, viewFor, SHEET_LETTERS } from '../../shared/lib/markdown';
import { MD_SOURCE, artifactSeed, htmlSourceFor, imageSourceFor } from '../../services/artifacts';

const props = defineProps({
  tab: { type: Object, required: true }
});
const emit = defineEmits(['saved']);

const mdDraft = ref(MD_SOURCE);
const htmlDraft = ref(htmlSourceFor(props.tab.id));

const view = computed(() => viewFor(props.tab.format, props.tab.mode));
const imageSrc = computed(() => imageSourceFor(props.tab.id));
const renderedMd = computed(() => mdToHtml(mdDraft.value));
const renderedHtml = computed(() => sanitizeHtml(htmlDraft.value));

/* 表格：表头 | 分隔，行末列作为状态列 */
const sheetHeads = computed(() => splitPipes(artifactSeed.sheet.heads));
const sheetRows = computed(() => artifactSeed.sheet.rows.map((row) => splitPipes(row)));
const sheetRange = computed(() => `A1:${SHEET_LETTERS[sheetHeads.value.length - 1]}${sheetRows.value.length + 1}`);
const sheetName = computed(() => {
  const base = props.tab.name.replace(/\.[a-z0-9]+$/i, '');
  return base;
});

const pageTitle = computed(() => props.tab.name.replace(/\.[a-z0-9]+$/i, ''));
const docParas = computed(() => artifactSeed.docx.paras);
const slideTitle = computed(() => '多轨卫星时延态势本周判断');
const slideBullets = computed(() => artifactSeed.ppt.bullets);

/* 输入 400ms 节流后标记「已保存」 */
let saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => emit('saved'), 400);
}

watch(
  () => props.tab.id,
  (id) => {
    clearTimeout(saveTimer);
    /* 切页签要换源：否则上一个文件的编辑内容会串到下一个文件 */
    mdDraft.value = MD_SOURCE;
    htmlDraft.value = htmlSourceFor(id);
  }
);
</script>
