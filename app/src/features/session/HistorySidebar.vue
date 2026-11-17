<template>
  <div class="pw-left">
    <div data-component="brand-header" class="ds-brand">
      <span class="ds-brand__logo">
        <Icon name="sparkles" :size="18" />
      </span>
      <span class="ds-brand__name">卫星互联网数字专家</span>
    </div>

    <div class="pw-new">
      <button type="button" class="ds-btn ds-btn--primary ds-btn--block pw-new__btn" @click="emit('new')">
        <Icon name="plus" :size="18" />
        <span class="ds-btn__label">新建会话</span>
      </button>
    </div>

    <nav class="pw-tools" aria-label="工具">
      <div class="pw-tools__title">工具</div>
      <button
        type="button"
        class="pw-tools__item"
        :class="{ 'is-active': skillsOpen }"
        :aria-current="skillsOpen ? 'page' : undefined"
        @click="emit('skills')"
      >
        <span class="pw-tools__icon">
          <Icon name="grid" :size="18" />
        </span>
        <span class="pw-tools__label">技能中心</span>
      </button>
    </nav>

    <HistoryTree
      :selection-muted="skillsOpen"
      @open="(id) => emit('open', id)"
      @deleted="(id) => emit('deleted', id)"
    />

    <div data-component="user-card" class="ds-usercard">
      <span class="ds-usercard__avatar">秦</span>
      <span class="ds-usercard__name">秦怡宁</span>
    </div>
  </div>
</template>

<script setup>
import Icon from '../../shared/ui/Icon.vue';
import HistoryTree from './HistoryTree.vue';

defineProps({
  skillsOpen: { type: Boolean, default: false }
});

const emit = defineEmits(['new', 'open', 'deleted', 'skills']);
</script>
