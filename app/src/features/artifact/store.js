import { defineStore } from 'pinia';
import { formatOfType, kindOfType, isEditableFormat } from '../../shared/lib/markdown';
import { lookupArtifact } from '../../services/artifacts';
import { useShellStore } from '../shell/store';

const TREE_KEY = 'ds.chat-workbench.fileTree.open';

function readTreeOpen() {
  try {
    return localStorage.getItem(TREE_KEY) === '1';
  } catch {
    return false;
  }
}

export const useArtifactStore = defineStore('artifact', {
  state: () => ({
    tabs: [],
    activeId: null,
    launcher: false,
    treeOpen: readTreeOpen(),
    saved: false
  }),

  getters: {
    activeTab: (s) => s.tabs.find((t) => t.id === s.activeId) || null,
    panelMode: (s) => {
      if (s.launcher) return 'launcher';
      return s.tabs.length ? 'artifact' : 'empty';
    },
    activeFormat() {
      return this.activeTab ? this.activeTab.format : 'other';
    },
    editable() {
      return this.activeTab ? isEditableFormat(this.activeTab.format) : false;
    },
    /** 选择元素只在 HTML/网页产物的预览态出现 */
    pickerVisible() {
      if (!this.activeTab) return false;
      return this.activeTab.format === 'web' && this.activeTab.mode === 'preview';
    }
  },

  actions: {
    open(detail = {}) {
      const info = detail.id ? lookupArtifact(detail.id) : null;
      const id = String(detail.id != null ? detail.id : detail.name || '');
      if (!id) return;
      const name = detail.name || info?.name || id;
      const type = detail.type || info?.type || 'file';

      if (!this.tabs.some((t) => t.id === id)) {
        this.tabs.push({
          id,
          name,
          type,
          kind: kindOfType(type),
          format: formatOfType(type),
          mode: 'preview'
        });
      }
      this.activeId = id;
      this.launcher = false;
      this.saved = false;
      useShellStore().setRightOpen(true);
    },

    openDefault() {
      const first = this.tabs[0];
      if (first) {
        this.activeId = first.id;
        this.launcher = false;
      }
    },

    close(id) {
      if (id === ':launcher:') {
        this.launcher = false;
        return;
      }
      const idx = this.tabs.findIndex((t) => t.id === id);
      if (idx < 0) return;
      this.tabs.splice(idx, 1);
      if (this.activeId === id) {
        const neighbor = this.tabs[idx - 1] || this.tabs[idx] || null;
        this.activeId = neighbor ? neighbor.id : null;
      }
    },

    newTab() {
      this.launcher = true;
    },

    activate(id) {
      this.activeId = id;
      this.launcher = false;
    },

    setMode(mode) {
      const tab = this.activeTab;
      if (!tab || !isEditableFormat(tab.format)) return;
      tab.mode = mode === 'edit' ? 'edit' : 'preview';
      this.saved = false;
    },

    toggleMode() {
      const tab = this.activeTab;
      if (!tab || !isEditableFormat(tab.format)) return;
      this.setMode(tab.mode === 'preview' ? 'edit' : 'preview');
    },

    markSaved() {
      this.saved = true;
    },

    setTreeOpen(open) {
      this.treeOpen = !!open;
      try {
        localStorage.setItem(TREE_KEY, this.treeOpen ? '1' : '0');
      } catch {
        /* 隐私模式 */
      }
    },

    toggleTree() {
      this.setTreeOpen(!this.treeOpen);
    }
  }
});
