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
            'ds-popover__item--submenu': hasChildren(item),
            'is-checked': item.checked,
            'is-submenu-open': state.subOpen && state.subParentIndex === index,
            'ds-popover__item--two-line': item.twoLine || item.desc,
            'is-focused': focusIndex === index
          }"
          :data-index="index"
          :aria-disabled="item.disabled ? 'true' : undefined"
          :aria-haspopup="hasChildren(item) ? 'menu' : undefined"
          :aria-expanded="hasChildren(item) ? String(state.subOpen && state.subParentIndex === index) : undefined"
          tabindex="-1"
          @click="activate(index, $event)"
          @mouseenter="onHover(index, $event)"
          @mouseleave="onItemLeave(index)"
        >
          <Icon v-if="item.icon" :name="item.icon" :size="18" icon-class="ds-popover__icon" />
          <span v-else class="ds-popover__icon" aria-hidden="true"></span>

          <span v-if="item.desc" class="ds-popover__texts">
            <span class="ds-popover__label">{{ item.label }}</span>
            <span class="ds-popover__desc">{{ item.desc }}</span>
          </span>
          <span v-else class="ds-popover__label">{{ item.label }}</span>

          <span v-if="item.shortcut && !hasChildren(item)" class="ds-popover__shortcut">{{ item.shortcut }}</span>
          <Icon
            v-if="hasChildren(item)"
            name="chevron-right"
            :size="16"
            icon-class="ds-popover__check ds-popover__check--chevron"
          />
          <Icon v-else name="check" :size="16" icon-class="ds-popover__check" />
        </button>
      </template>
    </div>

    <div
      v-if="state.open && state.subOpen"
      id="ds-popover-subpanel"
      ref="subPanelRef"
      class="ds-popover ds-popover--sub"
      role="menu"
      :aria-label="state.items[state.subParentIndex]?.label"
      :style="{ left: state.subLeft + 'px', top: state.subTop + 'px' }"
      @keydown="onSubKeydown"
      @mouseenter="cancelSubClose"
      @mouseleave="scheduleSubClose"
    >
      <template v-for="(item, index) in state.subItems" :key="index">
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
            'is-focused': subFocusIndex === index
          }"
          :data-sub-index="index"
          :aria-disabled="item.disabled ? 'true' : undefined"
          tabindex="-1"
          @click="activateSub(index)"
          @mouseenter="onSubHover(index)"
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
import {
  activatePopoverItem,
  activateSubItem,
  closePopover,
  closeSubmenu,
  openSubmenu,
  placePopover,
  placeSubmenu,
  popoverState as state
} from './popover';

const panelRef = ref(null);
const subPanelRef = ref(null);
const focusIndex = ref(-1);
const subFocusIndex = ref(-1);

let subOpenTimer = null;
let subCloseTimer = null;

function hasChildren(item) {
  return Array.isArray(item.children) && item.children.length > 0;
}

function enabledIndexes() {
  return state.items.map((it, i) => (it.divider || it.disabled ? -1 : i)).filter((i) => i >= 0);
}

function enabledSubIndexes() {
  return state.subItems.map((it, i) => (it.divider || it.disabled ? -1 : i)).filter((i) => i >= 0);
}

function focusAt(index) {
  const list = enabledIndexes();
  if (!list.length) return;
  const pos = list.indexOf(index);
  const target = list[(pos >= 0 ? pos : 0) % list.length];
  focusIndex.value = target;
  nextTick(() => {
    panelRef.value?.querySelector(`.ds-popover__item[data-index="${target}"]`)?.focus();
  });
}

function focusSubAt(index) {
  const list = enabledSubIndexes();
  if (!list.length) return;
  const pos = list.indexOf(index);
  const target = list[(pos >= 0 ? pos : 0) % list.length];
  subFocusIndex.value = target;
  nextTick(() => {
    subPanelRef.value?.querySelector(`.ds-popover__item[data-sub-index="${target}"]`)?.focus();
  });
}

function itemElement(index) {
  return panelRef.value?.querySelector(`.ds-popover__item[data-index="${index}"]`) || null;
}

function activate(index, event) {
  const item = state.items[index];
  if (!item || item.disabled) return;
  /* 已展开二级浮层时再次点击同级项 → 收起，而不是重复展开 */
  if (hasChildren(item) && state.subOpen && state.subParentIndex === index) {
    cancelSubClose();
    closeSubmenu();
    return;
  }
  activatePopoverItem(index, event?.currentTarget || itemElement(index));
}

function activateSub(index) {
  activateSubItem(index);
}

function openSubFor(index, { focusFirst = false } = {}) {
  const item = state.items[index];
  if (!hasChildren(item)) return;
  cancelSubClose();
  openSubmenu(itemElement(index), item.children, index);
  if (focusFirst) {
    nextTick(() => focusSubAt(enabledSubIndexes()[0]));
  } else {
    subFocusIndex.value = -1;
  }
}

function cancelSubOpen() {
  clearTimeout(subOpenTimer);
  subOpenTimer = null;
}

function cancelSubClose() {
  clearTimeout(subCloseTimer);
  subCloseTimer = null;
}

function scheduleSubOpen(index) {
  const item = state.items[index];
  cancelSubOpen();
  cancelSubClose();
  if (!hasChildren(item)) {
    if (state.subOpen && state.subParentIndex !== index) closeSubmenu();
    return;
  }
  if (state.subOpen && state.subParentIndex === index) return;
  subOpenTimer = setTimeout(() => openSubFor(index), 120);
}

function scheduleSubClose() {
  cancelSubOpen();
  cancelSubClose();
  subCloseTimer = setTimeout(() => closeSubmenu(), 140);
}

function onHover(index, event) {
  if (event.currentTarget.getAttribute('aria-disabled') === 'true') return;
  focusIndex.value = index;
  scheduleSubOpen(index);
}

function onItemLeave(index) {
  cancelSubOpen();
  const item = state.items[index];
  if (hasChildren(item) && state.subOpen && state.subParentIndex === index) {
    scheduleSubClose();
  } else if (state.subOpen) {
    closeSubmenu();
  }
}

function onSubHover(index) {
  subFocusIndex.value = index;
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
    case 'ArrowRight':
      if (focusIndex.value >= 0 && hasChildren(state.items[focusIndex.value])) {
        event.preventDefault();
        openSubFor(focusIndex.value, { focusFirst: true });
      }
      break;
    case 'Enter':
    case ' ':
      if (focusIndex.value >= 0) {
        event.preventDefault();
        const index = focusIndex.value;
        const item = state.items[index];
        if (hasChildren(item)) openSubFor(index, { focusFirst: true });
        else activate(index);
      }
      break;
    case 'Escape':
      event.preventDefault();
      event.stopPropagation();
      if (state.subOpen) closeSubmenu();
      else closePopover();
      break;
    case 'Tab':
      closePopover();
      break;
  }
}

function onSubKeydown(event) {
  const list = enabledSubIndexes();
  if (!list.length) return;
  const pos = list.indexOf(subFocusIndex.value);
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      focusSubAt(list[(pos + 1 + list.length) % list.length]);
      break;
    case 'ArrowUp':
      event.preventDefault();
      focusSubAt(list[(pos - 1 + list.length) % list.length]);
      break;
    case 'Home':
      event.preventDefault();
      focusSubAt(list[0]);
      break;
    case 'End':
      event.preventDefault();
      focusSubAt(list[list.length - 1]);
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (subFocusIndex.value >= 0) activateSub(subFocusIndex.value);
      break;
    case 'ArrowLeft':
    case 'Escape':
      event.preventDefault();
      event.stopPropagation();
      closeSubmenu();
      focusAt(state.subParentIndex);
      break;
    case 'Tab':
      closePopover();
      break;
  }
}

function onPointerDown(event) {
  if (!state.open) return;
  const panel = panelRef.value;
  const subPanel = subPanelRef.value;
  const anchor = state.anchor;
  if (panel?.contains(event.target)) return;
  if (subPanel?.contains(event.target)) return;
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
  cancelSubOpen();
  cancelSubClose();
});

watch(
  () => state.open,
  (open) => {
    if (open) {
      focusIndex.value = -1;
      subFocusIndex.value = -1;
      nextTick(() => {
        if (panelRef.value) placePopover(panelRef.value);
        const first = enabledIndexes()[0];
        if (first !== undefined) focusAt(first);
      });
    } else {
      closeSubmenu();
      cancelSubOpen();
      cancelSubClose();
    }
  }
);

watch(
  () => state.subOpen,
  (open) => {
    if (open) {
      nextTick(() => {
        if (subPanelRef.value) placeSubmenu(subPanelRef.value);
      });
    }
  }
);
</script>
