/**
 * 演示用「假后端」：把原型的 7 段时间轴做成可替换的 mock 服务。
 * 真接入时只保留同样的回调契约，页面逻辑无需改动。
 */
import demo from './seeds/demo.json';
import models from './seeds/models.json';
import mention from './seeds/mention.json';

export const demoData = demo;
export const MODEL_OPTIONS = models;
export const MENTION_GROUPS = mention;

/** 时间轴（毫秒），与成品原型的演示节奏一致 */
export const TIMELINE = {
  thinkDone: 700,
  step0Done: 1400,
  step1Done: 2100,
  md: 2800,
  code: 3400,
  cites: 4000,
  cards: 4600,
  step2Done: 5200,
  done: 5800
};

/** 把 demo seed 的步骤拍平成视图需要的结构 */
export function normalizeSteps(raw = demo.steps) {
  return raw.map((s, i) => ({
    key: `step-${i}`,
    action: s.action,
    state: 'waiting',
    tool: '',
    dur: '',
    detail: '',
    runningTool: s.runningTool || '',
    runningDur: s.runningDur || '',
    runningDetail: s.runningDetail || '',
    doneTool: s.doneTool || '',
    doneDur: s.doneDur || ''
  }));
}

/**
 * 播放一次生成过程。
 * handlers: { onThinkDone, onStep(index, state), onReveal(key), onDone }
 * 返回 { stop } —— stop 后所有未到点的定时器作废。
 */
export function startPlayback(handlers = {}) {
  const timers = [];
  let stopped = false;

  const at = (ms, fn) =>
    timers.push(
      setTimeout(() => {
        if (!stopped) fn();
      }, ms)
    );

  at(TIMELINE.thinkDone, () => {
    handlers.onStep?.(0, 'running');
    handlers.onThinkDone?.();
  });
  at(TIMELINE.step0Done, () => {
    handlers.onStep?.(0, 'done');
    handlers.onStep?.(1, 'running');
  });
  at(TIMELINE.step1Done, () => {
    handlers.onStep?.(1, 'done');
    handlers.onStep?.(2, 'running');
  });
  at(TIMELINE.md, () => handlers.onReveal?.('md'));
  at(TIMELINE.code, () => handlers.onReveal?.('code'));
  at(TIMELINE.cites, () => handlers.onReveal?.('cites'));
  at(TIMELINE.cards, () => handlers.onReveal?.('cards'));
  at(TIMELINE.step2Done, () => {
    handlers.onStep?.(2, 'done');
    handlers.onStep?.(3, 'running');
  });
  at(TIMELINE.done, () => {
    handlers.onStep?.(3, 'done');
    handlers.onDone?.();
  });

  return {
    stop() {
      stopped = true;
      timers.forEach((t) => clearTimeout(t));
      timers.length = 0;
    }
  };
}
