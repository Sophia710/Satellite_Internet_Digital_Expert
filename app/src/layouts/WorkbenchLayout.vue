<template>
  <div
    data-component="workbench-shell"
    class="ds-shell"
    :class="{ 'ds-shell--dragging': dragging }"
    :data-left="shell.leftState"
    :data-right="shell.rightState"
    :data-ready="shell.ready ? '1' : '0'"
    :style="{ '--shell-right-w': `${shell.rightWidth}px` }"
  >
    <aside class="ds-shell__left" aria-label="工作台侧边栏">
      <div class="ds-shell__left-body" data-region="left-body">
        <slot name="left" />
      </div>
    </aside>

    <slot name="center" />

    <div
      class="ds-shell__resize"
      role="separator"
      aria-orientation="vertical"
      tabindex="0"
      aria-label="调整产物面板宽度"
      :aria-valuemin="shell.widthMin"
      :aria-valuemax="shell.widthMax"
      :aria-valuenow="shell.rightWidth"
      @pointerdown="startResize"
      @keydown="onResizeKeydown"
    ></div>

    <aside class="ds-shell__right" aria-label="产物面板">
      <header class="ds-shell__right-header">
        <span class="ds-shell__right-title">产物</span>
        <button
          type="button"
          class="ds-icon-btn"
          data-action="right-close"
          aria-label="关闭产物面板"
          aria-expanded="true"
          @click="shell.setRightOpen(false)"
        >
          <Icon name="panel-right" :size="18" />
        </button>
      </header>
      <div class="ds-shell__right-scroll" data-region="artifact">
        <slot name="right" />
      </div>
    </aside>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import Icon from '../shared/ui/Icon.vue';
import { useShellStore } from '../features/shell/store';

const shell = useShellStore();
const dragging = ref(false);

/* 右栏锚定视口右缘：宽度 = 视口宽 - 指针 X，指针在哪宽度就在哪（与原型同口径） */
function onPointerMove(event) {
  if (!dragging.value) return;
  shell.setRightWidth(window.innerWidth - event.clientX, { persist: false });
}

function stopResize() {
  if (!dragging.value) return;
  dragging.value = false;
  document.body.classList.remove('ds-is-resizing');
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', stopResize);
  window.removeEventListener('pointercancel', stopResize);
  shell.setRightWidth(shell.rightWidth);
}

function startResize(event) {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  dragging.value = true;
  shell.reclamp();
  shell.setRightWidth(window.innerWidth - event.clientX, { persist: false });
  document.body.classList.add('ds-is-resizing');
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', stopResize);
  window.addEventListener('pointercancel', stopResize);
}

/* ← 加宽 / → 收窄；Home = 最小 320，End = 当前视口允许的最大（原型 3428 同键位） */
function onResizeKeydown(event) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    shell.stepRightWidth(1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    shell.stepRightWidth(-1);
  } else if (event.key === 'Home') {
    event.preventDefault();
    shell.setRightWidth(shell.widthMin);
  } else if (event.key === 'End') {
    event.preventDefault();
    shell.reclamp();
    shell.setRightWidth(shell.widthMax);
  }
}

function onViewportResize() {
  shell.reclamp();
}

onMounted(() => {
  shell.applyTheme();
  shell.reclamp();
  window.addEventListener('resize', onViewportResize);
  requestAnimationFrame(() => shell.markReady());
});

onBeforeUnmount(() => {
  stopResize();
  window.removeEventListener('resize', onViewportResize);
});
</script>
