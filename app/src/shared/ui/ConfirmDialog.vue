<template>
  <Teleport to="body">
    <div
      v-if="state.open"
      class="ds-dialog is-open"
      @keydown="onKeydown"
    >
      <div class="ds-dialog__scrim" @click="settleDialog(false)"></div>
      <div class="ds-dialog__panel" role="alertdialog" aria-modal="true">
        <div class="ds-dialog__head">
          <Icon v-if="state.danger" name="alert-triangle" :size="20" icon-class="ds-dialog__icon" />
          <h2 class="ds-dialog__title">{{ state.title }}</h2>
        </div>
        <p class="ds-dialog__body">{{ state.body }}</p>
        <div class="ds-dialog__actions">
          <button ref="cancelRef" type="button" class="ds-btn ds-dialog__cancel" @click="settleDialog(false)">
            {{ state.cancelText }}
          </button>
          <button
            ref="confirmRef"
            type="button"
            class="ds-btn ds-dialog__confirm"
            :class="state.danger ? 'ds-btn--danger' : 'ds-btn--primary'"
            @click="settleDialog(true)"
          >
            {{ state.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue';
import Icon from './Icon.vue';
import { dialogState as state, settleDialog } from './dialog';

const cancelRef = ref(null);
const confirmRef = ref(null);

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    settleDialog(false);
    return;
  }
  if (event.key === 'Tab') {
    // 手动焦点循环：Tab 永不出面板
    event.preventDefault();
    const focusables = [cancelRef.value, confirmRef.value];
    const idx = focusables.indexOf(document.activeElement);
    const next = (idx + (event.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
    focusables[next]?.focus();
  }
}

watch(
  () => state.open,
  (open) => {
    if (open) nextTick(() => cancelRef.value?.focus());
  }
);
</script>
