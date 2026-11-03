<template>
  <div class="header-menu-search-left">
    <t-button
      theme="default"
      shape="square"
      variant="text"
      class="search-trigger-btn"
      :title="t('common.search_page')"
      @click="searchVisible = true"
    >
      <search-icon />
    </t-button>

    <!-- 页面搜索：按钮 + 模态框 -->
    <t-dialog
      v-model:visible="searchVisible"
      :header="t('common.search_page')"
      :footer="false"
      width="560px"
      destroy-on-close
      @closed="onDialogClosed"
    >
      <div class="search-dialog-body">
        <t-select
          v-model="searchData"
          filterable
          clearable
          autofocus
          :filter="filterSearch"
          :options="searchOptions"
          :placeholder="t('common.search_page_placeholder')"
          @change="handleNavigate"
        >
          <template #prefix-icon>
            <search-icon size="16" />
          </template>
        </t-select>
        <p class="search-dialog-tip">{{ t('common.search_page_tip') }}</p>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { SearchIcon } from 'tdesign-icons-vue-next';
import { computed, nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

interface SearchOption {
  value: string;
  label: string;
}

const { t } = useI18n();
const router = useRouter();

const searchVisible = ref(false);
const searchData = ref<string | null>(null);

const searchOptions = computed<SearchOption[]>(() => {
  const options: SearchOption[] = [];
  const allRoutes = (router.options.routes || []) as any[];

  const flatten = (routes: any[], parentPath: string, parentLabel: string) => {
    for (const route of routes) {
      // 根布局没有 meta，但需要继续展开 children
      if (route.meta?.hidden) continue;
      // 根布局 path 为 '/'，直接拼接会得到 '//dashboard/base'：
      // 该路径匹配不到真实路由（只会命中 catch-all 并回落到仪表盘），所以先把重复斜杠归一
      const path = route.path.startsWith('/')
        ? route.path
        : `${parentPath}/${route.path}`.replace(/\/+/g, '/');
      const label = route.meta?.title ? t(route.meta.title) : '';
      if (route.children?.length) {
        flatten(route.children, path, label || parentLabel);
      } else if (route.meta?.title) {
        const display = parentLabel && parentLabel !== label ? `${parentLabel} / ${label}` : label;
        options.push({ value: path, label: display });
      }
    }
  };
  flatten(allRoutes, '', '');
  return options;
});

function filterSearch(filterWords: string, option: any): boolean {
  if (!filterWords) return true;
  return String(option.label).toLowerCase().includes(filterWords.toLowerCase());
}

function handleNavigate(path: any) {
  if (!path) return;
  router.push(String(path)).catch(() => {});
  nextTick(() => {
    searchData.value = null;
    searchVisible.value = false;
  });
}

// 关闭搜索模态框时重置输入
function onDialogClosed() {
  searchData.value = null;
}
</script>

<style scoped>
.header-menu-search-left {
  display: flex;
  align-items: center;
}

/* 搜索模态框 */
.search-dialog-body {
  padding-top: 8px;
}

.search-dialog-tip {
  margin: 12px 2px 0;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
</style>
