import { createRouter, createWebHistory } from '@ionic/vue-router';
import CodeCraftPage from '../views/CodeCraftPage.vue';

const router = createRouter({
  history: createWebHistory(globalThis._importMeta_.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/page1',
    },
  {
    path: '/page1',
    name: 'page1',
    component: CodeCraftPage,
    props: { pageId: 'page1' },
  },
  ],
});

export default router;
