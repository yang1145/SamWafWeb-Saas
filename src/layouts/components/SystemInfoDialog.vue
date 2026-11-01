<template>
  <!-- 系统信息弹窗：点击左下角版本号打开，展示运行环境 + 在线交流渠道，方便用户反馈问题 -->
  <!-- attach 到 body：弹窗挂在侧边菜单里，避免被菜单容器的 overflow 裁剪 -->
  <t-dialog v-model:visible="innerVisible" width="900px" :header="t('common.system_info.title')" :footer="false" attach="body">
    <div v-if="loading" class="sysinfo-loading">{{ t('common.loading') }}</div>
    <div v-else>
      <t-alert v-if="loadFailed" theme="warning" :message="t('common.system_info.load_failed')" style="margin-bottom: 12px" />

      <!-- 运行环境信息 -->
      <div class="sysinfo-grid">
        <div v-for="item in infoRows" :key="item.label" class="sysinfo-item">
          <span class="sysinfo-label">{{ item.label }}</span>
          <span class="sysinfo-value">
            {{ item.value }}
            <t-tag v-if="item.tag" size="small" :theme="item.tagTheme || 'primary'" variant="light">{{ item.tag }}</t-tag>
          </span>
        </div>
      </div>

      <div class="sysinfo-actions">
        <t-button theme="default" variant="outline" size="small" @click="handleCopy">
          {{ t('common.system_info.copy_info') }}
        </t-button>
        <t-button theme="default" variant="text" size="small" @click="innerVisible = false">
          {{ t('common.close') }}
        </t-button>
      </div>

      <!-- 支持渠道：brand.ts 未配置任何渠道时整块隐藏 -->
      <template v-if="channels.length">
        <div class="sysinfo-channel-title">{{ t('common.system_info.channel_title') }}</div>
        <div class="sysinfo-channels">
          <a v-for="channel in channels" :key="channel.key" class="sysinfo-channel" :href="channel.url" target="_blank" rel="noopener noreferrer">
            <component :is="channel.icon" class="sysinfo-channel-icon" />
            {{ channel.label }}
          </a>
        </div>
      </template>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import {
  ServiceIcon,
  BookOpenIcon,
  MailIcon,
} from 'tdesign-icons-vue-next';
import { SysRuntimeInfoApi } from '@/apis/sysinfo';
import { BRAND } from '@/config/brand';

// 版本号里带 beta / test / alpha / rc 的是预发布版本，必须明确标成"测试版"，
// 不能跟正式版一样标绿，否则用户分不清手上跑的是不是稳定版本。
const PRERELEASE_RE = /(^|[^a-z])(beta|test|alpha|rc)([^a-z]|$)/i;

const props = defineProps<{ visible: boolean }>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
}>();

const { t } = useI18n();

const innerVisible = computed({
  get: () => props.visible,
  set: (val: boolean) => emit('update:visible', val),
});

const loading = ref(false);
const loadFailed = ref(false);
const info = ref<Record<string, any>>({});

interface InfoRow {
  label: string;
  value: string;
  tag?: string;
  tagTheme?: string;
}

/** 支持渠道：按 brand.ts 配置动态生成，未配置的不出现 */
const channels = computed(() => {
  const list: Array<{ key: string; label: string; url: string; icon: any }> = [];
  if (BRAND.docUrl) {
    list.push({ key: 'doc', label: t('common.system_info.online_document'), url: BRAND.docUrl, icon: BookOpenIcon });
  }
  if (BRAND.supportEmail) {
    list.push({ key: 'email', label: t('common.system_info.email'), url: `mailto:${BRAND.supportEmail}`, icon: MailIcon });
  }
  if (BRAND.serviceUrl) {
    list.push({ key: 'service', label: t('common.system_info.online_service'), url: BRAND.serviceUrl, icon: ServiceIcon });
  }
  return list;
});

function formatDuration(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  return t('common.system_info.duration', {
    days: Math.floor(total / 86400),
    hours: Math.floor(total / 3600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
  });
}

/** 展示行：取不到的字段直接不展示，保证任何一项缺失都不影响弹窗 */
const infoRows = computed<InfoRow[]>(() => {
  const data = info.value || {};
  const label = (key: string) => t(`common.system_info.${key}`);
  const rows: InfoRow[] = [];

  const versionText = [data.version_name, data.version ? `(${data.version})` : ''].filter(Boolean).join(' ');
  if (versionText) {
    const isDebug = data.version_release === 'false';
    const isPrerelease = !isDebug && PRERELEASE_RE.test(versionText);
    let tag = label('release_official');
    if (isDebug) tag = label('release_debug');
    else if (isPrerelease) tag = label('release_beta');
    rows.push({
      label: label('software_version'),
      value: versionText,
      tag,
      tagTheme: isDebug || isPrerelease ? 'warning' : 'success',
    });
  }
  if (data.os_name) {
    rows.push({ label: label('os'), value: data.os_name });
  }
  if (data.os) {
    rows.push({ label: label('system_type'), value: data.os });
  }
  if (data.arch) {
    // 32位程序跑在64位系统时，内核架构与编译架构不同，一并展示便于定位
    const arch = data.kernel_arch && data.kernel_arch !== data.arch ? `${data.arch} (${label('kernel_arch')}: ${data.kernel_arch})` : data.arch;
    rows.push({ label: label('arch'), value: arch });
  }
  if (data.kernel_version) {
    rows.push({ label: label('kernel'), value: data.kernel_version });
  }
  if (data.go_version) {
    rows.push({ label: label('go_version'), value: data.go_version });
  }
  // 运行环境：容器/K8s/WSL/虚拟化，识别到才展示
  const envParts: string[] = [];
  if (data.container) {
    envParts.push(`${label('container')}(${data.container})`);
  }
  if (data.in_kubernetes) {
    envParts.push(label('kubernetes'));
  }
  if (data.is_wsl) {
    envParts.push(label('wsl'));
  }
  if (data.virtualization) {
    envParts.push(`${label('virtualization')}(${data.virtualization})`);
  }
  if (envParts.length > 0) {
    rows.push({ label: label('runtime_env'), value: envParts.join(' / ') });
  }
  // Win7 内核只在 Windows 下才有意义
  if (data.is_windows) {
    rows.push({
      label: label('win7_kernel'),
      value: data.is_win7_kernel ? t('common.yes') : t('common.no'),
      tag: data.is_win7_build ? label('win7_build') : '',
      tagTheme: 'warning',
    });
  }
  if (data.os) {
    rows.push({
      label: label('start_mode'),
      value: data.run_as_service ? label('start_service') : label('start_console'),
    });
  }
  if (data.system_uptime_seconds > 0) {
    rows.push({ label: label('system_uptime'), value: formatDuration(data.system_uptime_seconds) });
  }
  if (data.os) {
    rows.push({ label: label('process_uptime'), value: formatDuration(data.process_uptime_seconds) });
  }
  return rows;
});

function loadRuntimeInfo() {
  loading.value = true;
  loadFailed.value = false;
  SysRuntimeInfoApi()
    .then((res: any) => {
      if (res && res.code === 0 && res.data) {
        info.value = res.data;
      } else {
        loadFailed.value = true;
      }
    })
    .catch(() => {
      // 接口异常时仍然展示弹窗（交流渠道可用），只是环境信息为空
      loadFailed.value = true;
    })
    .finally(() => {
      loading.value = false;
    });
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      loadRuntimeInfo();
    }
  },
);

function fallbackCopy(text: string, onSuccess: () => void) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    onSuccess();
  } catch (e) {
    MessagePlugin.warning(t('common.system_info.copy_failed'));
  }
}

function handleCopy() {
  const text = infoRows.value.map((row) => `${row.label}: ${row.value}${row.tag ? ` [${row.tag}]` : ''}`).join('\n');
  const onSuccess = () => MessagePlugin.success(t('common.system_info.copy_success'));
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(text)
      .then(onSuccess)
      .catch(() => fallbackCopy(text, onSuccess));
  } else {
    fallbackCopy(text, onSuccess);
  }
}
</script>

<style scoped>
/* 窗口宽度按内容放宽，小屏时不撑出屏幕 */
:deep(.t-dialog) {
  max-width: 92vw;
}

.sysinfo-loading {
  padding: 32px 0;
  text-align: center;
  color: var(--td-text-color-secondary);
}

.sysinfo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 24px;
}

@media screen and (max-width: 600px) {
  .sysinfo-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.sysinfo-item {
  display: flex;
  align-items: flex-start;
  line-height: 22px;
  word-break: break-all;
}

.sysinfo-label {
  flex: 0 0 auto;
  min-width: 96px;
  color: var(--td-text-color-secondary);
}

.sysinfo-value {
  flex: 1;
  color: var(--td-text-color-primary);
}

.sysinfo-actions {
  margin-top: 16px;
}

.sysinfo-channel-title {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid var(--td-component-stroke);
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.sysinfo-channels {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

/* 渠道做成带图标的按钮块，比纯文字链接更容易被注意到 */
.sysinfo-channel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid var(--td-component-border);
  border-radius: var(--td-radius-default);
  color: var(--td-text-color-primary);
  text-decoration: none;
  transition: all 0.2s;
}

.sysinfo-channel:hover {
  border-color: var(--td-brand-color);
  color: var(--td-brand-color);
  background-color: var(--td-brand-color-light);
}

.sysinfo-channel-icon {
  font-size: 16px;
}
</style>
