<template>
  <Teleport to="body">
    <div
      v-if="state.open"
      id="ds-popover-panel"
      ref="panelRef"
      class="ds-popover"
      role="menu"
      :style="{ left: state.left + 'px', top: state.top + 'px' }"
      @keydown="onKeydown"
    >
      <template v-for="(item, index) in state.items" :key="index">
        <div v-if="item.divider" class="ds-popover__separator" role="separator"></div>
        <button
          v-else
          type="button"
          role="menuitem"
          class="ds-popover__item"
          :class="{
            'ds-popover__item--danger': item.danger,
            'is-checked': item.checked,
            'ds-popover__item--two-line': item.twoLine || item.desc,
            'is-focused': focusIndex === index
          }"
          :data-index="index"
          :aria-disabled="item.disabled ? 'true' : undefined"
          tabindex="-1"
          @click="activate(index)"
          @mouseenter="onHover(index, $event)"
        >
          <Icon v-if="item.icon" :name="item.icon" :size="18" icon-class="ds-popover__icon" />
          <span v-else class="ds-popover__icon" aria-hidden="true"></span>

          <span v-if="item.desc" class="ds-popover__texts">
            <span class="ds-popover__label">{{ item.label }}</span>
            <span class="ds-popover__desc">{{ item.desc }}</span>
          </span>
          <span v-else class="ds-popover__label">{{ item.label }}</span>

          <span v-if="item.shortcut" class="ds-popover__shortcut">{{ item.shortcut }}</span>
          <Icon name="check" :size="16" icon-class="ds-popover__check" />
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import { activatePopoverItem, closePopover, placePopover, popoverState as state } from './popover';

const panelRef = ref(null);
const focusIndex = ref(-1);

function enabledIndexes() {
  return state.items.map((it, i) => (it.divider || it.disabled ? -1 : i)).filter((i) => i >= 0);
}

function focusAt(index) {
  const list = enabledIndexes();
  if (!list.length) return;
  const pos = list.indexOf(index);
  const target = list[(pos + list.length) % list.length];
  focusIndex.value = target;
  nextTick(() => {
    panelRef.value?.querySelector(`.ds-popover__item[data-index="${target}"]`)?.focus();
  });
}

function activate(index) {
  activatePopoverItem(index);
}

function onHover(index, event) {
  if (event.currentTarget.getAttribute('aria-disabled') === 'true') return;
  focusIndex.value = index;
}

function onKeydown(event) {
  const list = enabledIndexes();
  if (!list.length) return;
  const pos = list.indexOf(focusIndex.value);
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      focusAt(list[(pos + 1 + list.length) % list.length]);
      break;
    case 'ArrowUp':
      event.preventDefault();
      focusAt(list[(pos - 1 + list.length) % list.length]);
      break;
    case 'Home':
      event.preventDefault();
      focusAt(list[0]);
      break;
    case 'End':
      event.preventDefault();
      focusAt(list[list.length - 1]);
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (focusIndex.value >= 0) activate(focusIndex.value);
      break;
    case 'Escape':
      event.preventDefault();
      event.stopPropagation();
      closePopover();
      break;
    case 'Tab':
      closePopover();
      break;
  }
}

function onPointerDown(event) {
  if (!state.open) return;
  const panel = panelRef.value;
  const anchor = state.anchor;
  if (panel?.contains(event.target)) return;
  if (anchor?.contains?.(event.target) || anchor === event.target) return;
  closePopover(false);
}

const onViewportChange = () => closePopover(false);

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('resize', onViewportChange, true);
  window.addEventListener('scroll', onViewportChange, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown, true);
  window.removeEventListener('resize', onViewportChange, true);
  window.removeEventListener('scroll', onViewportChange, true);
});

watch(
  () => state.open,
  (open) => {
    if (open) {
      focusIndex.value = -1;
      nextTick(() => {
        if (panelRef.value) placePopover(panelRef.value);
        const first = enabledIndexes()[0];
        if (first !== undefined) focusAt(first);
      });
    }
  }
);
</script>
