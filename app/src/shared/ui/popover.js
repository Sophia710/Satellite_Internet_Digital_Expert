import { nextTick, reactive } from 'vue';

/** 全局单例浮层菜单：与原型 DSPopoverMenu 同一套交互契约，但由 Vue 托管 DOM
 *  支持一级菜单项挂 children 时向右展开二级浮层（如「移动到项目」的项目列表） */
export const popoverState = reactive({
  open: false,
  anchor: null,
  align: 'start',
  items: [],
  left: 0,
  top: 0,
  onSelect: null,
  /* 二级浮层 */
  subOpen: false,
  subItems: [],
  subParentIndex: -1,
  subAnchorRect: null,
  subLeft: 0,
  subTop: 0
});

const MARGIN = 8;
const SUB_GAP = 6;

export function placePopover(panelEl) {
  const anchor = popoverState.anchor;
  if (!anchor || !panelEl) return;
  const rect = anchor.getBoundingClientRect();
  const w = panelEl.offsetWidth;
  const h = panelEl.offsetHeight;
  let left = popoverState.align === 'end' ? rect.right - w : rect.left;
  let top = rect.bottom + 4;
  if (left + w > window.innerWidth - MARGIN) left = window.innerWidth - w - MARGIN;
  if (left < MARGIN) left = MARGIN;
  if (top + h > window.innerHeight - MARGIN) {
    const above = rect.top - h - 4;
    top = above >= MARGIN ? above : Math.max(MARGIN, window.innerHeight - h - MARGIN);
  }
  popoverState.left = Math.round(left);
  popoverState.top = Math.round(top);
}

/** 二级浮层贴着一级菜单项右缘展开；右侧放不下时翻到左侧 */
export function placeSubmenu(panelEl) {
  const rect = popoverState.subAnchorRect;
  if (!rect || !panelEl) return;
  const w = panelEl.offsetWidth;
  const h = panelEl.offsetHeight;
  let left = rect.right + SUB_GAP;
  if (left + w > window.innerWidth - MARGIN) left = rect.left - w - SUB_GAP;
  if (left < MARGIN) left = MARGIN;
  let top = rect.top - 1;
  if (top + h > window.innerHeight - MARGIN) {
    top = Math.max(MARGIN, window.innerHeight - h - MARGIN);
  }
  popoverState.subLeft = Math.round(left);
  popoverState.subTop = Math.round(top);
}

export function openPopover({ anchor, align = 'start', items = [], onSelect }) {
  if (popoverState.open) closePopover(false);
  popoverState.anchor = anchor;
  popoverState.align = align === 'end' ? 'end' : 'start';
  popoverState.items = items;
  popoverState.onSelect = onSelect || null;
  popoverState.left = 0;
  popoverState.top = 0;
  popoverState.open = true;
  nextTick(() => {
    const el = document.getElementById('ds-popover-panel');
    if (el) placePopover(el);
  });
}

export function openSubmenu(itemEl, items, parentIndex) {
  if (!itemEl || !Array.isArray(items) || !items.length) return;
  popoverState.subAnchorRect = itemEl.getBoundingClientRect();
  popoverState.subItems = items;
  popoverState.subParentIndex = parentIndex;
  popoverState.subLeft = 0;
  popoverState.subTop = 0;
  popoverState.subOpen = true;
  nextTick(() => {
    const el = document.getElementById('ds-popover-subpanel');
    if (el) placeSubmenu(el);
  });
}

export function closeSubmenu() {
  if (!popoverState.subOpen) return;
  popoverState.subOpen = false;
  popoverState.subItems = [];
  popoverState.subParentIndex = -1;
  popoverState.subAnchorRect = null;
}

export function closePopover(restoreFocus = true) {
  if (!popoverState.open) return;
  const anchor = popoverState.anchor;
  closeSubmenu();
  popoverState.open = false;
  popoverState.items = [];
  popoverState.anchor = null;
  popoverState.onSelect = null;
  if (restoreFocus && anchor && typeof anchor.focus === 'function') anchor.focus();
}

/** 一级菜单项：有 children 时改为展开二级浮层，不触发业务动作 */
export function activatePopoverItem(index, itemEl) {
  const item = popoverState.items[index];
  if (!item || item.disabled) return;
  if (item.children?.length) {
    openSubmenu(itemEl || null, item.children, index);
    return;
  }
  const handler = popoverState.onSelect;
  const action = item.action || item.label;
  closePopover(false);
  if (handler) handler(action, item, index);
}

export function activateSubItem(index) {
  const item = popoverState.subItems[index];
  if (!item || item.disabled) return;
  const handler = popoverState.onSelect;
  const parentIndex = popoverState.subParentIndex;
  const action = item.action || item.label;
  closeSubmenu();
  closePopover(false);
  if (handler) handler(action, item, parentIndex);
}
