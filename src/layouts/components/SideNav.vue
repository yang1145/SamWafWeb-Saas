<template>
  <t-menu
    :theme="settingStore.displayMode"
    height="100%"
    :collapsed="collapsed"
    :value="activeMenu"
    class="side-nav-menu"
    @change="onMenuChange"
  >
    <template #logo>
      <!-- 纯文字标识：展开态显示产品名，折叠态显示品牌徽标（见 config/brand.ts） -->
      <span class="side-nav-logo-wrapper" @click="router.push('/dashboard/base')">
        <template v-if="!collapsed">
          <!-- 平台配置了品牌 Logo 时优先图片，否则文字标识 -->
          <img v-if="brandRuntime.logo" :src="brandRuntime.logo" class="side-nav-logo-img" alt="logo" />
          <span v-else class="side-nav-wordmark">{{ brandDisplayName() }}</span>
        </template>
        <template v-else>
          <img v-if="brandRuntime.logo" :src="brandRuntime.logo" class="side-nav-logo-img side-nav-logo-img--badge" alt="logo" />
          <span v-else class="side-nav-badge">{{ BRAND.logoBadge }}</span>
        </template>
      </span>
    </template>
    <menu-content :nav-data="menuRoutes" />
    <template #operations>
      <!-- 版本号即“系统信息”入口：弱化显示，不抢视觉焦点 -->
      <t-tooltip placement="top" :content="t('common.system_info.tooltip')">
        <div v-if="versionInfo.version" class="version-entry" @click="sysinfoVisible = true">
          <device-icon class="version-entry-icon" />
          <span v-if="!collapsed" class="version-entry-text">
            {{ versionInfo.version_name }}({{ versionInfo.version }})
            <t-tag v-if="versionInfo.version_release === 'false'" size="small" theme="warning" variant="light" class="version-entry-tag">
              {{ t('common.debug') }}
            </t-tag>
          </span>
        </div>
      </t-tooltip>
      <!-- 点击版本号查看系统信息 -->
      <system-info-dialog v-model:visible="sysinfoVisible" />
    </template>
  </t-menu>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { MenuValue } from 'tdesign-vue-next';
import { DeviceIcon } from 'tdesign-icons-vue-next';
import { routes } from '@/router';
import { useSettingStore } from '@/store/modules/setting';
import { SysVersionApi } from '@/apis/sysinfo';
import { BRAND } from '@/config/brand';
import { brandDisplayName, brandRuntime, loadBrandLogo } from '@/config/brandRuntime';
import MenuContent from './MenuContent.vue';
import SystemInfoDialog from './SystemInfoDialog.vue';

// 品牌图片按需拉取（平台「品牌设置」下发；未配置时走默认徽标）
void loadBrandLogo();

withDefaults(defineProps<{ collapsed?: boolean }>(), { collapsed: false });

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const settingStore = useSettingStore();

// 侧边菜单数据来源：根布局路由（path: '/'）的 children
const menuRoutes = computed(() => routes.find((r) => r.path === '/')?.children ?? []);

const activeMenu = computed(() => route.path);

/** 左下角版本信息（对应老项目 version store） */
const versionInfo = ref<{ version: string; version_name: string; version_release: string }>({
  version: '',
  version_name: '',
  version_release: '',
});

/** 系统信息弹窗 */
const sysinfoVisible = ref(false);

onMounted(() => {
  SysVersionApi()
    .then((res) => {
      if (res.code === 0) {
        versionInfo.value = res.data;
      }
    })
    .catch(() => {});
});

function onMenuChange(value: MenuValue) {
  router.push(String(value));
}
</script>

<style scoped>
.side-nav-logo-wrapper {
  display: inline-flex;
  align-items: center;
  height: 100%;
  min-width: 0;
  padding: 0 4px;
  cursor: pointer;
}

/* 品牌图片（平台「品牌设置」下发）：展开态与文字标识等高，折叠态与徽标等大 */
.side-nav-logo-img {
  max-height: 28px;
  max-width: 160px;
  object-fit: contain;
}

.side-nav-logo-img--badge {
  max-height: 28px;
  max-width: 30px;
}

/* 展开态：产品名文字标识 */
.side-nav-wordmark {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--td-brand-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 折叠态：紧凑文字徽标 */
.side-nav-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 28px;
  padding: 0 6px;
  border-radius: var(--td-radius-medium);
  background-color: var(--td-brand-color);
  color: var(--td-text-color-anti);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* 左下角版本号 = 系统信息入口，弱化为次要信息，避免喧宾夺主 */
.version-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 4px 8px;
  border-radius: var(--td-radius-default);
  color: var(--td-text-color-secondary);
  font-size: 12px;
  line-height: 20px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.version-entry:hover {
  background-color: var(--td-bg-color-secondarycontainer);
  color: var(--td-text-color-primary);
}

.version-entry-icon {
  flex: 0 0 auto;
  font-size: 16px;
}

.version-entry-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.version-entry-tag {
  flex: 0 0 auto;
  margin-left: 4px;
}
</style>
