<template>
  <t-layout class="app-layout">
    <!-- PC：固定侧边栏（可折叠） -->
    <t-aside v-if="!settingStore.isMobile" :width="asideWidth" class="app-aside">
      <side-nav :collapsed="settingStore.isSidebarCompact" />
    </t-aside>

    <!-- 移动端：抽屉式侧边菜单 -->
    <t-drawer
      v-else
      v-model:visible="settingStore.sidebarDrawerVisible"
      placement="left"
      size="232px"
      :close-btn="false"
      :footer="false"
      :header="false"
      class="app-sidebar-drawer"
    >
      <side-nav :collapsed="false" />
    </t-drawer>

    <t-layout class="app-main">
      <!-- HTTP 访问提示条：置于内容区顶部、页头上方，宽度与内容区对齐（放在布局最外层会被
           flex 当作与侧边栏平级的列，挤在侧边栏旁边导致位置错误） -->
      <insecure-banner />
      <t-header class="app-header" height="56px">
        <layout-header />
      </t-header>
      <t-content class="app-content">
        <breadcrumb v-if="settingStore.showBreadcrumb" />
        <router-view />
        <layout-footer v-if="settingStore.showFooter" />
      </t-content>
    </t-layout>

    <!-- AI 助手抽屉 + 悬浮入口 -->
    <ai-assistant />

    <!-- 页面配置抽屉 -->
    <setting-panel />
  </t-layout>
</template>

<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { NotifyPlugin, Button as TButton } from 'tdesign-vue-next';
import { useSettingStore } from '@/store/modules/setting';
import SideNav from './components/SideNav.vue';
import InsecureBanner from './components/InsecureBanner.vue';
import LayoutHeader from './components/LayoutHeader.vue';
import Breadcrumb from './components/Breadcrumb.vue';
import AiAssistant from './components/AiAssistant.vue';
import LayoutFooter from './components/Footer.vue';
import SettingPanel from './setting.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const settingStore = useSettingStore();

const asideWidth = computed(() => (settingStore.isSidebarCompact ? '64px' : '232px'));

// 移动端点击菜单跳转后自动收起抽屉
watch(
  () => route.path,
  () => {
    if (settingStore.isMobile) {
      settingStore.sidebarDrawerVisible = false;
    }
  },
);

function onResize() {
  settingStore.updateIsMobile();
}

// 登录来源提醒：登录时把响应里的 login_notice 存进 sessionStorage，进入布局后在右下角弹一次。
// 读完即删，保证刷新页面不会反复弹。
function showLoginNotice() {
  const raw = sessionStorage.getItem('login_notice');
  if (!raw) return;
  sessionStorage.removeItem('login_notice');

  let notice: Record<string, any> | null = null;
  try {
    notice = JSON.parse(raw);
  } catch {
    return;
  }
  if (!notice || !notice.current_ip) return;

  const dash = (v: string) => (v && String(v).trim() !== '' ? v : '-');
  const rows: Array<[string, string]> = [
    [t('page.login_notice.current_ip'), dash(notice.current_ip)],
    [t('page.login_notice.current_area'), dash(notice.current_area)],
    [t('page.login_notice.current_time'), dash(notice.current_time)],
  ];
  if (notice.is_changed) {
    rows.push([t('page.login_notice.last_ip'), dash(notice.last_ip)]);
    rows.push([t('page.login_notice.last_area'), dash(notice.last_area)]);
    rows.push([t('page.login_notice.last_time'), dash(notice.last_time)]);
  }

  let tipKey = 'page.login_notice.same_tip';
  if (notice.is_changed) tipKey = 'page.login_notice.changed_tip';
  else if (notice.is_first) tipKey = 'page.login_notice.first_tip';

  // 全部用 h() 构造文本节点，IP/归属地这些外部来源的字符串不会被当成 HTML 解析
  const content = () =>
    h('div', { style: 'font-size:13px;line-height:22px;' }, [
      ...rows.map(([label, value]) =>
        h('div', { style: 'display:flex;gap:8px;' }, [
          h('span', { style: 'flex:0 0 84px;color:var(--td-text-color-secondary);' }, label),
          h('span', { style: 'flex:1;word-break:break-all;' }, value),
        ]),
      ),
      h(
        'div',
        {
          style: `margin-top:8px;${
            notice.is_changed ? 'color:var(--td-warning-color);' : 'color:var(--td-text-color-secondary);'
          }`,
        },
        t(tipKey),
      ),
    ]);

  const options: Record<string, any> = {
    title: t(notice.is_changed ? 'page.login_notice.title_changed' : 'page.login_notice.title_normal'),
    content,
    placement: 'bottom-right',
    // 来源变化是要人看到并判断的，不自动消失，必须用户自己关；一致时 6 秒后自动关掉，别挡住页面
    duration: notice.is_changed ? 0 : 6000,
    closeBtn: true,
  };

  // instance 在 footer 渲染之后才赋值，但点击一定发生在渲染之后，闭包里拿得到
  let instance: Promise<{ close: () => void }> | null = null;
  if (notice.is_changed) {
    options.footer = () =>
      h('div', { style: 'display:flex;justify-content:flex-end;' }, [
        h(
          TButton,
          {
            theme: 'primary',
            variant: 'text',
            size: 'small',
            onClick: () => {
              if (instance) NotifyPlugin.close(instance);
              router.push('/account/LoginHistory');
            },
          },
          () => t('page.login_notice.view_history'),
        ),
      ]);
  }
  instance = notice.is_changed ? NotifyPlugin.warning(options) : NotifyPlugin.success(options);
}

onMounted(() => {
  settingStore.updateIsMobile();
  window.addEventListener('resize', onResize);
  showLoginNotice();
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
</script>

<style scoped>
.app-layout {
  height: 100vh;
}

.app-aside {
  transition: width 0.2s;
  border-right: 1px solid var(--td-component-stroke);
}

.app-main {
  height: 100vh;
  overflow: hidden;
}

.app-header {
  border-bottom: 1px solid var(--td-component-stroke);
  background: var(--td-bg-color-container);
}

.app-content {
  padding: 24px;
  overflow: auto;
  background: var(--td-bg-color-page);
}

@media (max-width: 768px) {
  .app-content {
    padding: 16px;
  }
}
</style>

<style>
/* 抽屉内菜单铺满，去掉默认内边距（drawer 渲染在 body 下，不能用 scoped） */
.app-sidebar-drawer .t-drawer__body {
  padding: 0;
  background: var(--td-bg-color-container);
}
</style>
