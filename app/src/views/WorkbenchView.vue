<template>
  <WorkbenchLayout>
    <template #left>
      <HistorySidebar @new="startNewChat" @open="openConversation" @deleted="onDeleted" />
    </template>

    <template #center>
      <ConversationPane ref="paneRef" @open="onTurnCreated" />
    </template>

    <template #right>
      <ArtifactPanel @navigate="onArtifactNavigate" />
    </template>
  </WorkbenchLayout>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WorkbenchLayout from '../layouts/WorkbenchLayout.vue';
import HistorySidebar from '../features/session/HistorySidebar.vue';
import ConversationPane from '../features/chat/ConversationPane.vue';
import ArtifactPanel from '../features/artifact/ArtifactPanel.vue';
import { useChatStore } from '../features/chat/store';
import { useSessionStore } from '../features/session/store';
import { useArtifactStore } from '../features/artifact/store';
import { lookupArtifact } from '../services/artifacts';

const route = useRoute();
const router = useRouter();
const chat = useChatStore();
const session = useSessionStore();
const artifact = useArtifactStore();

function openConversation(id) {
  router.push(`/w/${id}`);
}

function startNewChat() {
  session.clearSelection();
  chat.showWelcome();
  router.push('/');
}

function onTurnCreated(id) {
  if (id && route.params.conversationId !== id) router.push(`/w/${id}`);
}

function onArtifactNavigate(artifactId) {
  if (!chat.conversationId) return;
  router.push(
    artifactId ? `/w/${chat.conversationId}/artifact/${artifactId}` : `/w/${chat.conversationId}`
  );
}

function onDeleted(id) {
  if (route.params.conversationId === id) startNewChat();
}

/* 路由 → 状态：刷新 / 深链都能还原 */
function applyRoute() {
  const convId = route.params.conversationId;
  const artId = route.params.artifactId;

  if (convId) {
    session.select(convId);
    if (chat.conversationId !== convId) chat.openConversation(convId);
  } else {
    session.clearSelection();
    if (chat.mode === 'thread') chat.showWelcome();
  }

  if (artId) {
    artifact.open(lookupArtifact(artId));
  }
}

/* 产物页签变化 → 深链同步（会话存在时才写进 URL） */
watch(
  () => [artifact.activeId, artifact.launcher],
  () => {
    if (!chat.conversationId) return;
    const target = artifact.activeId && !artifact.launcher
      ? `/w/${chat.conversationId}/artifact/${artifact.activeId}`
      : `/w/${chat.conversationId}`;
    if (route.path !== target) router.push(target);
  }
);

watch(
  () => route.fullPath,
  applyRoute,
  { immediate: true }
);

onMounted(() => {
  if (!route.params.conversationId) chat.showWelcome();
});
</script>
