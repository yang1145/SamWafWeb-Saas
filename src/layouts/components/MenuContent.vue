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

/** 内部转换态：叶子路由可携带 meta.menuGroup（i18n key）等待归并 */
type MenuNodeWithGroup = MenuNode & { menuGroup?: string };

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
 *
 * 二级子分组：叶子路由标注 meta.menuGroup（i18n key）时，按首次出现顺序
 * 归并为折叠子菜单（如「网站防护 → 访问控制」）；同一 key 不连续出现也会
 * 合并进同一组。仅影响菜单展示层级，路由 path 保持扁平。
 */
function toMenuNodes(items: (RouteRecordRaw | MenuNode)[], base: string): MenuNode[] {
  const nodes: MenuNodeWithGroup[] = [];
  for (const item of items) {
    if (!('meta' in item) && !('component' in item) && 'title' in item) {
      nodes.push(item as MenuNode); // 已是菜单节点
      continue;
    }
    const route = item as RouteRecordRaw;
    if (route.meta?.hidden || !route.meta?.title) continue;
    if (!permissionStore.has(route.meta.permission)) continue;
    const fullPath = joinPath(base, route.path);
    if (route.children?.length) {
      const children = toMenuNodes(route.children, fullPath);
      if (!children.length) continue; // 组内子项全被过滤（含权限裁剪）：整组不渲染
      nodes.push({
        path: fullPath,
        title: route.meta.title,
        icon: route.meta.icon,
        children,
      });
      continue;
    }
    nodes.push({
      path: fullPath,
      title: route.meta.title,
      icon: route.meta.icon,
      menuGroup: route.meta.menuGroup as string | undefined,
    });
  }

  // menuGroup 归并：未标注的项原位直出，标注的项按 i18n key 分桶折叠
  const result: MenuNode[] = [];
  const buckets = new Map<string, MenuNode>();
  for (const node of nodes) {
    const { menuGroup, ...leaf } = node;
    if (!menuGroup) {
      result.push(leaf);
      continue;
    }
    let bucket = buckets.get(menuGroup);
    if (!bucket) {
      // 分组节点 value 需全局唯一且不与任何路由 path 冲突，用父路径做前缀
      bucket = { path: `${base}__group__${menuGroup}`, title: menuGroup, children: [] };
      buckets.set(menuGroup, bucket);
      result.push(bucket);
    }
    bucket.children!.push(leaf);
  }
  return result;
}

const list = computed(() => toMenuNodes(props.navData, props.basePath || ''));
</script>
