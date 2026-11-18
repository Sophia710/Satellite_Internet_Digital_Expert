<template>
  <section
    ref="root"
    class="ds-mcp"
    tabindex="-1"
    aria-label="MCP 连接器"
    @keydown.esc="emit('close')"
  >
    <div class="ds-mcp__scroll">
      <div class="ds-mcp__content">
        <header class="ds-mcp__header">
          <h1 class="ds-mcp__title">MCP</h1>
          <p class="ds-mcp__subtitle">为对话连接波束和时延分析工具。</p>
        </header>

        <div class="ds-mcp__grid">
          <McpConnectorCard
            v-for="connector in connectors"
            :key="connector.name"
            v-bind="connector"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import McpConnectorCard from './McpConnectorCard.vue';

const emit = defineEmits(['close']);
const root = ref(null);

const connectors = [
  {
    name: '通信波束分析',
    initialStatus: 'connected',
    initialMode: 'local',
    initialEndpoint: 'http://127.0.0.1:8901/mcp',
    localEndpoint: 'http://127.0.0.1:8901/mcp',
    localAddress: 'http://127.0.0.1:8901',
    remoteAddress: 'http://127.0.0.1:8901/mcp',
    account: 'admin',
    password: 'admin123'
  },
  {
    name: '天基时延分析',
    initialStatus: 'disconnected',
    initialMode: 'local',
    localEndpoint: 'http://127.0.0.1:8680/satellite_backend/mcp',
    localAddress: 'http://127.0.0.1:8680/satellite_backend/api',
    remoteAddress: 'http://127.0.0.1:8680/mcp',
    account: 'admin',
    password: 'admin123'
  }
];

onMounted(() => {
  root.value?.focus();
});
</script>
