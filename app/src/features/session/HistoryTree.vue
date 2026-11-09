<template>
  <div class="ds-history">
    <div
      v-for="group in groups"
      :key="group.key"
      class="ds-history__group"
      :data-group="group.key"
      :data-expanded="expanded[group.key] ? 'true' : 'false'"
    >
      <div class="ds-history__group-head">
        <span class="ds-history__group-label">{{ group.label }}</span>
        <button
          type="button"
          class="ds-icon-btn ds-icon-btn--sm"
          data-act="toggle-group"
          :aria-expanded="expanded[group.key] ? 'true' : 'false'"
          :aria-label="expanded[group.key] ? `折叠${group.label}分组` : `展开${group.label}分组`"
          @click="session.toggleGroup(group.key)"
        >
          <Icon name="chevron-down" :size="16" />
        </button>
        <span class="ds-history__group-actions">
          <button
            v-if="group.key === 'projects'"
            type="button"
            class="ds-icon-btn ds-icon-btn--sm"
            data-act="project-create"
            aria-label="新建项目"
            @click="createProject"
          >
            <Icon name="folder-plus" :size="16" />
          </button>
          <button
            v-else
            type="button"
            class="ds-icon-btn ds-icon-btn--sm"
            data-act="conversation-create"
            aria-label="新建会话"
            @click="createConversation(null)"
          >
            <Icon name="message-plus" :size="16" />
          </button>
        </span>
      </div>

      <div class="ds-history__group-body">
        <template v-if="group.key === 'projects'">
          <div
            v-for="project in session.sortedProjects"
            :key="project.id"
            class="ds-history__project"
            :data-project-id="project.id"
            :data-expanded="project.expanded ? 'true' : 'false'"
          >
            <div
              class="ds-history__row ds-history__row--project"
              :class="{
                'is-parent': project.conversations.some((c) => c.id === session.selectedId),
                'is-renaming': isRenaming('project', project.id)
              }"
              data-rename-row
            >
              <Icon
                :name="project.expanded ? 'folder-open' : 'folder'"
                :size="16"
                icon-class="ds-history__folder"
              />
              <input
                v-if="isRenaming('project', project.id)"
                ref="renameInput"
                v-model="renameValue"
                type="text"
                class="ds-rename__input"
                aria-label="重命名"
                @keydown.enter.prevent="commitRename"
                @keydown.esc.prevent.stop="cancelRename"
                @blur="commitRename"
              />
              <span
                v-else
                class="ds-history__label ds-rename__anchor"
                data-label
                @dblclick="startRename('project', project.id, project.title)"
              >{{ project.title }}</span>
              <button
                type="button"
                class="ds-icon-btn ds-icon-btn--sm"
                data-act="project-toggle"
                :aria-expanded="project.expanded ? 'true' : 'false'"
                :aria-label="project.expanded ? '折叠项目' : '展开项目'"
                @click="session.toggleProject(project.id)"
              >
                <Icon name="chevron-down" :size="16" />
              </button>
              <span class="ds-history__row-actions">
                <button
                  type="button"
                  class="ds-icon-btn ds-icon-btn--sm"
                  data-act="conversation-create"
                  aria-label="在项目中新建会话"
                  :disabled="isRenaming('project', project.id)"
                  @click="createConversation(project.id)"
                >
                  <Icon name="message-plus" :size="16" />
                </button>
                <button
                  type="button"
                  class="ds-icon-btn ds-icon-btn--sm"
                  data-act="menu"
                  aria-haspopup="menu"
                  aria-label="更多操作"
                  :disabled="isRenaming('project', project.id)"
                  @click="openProjectMenu($event, project)"
                >
                  <Icon name="more-horizontal" :size="16" />
                </button>
              </span>
            </div>

            <div class="ds-history__project-body">
              <div
                v-for="conv in session.sortedConversations(project)"
                :key="conv.id"
                class="ds-history__row ds-history__row--conversation"
                :class="{ 'is-current': session.selectedId === conv.id, 'is-renaming': isRenaming('conversation', conv.id) }"
                data-rename-row
                :data-conv-id="conv.id"
                :data-in-project="project.id"
              >
                <button
                  v-if="!isRenaming('conversation', conv.id)"
                  type="button"
                  class="ds-history__main"
                  data-act="open"
                  :aria-label="conv.title"
                  @click="scheduleOpen(conv.id)"
                  @dblclick="startRename('conversation', conv.id, conv.title)"
                >
                  {{ conv.title }}
                </button>
                <input
                  v-else
                  ref="renameInput"
                  v-model="renameValue"
                  type="text"
                  class="ds-rename__input"
                  aria-label="重命名"
                  @keydown.enter.prevent="commitRename"
                  @keydown.esc.prevent.stop="cancelRename"
                  @blur="commitRename"
                />
                <span class="ds-history__row-actions">
                  <button
                    type="button"
                    class="ds-icon-btn ds-icon-btn--sm"
                    data-act="menu"
                    aria-haspopup="menu"
                    aria-label="更多操作"
                    :disabled="isRenaming('conversation', conv.id)"
                    @click="openConversationMenu($event, conv, project.id)"
                  >
                    <Icon name="more-horizontal" :size="16" />
                  </button>
                </span>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div
            v-for="conv in session.sortedRecent"
            :key="conv.id"
            class="ds-history__row ds-history__row--conversation ds-history__row--recent"
            :class="{ 'is-current': session.selectedId === conv.id, 'is-renaming': isRenaming('conversation', conv.id) }"
            data-rename-row
            :data-conv-id="conv.id"
            data-in-project=""
          >
            <button
              v-if="!isRenaming('conversation', conv.id)"
              type="button"
              class="ds-history__main"
              data-act="open"
              :aria-label="conv.title"
              @click="scheduleOpen(conv.id)"
              @dblclick="startRename('conversation', conv.id, conv.title)"
            >
              {{ conv.title }}
            </button>
            <input
              v-else
              ref="renameInput"
              v-model="renameValue"
              type="text"
              class="ds-rename__input"
              aria-label="重命名"
              @keydown.enter.prevent="commitRename"
              @keydown.esc.prevent.stop="cancelRename"
              @blur="commitRename"
            />
            <span class="ds-history__row-actions">
              <button
                type="button"
                class="ds-icon-btn ds-icon-btn--sm"
                data-act="menu"
                aria-haspopup="menu"
                aria-label="更多操作"
                :disabled="isRenaming('conversation', conv.id)"
                @click="openConversationMenu($event, conv, null)"
              >
                <Icon name="more-horizontal" :size="16" />
              </button>
            </span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import Icon from '../../shared/ui/Icon.vue';
import { useSessionStore } from '../session/store';
import { confirmDialog } from '../../shared/ui/dialog';
import { openPopover } from '../../shared/ui/popover';

const emit = defineEmits(['open']);
const session = useSessionStore();

const groups = [
  { key: 'projects', label: '项目' },
  { key: 'recent', label: '对话' }
];

const expanded = computed(() => session.groupsExpanded);
const renameInput = ref(null);

/* 重命名态：{kind, id, value} */
const renaming = ref(null);
const renameValue = ref('');

function isRenaming(kind, id) {
  return !!renaming.value && renaming.value.kind === kind && renaming.value.id === id;
}

function startRename(kind, id, title) {
  cancelPendingOpen();
  renaming.value = { kind, id };
  renameValue.value = title;
  nextTick(() => {
    const el = Array.isArray(renameInput.value) ? renameInput.value[0] : renameInput.value;
    el?.focus();
    el?.select();
  });
}

function commitRename() {
  if (!renaming.value) return;
  const { kind, id } = renaming.value;
  const value = renameValue.value.trim();
  const found = kind === 'project'
    ? session.projects.find((p) => p.id === id)
    : session.findConversation(id)?.conv;
  const previous = found ? found.title : '';
  renaming.value = null;
  if (!value || value === previous) return;
  if (kind === 'project') session.renameProject(id, value);
  else session.renameConversation(id, value);
}

function cancelRename() {
  renaming.value = null;
}

/* ---------------- 单击延迟打开（给双击重命名让路） ---------------- */
let openTimer = null;

function scheduleOpen(id) {
  clearTimeout(openTimer);
  openTimer = setTimeout(() => emit('open', id), 220);
}

function cancelPendingOpen() {
  clearTimeout(openTimer);
  openTimer = null;
}

/* ---------------- 新建 ---------------- */
function createProject() {
  const id = session.createProject();
  startRename('project', id, '新项目');
}

function createConversation(projectId) {
  const id = session.createConversation(projectId);
  emit('open', id);
}

/* ---------------- 菜单 ---------------- */
function openProjectMenu(event, project) {
  openPopover({
    anchor: event.currentTarget,
    align: 'start',
    items: [
      { icon: 'pencil', label: '重命名', action: 'rename' },
      { icon: 'pin', label: project.pinned ? '取消置顶' : '置顶', action: 'pin' },
      { divider: true },
      { icon: 'trash', label: '删除项目', action: 'delete', danger: true }
    ],
    onSelect: (action) => {
      if (action === 'rename') startRename('project', project.id, project.title);
      else if (action === 'pin') session.pinProject(project.id);
      else if (action === 'delete') confirmDeleteProject(project, event.currentTarget);
    }
  });
}

function openConversationMenu(event, conv, projectId) {
  const anchor = event.currentTarget;
  const items = [{ icon: 'pencil', label: '重命名', action: 'rename' }];
  if (projectId) items.push({ icon: 'folder-input', label: '移出项目', action: 'move-out' });
  items.push({ icon: 'folder-input', label: '移动到项目…', action: 'move-to', disabled: true });
  items.push({ icon: 'pin', label: conv.pinned ? '取消置顶' : '置顶', action: 'pin' });
  items.push({ divider: true });
  items.push({ icon: 'trash', label: '删除', action: 'delete', danger: true });

  openPopover({
    anchor,
    align: 'start',
    items,
    onSelect: (action) => {
      if (action === 'rename') startRename('conversation', conv.id, conv.title);
      else if (action === 'move-out') session.moveOutOfProject(conv.id);
      else if (action === 'pin') session.pinConversation(conv.id);
      else if (action === 'delete') confirmDeleteConversation(conv, anchor);
    }
  });
}

async function confirmDeleteConversation(conv, anchor) {
  const ok = await confirmDialog({
    title: '删除该会话？',
    body: '该会话及其消息、引用的数据集与产物将被删除，删除后不可恢复。',
    confirmText: '删除',
    cancelText: '取消',
    danger: true,
    returnFocus: anchor
  });
  if (!ok) return;
  session.removeConversation(conv.id);
  emit('deleted', conv.id);
}

async function confirmDeleteProject(project, anchor) {
  const n = project.conversations.length;
  const ok = await confirmDialog({
    title: '删除该项目？',
    body: n > 0 ? `将同时删除该项目及其下 ${n} 个会话，删除后不可恢复。` : '删除后不可恢复。',
    confirmText: n > 0 ? `删除项目及 ${n} 个会话` : '删除项目',
    cancelText: '取消',
    danger: true,
    returnFocus: anchor
  });
  if (!ok) return;
  const ids = project.conversations.map((c) => c.id);
  session.removeProject(project.id);
  emit('deleted', ids[0] || '');
}

onBeforeUnmount(() => clearTimeout(openTimer));

defineExpose({ cancelPendingOpen });
</script>
