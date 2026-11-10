<template>
  <div class="ds-composer-stage">
    <div class="ds-composer" data-region="composer" :data-conversation-id="conversationId || 'default'">
      <div v-show="attachments.length" class="ds-attach-row">
        <span v-for="file in attachments" :key="file.uid" class="ds-attach-chip" :data-type="file.type">
          <Icon :name="iconForType(file.type)" :size="16" icon-class="ds-attach-chip__icon" />
          <span class="ds-attach-chip__name">{{ file.name }}</span>
          <button type="button" class="ds-attach-chip__x" :aria-label="`移除附件：${file.name}`" @click="removeAttachment(file.uid)">
            <Icon name="x" :size="12" />
          </button>
        </span>
      </div>

      <textarea
        ref="textareaRef"
        v-model="text"
        class="ds-composer__textarea"
        rows="3"
        placeholder="输入问题或直接拖入日志文件，Enter 发送，Shift+Enter 换行"
        :readonly="generating"
        @input="onInput"
        @keydown.capture="onKeydown"
        @compositionstart="composing = true"
        @compositionend="composing = false"
      ></textarea>

      <div class="ds-composer__bar">
        <button
          ref="attachRef"
          type="button"
          class="ds-icon-btn ds-composer__attach"
          aria-label="上传附件"
          title="上传附件"
          :disabled="generating"
          @click.stop="pickFiles"
        >
          <Icon name="paperclip" :size="18" />
        </button>

        <span class="ds-composer__spacer" aria-hidden="true"></span>

        <button
          ref="modelRef"
          type="button"
          class="ds-model-switch"
          aria-haspopup="listbox"
          :aria-expanded="modelOpen ? 'true' : 'false'"
          :disabled="generating"
          @click.stop="openModelMenu"
        >
          <Icon name="bot" :size="16" />
          <span class="ds-model-switch__name">{{ modelName }}</span>
          <Icon name="chevron-down" :size="16" icon-class="ds-model-switch__caret" />
        </button>

        <button
          type="button"
          class="ds-btn ds-btn--primary ds-composer__send"
          :disabled="!generating && !canSend"
          :aria-label="generating ? '停止生成' : '发送'"
          @click="onSendClick"
        >
          <Icon :name="generating ? 'stop' : 'send'" :size="18" icon-class="ds-composer__send-icon" />
        </button>
      </div>

      <input ref="fileRef" type="file" class="ds-composer__file" hidden multiple @change="onFilesPicked" />
    </div>

    <Teleport to="body">
      <!-- @ 提及浮层 -->
      <div
        v-if="mentionOpen"
        ref="mentionRef"
        class="ds-mention"
        role="listbox"
        aria-label="提及对象"
        :style="{ left: mentionLeft + 'px', top: mentionTop + 'px' }"
        @keydown="onMentionKeydown"
      >
        <div v-for="group in mentionGroups" :key="group.key" class="ds-mention__group">
          <span class="ds-mention__group-title">{{ group.title }}</span>
          <button
            v-for="item in group.items"
            :key="item.value"
            type="button"
            class="ds-mention__item"
            :class="{ 'is-focused': mentionFocus === item.value }"
            role="option"
            :aria-selected="mentionFocus === item.value ? 'true' : 'false'"
            @click="pickMention(item.value)"
            @mouseenter="mentionFocus = item.value"
          >
            <Icon :name="group.icon" :size="18" icon-class="ds-mention__icon" />
            <span class="ds-mention__label">{{ item.label }}</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import Icon from '../../shared/ui/Icon.vue';
import { iconForType, typeFromName } from '../../shared/lib/markdown';
import { MENTION_GROUPS, MODEL_OPTIONS } from '../../services/mockApi';
import { closePopover, openPopover, popoverState } from '../../shared/ui/popover';

const props = defineProps({
  conversationId: { type: String, default: '' },
  generating: { type: Boolean, default: false },
  prefill: { type: String, default: '' }
});
const emit = defineEmits(['submit', 'stop']);

const DRAFT_PREFIX = 'ds.chat-workbench.draft.';
const MODEL_KEY = 'ds.chat-workbench.model';
const MIN_LINES = 3;
const MAX_LINES = 10;

const textareaRef = ref(null);
const attachRef = ref(null);
const modelRef = ref(null);
const fileRef = ref(null);
const mentionRef = ref(null);

const text = ref('');
const attachments = ref([]);
const composing = ref(false);
const modelOpen = ref(false);
const modelName = ref('');

const mentionOpen = ref(false);
const mentionQuery = ref('');
const mentionFocus = ref('');
const mentionLeft = ref(0);
const mentionTop = ref(0);
let mentionRange = null;
let draftTimer = null;
let modelPopoverClose = null;

const canSend = computed(() => text.value.trim().length > 0 || attachments.value.length > 0);

const mentionGroups = computed(() => {
  const q = mentionQuery.value.trim();
  const groups = [
    { key: 'file', title: '文件', icon: 'file-text', items: MENTION_GROUPS.file || [] },
    { key: 'kb', title: '知识库', icon: 'hash', items: MENTION_GROUPS.kb || [] },
    { key: 'agent', title: '智能体', icon: 'bot', items: MENTION_GROUPS.agent || [] }
  ];
  return groups
    .map((g) => ({
      ...g,
      items: g.items
        .map((label) => ({ label, value: label }))
        .filter((it) => !q || it.label.toLowerCase().includes(q.toLowerCase()))
    }))
    .filter((g) => g.items.length);
});

/* ---------------- 尺寸与草稿 ---------------- */
let lineHeight = 24;
let paddingV = 24;

function autosize() {
  const ta = textareaRef.value;
  if (!ta) return;
  ta.style.height = 'auto';
  const minH = lineHeight * MIN_LINES + paddingV;
  const maxH = lineHeight * MAX_LINES + paddingV;
  const h = Math.min(Math.max(ta.scrollHeight, minH), maxH);
  ta.style.height = `${h}px`;
}

function draftKey() {
  return DRAFT_PREFIX + (props.conversationId || 'default');
}

function saveDraft() {
  try {
    if (text.value) localStorage.setItem(draftKey(), text.value);
    else localStorage.removeItem(draftKey());
  } catch {
    /* ignore */
  }
}

function scheduleDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 300);
}

function restoreDraft() {
  try {
    text.value = localStorage.getItem(draftKey()) || '';
  } catch {
    text.value = '';
  }
  nextTick(autosize);
}

/* ---------------- 输入与发送 ---------------- */
function onInput() {
  autosize();
  scheduleDraft();
  syncMention();
}

function onKeydown(event) {
  if (mentionOpen.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
      onMentionKeydown(event);
      return;
    }
  }
  if (event.key !== 'Enter' || event.shiftKey) return;
  if (composing.value || event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  if (!props.generating) submit();
}

function submit() {
  if (!canSend.value) return;
  emit('submit', text.value.trim());
  text.value = '';
  attachments.value = [];
  try {
    localStorage.removeItem(draftKey());
  } catch {
    /* ignore */
  }
  nextTick(() => {
    autosize();
    textareaRef.value?.focus();
  });
}

function onSendClick() {
  if (props.generating) emit('stop');
  else submit();
}

/* ---------------- 附件 ---------------- */
let attachSeq = 0;

/** 加号按钮已替换为上传附件按钮：点击直接唤起文件选择，本版本只保留附件上传 */
function pickFiles() {
  if (props.generating) return;
  fileRef.value?.click();
}

function onFilesPicked() {
  const files = Array.from(fileRef.value?.files || []);
  files.forEach((f) => {
    attachments.value.push({ uid: ++attachSeq, name: f.name, type: typeFromName(f.name) });
  });
  if (fileRef.value) fileRef.value.value = '';
}

function removeAttachment(uid) {
  attachments.value = attachments.value.filter((a) => a.uid !== uid);
}

/* ---------------- 模型 ---------------- */
function openModelMenu() {
  if (props.generating) return;
  const items = MODEL_OPTIONS.map((m) => ({
    label: m.name,
    desc: m.desc,
    twoLine: true,
    checked: m.name === modelName.value
  }));
  modelOpen.value = true;
  modelPopoverClose = () => {
    modelOpen.value = false;
  };
  openPopover({
    anchor: modelRef.value,
    align: 'end',
    items,
    onSelect: (_action, item) => {
      modelName.value = item.label;
      modelOpen.value = false;
      try {
        localStorage.setItem(MODEL_KEY, item.label);
      } catch {
        /* ignore */
      }
    }
  });
}

watch(
  () => popoverState.open,
  (open) => {
    if (!open) {
      modelOpen.value = false;
      modelPopoverClose = null;
    }
  }
);

/* ---------------- @ 提及 ---------------- */
function syncMention() {
  const ta = textareaRef.value;
  if (!ta) return;
  const pos = ta.selectionStart ?? 0;
  const before = text.value.slice(0, pos);
  const m = /@([^\s@]*)$/.exec(before);
  if (!m || props.generating) {
    mentionOpen.value = false;
    return;
  }
  mentionRange = { start: pos - m[0].length, end: pos };
  mentionQuery.value = m[1];
  mentionOpen.value = true;
  mentionFocus.value = mentionGroups.value[0]?.items[0]?.value || '';
  nextTick(() => {
    const pa = attachRef.value?.getBoundingClientRect();
    const mh = mentionRef.value?.offsetHeight || 240;
    const left = Math.max(8, Math.min((pa?.left || 16) - 8, window.innerWidth - 300));
    mentionLeft.value = Math.round(left);
    mentionTop.value = Math.round(Math.max(8, (pa?.top || 400) - mh - 8));
  });
}

function pickMention(label) {
  const ta = textareaRef.value;
  if (!ta || !mentionRange) {
    mentionOpen.value = false;
    return;
  }
  const { start, end } = mentionRange;
  text.value = `${text.value.slice(0, start)}@${label} ${text.value.slice(end)}`;
  mentionOpen.value = false;
  mentionRange = null;
  nextTick(() => {
    ta.focus();
    ta.selectionStart = ta.selectionEnd = start + label.length + 2;
    autosize();
    scheduleDraft();
  });
}

function onMentionKeydown(event) {
  const flat = mentionGroups.value.flatMap((g) => g.items.map((i) => i.value));
  if (!flat.length) {
    if (event.key === 'Escape') mentionOpen.value = false;
    return;
  }
  const idx = flat.indexOf(mentionFocus.value);
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const next = idx < 0 ? 0 : (idx + (event.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length;
    mentionFocus.value = flat[next];
  } else if (event.key === 'Enter' || event.key === 'Tab') {
    if (mentionOpen.value) {
      event.preventDefault();
      pickMention(mentionFocus.value);
    }
  } else if (event.key === 'Escape') {
    event.preventDefault();
    mentionOpen.value = false;
  }
}

/* ---------------- 生命周期 ---------------- */
function onWindowResize() {
  if (mentionOpen.value) mentionOpen.value = false;
  if (modelOpen.value) closePopover(false);
}

onMounted(() => {
  const ta = textareaRef.value;
  if (ta) {
    const cs = getComputedStyle(ta);
    lineHeight = parseFloat(cs.lineHeight) || 24;
    paddingV = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  }
  try {
    modelName.value =
      localStorage.getItem(MODEL_KEY) ||
      (MODEL_OPTIONS.some((m) => m.name === '通用模型 · 标准') ? '通用模型 · 标准' : MODEL_OPTIONS[0]?.name) ||
      '通用模型 · 标准';
  } catch {
    modelName.value = MODEL_OPTIONS[0]?.name || '通用模型 · 标准';
  }
  restoreDraft();
  window.addEventListener('resize', onWindowResize, true);
});

onBeforeUnmount(() => {
  clearTimeout(draftTimer);
  window.removeEventListener('resize', onWindowResize, true);
});

watch(
  () => props.conversationId,
  () => {
    restoreDraft();
    attachments.value = [];
    mentionOpen.value = false;
  }
);

watch(
  () => props.prefill,
  (value) => {
    if (!value) return;
    text.value = value;
    nextTick(() => {
      autosize();
      textareaRef.value?.focus();
    });
  },
  { flush: 'post' }
);

defineExpose({
  focus() {
    textareaRef.value?.focus();
  },
  setText(value) {
    text.value = value;
    nextTick(() => {
      autosize();
      textareaRef.value?.focus();
    });
  }
});
</script>
