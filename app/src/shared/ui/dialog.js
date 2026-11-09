import { reactive } from 'vue';

/** 全局单例确认框：Promise<boolean> 契约，默认焦点永远不在危险项 */
export const dialogState = reactive({
  open: false,
  title: '',
  body: '',
  confirmText: '确认',
  cancelText: '取消',
  danger: true,
  resolve: null,
  returnFocus: null
});

export function confirmDialog(options = {}) {
  if (dialogState.open && dialogState.resolve) {
    dialogState.resolve(false);
    dialogState.resolve = null;
  }
  dialogState.title = options.title || '';
  dialogState.body = options.body || '';
  dialogState.confirmText = options.confirmText || '确认';
  dialogState.cancelText = options.cancelText || '取消';
  dialogState.danger = options.danger !== false;
  dialogState.returnFocus = options.returnFocus || document.activeElement;
  dialogState.open = true;

  return new Promise((resolve) => {
    dialogState.resolve = resolve;
  });
}

export function settleDialog(result) {
  const resolve = dialogState.resolve;
  const returnFocus = dialogState.returnFocus;
  dialogState.open = false;
  dialogState.resolve = null;
  dialogState.returnFocus = null;
  if (resolve) resolve(result);
  if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
}
