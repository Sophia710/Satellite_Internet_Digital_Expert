<template>
  <span
    v-if="meta"
    class="ds-task-state"
    :data-status="meta.key"
    :title="`任务状态：${meta.label}`"
    :aria-label="`任务状态：${meta.label}`"
  >
    <span v-if="meta.key === 'running'" class="ds-task-state__spinner" aria-hidden="true"></span>
    <span class="ds-task-state__label">{{ meta.label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: { type: String, default: '' }
});

const STATES = {
  running: { key: 'running', label: '进行中' },
  completed: { key: 'completed', label: '完成' },
  failed: { key: 'failed', label: '失败' },
  waiting: { key: 'waiting', label: '待确认' }
};

const meta = computed(() => STATES[props.status] || null);
</script>
