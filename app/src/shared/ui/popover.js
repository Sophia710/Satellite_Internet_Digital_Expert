import { nextTick, reactive } from 'vue';

/** 全局单例浮层菜单：与原型 DSPopoverMenu 同一套交互契约，但由 Vue 托管 DOM */
export const popoverState = reactive({
  open: false,
  anchor: null,
  align: 'start',
  items: [],
  left: 0,
  top: 0,
  onSelect: null
});

const MARGIN = 8;

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

export function closePopover(restoreFocus = true) {
  if (!popoverState.open) return;
  const anchor = popoverState.anchor;
  popoverState.open = false;
  popoverState.items = [];
  popoverState.anchor = null;
  popoverState.onSelect = null;
  if (restoreFocus && anchor && typeof anchor.focus === 'function') anchor.focus();
}

export function activatePopoverItem(index) {
  const item = popoverState.items[index];
  if (!item || item.disabled) return;
  const handler = popoverState.onSelect;
  const action = item.action || item.label;
  closePopover(false);
  if (handler) handler(action, item, index);
}
