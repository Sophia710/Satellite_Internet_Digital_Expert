<template>
  <section class="ds-shell__center">
    <header class="ds-shell__center-header">
      <button
        type="button"
        class="ds-icon-btn"
        data-action="left-toggle"
        :aria-label="shell.leftCollapsed ? '展开左栏' : '折叠左栏'"
        :aria-expanded="shell.leftCollapsed ? 'false' : 'true'"
        @click="shell.toggleLeft()"
      >
        <Icon name="panel-left" :size="18" />
      </button>

      <div class="ds-shell__header-slot" data-region="center-header">
        <div class="pw-head">
          <div v-if="chat.generating && chat.title" data-component="conversation-header" class="ds-convhead pw-head__main">
            <span class="ds-convhead__title">{{ chat.title }}</span>
          </div>
          <span class="pw-head__spacer" aria-hidden="true"></span>
        </div>
      </div>

      <button
        v-if="!shell.rightOpen"
        type="button"
        class="ds-icon-btn ds-shell__right-open"
        data-action="right-open"
        aria-label="打开产物面板"
        aria-expanded="false"
        @click="shell.setRightOpen(true)"
      >
        <Icon name="panel-right" :size="18" />
      </button>
    </header>

    <div ref="scrollRef" class="ds-shell__scroll" data-region="conversation" @scroll="onScroll">
      <WelcomeState v-if="isWelcome" @pick="prefill">
        <template #composer>
          <ComposerBox
            ref="composerRef"
            :conversation-id="chat.conversationId"
            :generating="chat.generating"
            @submit="onSubmit"
            @stop="chat.stop()"
          />
        </template>
      </WelcomeState>
      <MessageTurn v-else />
    </div>

    <div v-if="!isWelcome" class="ds-shell__composer" data-region="composer">
      <ComposerBox
        ref="composerRef"
        :conversation-id="chat.conversationId"
        :generating="chat.generating"
        @submit="onSubmit"
        @stop="chat.stop()"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import Icon from '../../shared/ui/Icon.vue';
import ComposerBox from '../composer/ComposerBox.vue';
import WelcomeState from './WelcomeState.vue';
import MessageTurn from './MessageTurn.vue';
import { useChatStore } from './store';
import { useShellStore } from '../shell/store';

const emit = defineEmits(['open']);
const chat = useChatStore();
const shell = useShellStore();

const scrollRef = ref(null);
const composerRef = ref(null);
let pinned = true;

/* 新建对话页：输入框在标题与快捷任务之间；进入对话后回到底部停靠 */
const isWelcome = computed(() => chat.mode !== 'thread');

function onScroll() {
  const el = scrollRef.value;
  if (!el) return;
  pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
}

function pinBottom(force = false) {
  nextTick(() => {
    const el = scrollRef.value;
    if (!el) return;
    if (!pinned && !force) return;
    const toBottom = () => {
      el.scrollTop = el.scrollHeight;
    };
    toBottom();
    // 字体/图标/换行会让内容在下一帧继续长高，补两次贴底
    requestAnimationFrame(toBottom);
    setTimeout(toBottom, 120);
  });
}

onMounted(() => {
  pinned = true;
  pinBottom(true);
});

function prefill(prompt) {
  composerRef.value?.setText(prompt);
}

function onSubmit(value) {
  const id = chat.send(value);
  if (id) emit('open', id);
  pinned = true;
  pinBottom(true);
}

/* 揭示内容与步骤推进时贴底跟随（距底 <160px 才跟随） */
watch(
  () => [chat.reveals.md, chat.reveals.code, chat.reveals.cites, chat.reveals.cards, chat.doneSteps, chat.mode],
  () => pinBottom(),
  { flush: 'post' }
);

watch(
  () => chat.conversationId,
  () => {
    pinned = true;
    pinBottom(true);
  }
);

/* 发出首条消息后输入框从欢迎区搬到页脚，焦点跟着走，避免“打字打到一半没了光标” */
watch(
  () => chat.mode,
  async (mode) => {
    if (mode !== 'thread') return;
    await nextTick();
    composerRef.value?.focus();
    pinBottom(true);
  }
);

defineExpose({ prefill, focusComposer: () => composerRef.value?.focus() });
</script>
