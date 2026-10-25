<template>
  <template v-for="item in list" :key="item.path">
    <t-submenu v-if="item.children && item.children.length" :value="item.path" :title="t(item.title)">
      <template v-if="item.icon" #icon>
        <component :is="item.icon" />
      </template>
      <MenuContent :nav-data="item.children" />
    </t-submenu>
    <t-menu-item v-else :value="item.path">
      <template v-if="item.icon" #icon>
        <component :is="item.icon" />
      </template>
      {{ t(item.title) }}
    </t-menu-item>
  </template>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import { useI18n } from 'vue-i18n';
import type { RouteRecordRaw } from 'vue-router';

import { usePermissionStore } from '@/store/modules/permission';

export interface MenuNode {
  path: string;
  title: string;
  icon?: Component;
  children?: MenuNode[];
}

const props = defineProps<{
  // 既支持原始路由记录，也支持已转换的菜单节点（递归时传入）
  navData: (RouteRecordRaw | MenuNode)[];
  basePath?: string;
}>();

const { t } = useI18n();
const permissionStore = usePermissionStore();

function joinPath(base: string, path: string): string {
  if (path.startsWith('/')) return path;
  return `${base.replace(/\/$/, '')}/${path}`;
}

/**
 * 把路由记录转换为菜单节点，过滤 hidden / 无标题 / 无权限项。
 * 权限判定走权限 store（登录后探针填充，响应式）：探测未完成或无权都隐藏
 * （fail-closed）。组内全部子项被过滤后整组丢弃（否则组会退化成叶子项）。
 */
function toMenuNodes(items: (RouteRecordRaw | MenuNode)[], base: string): MenuNode[] {
  return items
    .map((item) => {
      if (!('meta' in item) && !('component' in item) && 'title' in item) {
        return item as MenuNode; // 已是菜单节点
      }
      const route = item as RouteRecordRaw;
      if (route.meta?.hidden || !route.meta?.title) return null;
      if (!permissionStore.has(route.meta.permission)) return null;
      const fullPath = joinPath(base, route.path);
      if (route.children?.length) {
        const children = toMenuNodes(route.children, fullPath);
        if (!children.length) return null; // 组内子项全被过滤（含权限裁剪）：整组不渲染
        return {
          path: fullPath,
          title: route.meta.title,
          icon: route.meta.icon,
          children,
        };
      }
      return {
        path: fullPath,
        title: route.meta.title,
        icon: route.meta.icon,
      };
    })
    .filter((item): item is MenuNode => item !== null);
}

const list = computed(() => toMenuNodes(props.navData, props.basePath || ''));
</script>
