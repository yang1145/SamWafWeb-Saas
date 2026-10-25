import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import { markRaw } from 'vue';
import { DashboardIcon } from 'tdesign-icons-vue-next';
import wafRoutes, { setupPermissionMenuGate } from './modules/waf';

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
            meta: { title: 'menu.dashboard.dashboard_title', permission: 'dashboard:view' },
          },
          {
            path: 'stats',
            name: 'DashboardStats',
            component: () => import('@/pages/dashboard/stats/index.vue'),
            meta: { title: 'menu.dashboard.stats_title', permission: 'dashboard:view' },
          },
          {
            path: 'overview',
            name: 'DashboardOverview',
            component: () => import('@/pages/dashboard/overview/index.vue'),
            meta: { title: 'menu.dashboard.overview_title', permission: 'dashboard:view' },
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

// 权限菜单门控：登录后按权限码探针裁剪菜单并拦截无权导航（SaaS 租户权限差异化）
setupPermissionMenuGate(router);
