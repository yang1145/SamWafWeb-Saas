<template>
  <div class="layout-header">
    <t-button
      class="header-menu-btn"
      shape="square"
      variant="text"
      :aria-label="settingStore.isMobile ? 'menu' : 'collapse'"
      @click="settingStore.toggleSidebar()"
    >
      <view-list-icon />
    </t-button>

    <div class="header-spacer" />

    <!-- 搜索框（移动端隐藏） -->
    <search v-if="!settingStore.isMobile" />

    <!-- 系统监控（移动端隐藏） -->
    <system-monitor-widget v-if="!settingStore.isMobile" @open-wechat="wechatVisible = true" />

    <!-- 全局通知 -->
    <notice />

    <!-- 微信公众号 -->
    <t-tooltip v-if="!settingStore.isMobile" placement="bottom" :content="t('topNav.wechat')">
      <t-button theme="default" shape="square" variant="text" @click="wechatVisible = true">
        <logo-wechat-stroke-icon />
      </t-button>
    </t-tooltip>
    <!-- 联系我们 -->
    <t-tooltip v-if="!settingStore.isMobile" placement="bottom" :content="t('topNav.contract')">
      <t-button theme="default" shape="square" variant="text" @click="sendMail">
        <mail-icon />
      </t-button>
    </t-tooltip>
    <!-- 帮助文档 -->
    <t-tooltip placement="bottom" :content="t('topNav.help_document')">
      <t-button theme="default" shape="square" variant="text" @click="navToHelper">
        <help-circle-icon />
      </t-button>
    </t-tooltip>

    <!-- 页面配置 -->
    <t-tooltip placement="bottom" :content="t('page.right_setting.page_setting')">
      <t-button theme="default" shape="square" variant="text" @click="settingStore.showSettingPanel = true">
        <setting-icon />
      </t-button>
    </t-tooltip>

    <!-- 语言切换 -->
    <t-dropdown :options="langOptions" trigger="click" @click="onLangChange">
      <t-button shape="square" variant="text" aria-label="language">
        <translate-icon />
      </t-button>
    </t-dropdown>

    <!-- 用户菜单 -->
    <t-dropdown :options="userOptions" trigger="click" @click="onUserAction">
      <t-button variant="text" class="header-user-btn">
        <template #icon><user-circle-icon /></template>
        <span v-if="!settingStore.isMobile">{{ userStore.account || 'admin' }}</span>
      </t-button>
    </t-dropdown>

    <!-- 微信公众号二维码对话框 -->
    <t-dialog v-model:visible="wechatVisible" width="800px" :header="t('topNav.wechat')" :confirm-btn="null" :cancel-btn="null">
      <div class="wechat-qr-container">
        <div class="qr-image-wrapper">
          <img src="@/assets/assets-mp-samwaf.png" class="qr-image" />
        </div>
      </div>
    </t-dialog>

    <!-- 个人自助修改密码 -->
    <change-password-dialog v-model:visible="showChangePwd" :forced="false" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { DropdownProps } from 'tdesign-vue-next';
import {
  HelpCircleIcon,
  LogoWechatStrokeIcon,
  MailIcon,
  SettingIcon,
  TranslateIcon,
  UserCircleIcon,
  ViewListIcon,
} from 'tdesign-icons-vue-next';

import { useUserStore } from '@/store/modules/user';
import { useSettingStore } from '@/store/modules/setting';
import { resetWAFApi } from '@/apis/common';
import { getOnlineUrl } from '@/utils/usuallytool';
import Notice from './Notice.vue';
import Search from './Search.vue';
import SystemMonitorWidget from './SystemMonitorWidget.vue';
import ChangePasswordDialog from '@/pages/waf/account/components/ChangePasswordDialog.vue';

const router = useRouter();
const { t, locale } = useI18n();
const userStore = useUserStore();
const settingStore = useSettingStore();

/** 微信二维码对话框 */
const wechatVisible = ref(false);
const isResetloading = ref(false);

const langOptions: DropdownProps['options'] = [
  { content: '简体中文', value: 'zh_CN' },
  { content: 'English', value: 'en_US' },
];

const userOptions = computed<DropdownProps['options']>(() => [
  { content: t('topNav.dropdown_change_password'), value: 'changepwd' },
  { content: t('topNav.dropdown_reboot_waf'), value: 'reboot', disabled: isResetloading.value },
  { content: t('topNav.dropdown_logout'), value: 'logout' },
]);

/** 个人自助修改密码 */
const showChangePwd = ref(false);

function onLangChange(data: { value?: string | number }) {
  const lang = String(data.value);
  locale.value = lang;
  localStorage.setItem('lang', lang);
  window.location.reload();
}

async function onUserAction(data: { value?: string | number }) {
  switch (data.value) {
    case 'changepwd':
      showChangePwd.value = true;
      break;
    case 'reboot':
      resetServer();
      break;
    case 'logout':
      await userStore.logout();
      router.replace({ path: '/login' });
      break;
    default:
      break;
  }
}

function navToHelper() {
  window.open(getOnlineUrl(), '_blank', 'noopener,noreferrer');
}

function sendMail() {
  window.location.href = 'mailto:samwafgo@gmail.com';
}

function resetServer() {
  isResetloading.value = true;
  resetWAFApi()
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        setTimeout(() => {
          isResetloading.value = false;
        }, 3000);
      } else {
        MessagePlugin.warning(res.msg);
        isResetloading.value = false;
      }
    })
    .catch((e: Error) => {
      console.log(e);
      isResetloading.value = false;
    });
}
</script>

<style scoped>
.layout-header {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  padding: 0 16px;
}

.header-spacer {
  flex: 1;
}

/* 方形图标按钮：统一 36px 圆角方块 + 精致 hover */
.layout-header :deep(.t-button--shape-square) {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.15s ease;
}

.layout-header :deep(.t-icon) {
  font-size: 18px;
}

/* 用户入口：胶囊 */
.header-user-btn {
  max-width: 160px;
  height: 36px;
  padding: 0 12px;
  border-radius: 18px;
  border: 1px solid var(--td-component-stroke);
  margin-left: 8px;
}

/* 微信二维码对话框样式 */
.wechat-qr-container {
  text-align: center;
  padding: 20px;
}

.wechat-qr-container .qr-image-wrapper {
  margin-bottom: 16px;
}

.wechat-qr-container .qr-image {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
