import { defineStore } from 'pinia';

const KEYS = {
  left: 'ds.chat-workbench.sidebar.collapsed',
  /* v2：右栏默认关闭；换 key 让旧版「默认打开」的本地记忆失效 */
  rightOpen: 'ds.chat-workbench.rightPanel.open.v2',
  rightWidth: 'ds.chat-workbench.rightPanel.width'
};

const RIGHT_MIN = 320;
const RIGHT_TOKEN_MAX = 720;
const CENTER_MIN = 360;
const DEFAULT_WIDTH = 480;
const STEP = 16;

/** 读设计 token 里的像素值（与原型 tokenPx 同口径，token 缺失时回退常量） */
function cssPx(name, fallback) {
  try {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function rightMin() {
  return cssPx('--ds-right-min', RIGHT_MIN);
}

/**
 * 右栏上限按视口算，而不是固定的 720：上限 = 视口宽 - 左栏实宽 - 中栏最小宽（360）。
 * 原型 `maxWidthForViewport()` 就是这个口径，所以宽屏能拉到比 720 更宽、窄屏会自动收窄。
 */
function viewportMax() {
  const left = document.querySelector('.ds-shell__left');
  const leftW = left ? left.getBoundingClientRect().width : 0;
  const centerMin = cssPx('--ds-center-min', CENTER_MIN);
  return Math.max(rightMin(), Math.round(window.innerWidth - leftW - centerMin));
}

function clampWidth(v, max) {
  return Math.max(rightMin(), Math.min(max ?? viewportMax(), Math.round(v)));
}

function readFlag(key) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : v === '1';
  } catch {
    return null;
  }
}

function readNumber(key) {
  try {
    const v = parseFloat(localStorage.getItem(key));
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* 隐私模式下降级为内存态 */
  }
}

export const useShellStore = defineStore('shell', {
  state: () => ({
    leftCollapsed: readFlag(KEYS.left) ?? false,
    /* 首次进入系统右栏关闭；之后按用户最后一次显式开关恢复 */
    rightOpen: readFlag(KEYS.rightOpen) ?? false,
    rightWidth: clampWidth(readNumber(KEYS.rightWidth) ?? DEFAULT_WIDTH),
    maxRightWidth: viewportMax(),
    theme: 'light',
    ready: false
  }),

  getters: {
    leftState: (s) => (s.leftCollapsed ? 'closed' : 'open'),
    rightState: (s) => (s.rightOpen ? 'open' : 'closed'),
    themeLabel: (s) => (s.theme === 'dark' ? '浅色' : '深色'),
    widthMin: () => rightMin(),
    widthMax: (s) => s.maxRightWidth
  },

  actions: {
    /** 重新量左栏与视口，刷新右栏上限；越界则收回合法区间（不写盘，避免缩放污染记忆） */
    reclamp() {
      this.maxRightWidth = viewportMax();
      const next = clampWidth(this.rightWidth, this.maxRightWidth);
      if (next !== this.rightWidth) this.rightWidth = next;
    },

    toggleLeft() {
      this.leftCollapsed = !this.leftCollapsed;
      write(KEYS.left, this.leftCollapsed ? '1' : '0');
      this.reclamp();
    },

    setLeft(collapsed) {
      this.leftCollapsed = !!collapsed;
      write(KEYS.left, this.leftCollapsed ? '1' : '0');
      this.reclamp();
    },

    toggleRight() {
      this.rightOpen = !this.rightOpen;
      write(KEYS.rightOpen, this.rightOpen ? '1' : '0');
    },

    setRightOpen(open) {
      this.rightOpen = !!open;
      write(KEYS.rightOpen, this.rightOpen ? '1' : '0');
    },

    setRightWidth(width, { persist = true } = {}) {
      this.maxRightWidth = viewportMax();
      const next = clampWidth(width, this.maxRightWidth);
      if (next !== this.rightWidth) this.rightWidth = next;
      if (persist) write(KEYS.rightWidth, next);
    },

    nudgeRightWidth(delta) {
      this.setRightWidth(this.rightWidth + delta);
    },

    stepRightWidth(dir) {
      this.nudgeRightWidth(dir * STEP);
    },

    applyTheme() {
      document.documentElement.dataset.theme = this.theme;
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      this.applyTheme();
    },

    markReady() {
      this.ready = true;
    }
  }
});
