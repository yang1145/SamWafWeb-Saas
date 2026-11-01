<template>
  <t-popup expand-animation placement="bottom-right" trigger="hover" :visible="isMonitorVisible" @visible-change="onPopupVisibleChange">
    <template #content>
      <div class="system-monitor-panel">
        <div class="monitor-header">
          <p>{{ t('topNav.system_monitor') }}</p>
          <t-button v-if="!loading" class="refresh-btn" variant="text" theme="primary" :loading="loading" @click="refreshData">
            <template #icon><refresh-icon /></template>
            {{ t('common.refresh') }}
          </t-button>
        </div>

        <div class="monitor-content" :class="{ 'loading-state': loading }">
          <!-- 错误状态 -->
          <div v-if="error && !loading" class="monitor-error">
            <span>{{ t('topNav.load_failed') }}</span>
            <t-button size="small" theme="primary" @click="refreshData">
              {{ t('topNav.retry') }}
            </t-button>
          </div>

          <div class="monitor-data" :class="{ 'data-loading': loading }">
            <!-- 运行环境：数据库 / 缓存（含连接目标与切换方式） -->
            <div class="env-section">
              <div class="section-title">{{ t('topNav.runtime_env') }}</div>
              <div class="env-row">
                <span class="item-label">{{ t('topNav.runtime_db') }}</span>
                <span class="item-value">{{ dbDetail }}</span>
              </div>
              <div class="env-row">
                <span class="item-label">{{ t('topNav.runtime_cache') }}</span>
                <span class="item-value">{{ cacheDetail }}</span>
              </div>
              <div class="env-tip">
                <div>{{ t('topNav.runtime_switch_tip') }}</div>
                <div class="env-migrate">
                  {{ t('topNav.runtime_migrate_tip') }}
                </div>
              </div>
            </div>

            <!-- CPU信息 -->
            <div class="monitor-item">
              <div class="item-header">
                <span class="item-label">CPU</span>
                <span class="item-value" :style="{ color: getUsageColor(cpuUsage) }">{{ cpuUsage }}%</span>
              </div>
              <t-progress :percentage="cpuUsage" :color="getUsageColor(cpuUsage)" size="small" :label="false" />
            </div>

            <!-- 内存信息 -->
            <div class="monitor-item">
              <div class="item-header">
                <span class="item-label">{{ t('topNav.memory') }}</span>
                <span class="item-value" :style="{ color: getUsageColor(memoryUsage) }">{{ memoryUsage }}%</span>
              </div>
              <t-progress :percentage="memoryUsage" :color="getUsageColor(memoryUsage)" size="small" :label="false" />
            </div>

            <!-- 磁盘信息 -->
            <div v-if="diskList.length > 0" class="disk-section">
              <div class="section-title">{{ t('topNav.disk') }}</div>
              <div class="disk-list">
                <div v-for="disk in diskList" :key="disk.mount_point || disk.file_system" class="disk-item">
                  <div class="item-header">
                    <span class="item-label">{{ disk.mount_point || disk.file_system }}</span>
                    <span class="item-value" :style="{ color: getUsageColor(getDiskUsage(disk)) }">{{ getDiskUsage(disk) }}%</span>
                  </div>
                  <t-progress :percentage="getDiskUsage(disk)" :color="getUsageColor(getDiskUsage(disk))" size="small" :label="false" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="monitor-footer">
          <t-button class="detail-btn" variant="text" theme="primary" @click="goToMonitorPage">
            {{ t('topNav.view_details') }}
          </t-button>
        </div>
      </div>
    </template>

    <!-- 触发器 - 直观显示系统状态 -->
    <div class="system-monitor-trigger" :title="t('topNav.system_monitor')" @click="isMonitorVisible = true">
      <!-- 系统整体状态灯（绿/黄/橙/红，悬浮查看含义） -->
      <span class="status-indicator" :class="overallStatusClass" :title="t('topNav.overall_status')"></span>
      <div class="monitor-display">
        <div class="monitor-item-inline">
          <span class="label">CPU</span>
          <span class="value" :style="{ color: getUsageColor(cpuUsage) }">{{ cpuUsage }}%</span>
        </div>
        <span class="monitor-divider"></span>
        <div class="monitor-item-inline">
          <span class="label">{{ t('topNav.memory') }}</span>
          <span class="value" :style="{ color: getUsageColor(memoryUsage) }">{{ memoryUsage }}%</span>
        </div>
        <template v-if="averageDiskUsage > 0">
          <span class="monitor-divider"></span>
          <div class="monitor-item-inline">
            <span class="label">{{ t('topNav.disk') }}</span>
            <span class="value" :style="{ color: getUsageColor(averageDiskUsage) }">{{ averageDiskUsage }}%</span>
          </div>
        </template>
      </div>
      <chevron-down-icon class="monitor-caret" />
    </div>
  </t-popup>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ChevronDownIcon, RefreshIcon } from 'tdesign-icons-vue-next';

import { getSystemMonitorApi } from '@/apis/monitor';
import { GetSystemParamsApi } from '@/apis/sysinfo';
import { useStatsStore } from '@/store/modules/stats';

const { t } = useI18n();
const router = useRouter();
const statsStore = useStatsStore();

const loading = ref(false);
const error = ref(false);
const isMonitorVisible = ref(false);

// 运行环境：数据库(sqlite|mysql|postgres) / 缓存(memory|redis)
const dbInfo = ref<Record<string, any>>({ driver: '' });
const cacheInfo = ref<Record<string, any>>({ type: '' });

// 后端 database.driver 取值 -> 展示名。
// 不能用「不是 mysql 就当 sqlite」的兜底：新增 postgres 后会被误显示成 SQLite。
// 未知 driver 直接原样显示，比错报一个数据库名要好。
const DB_DRIVER_LABELS: Record<string, string> = {
  sqlite: 'SQLite',
  mysql: 'MySQL',
  postgres: 'PostgreSQL',
};

const dbDetail = computed(() => {
  const d = dbInfo.value;
  if (!d.driver) return '-';
  const name = DB_DRIVER_LABELS[d.driver] || d.driver;
  // 服务端数据库(mysql/postgres)才有 host/port，sqlite 是本地文件
  return d.host ? `${name} (${d.host}:${d.port})` : name;
});
const cacheDetail = computed(() => {
  const c = cacheInfo.value;
  if (c.type === 'redis') return c.host ? `Redis (${c.host}:${c.port})` : 'Redis';
  if (!c.type) return '-';
  return 'Memory';
});

const cpuUsage = computed(() => Math.round(statsStore.getCpuUsage));
const memoryUsage = computed(() => Math.round(statsStore.getMemoryUsage));
const diskList = computed(() => statsStore.getDiskList);
const averageDiskUsage = computed(() => Math.round(statsStore.getAverageDiskUsage));

const overallStatusClass = computed(() => {
  const maxUsage = Math.max(cpuUsage.value, memoryUsage.value, averageDiskUsage.value);
  if (maxUsage >= 90) return 'overall-critical';
  if (maxUsage >= 70) return 'overall-warning';
  if (maxUsage >= 50) return 'overall-caution';
  return 'overall-normal';
});

onMounted(() => {
  fetchSystemInfo();
  // 当前运行环境（数据库/缓存）
  GetSystemParamsApi()
    .then((res) => {
      if (res.code === 0) {
        dbInfo.value = res.data?.database || { driver: '' };
        cacheInfo.value = res.data?.cache || { type: '' };
      }
    })
    .catch(() => {});
});

function onPopupVisibleChange(visible: boolean, context: any) {
  if (context?.trigger === 'trigger-element-click') {
    isMonitorVisible.value = true;
    return;
  }
  isMonitorVisible.value = visible;
}

// 获取系统监控数据
function fetchSystemInfo() {
  loading.value = true;
  error.value = false;
  getSystemMonitorApi()
    .then((res) => {
      if (res.code === 0) {
        statsStore.setSystemMonitor(res.data);
      } else {
        error.value = true;
      }
    })
    .catch(() => {
      error.value = true;
    })
    .finally(() => {
      loading.value = false;
    });
}

function getDiskUsage(disk: Record<string, any>) {
  return Math.round(disk.usage_percent || 0);
}

function refreshData() {
  fetchSystemInfo();
}

// 跳转到监控页面
function goToMonitorPage() {
  router.push('/dashboard/stats');
  isMonitorVisible.value = false;
}

// 根据使用率获取颜色
function getUsageColor(percentage: number) {
  if (percentage >= 90) return '#e34d59'; // 红色
  if (percentage >= 70) return '#ed7b2f'; // 橙色
  if (percentage >= 50) return '#f2bd27'; // 黄色
  return '#00a870'; // 绿色
}
</script>

<style scoped>
/* 系统监控面板样式 */
.system-monitor-panel {
  width: 400px;
  height: 450px;
}

.monitor-header {
  position: relative;
  height: 56px;
  font-size: 16px;
  color: var(--td-text-color-primary);
  text-align: center;
  line-height: 56px;
  border-bottom: 1px solid var(--td-component-border);
}

.monitor-header .refresh-btn {
  position: absolute;
  top: 12px;
  right: 16px;
}

.monitor-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--td-text-color-secondary);
  font-size: 14px;
  flex-direction: column;
  z-index: 10;
}

.monitor-content {
  padding: 16px;
  height: calc(100% - 104px);
  overflow-y: auto;
  position: relative;
}

.monitor-content.loading-state .monitor-data {
  opacity: 0.6;
  pointer-events: none;
}

.monitor-data {
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: opacity 0.3s ease;
}

.monitor-data.data-loading {
  opacity: 0.6;
}

.monitor-footer {
  height: 48px;
  align-items: center;
  display: flex;
  justify-content: center;
  border-top: 1px solid var(--td-component-border);
}

.monitor-footer .detail-btn {
  text-decoration: none;
  font-size: 14px;
  color: var(--td-brand-color);
  line-height: 48px;
  cursor: pointer;
}

/* 运行环境区（数据库/缓存）样式 */
.env-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--td-component-border);
}

.env-section .section-title {
  font-size: 14px;
  color: var(--td-text-color-secondary);
  font-weight: 500;
}

.env-section .env-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.env-section .env-tip {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  line-height: 1.5;
}

.env-section .env-migrate {
  margin-top: 4px;
}

/* 监控项样式 */
.monitor-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-label {
  font-size: 14px;
  color: var(--td-text-color-secondary);
  font-weight: 500;
}

.item-value {
  font-size: 14px;
  color: var(--td-text-color-primary);
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.disk-section .section-title {
  font-size: 14px;
  color: var(--td-text-color-secondary);
  font-weight: 500;
  margin-bottom: 12px;
}

.disk-section .disk-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.disk-section .disk-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 触发器样式：企业级状态胶囊 */
.system-monitor-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 12px;
  border-radius: 18px;
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-component-stroke);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
  min-width: 0;
}

.system-monitor-trigger:hover {
  border-color: var(--td-brand-color-3);
  box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.monitor-display {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.monitor-divider {
  width: 1px;
  height: 14px;
  flex-shrink: 0;
  background: var(--td-component-stroke);
}

.monitor-item-inline {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.monitor-item-inline .label {
  font-size: 11px;
  color: var(--td-text-color-secondary);
  font-weight: 500;
}

.monitor-item-inline .value {
  font-size: 13px;
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-variant-numeric: tabular-nums;
  min-width: 34px;
  text-align: right;
}

.monitor-caret {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--td-text-color-placeholder);
}

/* 状态灯：发光圆点，严重状态呼吸告警 */
.status-indicator {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  opacity: 0;
}

.status-indicator.overall-normal {
  background: #00a870;
  box-shadow: 0 0 0 3px rgba(0, 168, 112, 0.14);
}

.status-indicator.overall-caution {
  background: #f2bd27;
  box-shadow: 0 0 0 3px rgba(242, 189, 39, 0.16);
}

.status-indicator.overall-warning {
  background: #ed7b2f;
  box-shadow: 0 0 0 3px rgba(237, 123, 47, 0.16);
}

.status-indicator.overall-critical {
  background: #e34d59;
  box-shadow: 0 0 0 3px rgba(227, 77, 89, 0.18);
}

.status-indicator.overall-critical::after {
  opacity: 0.6;
  animation: status-pulse 1.6s ease-out infinite;
}

@keyframes status-pulse {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }

  70% {
    transform: scale(2.1);
    opacity: 0;
  }

  100% {
    transform: scale(2.1);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-indicator.overall-critical::after {
    animation: none;
  }
}

@media (max-width: 768px) {
  .system-monitor-trigger {
    padding: 0 8px;
    min-width: 0;
  }

  .monitor-caret {
    display: none;
  }

  .monitor-display {
    gap: 6px;
  }

  .monitor-item-inline .value {
    font-size: 11px;
    min-width: 26px;
  }

  .system-monitor-panel {
    width: 320px;
    height: 400px;
  }
}
</style>
