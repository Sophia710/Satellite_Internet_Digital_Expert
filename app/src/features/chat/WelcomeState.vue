<template>
  <div data-component="welcome-state" class="ds-welcome">
    <div class="ds-welcome__hero">
      <h2 class="ds-welcome__greeting">你好，今天想完成什么任务</h2>
      <p class="ds-welcome__subtitle">从想法到成果，让 AI 帮你高效完成</p>
    </div>

    <!-- 输入框在新建对话页位于标题与快捷任务之间（不再贴底） -->
    <div class="ds-welcome__composer">
      <slot name="composer" />
    </div>

    <div class="ds-welcome__suggest-block">
      <div class="ds-welcome__suggest-head">
        <span class="ds-suggest__heading">快捷任务</span>
        <span class="ds-suggest__hint">选择一个模板快速开始</span>
      </div>
      <div class="ds-suggest" role="group" aria-label="快捷任务">
        <button
          v-for="task in tasks"
          :key="task.key"
          type="button"
          class="ds-suggest__card"
          :aria-label="task.title"
          :title="task.prompt"
          @click="emit('pick', task.prompt)"
        >
          <span class="ds-suggest__icon" aria-hidden="true">
            <Icon :name="task.icon" :size="16" />
          </span>
          <span class="ds-suggest__body">
            <span class="ds-suggest__title">{{ task.title }}</span>
            <span class="ds-suggest__desc">{{ task.prompt }}</span>
          </span>
          <Icon name="chevron-right" :size="16" icon-class="ds-suggest__chevron" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import Icon from '../../shared/ui/Icon.vue';

const emit = defineEmits(['pick']);

const tasks = [
  {
    key: 'delay',
    icon: 'clock',
    title: '天基时延分析',
    prompt: '请分析承载网时延日志数据，研判多轨卫星时延态势并生成趋势分析。'
  },
  {
    key: 'beam',
    icon: 'file-text',
    title: '通信波束日志分析',
    prompt: '请分析通信载荷测试日志，对比不同波束角度的质量与指标变化。'
  },
  {
    key: 'fault',
    icon: 'pencil',
    title: '故障案例分析',
    prompt: '请分析时序数据异常，结合历史故障案例定位异常区间和潜在原因。'
  },
  {
    key: 'telemetry',
    icon: 'chart-line',
    title: '遥测数据可视化',
    prompt: '请将遥测数据按时间轴与关键指标进行可视化，生成趋势图并标注异常区间。'
  }
];
</script>
