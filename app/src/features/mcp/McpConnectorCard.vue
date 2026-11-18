<template>
  <article class="ds-mcp-card" :aria-label="`${name} 连接器`">
    <header class="ds-mcp-card__head">
      <h2 class="ds-mcp-card__title">{{ name }}</h2>
      <p class="ds-mcp-card__status" aria-live="polite">
        <span class="ds-mcp-card__dot" :class="statusDotClass" aria-hidden="true"></span>
        <span>{{ statusLabel }}</span>
        <span v-if="isConnected && endpoint" class="ds-mcp-card__endpoint">· {{ endpoint }}</span>
      </p>
    </header>

    <div v-if="isConnected" class="ds-mcp-card__connected">
      <div class="ds-mcp-card__actions">
        <button type="button" class="ds-btn" :disabled="isTesting" @click="testConnection">
          {{ isTesting ? '测试中…' : '测试连接' }}
        </button>
        <button type="button" class="ds-btn" @click="disconnect">
          {{ mode === 'local' ? '停止适配器' : '断开连接' }}
        </button>
      </div>
    </div>

    <form v-else class="ds-mcp-card__form" @submit.prevent="connect">
      <label class="ds-mcp-field">
        <span class="ds-mcp-field__label">连接方式</span>
        <span class="ds-mcp-select">
          <select v-model="mode" aria-label="连接方式" @change="clearMessages">
            <option value="local">启动本机适配器</option>
            <option value="remote">连接已有 MCP</option>
          </select>
          <Icon name="chevron-down" :size="16" />
        </span>
      </label>

      <template v-if="mode === 'local'">
        <label class="ds-mcp-field">
          <span class="ds-mcp-field__label">系统地址（含 API 部署前缀）</span>
          <input
            v-model.trim="localAddress"
            class="ds-mcp-field__input"
            type="text"
            inputmode="url"
            autocomplete="off"
            spellcheck="false"
            placeholder="http://127.0.0.1:8901"
            @input="clearMessages"
          />
        </label>
        <label class="ds-mcp-field">
          <span class="ds-mcp-field__label">管理员账号</span>
          <input
            v-model.trim="account"
            class="ds-mcp-field__input"
            type="text"
            autocomplete="off"
            placeholder="请输入管理员账号"
            @input="clearMessages"
          />
        </label>
        <label class="ds-mcp-field">
          <span class="ds-mcp-field__label">管理员密码</span>
          <input
            v-model="password"
            class="ds-mcp-field__input"
            type="password"
            autocomplete="off"
            placeholder="请输入管理员密码"
            @input="clearMessages"
          />
        </label>
      </template>

      <template v-else>
        <label class="ds-mcp-field">
          <span class="ds-mcp-field__label">MCP 地址（含 /mcp）</span>
          <input
            v-model.trim="remoteAddress"
            class="ds-mcp-field__input"
            type="text"
            inputmode="url"
            autocomplete="off"
            spellcheck="false"
            placeholder="http://127.0.0.1:8901/mcp"
            @input="clearMessages"
          />
        </label>
        <label class="ds-mcp-field">
          <span class="ds-mcp-field__label">MCP 令牌</span>
          <input
            v-model.trim="token"
            class="ds-mcp-field__input"
            type="password"
            autocomplete="off"
            placeholder="请输入 MCP 令牌"
            @input="clearMessages"
          />
        </label>
      </template>

      <p v-if="error" class="ds-mcp-card__error" aria-live="polite">{{ error }}</p>

      <button type="submit" class="ds-btn ds-btn--primary ds-mcp-card__submit" :disabled="isConnecting">
        {{ isConnecting ? '连接中…' : mode === 'local' ? '启动并连接' : '连接' }}
      </button>
    </form>

    <p v-if="feedback" class="ds-mcp-card__feedback" aria-live="polite">{{ feedback }}</p>
  </article>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import Icon from '../../shared/ui/Icon.vue';

const props = defineProps({
  name: { type: String, required: true },
  initialStatus: { type: String, default: 'disconnected' },
  initialMode: { type: String, default: 'local' },
  initialEndpoint: { type: String, default: '' },
  localEndpoint: { type: String, default: '' },
  localAddress: { type: String, default: '' },
  remoteAddress: { type: String, default: '' },
  account: { type: String, default: 'admin' },
  password: { type: String, default: 'admin123' }
});

const mode = ref(props.initialMode);
const status = ref(props.initialStatus === 'connected' ? 'connected' : 'disconnected');
const endpoint = ref(
  props.initialStatus === 'connected' ? props.initialEndpoint || props.localEndpoint : ''
);
const localAddress = ref(props.localAddress);
const remoteAddress = ref(props.remoteAddress);
const account = ref(props.account);
const password = ref(props.password);
const token = ref('');
const error = ref('');
const feedback = ref('');
const isTesting = ref(false);
const isConnecting = ref(false);

let connectTimer = 0;
let testTimer = 0;
let feedbackTimer = 0;

const isConnected = computed(() => status.value === 'connected');

const statusLabel = computed(() => {
  if (isConnecting.value) return '连接中';
  if (isConnected.value) return '已连接';
  return '未连接';
});

const statusDotClass = computed(() => ({
  'is-connected': isConnected.value,
  'is-connecting': isConnecting.value
}));

function clearFeedbackTimer() {
  if (feedbackTimer) {
    window.clearTimeout(feedbackTimer);
    feedbackTimer = 0;
  }
}

function scheduleFeedbackClear() {
  clearFeedbackTimer();
  feedbackTimer = window.setTimeout(() => {
    feedback.value = '';
    feedbackTimer = 0;
  }, 2600);
}

function clearMessages() {
  error.value = '';
  feedback.value = '';
  clearFeedbackTimer();
}

function connect() {
  clearMessages();

  if (mode.value === 'local') {
    if (!localAddress.value.trim()) {
      error.value = '请填写系统地址';
      return;
    }
    if (!account.value.trim()) {
      error.value = '请填写管理员账号';
      return;
    }
    if (!password.value.trim()) {
      error.value = '请填写管理员密码';
      return;
    }
  } else {
    if (!remoteAddress.value.trim()) {
      error.value = '请填写 MCP 地址';
      return;
    }
    if (!token.value.trim()) {
      error.value = '请填写 MCP 令牌';
      return;
    }
  }

  isConnecting.value = true;
  connectTimer = window.setTimeout(() => {
    endpoint.value =
      mode.value === 'local'
        ? props.localEndpoint || localAddress.value.trim()
        : remoteAddress.value.trim();
    status.value = 'connected';
    isConnecting.value = false;
    feedback.value = '连接成功';
    scheduleFeedbackClear();
    connectTimer = 0;
  }, 900);
}

function testConnection() {
  if (isTesting.value) return;
  clearMessages();
  isTesting.value = true;
  testTimer = window.setTimeout(() => {
    isTesting.value = false;
    feedback.value = '连接正常';
    scheduleFeedbackClear();
    testTimer = 0;
  }, 700);
}

function disconnect() {
  clearFeedbackTimer();
  status.value = 'disconnected';
  endpoint.value = '';
  error.value = '';
  feedback.value = mode.value === 'local' ? '已停止适配器' : '已断开连接';
  scheduleFeedbackClear();
}

onBeforeUnmount(() => {
  if (connectTimer) window.clearTimeout(connectTimer);
  if (testTimer) window.clearTimeout(testTimer);
  clearFeedbackTimer();
});
</script>
