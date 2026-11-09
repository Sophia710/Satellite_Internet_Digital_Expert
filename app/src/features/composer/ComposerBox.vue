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
          ref="plusRef"
          type="button"
          class="ds-icon-btn ds-composer__plus"
          aria-label="更多输入能力"
          aria-haspopup="menu"
          :aria-expanded="plusOpen ? 'true' : 'false'"
          :disabled="generating"
          @click.stop="togglePlus"
        >
          <Icon name="plus" :size="18" />
        </button>

        <button
          ref="voiceRef"
          type="button"
          class="ds-icon-btn ds-voice ds-composer__voice"
          :data-state="voiceState"
          :aria-label="voiceState === 'recording' ? '结束语音输入' : '语音输入'"
          :aria-pressed="voiceState === 'recording' ? 'true' : 'false'"
          :disabled="generating"
          @click="toggleVoice"
        >
          <span v-if="voiceState === 'recording'" class="ds-voice__dot" aria-hidden="true"></span>
          <Icon v-else name="mic" :size="18" />
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
      <!-- 加号收纳菜单：fixed 定位，向上展开，支持二级面板 -->
      <div
        v-if="plusOpen"
        ref="menuRef"
        class="ds-plus-menu"
        role="menu"
        aria-label="更多输入能力"
        :style="{ left: menuLeft + 'px', top: menuTop + 'px' }"
        @pointerleave="scheduleSubClose"
        @keydown="onMenuKeydown"
      >
        <button type="button" role="menuitem" class="ds-plus-menu__item" @click="invokeLeaf('add-context')">
          <Icon name="hash" :size="18" icon-class="ds-plus-menu__icon" />
          <span class="ds-plus-menu__label">添加知识库</span>
        </button>
        <button type="button" role="menuitem" class="ds-plus-menu__item" @click="invokeLeaf('attachment')">
          <Icon name="paperclip" :size="18" icon-class="ds-plus-menu__icon" />
          <span class="ds-plus-menu__label">上传附件</span>
        </button>
        <div class="ds-plus-menu__sep" role="separator"></div>

        <button
          v-for="entry in plusGroups"
          :key="entry.key"
          type="button"
          role="menuitem"
          class="ds-plus-menu__item"
          :data-plus-sub="entry.key"
          aria-haspopup="menu"
          :aria-expanded="currentSub === entry.key ? 'true' : 'false'"
          @pointerenter="openSub(entry.key, $event)"
          @focusin="openSub(entry.key, $event)"
          @click.stop="openSub(entry.key, $event)"
        >
          <Icon :name="entry.icon" :size="18" icon-class="ds-plus-menu__icon" />
          <span class="ds-plus-menu__label">{{ entry.label }}</span>
          <Icon name="chevron-right" :size="16" icon-class="ds-plus-menu__caret" />
        </button>
      </div>

      <div
        v-if="plusOpen && currentSub"
        ref="subRef"
        class="ds-plus-sub"
        role="menu"
        :aria-label="currentSubLabel"
        :style="{ left: subLeft + 'px', top: subTop + 'px' }"
        @pointerenter="cancelSubClose"
        @pointerleave="scheduleSubClose"
      >
        <div class="ds-plus-sub__title">{{ subTitle }}</div>
        <button
          v-for="leaf in subLeaves"
          :key="leaf.label"
          type="button"
          role="menuitem"
          class="ds-plus-menu__item"
          @click="invokeLeaf(leaf.action)"
        >
          <Icon :name="leaf.icon" :size="18" icon-class="ds-plus-menu__icon" />
          <span class="ds-plus-menu__label">{{ leaf.label }}</span>
        </button>
      </div>

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
const plusRef = ref(null);
const voiceRef = ref(null);
const modelRef = ref(null);
const fileRef = ref(null);
const menuRef = ref(null);
const subRef = ref(null);
const mentionRef = ref(null);

const text = ref('');
const attachments = ref([]);
const composing = ref(false);
const plusOpen = ref(false);
const currentSub = ref(null);
const modelOpen = ref(false);
const modelName = ref('');
const voiceState = ref('idle');

const menuLeft = ref(0);
const menuTop = ref(0);
const subLeft = ref(0);
const subTop = ref(0);

const mentionOpen = ref(false);
const mentionQuery = ref('');
const mentionFocus = ref('');
const mentionLeft = ref(0);
const mentionTop = ref(0);
let mentionRange = null;
let hoverTimer = null;
let draftTimer = null;
let modelPopoverClose = null;

const PLUS_GROUPS = [
  { key: 'command', icon: 'terminal', label: '命令', title: '可用命令', leaves: [
    { icon: 'terminal', label: '分位统计', action: 'command-item' },
    { icon: 'terminal', label: '突变点检测', action: 'command-item' },
    { icon: 'terminal', label: '口径换算', action: 'command-item' },
    { icon: 'sliders', label: '管理命令', action: 'manage-command' },
    { icon: 'external-link', label: '探索更多命令', action: 'explore-command' }
  ] },
  { key: 'plugin', icon: 'grid', label: '插件', title: '可用插件', leaves: [
    { icon: 'grid', label: '日志解析', action: 'plugin-item' },
    { icon: 'grid', label: '时序异常检测', action: 'plugin-item' },
    { icon: 'grid', label: '图表生成', action: 'plugin-item' },
    { icon: 'sliders', label: '管理插件', action: 'manage-plugin' },
    { icon: 'external-link', label: '探索更多插件', action: 'explore-plugin' }
  ] },
  { key: 'integration-1', icon: 'file-text', label: '数据接入', title: '数据接入', leaves: [
    { icon: 'file-text', label: '我的数据集', action: 'integration-1-item' },
    { icon: 'file-text', label: '共享给我', action: 'integration-1-item' },
    { icon: 'sliders', label: '管理', action: 'manage-integration-1' },
    { icon: 'external-link', label: '探索更多', action: 'explore-integration-1' }
  ] },
  { key: 'integration-2', icon: 'user', label: '知识库', title: '知识库', leaves: [
    { icon: 'user', label: '案例库', action: 'integration-2-item' },
    { icon: 'user', label: '指标口径库', action: 'integration-2-item' },
    { icon: 'sliders', label: '管理', action: 'manage-integration-2' },
    { icon: 'external-link', label: '探索更多', action: 'explore-integration-2' }
  ] }
];

const plusGroups = PLUS_GROUPS;
const subTitle = computed(() => PLUS_GROUPS.find((g) => g.key === currentSub.value)?.title || '');
const currentSubLabel = computed(() => PLUS_GROUPS.find((g) => g.key === currentSub.value)?.label || '');
const subLeaves = computed(() => PLUS_GROUPS.find((g) => g.key === currentSub.value)?.leaves || []);
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

/* ---------------- 语音 ---------------- */
let voiceTimer = null;

function toggleVoice() {
  if (voiceState.value === 'recording') {
    clearTimeout(voiceTimer);
    voiceState.value = 'idle';
    return;
  }
  voiceState.value = 'recording';
  voiceTimer = setTimeout(() => {
    voiceState.value = 'idle';
    insertAtCaret('分析 7 号链路昨晚的时延突变，给出结论和建议动作。');
  }, 1600);
}

function insertAtCaret(payload) {
  const ta = textareaRef.value;
  if (!ta) return;
  const pos = ta.selectionStart ?? text.value.length;
  const before = text.value.charAt(pos - 1);
  const prefix = pos > 0 && before !== ' ' && before !== '\n' ? ' ' : '';
  text.value = `${text.value.slice(0, pos)}${prefix}${payload}${text.value.slice(pos)}`;
  nextTick(() => {
    ta.focus();
    ta.selectionStart = ta.selectionEnd = pos + prefix.length + payload.length;
    autosize();
    scheduleDraft();
  });
}

/* ---------------- 加号菜单 ---------------- */
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function measureMenu() {
  nextTick(() => {
    const plus = plusRef.value;
    const menu = menuRef.value;
    if (!plus || !menu) return;
    const r = plus.getBoundingClientRect();
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    const left = clamp(r.left, 8, window.innerWidth - mw - 8);
    let top = r.top - mh - 8;
    if (top < 8) top = r.bottom + 8;
    menuLeft.value = Math.round(left);
    menuTop.value = Math.round(Math.min(top, window.innerHeight - mh - 8));
  });
}

function togglePlus() {
  if (plusOpen.value) closePlus(true);
  else openPlus();
}

function openPlus() {
  plusOpen.value = true;
  currentSub.value = null;
  measureMenu();
  nextTick(() => {
    menuRef.value?.querySelector('.ds-plus-menu__item')?.focus();
  });
}

function closePlus(returnFocus) {
  plusOpen.value = false;
  currentSub.value = null;
  clearTimeout(hoverTimer);
  if (returnFocus) textareaRef.value?.focus();
}

function openSub(key, event) {
  if (!plusOpen.value) return;
  currentSub.value = key;
  const itemRect = event?.currentTarget?.getBoundingClientRect();
  nextTick(() => {
    const menu = menuRef.value;
    const sub = subRef.value;
    if (!menu || !sub) return;
    const mr = menu.getBoundingClientRect();
    const sw = sub.offsetWidth;
    const sh = sub.offsetHeight;
    let left = mr.right + 4;
    if (left + sw > window.innerWidth - 8) left = mr.left - sw - 4;
    left = clamp(left, 8, window.innerWidth - sw - 8);
    const top = itemRect ? clamp(itemRect.top, 8, window.innerHeight - sh - 8) : mr.top;
    subLeft.value = Math.round(left);
    subTop.value = Math.round(top);
  });
}

function cancelSubClose() {
  clearTimeout(hoverTimer);
}

function scheduleSubClose() {
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    currentSub.value = null;
  }, 120);
}

function onMenuKeydown(event) {
  const items = Array.from(menuRef.value?.querySelectorAll('.ds-plus-menu__item') || []);
  const idx = items.indexOf(document.activeElement);
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const next = idx < 0 ? 0 : (idx + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    document.activeElement?.click?.();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    if (currentSub.value) closeSub();
    else closePlus(true);
  } else if (event.key === 'ArrowLeft' && currentSub.value) {
    event.preventDefault();
    closeSub();
  }
}

function closeSub() {
  currentSub.value = null;
  nextTick(() => menuRef.value?.querySelector(`[data-plus-sub]`)?.focus());
}

function invokeLeaf(action) {
  const call = action;
  closePlus(true);
  if (call === 'attachment') {
    fileRef.value?.click();
  } else if (call === 'add-context') {
    insertAtCaret('@');
    openMention('');
  }
  // 其余叶子：占位项，仅关闭并回焦
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
    const pa = plusRef.value?.getBoundingClientRect();
    const mh = mentionRef.value?.offsetHeight || 240;
    const left = clamp((pa?.left || 16) - 8, 8, window.innerWidth - 300);
    mentionLeft.value = Math.round(left);
    mentionTop.value = Math.round(Math.max(8, (pa?.top || 400) - mh - 8));
  });
}

function openMention(query = '') {
  mentionQuery.value = query;
  mentionOpen.value = true;
  const first = mentionGroups.value[0]?.items[0];
  mentionFocus.value = first ? first.value : '';
  nextTick(syncMention);
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
function onDocumentPointerDown(event) {
  if (!plusOpen.value) return;
  const inMenu = menuRef.value?.contains(event.target);
  const inSub = subRef.value?.contains(event.target);
  const inPlus = plusRef.value?.contains(event.target);
  if (!inMenu && !inSub && !inPlus) closePlus(false);
}

function onWindowResize() {
  if (plusOpen.value) {
    closePlus(false);
  }
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
  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  window.addEventListener('resize', onWindowResize, true);
});

onBeforeUnmount(() => {
  clearTimeout(draftTimer);
  clearTimeout(hoverTimer);
  clearTimeout(voiceTimer);
  document.removeEventListener('pointerdown', onDocumentPointerDown, true);
  window.removeEventListener('resize', onWindowResize, true);
});

watch(
  () => props.conversationId,
  () => {
    restoreDraft();
    attachments.value = [];
    mentionOpen.value = false;
    closePlus(false);
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
