/**
 * 演示用的会话标题生成：从用户问题里抽取「对象 + 动作」，压成适合侧边栏的短标题。
 * 真接入时替换为模型摘要即可，调用方无需改动。
 */

const ACTIONS = ['可视化', '分析', '研判', '排查', '定位', '对比', '复盘', '导出', '总结', '评估', '诊断', '统计', '映射', '清洗'];

const REQUEST_PREFIX = /^(?:请你?|帮我|帮忙|麻烦(?:你)?|我想|我需要|能否|可以)+/;
const FILLER_PREFIX = /^(?:将|把|对|针对)/;
const TRAILING_FILLER = /(?:进行|做|给出|输出|整理)$/;

function compact(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .replace(/^[“"'「『]+|[”"'」』]+$/g, '');
}

export function summarizeQuestionTitle(text) {
  let clean = compact(text).split(/[，。；！？,;!?]/)[0];
  clean = clean.replace(REQUEST_PREFIX, '').replace(FILLER_PREFIX, '');

  const action = ACTIONS.find((item) => clean.includes(item));
  let core = clean;

  if (action) {
    core = clean.replace(new RegExp(action, 'g'), '');
    core = core.replace(TRAILING_FILLER, '');
    if (action === '可视化') core = core.split(/按|与|并/)[0];
  }

  core = core.replace(/(?:的原因|原因|的问题|问题)$/, '');
  if (core.length > 6) core = core.replace(/(?:的数据|数据|结果|内容)$/, '');
  core = core.replace(/[“”"'「」『』]/g, '').trim();

  let title = core ? `${core}${action || ''}` : clean;
  if (!title) return '新会话';
  if (title.length > 16) title = title.slice(0, 16);
  return title;
}
