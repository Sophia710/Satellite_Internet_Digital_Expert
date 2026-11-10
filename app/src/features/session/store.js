import { defineStore } from 'pinia';
import seed from '../../services/seeds/history.json';

let seq = 0;
const nextId = (prefix) => {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq}`;
};

function cloneSeed() {
  return JSON.parse(JSON.stringify(seed));
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    groupsExpanded: cloneSeed().groupsExpanded,
    selectedId: null,
    projects: cloneSeed().projects,
    recent: cloneSeed().recent
  }),

  getters: {
    /** 置顶优先、组内保持原顺序（稳定排序） */
    sortedProjects: (s) =>
      s.projects
        .map((p, i) => ({ p, i }))
        .sort((a, b) => Number(b.p.pinned) - Number(a.p.pinned) || a.i - b.i)
        .map((x) => x.p),

    sortedRecent: (s) =>
      s.recent
        .map((c, i) => ({ c, i }))
        .sort((a, b) => Number(b.c.pinned) - Number(a.c.pinned) || a.i - b.i)
        .map((x) => x.c),

    sortedConversations: (s) => (project) =>
      project.conversations
        .map((c, i) => ({ c, i }))
        .sort((a, b) => Number(b.c.pinned) - Number(a.c.pinned) || a.i - b.i)
        .map((x) => x.c),

    findConversation: (s) => (id) => {
      for (const project of s.projects) {
        const conv = project.conversations.find((c) => c.id === id);
        if (conv) return { conv, project };
      }
      const conv = s.recent.find((c) => c.id === id);
      return conv ? { conv, project: null } : null;
    }
  },

  actions: {
    toggleGroup(key) {
      this.groupsExpanded[key] = !this.groupsExpanded[key];
    },

    toggleProject(id) {
      const p = this.projects.find((x) => x.id === id);
      if (p) p.expanded = !p.expanded;
    },

    select(id) {
      this.selectedId = id;
    },

    clearSelection() {
      this.selectedId = null;
    },

    createProject() {
      const project = { id: nextId('p-'), title: '新项目', pinned: false, expanded: true, conversations: [] };
      this.projects.unshift(project);
      return project.id;
    },

    createConversation(projectId) {
      const conv = { id: nextId('c-'), title: '新会话', pinned: false };
      if (projectId) {
        const p = this.projects.find((x) => x.id === projectId);
        if (p) {
          p.conversations.unshift(conv);
          p.expanded = true;
        } else {
          this.recent.unshift(conv);
        }
      } else {
        this.recent.unshift(conv);
      }
      this.selectedId = conv.id;
      return conv.id;
    },

    renameConversation(id, title) {
      const found = this.findConversation(id);
      if (found) found.conv.title = title;
    },

    renameProject(id, title) {
      const p = this.projects.find((x) => x.id === id);
      if (p) p.title = title;
    },

    pinConversation(id) {
      const found = this.findConversation(id);
      if (found) found.conv.pinned = !found.conv.pinned;
    },

    pinProject(id) {
      const p = this.projects.find((x) => x.id === id);
      if (p) p.pinned = !p.pinned;
    },

    /** 从项目移出 → 回到「最近」组 */
    moveOutOfProject(id) {
      const idx = this.projects.findIndex((p) => p.conversations.some((c) => c.id === id));
      if (idx < 0) return;
      const p = this.projects[idx];
      const ci = p.conversations.findIndex((c) => c.id === id);
      const [conv] = p.conversations.splice(ci, 1);
      this.recent.unshift({ ...conv, pinned: false });
    },

    /** 把会话移动到指定项目（跨项目直接搬，已在该项目内则原样返回） */
    moveToProject(id, projectId) {
      const target = this.projects.find((p) => p.id === projectId);
      const found = this.findConversation(id);
      if (!target || !found) return false;
      if (found.project && found.project.id === projectId) {
        target.expanded = true;
        return true;
      }
      if (found.project) {
        const ci = found.project.conversations.findIndex((c) => c.id === id);
        if (ci >= 0) found.project.conversations.splice(ci, 1);
      } else {
        const ri = this.recent.findIndex((c) => c.id === id);
        if (ri >= 0) this.recent.splice(ri, 1);
      }
      target.conversations.unshift({ ...found.conv, pinned: false });
      target.expanded = true;
      return true;
    },

    removeConversation(id) {
      this.projects.forEach((p) => {
        const i = p.conversations.findIndex((c) => c.id === id);
        if (i >= 0) p.conversations.splice(i, 1);
      });
      const ri = this.recent.findIndex((c) => c.id === id);
      if (ri >= 0) this.recent.splice(ri, 1);
      if (this.selectedId === id) this.selectedId = null;
    },

    removeProject(id) {
      const i = this.projects.findIndex((p) => p.id === id);
      if (i < 0) return;
      const removed = this.projects.splice(i, 1)[0];
      if (removed.conversations.some((c) => c.id === this.selectedId)) this.selectedId = null;
    }
  }
});
