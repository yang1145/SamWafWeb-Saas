import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import { markRaw } from 'vue';
import { DashboardIcon } from 'tdesign-icons-vue-next';
import wafRoutes, { setupPlatformMenuGate } from './modules/waf';

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/login/index.vue'),
    meta: { title: 'login.login_title', hidden: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        redirect: '/dashboard/base',
        meta: { title: 'menu.dashboard.parent_title', icon: markRaw(DashboardIcon) },
        children: [
          {
            path: 'base',
            name: 'DashboardBase',
            component: () => import('@/pages/dashboard/base/index.vue'),
            meta: { title: 'menu.dashboard.dashboard_title' },
          },
          {
            path: 'stats',
            name: 'DashboardStats',
            component: () => import('@/pages/dashboard/stats/index.vue'),
            meta: { title: 'menu.dashboard.stats_title' },
          },
          {
            path: 'overview',
            name: 'DashboardOverview',
            component: () => import('@/pages/dashboard/overview/index.vue'),
            meta: { title: 'menu.dashboard.overview_title' },
          },
        ],
      },
      ...wafRoutes,
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];

const router = createRouter({
  // 沿用 Vue2 版本的 hash 模式，便于打包进后端二进制后静态托管
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { left: 0, top: 0 };
  },
});

export default router;

// 租户菜单按平台角色显隐的探针门控（挂在路由守卫链上，登录后静默探测一次）
setupPlatformMenuGate(router);
