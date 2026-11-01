<template>
  <div class="help-block" :class="['help-block--' + resolvedMode, { 'is-open': expanded }]">
    <div class="hb-row">
      <info-circle-icon class="hb-ico" />
      <span class="hb-txt" :class="{ 'is-clamp': resolvedMode === 'inline' && !expanded }">{{ summary }}</span>

      <!-- 页面自己的动作入口（如「去批量任务」），排在说明入口左边 -->
      <span v-if="$slots.actions" class="hb-actions">
        <slot name="actions" />
      </span>

      <!-- 单行形态：没有详细说明，文档链接直接跟在摘要后面 -->
      <a
        v-if="resolvedMode === 'none' && mainDoc"
        class="hb-doclink"
        :href="mainDoc.url"
        target="_blank"
        rel="noopener noreferrer"
        >{{ mainDoc.label }}</a
      >

      <!-- 内联形态：原地展开 -->
      <button
        v-else-if="resolvedMode === 'inline'"
        type="button"
        class="hb-act"
        :aria-expanded="expanded ? 'true' : 'false'"
        @click="toggle"
      >
        <span>{{ expanded ? t('common.help_block.collapse') : t('common.help_block.detail') }}</span>
        <chevron-down-icon class="hb-caret" />
      </button>

      <!-- 抽屉形态：内容太长，顶部只留这一行 -->
      <button v-else-if="resolvedMode === 'drawer'" type="button" class="hb-act" @click="drawerVisible = true">
        <span>{{ t('common.help_block.detail') }}</span>
        <chevron-right-icon class="hb-caret is-static" />
      </button>
    </div>

    <div v-if="resolvedMode === 'inline'" v-show="expanded" class="hb-panel">
      <help-detail v-bind="detailProps" :docs="docs" :docs-label="t('common.help_block.docs')" />
    </div>

    <!-- 测量用影子节点：和真实面板同宽同样式，只是不可见 -->
    <div v-if="hasDetail" ref="ghost" class="hb-ghost" aria-hidden="true">
      <help-detail v-bind="detailProps" :docs="docs" :docs-label="t('common.help_block.docs')" />
    </div>

    <t-drawer
      v-if="hasDetail"
      v-model:visible="drawerVisible"
      :header="drawerTitle"
      :footer="false"
      :close-btn="true"
      :close-on-overlay-click="true"
      :close-on-esc-keydown="true"
      placement="right"
      size="420px"
      class="help-block-drawer"
    >
      <help-detail v-bind="detailProps" :docs="[]" />
      <div v-if="docs.length" class="hb-drawer-docs">
        <span class="hb-docs-label">{{ t('common.help_block.docs') }}</span>
        <a
          v-for="(d, i) in docs"
          :key="i"
          class="hb-doclink"
          :href="d.url"
          target="_blank"
          rel="noopener noreferrer"
          >{{ d.label }}</a
        >
      </div>
    </t-drawer>
  </div>
</template>

<script setup lang="ts">
import { ChevronDownIcon, ChevronRightIcon, InfoCircleIcon } from 'tdesign-icons-vue-next';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { getOnlineUrl } from '@/utils/usuallytool';

import HelpDetail from './help-detail';

type HelpItem = { k: string; v: string; tone?: 'brand' | 'danger' };
type HelpLink = { label: string; doc?: string; url?: string };

const props = withDefaults(
  defineProps<{
    /** 一行摘要，任何形态下都显示 */
    summary: string;
    /** 详细说明段落 */
    detail?: string;
    /** 结构化操作说明，tone 控制标签配色 */
    items?: HelpItem[];
    /** 底部注意事项 */
    note?: string;
    /** 在线文档相对路径，如 guide/ThreatIP、guide/Host#_2-新增网站；完整 http(s) 地址也认 */
    doc?: string;
    /** 相关文档 */
    links?: HelpLink[];
    /** 抽屉标题 */
    title?: string;
    /** 内联展开的高度上限(px)，超过就转抽屉 */
    threshold?: number;
    /** auto | inline | drawer，自动判定不合适时可钉死 */
    mode?: 'auto' | 'inline' | 'drawer';
    /** 传了就记住展开/收起状态，跨刷新保留 */
    storageKey?: string;
  }>(),
  {
    detail: '',
    items: () => [],
    note: '',
    doc: '',
    links: () => [],
    title: '',
    threshold: 140,
    mode: 'auto',
    storageKey: '',
  },
);

const STORE_PREFIX = 'samwaf_helpblock_';

const { t, locale } = useI18n();

const ghost = ref<HTMLElement | null>(null);
const expanded = ref(false);
const drawerVisible = ref(false);
const autoMode = ref<'inline' | 'drawer'>('inline');
let resizeTimer = 0;

const hasDetail = computed(() => !!(props.detail || props.note || props.items.length));

// none=单行提示 / inline=原地折叠 / drawer=右侧抽屉
const resolvedMode = computed(() => {
  if (!hasDetail.value) return 'none';
  if (props.mode === 'inline' || props.mode === 'drawer') return props.mode;
  return autoMode.value;
});

const detailProps = computed(() => ({ detail: props.detail, items: props.items, note: props.note }));

const isEn = computed(() => String(locale.value || '').toLowerCase().indexOf('en') === 0);

// 相对路径 → 带语言的完整文档地址。base 只有 usuallytool 一处，换域名改那里就行
function buildDocUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  let p = path;
  let hash = '';
  const i = p.indexOf('#');
  if (i >= 0) {
    hash = p.slice(i);
    p = p.slice(0, i);
  }
  p = p.replace(/^\/+/, '');
  if (p && !/\.html$/i.test(p) && !/\/$/.test(p)) p += '.html';

  const base = getOnlineUrl() + (isEn.value ? '/en' : '');
  return `${base}/${p}${hash}`;
}

const docs = computed(() => {
  // 未配置文档站（brand.docUrl 为空）时不渲染任何文档链接
  if (!getOnlineUrl()) return [];
  const list: Array<{ label: string; url: string }> = [];
  if (props.doc) list.push({ label: t('common.help_block.doc_main'), url: buildDocUrl(props.doc) });
  props.links.forEach((l) => {
    const path = l.doc || l.url;
    if (path) list.push({ label: l.label, url: buildDocUrl(path) });
  });
  return list;
});

const mainDoc = computed(() => (docs.value.length ? docs.value[0] : null));
const drawerTitle = computed(() => props.title || t('common.help_block.title'));

// 把详细说明渲进影子节点量一次高度，决定内联还是抽屉。
// 按字数判会在窄屏失准：同一段文案折行后能高出一倍。
function measure() {
  if (!hasDetail.value || props.mode !== 'auto') return;
  const el = ghost.value;
  if (!el || !el.parentElement) return;

  const w = (el.parentElement as HTMLElement).clientWidth;
  if (!w) return;
  el.style.width = `${w}px`;

  const h = Math.round(el.getBoundingClientRect().height);
  const next = h > props.threshold ? 'drawer' : 'inline';
  if (next !== autoMode.value) {
    autoMode.value = next;
    // 从内联翻成抽屉时，把展开态收掉，避免留下一块空面板
    if (next === 'drawer') expanded.value = false;
  }
}

function onResize() {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(measure, 150);
}

function toggle() {
  expanded.value = !expanded.value;
  if (props.storageKey) {
    try {
      localStorage.setItem(STORE_PREFIX + props.storageKey, expanded.value ? '1' : '0');
    } catch (e) {
      /* 隐私模式下 localStorage 可能不可写，说明区不该因此报错 */
    }
  }
}

// 切语言后文案长度变了，重新量
watch(locale, () => {
  setTimeout(measure, 0);
});

onMounted(() => {
  if (props.storageKey) {
    try {
      expanded.value = localStorage.getItem(STORE_PREFIX + props.storageKey) === '1';
    } catch (e) {
      expanded.value = false;
    }
  }
  setTimeout(measure, 0);
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  window.clearTimeout(resizeTimer);
});
</script>

<style scoped>
.help-block {
  position: relative;
  margin-bottom: 12px;
  border: 1px solid var(--td-brand-color-3);
  border-radius: var(--td-radius-default);
  background: var(--td-brand-color-1);
  overflow: hidden;
}

.hb-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--td-text-color-primary);
}

.hb-ico {
  flex: none;
  color: var(--td-brand-color);
  font-size: 16px;
}

.hb-txt {
  flex: 1;
  min-width: 0;
}

.hb-txt.is-clamp {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hb-actions {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--td-brand-color);
  cursor: pointer;
  white-space: nowrap;
}

.hb-act {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 13px;
  color: var(--td-brand-color);
  cursor: pointer;
  white-space: nowrap;
}

.hb-act:hover {
  color: var(--td-brand-color-hover);
}

.hb-caret {
  font-size: 12px;
  transition: transform 0.18s ease;
}

.is-open .hb-caret:not(.is-static) {
  transform: rotate(180deg);
}

.hb-panel,
.hb-ghost {
  border-top: 1px solid var(--td-brand-color-3);
  background: var(--td-bg-color-container);
  padding: 14px 16px 16px;
}

/* 影子节点：参与布局计算但不可见、不可点 */
.hb-ghost {
  position: absolute;
  left: -99999px;
  top: 0;
  visibility: hidden;
  pointer-events: none;
}

.hb-doclink {
  color: var(--td-brand-color);
  text-decoration: none;
  white-space: nowrap;
}

.hb-doclink:hover {
  color: var(--td-brand-color-hover);
  text-decoration: underline;
}

.hb-doclink::after {
  content: '↗';
  margin-left: 2px;
  font-size: 0.9em;
}

.hb-drawer-docs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 18px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--td-component-stroke);
  font-size: 13px;
}

.hb-docs-label {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
}
</style>

<style>
/* HelpDetail 是 render 函数组件，拿不到 scoped 的 data 属性，样式统一放这里 */
.hb-detail {
  font-size: 13px;
  line-height: 1.7;
  color: var(--td-text-color-secondary);
}

.hb-detail .hb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px 28px;
}

.hb-detail .hb-op {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.hb-detail .hb-k {
  font-size: 12px;
  line-height: 20px;
  text-align: center;
  border-radius: 2px;
  border: 1px solid var(--td-component-stroke);
  background: var(--td-bg-color-secondarycontainer);
  color: var(--td-text-color-primary);
}

.hb-detail .hb-k.is-brand {
  background: var(--td-brand-color-1);
  border-color: var(--td-brand-color-3);
  color: var(--td-brand-color);
}

.hb-detail .hb-k.is-danger {
  background: var(--td-warning-color-1);
  border-color: var(--td-warning-color-3);
  color: var(--td-warning-color-7);
}

.hb-detail .hb-body {
  white-space: pre-line;
}

.hb-detail .hb-grid + .hb-body {
  margin-top: 10px;
}

.hb-detail .hb-note {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--td-component-border);
  font-size: 12px;
}

.hb-detail .hb-docs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 18px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--td-component-border);
}
</style>
