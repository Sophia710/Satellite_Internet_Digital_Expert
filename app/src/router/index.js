import { createRouter, createWebHashHistory } from 'vue-router';
import WorkbenchView from '../views/WorkbenchView.vue';
import NotFoundView from '../views/NotFoundView.vue';

// hash 模式：打包后的单文件双击（file://）也能正常走路由
const routes = [
  { path: '/', name: 'workspace', component: WorkbenchView },
  { path: '/w/:conversationId', name: 'conversation', component: WorkbenchView },
  {
    path: '/w/:conversationId/artifact/:artifactId',
    name: 'conversation-artifact',
    component: WorkbenchView
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
];

export default createRouter({
  history: createWebHashHistory(),
  routes
});
