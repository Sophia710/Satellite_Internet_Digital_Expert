<template>
  <div class="pw-thread">
    <div data-component="message-bubble" data-variant="user" class="ds-msg-row ds-msg-row--user">
      <div class="ds-bubble">{{ chat.userText }}</div>
    </div>

    <div data-component="message-actions" class="ds-turn pw-turn" :data-message-id="'msg-1'" :data-copy-text="COPY_TEXT">
      <div
        data-component="thinking-block"
        class="ds-think"
        :class="{ 'ds-think--running': chat.think.state === 'running' }"
        :data-state="thinkState"
      >
        <template v-if="chat.think.state === 'running'">
          <span class="ds-think__dots" aria-hidden="true"><span></span><span></span><span></span></span>
          <span>{{ chat.thinkLabel }}</span>
        </template>
        <template v-else>
          <div class="ds-think__card">
            <button
              type="button"
              class="ds-think__bar"
              :aria-expanded="thinkExpanded ? 'true' : 'false'"
              @click="thinkExpanded = !thinkExpanded"
            >
              <span>{{ chat.thinkLabel }}</span>
              <Icon name="chevron-down" :size="16" icon-class="ds-think__chevron" />
            </button>
            <div v-show="thinkExpanded" class="ds-think__body">{{ chat.thinkBody }}</div>
          </div>
        </template>
      </div>

      <div v-if="stepsVisible" data-component="step-timeline" class="ds-steps">
        <div class="ds-steps__head">
          <Icon name="sparkles" :size="16" icon-class="ds-steps__head-icon" />
          <strong class="ds-steps__title">时延分析执行进度</strong>
          <span class="ds-steps__count">{{ chat.doneSteps }}/{{ chat.steps.length }}</span>
        </div>
        <ol class="ds-steps__list">
          <li
            v-for="(step, index) in chat.steps"
            :key="step.key"
            class="ds-step"
            :class="`ds-step--${step.state}`"
            :data-state="step.state"
            :data-expanded="expandedSteps[index] ? 'true' : 'false'"
          >
            <span class="ds-step__icon" aria-hidden="true">
              <Icon v-if="step.state === 'done'" name="check" :size="12" />
            </span>
            <span class="ds-step__main">
              <span class="ds-step__action">{{ step.action }}</span>
              <span v-if="step.tool" class="ds-step__tool">{{ step.tool }}</span>
              <span v-if="step.dur" class="ds-step__dur">{{ step.dur }}</span>
              <button
                v-if="step.detail"
                type="button"
                class="ds-step__toggle"
                :aria-label="expandedSteps[index] ? `收起${step.action}详情` : `展开${step.action}详情`"
                :aria-expanded="expandedSteps[index] ? 'true' : 'false'"
                @click="toggleStep(index)"
              >
                <Icon name="chevron-down" :size="14" />
              </button>
              <span v-if="step.detail && expandedSteps[index]" class="ds-step__detail">{{ step.detail }}</span>
            </span>
          </li>
        </ol>
      </div>

      <div v-if="chat.reveals.md" data-component="markdown-body" class="ds-md" v-html="responseHtml"></div>

      <figure v-if="chat.reveals.code" data-component="code-block" class="ds-code">
        <figcaption class="ds-code__head">
          <span class="ds-code__lang">python</span>
          <button type="button" class="ds-icon-btn ds-icon-btn--sm ds-code__copy" aria-label="复制代码" @click="copyText(CODE_TEXT, '代码')">
            <Icon name="copy" :size="16" />
          </button>
        </figcaption>
        <pre class="ds-code__body">{{ CODE_TEXT }}</pre>
      </figure>

      <p v-if="chat.reveals.cites" class="pw-cites">
        结论依据见来源
        <button
          type="button"
          class="ds-cite"
          data-component="citation-chip"
          :aria-describedby="`pw-cite-snip-1`"
        >
          <span class="ds-cite__no">1</span>
          <span class="ds-cite__title">承载网时延指标口径（待确认）</span>
          <span :id="`pw-cite-snip-1`" class="ds-cite__snippet" role="tooltip">单向时延与往返时延不可混算，口径确认后写入数据集元信息</span>
        </button>
        和
        <button type="button" class="ds-cite" :aria-describedby="`pw-cite-snip-2`">
          <span class="ds-cite__no">2</span>
          <span class="ds-cite__title">DS-01 演示数据集说明</span>
          <span :id="`pw-cite-snip-2`" class="ds-cite__snippet" role="tooltip">72 小时、30 条链路，含两段阶跃劣化与一处丢包突增，为构造数据</span>
        </button>
        。
      </p>

      <div v-if="chat.reveals.cards" class="pw-cards">
        <div data-component="artifact-card" class="ds-docrow">
          <span class="ds-docrow__label">已生成分析产物：</span>
          <button type="button" class="ds-artcard" data-id="art-md" data-type="md" @click="openArtifact('art-md')">
            <Icon name="file-md" :size="16" icon-class="ds-artcard__icon" />
            <span class="ds-artcard__texts">
              <span class="ds-artcard__name">时延态势与趋势分析.md</span>
              <span class="ds-artcard__status">Markdown · 18.6 KB · 今天 09:24</span>
            </span>
          </button>
        </div>
        <div data-component="artifact-card" class="ds-docrow">
          <button type="button" class="ds-artcard" data-id="art-docx" data-type="xlsx" @click="openArtifact('art-docx')">
            <Icon name="file-text" :size="16" icon-class="ds-artcard__icon" />
            <span class="ds-artcard__texts">
              <span class="ds-artcard__name">异常链路清单.xlsx</span>
              <span class="ds-artcard__status">Excel · 7.2 KB · 今天 09:24</span>
            </span>
          </button>
        </div>
        <div data-component="artifact-card" class="ds-docrow">
          <button type="button" class="ds-artcard" data-id="art-chart-line" data-type="html" @click="openArtifact('art-chart-line')">
            <Icon name="file-code" :size="16" icon-class="ds-artcard__icon" />
            <span class="ds-artcard__texts">
              <span class="ds-artcard__name">时延趋势折线图.html</span>
              <span class="ds-artcard__status">网页 · 24 点分位走势 · 今天 09:24</span>
            </span>
          </button>
        </div>
        <div data-component="artifact-card" class="ds-docrow">
          <button type="button" class="ds-artcard" data-id="art-png" data-type="png" @click="openArtifact('art-png')">
            <Icon name="image" :size="16" icon-class="ds-artcard__icon" />
            <span class="ds-artcard__texts">
              <span class="ds-artcard__name">链路时延分位分布.png</span>
              <span class="ds-artcard__status">图片 · 1200 × 760 · 今天 09:24</span>
            </span>
          </button>
        </div>
      </div>

      <div class="ds-msg-actions" role="group" aria-label="回答操作">
        <button type="button" class="ds-icon-btn ds-icon-btn--sm" aria-label="重新生成" @click="chat.regenerate()">
          <Icon name="refresh" :size="16" />
        </button>
        <button type="button" class="ds-icon-btn ds-icon-btn--sm" aria-label="复制回答" @click="copyText(COPY_TEXT, '回答')">
          <Icon name="copy" :size="16" />
        </button>
        <button
          type="button"
          class="ds-icon-btn ds-icon-btn--sm"
          aria-label="赞"
          :aria-pressed="reaction === 'like' ? 'true' : 'false'"
          @click="reaction = reaction === 'like' ? '' : 'like'"
        >
          <Icon name="thumb-up" :size="16" />
        </button>
        <button
          type="button"
          class="ds-icon-btn ds-icon-btn--sm"
          aria-label="踩"
          :aria-pressed="reaction === 'dislike' ? 'true' : 'false'"
          @click="reaction = reaction === 'dislike' ? '' : 'dislike'"
        >
          <Icon name="thumb-down" :size="16" />
        </button>
        <button type="button" class="ds-icon-btn ds-icon-btn--sm" aria-label="基于此回答创建分支">
          <Icon name="git-branch" :size="16" />
        </button>
        <button type="button" class="ds-icon-btn ds-icon-btn--sm" aria-label="分享回答" @click="copyText(COPY_TEXT, '链接')">
          <Icon name="share" :size="16" />
        </button>
        <button
          type="button"
          class="ds-icon-btn ds-icon-btn--sm"
          aria-label="更多操作"
          aria-haspopup="menu"
          @click="openMoreMenu"
        >
          <Icon name="more-horizontal" :size="16" />
        </button>
        <span v-if="copiedHint" class="ds-msg-actions__time">{{ copiedHint }}</span>
        <span v-else class="ds-msg-actions__time">
          <Icon name="clock" :size="12" />
          <span>耗时 36 秒</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import Icon from '../../shared/ui/Icon.vue';
import { useChatStore } from './store';
import { useArtifactStore } from '../artifact/store';
import { mdToHtml } from '../../shared/lib/markdown';
import { lookupArtifact } from '../../services/artifacts';
import { openPopover } from '../../shared/ui/popover';

const chat = useChatStore();
const artifact = useArtifactStore();

const RESPONSE_MD = `### 态势：30 条链路里只有 2 条越限

72 小时、30 条链路的 P95 分位热力已完成。7 号链路的 P95 明显抬升，越限时段集中在 21:40 之后；9 号链路出现短时丢包突增，其余链路处于周期波动范围内。

#### 趋势：是结构性劣化，不是轨道周期

- STL 分解的趋势项自昨夜起单调抬升，漂移速率约 0.6 毫秒每分钟。
- 残差中没有新的周期异常，周期性抖动段与轨道周期一致。
- PELT 检出 2 个突变点，与一次切换事件的时间偏差在 90 秒内。

**判断强度：**结构性劣化属于可复算结论；与切换事件的关联属于疑似，还需补充路由配置变更记录才能定性。

#### 建议动作

1. 核查 7 号链路昨夜的路由配置与切换记录。
2. 对 9 号链路做一次长窗丢包率复核。

图表与清单已放入右侧产物区，每个数字都可点回算子输出核对口径。`;

const CODE_TEXT = `import pandas as pd

df = pd.read_csv("delay_log.csv", parse_dates=["ts"])
q = df.groupby("link_id")["delay_ms"].quantile([0.5, 0.95, 0.99]).unstack()
print(q.sort_values(0.99, ascending=False).head(10))`;

const COPY_TEXT =
  '态势：30 条链路中 7 号链路 P95 明显抬升，越限集中在 21:40 之后，9 号链路短时丢包突增。趋势：STL 趋势项自昨夜单调抬升，漂移速率约 0.6 毫秒每分钟，PELT 检出 2 个突变点，与一次切换事件时间偏差在 90 秒内。判断强度：结构性劣化为可复算结论，与切换事件的关联为疑似，需补充路由配置变更记录。建议核查该链路路由配置，并对 9 号链路做长窗丢包复核。';

const responseHtml = computed(() => mdToHtml(RESPONSE_MD));
const thinkExpanded = ref(false);
const thinkState = computed(() => {
  if (chat.think.state === 'running') return 'running';
  if (chat.think.state === 'stopped') return thinkExpanded.value ? 'expanded' : 'stopped';
  return thinkExpanded.value ? 'expanded' : 'collapsed';
});
const stepsVisible = computed(() => chat.think.state !== 'running' && chat.steps.length > 0);

const expandedSteps = reactive({});
function toggleStep(index) {
  expandedSteps[index] = !expandedSteps[index];
}

const reaction = ref('');
const copiedHint = ref('');
let hintTimer = null;

async function copyText(value, label) {
  try {
    await navigator.clipboard.writeText(value);
    copiedHint.value = `${label}已复制`;
  } catch {
    copiedHint.value = '复制失败';
  }
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    copiedHint.value = '';
  }, 1600);
}

function openArtifact(id) {
  const detail = lookupArtifact(id);
  if (detail) artifact.open(detail);
}

function openMoreMenu(event) {
  openPopover({
    anchor: event.currentTarget,
    align: 'end',
    items: [
      { icon: 'share', label: '复制链接', action: 'link' },
      { icon: 'copy', label: '导出为 Markdown', action: 'export' },
      { divider: true },
      { icon: 'alert-triangle', label: '反馈问题', action: 'feedback' }
    ],
    onSelect: (action) => {
      if (action === 'link') copyText(COPY_TEXT, '链接');
      else if (action === 'export') copyText(COPY_TEXT, '内容');
    }
  });
}

/* 新一轮重新生成时折叠详情，回到 running 展示 */
watch(
  () => chat.think.state,
  (state) => {
    if (state === 'running') {
      thinkExpanded.value = false;
      Object.keys(expandedSteps).forEach((k) => delete expandedSteps[k]);
    }
  }
);
</script>
