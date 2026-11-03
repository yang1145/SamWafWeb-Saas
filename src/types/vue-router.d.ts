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
     * 菜单二级子分组（i18n key）：仅叶子路由可标注，MenuContent 渲染时
     * 按其归并为折叠子菜单（如「网站防护 → 访问控制」），不影响路由结构
     */
    menuGroup?: string;
    /**
     * 后端权限码（enums/permissions.go 同目录）：菜单显隐与导航拦截的依据。
     * 未标注的路由仅需登录态（基础组：登出/ws/自助改密等）。
     * 判定数据来自登录后的权限探针（store/modules/permission.ts），fail-closed：
     * 探针未完成/失败时按无权限处理，与后端 RequirePermission 同口径。
     */
    permission?: string;
  }
}
