<template>
  <section class="ds-skills" aria-label="技能中心" @keydown.esc="handleEsc">
    <div class="ds-skills__frame">
      <header class="ds-skills__header">
      <div class="ds-skills__heading">
        <div class="ds-skills__title-row">
          <h1 class="ds-skills__title">技能中心</h1>
        </div>
        <p class="ds-skills__subtitle">浏览并使用技能，增强数字专家能力。</p>
      </div>

      <div class="ds-skills__actions">
        <label class="ds-skills__search">
          <Icon name="search" :size="18" />
          <input
            ref="searchInput"
            v-model="query"
            class="ds-skills__search-input"
            type="search"
            placeholder="搜索技能名称、用途或关键词"
            autocomplete="off"
            aria-label="搜索技能"
          />
          <button
            v-if="query"
            type="button"
            class="ds-skills__search-clear"
            aria-label="清空搜索"
            @click="query = ''"
          >
            <Icon name="x" :size="16" />
          </button>
        </label>
      </div>
    </header>

    <div class="ds-skills__body">
      <div class="ds-skills__list">
        <div class="ds-skills__list-head">
          <span>{{ query ? '搜索结果' : '全部技能' }}</span>
          <span v-if="query && filtered.length" class="ds-skills__list-hint">输入内容已实时匹配</span>
        </div>

        <div v-if="filtered.length" class="ds-skills__grid">
          <button
            v-for="skill in filtered"
            :key="skill.id"
            type="button"
            class="ds-skill-card"
            aria-haspopup="dialog"
            :aria-label="`查看${skill.name}技能详情`"
            @click="openSkill(skill, $event)"
          >
            <span class="ds-skill-card__head">
              <span class="ds-skill-card__icon" aria-hidden="true">{{ skillInitial(skill.name) }}</span>
              <span class="ds-skill-card__names">
                <span class="ds-skill-card__name">{{ skill.name }}</span>
                <span class="ds-skill-card__category">{{ skill.category }}</span>
              </span>
            </span>
            <span class="ds-skill-card__description">{{ skill.description }}</span>
          </button>
        </div>

        <div v-else class="ds-skills__empty">
          <span class="ds-skills__empty-icon">
            <Icon name="search" :size="22" />
          </span>
          <p class="ds-skills__empty-title">没有找到相关技能</p>
          <p class="ds-skills__empty-text">换一个关键词试试，或清空搜索查看全部技能。</p>
          <button type="button" class="ds-btn ds-btn--sm" @click="query = ''">清空搜索</button>
        </div>
      </div>
    </div>
    </div>

    <div v-if="activeSkill" class="ds-skill-modal" @click.self="closeSkill">
      <article
        class="ds-skill-modal__panel"
        role="dialog"
        aria-modal="true"
        :aria-label="`${activeSkill.name}技能详情`"
      >
        <header class="ds-skill-modal__head">
          <span class="ds-skill-modal__icon" aria-hidden="true">{{ skillInitial(activeSkill.name) }}</span>
          <div class="ds-skill-modal__title">
            <h2>{{ activeSkill.name }}</h2>
            <p>{{ activeSkill.category }}</p>
          </div>
          <button
            ref="modalClose"
            type="button"
            class="ds-icon-btn ds-skill-modal__close"
            aria-label="关闭技能详情"
            @click="closeSkill"
          >
            <Icon name="x" :size="18" />
          </button>
        </header>

        <div class="ds-skill-modal__body">
          <section class="ds-skills__section">
            <h3 class="ds-skills__section-title">技能说明</h3>
            <p class="ds-skills__description">{{ activeSkill.description }}</p>
          </section>

          <section class="ds-skills__section ds-skills__section--structure">
            <pre class="ds-skill-structure" aria-label="技能文件结构">{{ structureText }}</pre>
          </section>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import Icon from '../../shared/ui/Icon.vue';
import { filterSkills, skillStructure } from '../../services/skills';

const emit = defineEmits(['close']);

const query = ref('');
const activeSkill = ref(null);
const searchInput = ref(null);
const modalClose = ref(null);
let lastTrigger = null;

const filtered = computed(() => filterSkills(query.value));
const structureText = computed(() => (activeSkill.value ? skillStructure(activeSkill.value.id) : ''));

function skillInitial(name) {
  return String(name || '').trim().slice(0, 1);
}

function openSkill(skill, event) {
  lastTrigger = event?.currentTarget || null;
  activeSkill.value = skill;
  nextTick(() => modalClose.value?.focus());
}

function closeSkill() {
  const trigger = lastTrigger;
  activeSkill.value = null;
  lastTrigger = null;
  nextTick(() => trigger?.focus());
}

function handleEsc() {
  if (activeSkill.value) {
    closeSkill();
    return;
  }
  close();
}

function close() {
  emit('close');
}

onMounted(() => {
  nextTick(() => searchInput.value?.focus());
});
</script>
