import 'vue-router';
import type { Component } from 'vue';

declare module 'vue-router' {
  interface RouteMeta {
    /** i18n key，用于菜单/面包屑/document.title */
    title?: string;
    /** 菜单图标组件 */
    icon?: Component;
    /** 不在侧边菜单中展示 */
    hidden?: boolean;
    /**
     * 后端权限码（enums/permissions.go 同目录）：菜单显隐与导航拦截的依据。
     * 未标注的路由仅需登录态（基础组：登出/ws/自助改密等）。
     * 判定数据来自登录后的权限探针（store/modules/permission.ts），fail-closed：
     * 探针未完成/失败时按无权限处理，与后端 RequirePermission 同口径。
     */
    permission?: string;
  }
}
