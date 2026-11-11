import { defineStore } from 'pinia';
import { demoData, normalizeSteps, startPlayback } from '../../services/mockApi';
import { useSessionStore } from '../session/store';
import { summarizeQuestionTitle } from './title';

/** 演示里唯一带有完整终态的会话 */
export const COMPLETED_CONVERSATION = 'c11';

let playback = null;

export const useChatStore = defineStore('chat', {
  state: () => ({
    mode: 'welcome', // welcome | thread | empty
    conversationId: null,
    title: null,
    userText: '',
    think: {
      state: 'idle', // idle | running | done | stopped
      runningLabel: demoData.thinking.running,
      doneLabel: demoData.thinking.doneLabel,
      body: demoData.thinking.body,
      stopLabel: demoData.thinking.stopLabel,
      stopBody: demoData.thinking.stopBody
    },
    steps: [],
    reveals: { md: false, code: false, cites: false, cards: false },
    generating: false
  }),

  getters: {
    showHeaderTitle: (s) => s.mode === 'thread' || (s.mode === 'welcome' && !!s.title),
    thinkLabel: (s) => {
      if (s.think.state === 'running') return s.think.runningLabel;
      if (s.think.state === 'stopped') return s.think.stopLabel;
      if (s.think.state === 'done') return s.think.doneLabel;
      return '';
    },
    thinkBody: (s) => (s.think.state === 'stopped' ? s.think.stopBody : s.think.body),
    doneSteps: (s) => s.steps.filter((x) => x.state === 'done').length
  },

  actions: {
    stopPlayback() {
      if (playback) {
        playback.stop();
        playback = null;
      }
      if (this.generating && this.conversationId) {
        const session = useSessionStore();
        const unread = session.selectedId !== this.conversationId;
        session.setConversationStatus(this.conversationId, 'waiting', unread);
      }
      this.generating = false;
    },

    resetTurn() {
      this.stopPlayback();
      this.think.state = 'idle';
      this.steps = [];
      this.reveals = { md: false, code: false, cites: false, cards: false };
    },

    /** 欢迎态：无会话，或打开一个还没演示内容的会话 */
    showWelcome(title = null, conversationId = null) {
      this.stopPlayback();
      this.mode = 'welcome';
      this.title = title;
      this.conversationId = conversationId;
      this.userText = '';
      this.resetTurn();
    },

    showEmpty() {
      this.stopPlayback();
      this.mode = 'empty';
      this.title = null;
      this.conversationId = null;
      this.userText = '';
      this.resetTurn();
    },

    openConversation(id) {
      const session = useSessionStore();
      session.markStatusSeen(id);
      const found = session.findConversation(id);
      const title = found ? found.conv.title : '新会话';
      if (id === COMPLETED_CONVERSATION) {
        this.stopPlayback();
        this.mode = 'thread';
        this.conversationId = id;
        this.title = title;
        this.userText = demoData.defaultQuestion;
        this.think.state = 'done';
        this.steps = normalizeSteps().map((s) => this.applyDone(s));
        this.reveals = { md: true, code: true, cites: true, cards: true };
        this.generating = false;
      } else {
        this.showWelcome(title, id);
      }
    },

    applyDone(step) {
      return {
        ...step,
        state: 'done',
        tool: step.doneTool,
        dur: step.doneDur,
        detail: ''
      };
    },

    /** 发送：没有会话时新建一个，返回会话 id 供路由跳转 */
    send(text) {
      const session = useSessionStore();
      const value = String(text || '').trim();
      if (!value) return this.conversationId;

      let id = this.conversationId;
      if (!id) {
        id = session.createConversation(null);
      }
      const conv = session.findConversation(id)?.conv;
      if (conv && (!conv.title || conv.title === '新会话')) {
        session.renameConversation(id, summarizeQuestionTitle(value));
      }
      this.conversationId = id;
      this.title = (session.findConversation(id)?.conv.title) || '新会话';
      this.userText = value;
      this.mode = 'thread';
      this.run();
      return id;
    },

    run() {
      this.stopPlayback();
      this.steps = normalizeSteps();
      this.reveals = { md: false, code: false, cites: false, cards: false };
      this.think.state = 'running';
      this.generating = true;
      const session = useSessionStore();
      if (this.conversationId) session.setConversationStatus(this.conversationId, 'running', false);

      try {
        playback = startPlayback({
          onThinkDone: () => {
            this.think.state = 'done';
          },
          onStep: (index, state) => {
            const step = this.steps[index];
            if (!step) return;
            if (state === 'running') {
              step.state = 'running';
              step.tool = step.runningTool;
              step.dur = step.runningDur;
              step.detail = step.runningDetail;
            } else {
              Object.assign(step, this.applyDone(step));
            }
          },
          onReveal: (key) => {
            this.reveals[key] = true;
          },
          onDone: () => {
            this.generating = false;
            playback = null;
            if (this.conversationId) session.setConversationStatus(this.conversationId, 'completed', false);
          }
        });
      } catch {
        this.generating = false;
        if (this.conversationId) session.setConversationStatus(this.conversationId, 'failed', false);
      }
    },

    stop() {
      if (!this.generating) return;
      this.stopPlayback();
      if (this.think.state === 'running') this.think.state = 'stopped';
      this.steps.forEach((s) => {
        if (s.state === 'running') {
          s.state = 'waiting';
          s.tool = '';
          s.dur = '';
          s.detail = '';
        }
      });
    },

    regenerate() {
      if (!this.userText) return;
      this.mode = 'thread';
      this.run();
    }
  }
});
