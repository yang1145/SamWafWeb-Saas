<template>
  <div class="stats-dashboard">
    <!-- 页面标题 + 实时状态 -->
    <div class="stats-head">
      <div class="stats-head__title">{{ t('menu.dashboard.stats_title') }}</div>
      <div class="stats-head__subtitle">
        <span class="live-dot"></span>
        {{ t('dashboard.stats.update_frequency') }} · {{ t('dashboard.stats.last_update') }}: {{ lastUpdateTime }}
      </div>
    </div>

    <!-- 实时指标 -->
    <div class="stats-grid">
      <div v-for="item in statCards" :key="item.key" class="stat-card" :class="`stat-card--${item.theme}`">
        <div class="stat-card__label">{{ item.label }}</div>
        <div v-if="!item.network" class="stat-card__value">
          {{ item.value }}<span v-if="item.unit" class="stat-card__unit">{{ item.unit }}</span>
        </div>
        <div v-else class="stat-card__network">
          <div class="stat-card__network-line"><span class="network-dot network-dot--in"></span>{{ item.recv }}</div>
          <div class="stat-card__network-line"><span class="network-dot network-dot--out"></span>{{ item.sent }}</div>
        </div>
      </div>
    </div>

    <!-- 趋势图表 -->
    <div class="charts-grid">
      <t-card :title="t('dashboard.stats.qps_trend')" class="chart-card">
        <div ref="qpsChartRef" class="chart-box"></div>
      </t-card>
      <t-card :title="t('dashboard.stats.queue_trend')" class="chart-card">
        <div ref="queueChartRef" class="chart-box"></div>
      </t-card>
      <t-card :title="t('dashboard.stats.response_time_trend')" class="chart-card">
        <div ref="responseTimeChartRef" class="chart-box"></div>
      </t-card>
      <t-card :title="t('dashboard.stats.system_resource_trend')" class="chart-card">
        <div ref="systemResourceChartRef" class="chart-box"></div>
      </t-card>
      <t-card :title="t('dashboard.stats.network_traffic_trend')" class="chart-card chart-card--full">
        <div ref="networkTrafficChartRef" class="chart-box"></div>
      </t-card>
    </div>

    <!-- 实时消息日志 -->
    <t-card :title="t('dashboard.stats.realtime_log')" class="message-log">
      <template #actions>
        <t-button theme="primary" size="small" :disabled="recentMessages.length === 0" style="margin-right: 8px" @click="exportToCSV">
          {{ t('dashboard.stats.export_csv') }}
        </t-button>
        <t-button theme="default" size="small" :disabled="recentMessages.length === 0" @click="clearMessages">
          {{ t('dashboard.stats.clear_log') }}
        </t-button>
      </template>
      <div class="log-container">
        <div v-for="(message, index) in recentMessages" :key="index" class="log-item">
          <span class="log-time">{{ formatTime(message.timestamp) }}</span>
          <span class="log-operation">{{ message.operatype }}</span>
          <span class="log-data">
            {{ t('dashboard.stats.qps_label') }}: {{ message.qps }}, {{ t('dashboard.stats.log_qps_label') }}: {{ message.log_qps }},
            {{ t('dashboard.stats.main_queue') }}: {{ message.main_queue }}, {{ t('dashboard.stats.log_queue') }}:
            {{ message.log_queue }}, {{ t('dashboard.stats.stats_queue') }}: {{ message.stats_queue }},
            {{ t('dashboard.stats.message_queue') }}: {{ message.message_queue }}, {{ t('dashboard.stats.cpu_usage') }}:
            {{ message.cpu_percent }}%, {{ t('dashboard.stats.memory_usage') }}: {{ message.memory_percent }}%,
            {{ t('dashboard.stats.network_recv_rate') }}: {{ formatBytes(message.network_recv_rate || 0) }},
            {{ t('dashboard.stats.network_sent_rate') }}: {{ formatBytes(message.network_sent_rate || 0) }}
          </span>
        </div>
      </div>
    </t-card>

    <!-- 系统监控 -->
    <div class="system-monitor-section">
      <system-monitor />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import * as echarts from 'echarts/core';
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

import { heartbeat_api } from '@/apis/common';
import { useStatsStore } from '@/store/modules/stats';
import type { ResponseTimeItem, StatsDataItem } from '@/store/modules/stats';
import SystemMonitor from '@/pages/waf/monitor/index.vue';

echarts.use([GridComponent, TooltipComponent, LegendComponent, TitleComponent, LineChart, CanvasRenderer]);

const { t } = useI18n();
const statsStore = useStatsStore();

const qpsChartRef = ref<HTMLElement>();
const queueChartRef = ref<HTMLElement>();
const responseTimeChartRef = ref<HTMLElement>();
const systemResourceChartRef = ref<HTMLElement>();
const networkTrafficChartRef = ref<HTMLElement>();

let qpsChart: echarts.ECharts | null = null;
let queueChart: echarts.ECharts | null = null;
let responseTimeChart: echarts.ECharts | null = null;
let systemResourceChart: echarts.ECharts | null = null;
let networkTrafficChart: echarts.ECharts | null = null;

const qpsData = reactive({ times: [] as string[], qps: [] as number[], log_qps: [] as number[] });
const queueData = reactive({
  times: [] as string[],
  main_queue: [] as number[],
  log_queue: [] as number[],
  stats_queue: [] as number[],
  message_queue: [] as number[],
});
const responseTimeData = reactive({ times: [] as string[], responseTimes: [] as number[] });
const systemResourceData = reactive({ times: [] as string[], cpu_percent: [] as number[], memory_percent: [] as number[] });
const networkTrafficData = reactive({ times: [] as string[], recv_rate: [] as number[], sent_rate: [] as number[] });

const recentMessages = ref<StatsDataItem[]>([]);
const maxDataPoints = 50; // 最多保留50个数据点
const maxMessages = 100; // 最多保留100条消息
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
const heartbeatIntervalTime = 10000; // 心跳间隔10秒
const lastUpdateTime = ref('--');

const currentStats = computed(
  () =>
    statsStore.currentStats || {
      qps: 0,
      log_qps: 0,
      main_queue: 0,
      log_queue: 0,
      stats_queue: 0,
      message_queue: 0,
      cpu_percent: 0,
      memory_percent: 0,
      network_recv_rate: 0,
      network_sent_rate: 0,
    },
);
const averageResponseTime = computed(() => statsStore.getAverageResponseTime);
const networkRecvRateFormatted = computed(() => formatBytes(currentStats.value.network_recv_rate || 0));
const networkSentRateFormatted = computed(() => formatBytes(currentStats.value.network_sent_rate || 0));

// 顶部指标卡数据（统一由 computed 驱动）
const statCards = computed(() => {
  const fmt = (v: any) => (Number(v) || 0).toLocaleString('en-US');
  return [
    { key: 'qps', theme: 'primary', label: t('dashboard.stats.current_qps'), value: fmt(currentStats.value.qps) },
    { key: 'log_qps', theme: 'primary', label: t('dashboard.stats.log_qps'), value: fmt(currentStats.value.log_qps) },
    {
      key: 'avg_response',
      theme: 'primary',
      label: t('dashboard.stats.avg_response_time'),
      value: Math.round(Number(averageResponseTime.value) || 0),
      unit: 'ms',
    },
    { key: 'main_queue', theme: 'warning', label: t('dashboard.stats.main_queue'), value: fmt(currentStats.value.main_queue) },
    { key: 'log_queue', theme: 'warning', label: t('dashboard.stats.log_queue'), value: fmt(currentStats.value.log_queue) },
    {
      key: 'cpu',
      theme: 'danger',
      label: t('dashboard.stats.cpu_usage'),
      value: (Number(currentStats.value.cpu_percent) || 0).toFixed(1),
      unit: '%',
    },
    {
      key: 'memory',
      theme: 'danger',
      label: t('dashboard.stats.memory_usage'),
      value: (Number(currentStats.value.memory_percent) || 0).toFixed(1),
      unit: '%',
    },
    {
      key: 'network',
      theme: 'success',
      label: t('dashboard.stats.network_rate'),
      network: true,
      recv: networkRecvRateFormatted.value,
      sent: networkSentRateFormatted.value,
    },
  ] as Array<Record<string, any>>;
});

watch(
  () => statsStore.statsHistory.length,
  () => {
    const history = statsStore.statsHistory;
    if (history.length > 0) {
      handleStatsMessage(history[history.length - 1]);
      lastUpdateTime.value = formatTime(Date.now());
    }
  },
  { immediate: true },
);

watch(
  () => statsStore.responseTimeHistory.length,
  () => {
    const history = statsStore.responseTimeHistory;
    if (history.length > 0) {
      handleResponseTimeData(history[history.length - 1]);
      lastUpdateTime.value = formatTime(Date.now());
    }
  },
  { immediate: true },
);

function resizeHandler() {
  [qpsChart, queueChart, responseTimeChart, systemResourceChart, networkTrafficChart].forEach((chart) => chart?.resize());
}

onMounted(() => {
  nextTick(() => {
    initQpsChart();
    initQueueChart();
    initResponseTimeChart();
    initSystemResourceChart();
    initNetworkTrafficChart();
  });
  window.addEventListener('resize', resizeHandler);
  // 启动心跳监控
  startHeartbeatMonitoring();
});

onBeforeUnmount(() => {
  [qpsChart, queueChart, responseTimeChart, systemResourceChart, networkTrafficChart].forEach((chart) => chart?.dispose());
  window.removeEventListener('resize', resizeHandler);
  stopHeartbeatMonitoring();
});

function startHeartbeatMonitoring() {
  heartbeatInterval = setInterval(() => {
    sendHeartbeat();
  }, heartbeatIntervalTime);
}

function stopHeartbeatMonitoring() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

async function sendHeartbeat() {
  const startTime = Date.now();
  try {
    const response = await heartbeat_api();
    const endTime = Date.now();
    statsStore.addResponseTimeData({
      timestamp: endTime,
      responseTime: endTime - startTime,
      status: (response as any).code === 200 ? 'success' : 'error',
    });
  } catch (error) {
    const endTime = Date.now();
    statsStore.addResponseTimeData({
      timestamp: endTime,
      responseTime: endTime - startTime,
      status: 'error',
    });
    console.error('心跳请求失败:', error);
  }
}

function handleResponseTimeData(responseTimeItem: ResponseTimeItem) {
  const timeStr = formatTime(responseTimeItem.timestamp);
  responseTimeData.times.push(timeStr);
  responseTimeData.responseTimes.push(responseTimeItem.responseTime);

  if (responseTimeData.times.length > maxDataPoints) {
    responseTimeData.times.shift();
    responseTimeData.responseTimes.shift();
  }
  updateResponseTimeChart();
}

function updateResponseTimeChart() {
  responseTimeChart?.setOption({
    xAxis: { data: responseTimeData.times },
    series: [{ data: responseTimeData.responseTimes }],
  });
}

function initQpsChart() {
  if (!qpsChartRef.value) return;
  qpsChart = echarts.init(qpsChartRef.value);
  qpsChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: [t('dashboard.stats.qps_label'), t('dashboard.stats.log_qps_label')] },
    grid: { left: '10%', right: '10%', bottom: '15%', top: '15%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: qpsData.times },
    yAxis: { type: 'value' },
    series: [
      { name: t('dashboard.stats.qps_label'), type: 'line', data: qpsData.qps, smooth: true, itemStyle: { color: '#5470c6' } },
      { name: t('dashboard.stats.log_qps_label'), type: 'line', data: qpsData.log_qps, smooth: true, itemStyle: { color: '#91cc75' } },
    ],
  });
}

function initQueueChart() {
  if (!queueChartRef.value) return;
  queueChart = echarts.init(queueChartRef.value);
  queueChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: {
      data: [
        t('dashboard.stats.main_queue'),
        t('dashboard.stats.log_queue'),
        t('dashboard.stats.stats_queue'),
        t('dashboard.stats.message_queue'),
      ],
    },
    grid: { left: '10%', right: '10%', bottom: '15%', top: '15%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: queueData.times },
    yAxis: { type: 'value' },
    series: [
      { name: t('dashboard.stats.main_queue'), type: 'line', data: queueData.main_queue, smooth: true, itemStyle: { color: '#5470c6' } },
      { name: t('dashboard.stats.log_queue'), type: 'line', data: queueData.log_queue, smooth: true, itemStyle: { color: '#91cc75' } },
      { name: t('dashboard.stats.stats_queue'), type: 'line', data: queueData.stats_queue, smooth: true, itemStyle: { color: '#fac858' } },
      {
        name: t('dashboard.stats.message_queue'),
        type: 'line',
        data: queueData.message_queue,
        smooth: true,
        itemStyle: { color: '#ee6666' },
      },
    ],
  });
}

function initResponseTimeChart() {
  if (!responseTimeChartRef.value) return;
  responseTimeChart = echarts.init(responseTimeChartRef.value);
  responseTimeChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter(params: any) {
        let result = `${params[0].name}<br/>`;
        params.forEach((item: any) => {
          result += `${item.marker}${item.seriesName}: ${item.value}ms<br/>`;
        });
        return result;
      },
    },
    legend: { data: [t('dashboard.stats.response_time_label')] },
    grid: { left: '10%', right: '10%', bottom: '15%', top: '15%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: responseTimeData.times },
    yAxis: { type: 'value', name: 'ms', min: 0 },
    series: [
      {
        name: t('dashboard.stats.response_time_label'),
        type: 'line',
        data: responseTimeData.responseTimes,
        smooth: true,
        itemStyle: { color: '#ff7875' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 120, 117, 0.3)' },
              { offset: 1, color: 'rgba(255, 120, 117, 0.1)' },
            ],
          },
        },
      },
    ],
  });
}

function initSystemResourceChart() {
  if (!systemResourceChartRef.value) return;
  systemResourceChart = echarts.init(systemResourceChartRef.value);
  systemResourceChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter(params: any) {
        let result = `${params[0].name}<br/>`;
        params.forEach((item: any) => {
          result += `${item.marker}${item.seriesName}: ${item.value}%<br/>`;
        });
        return result;
      },
    },
    legend: { data: [t('dashboard.stats.cpu_usage'), t('dashboard.stats.memory_usage')] },
    grid: { left: '10%', right: '10%', bottom: '15%', top: '15%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: systemResourceData.times },
    yAxis: { type: 'value', name: '%', min: 0, max: 100 },
    series: [
      {
        name: t('dashboard.stats.cpu_usage'),
        type: 'line',
        data: systemResourceData.cpu_percent,
        smooth: true,
        itemStyle: { color: '#ff7875' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 120, 117, 0.3)' },
              { offset: 1, color: 'rgba(255, 120, 117, 0.1)' },
            ],
          },
        },
      },
      {
        name: t('dashboard.stats.memory_usage'),
        type: 'line',
        data: systemResourceData.memory_percent,
        smooth: true,
        itemStyle: { color: '#73d13d' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(115, 209, 61, 0.3)' },
              { offset: 1, color: 'rgba(115, 209, 61, 0.1)' },
            ],
          },
        },
      },
    ],
  });
}

function initNetworkTrafficChart() {
  if (!networkTrafficChartRef.value) return;
  networkTrafficChart = echarts.init(networkTrafficChartRef.value);
  networkTrafficChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        let result = `${params[0].name}<br/>`;
        params.forEach((item: any) => {
          result += `${item.marker}${item.seriesName}: ${formatBytes(item.value)}<br/>`;
        });
        return result;
      },
    },
    legend: { data: [t('dashboard.stats.network_recv_rate'), t('dashboard.stats.network_sent_rate')] },
    grid: { left: '10%', right: '10%', bottom: '15%', top: '15%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: networkTrafficData.times },
    yAxis: {
      type: 'value',
      name: 'Bytes/s',
      min: 0,
      axisLabel: {
        formatter: (value: number) => formatBytes(value),
      },
    },
    series: [
      {
        name: t('dashboard.stats.network_recv_rate'),
        type: 'line',
        data: networkTrafficData.recv_rate,
        smooth: true,
        itemStyle: { color: '#40a9ff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(64, 169, 255, 0.3)' },
              { offset: 1, color: 'rgba(64, 169, 255, 0.1)' },
            ],
          },
        },
      },
      {
        name: t('dashboard.stats.network_sent_rate'),
        type: 'line',
        data: networkTrafficData.sent_rate,
        smooth: true,
        itemStyle: { color: '#f759ab' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(247, 89, 171, 0.3)' },
              { offset: 1, color: 'rgba(247, 89, 171, 0.1)' },
            ],
          },
        },
      },
    ],
  });
}

function handleStatsMessage(statsData: StatsDataItem) {
  // 添加到消息日志
  recentMessages.value.unshift(statsData);
  if (recentMessages.value.length > maxMessages) {
    recentMessages.value = recentMessages.value.slice(0, maxMessages);
  }

  // 更新图表数据
  const timeStr = formatTime(statsData.timestamp);

  qpsData.times.push(timeStr);
  qpsData.qps.push(statsData.qps || 0);
  qpsData.log_qps.push(statsData.log_qps || 0);

  queueData.times.push(timeStr);
  queueData.main_queue.push(statsData.main_queue || 0);
  queueData.log_queue.push(statsData.log_queue || 0);
  queueData.stats_queue.push(statsData.stats_queue || 0);
  queueData.message_queue.push(statsData.message_queue || 0);

  systemResourceData.times.push(timeStr);
  systemResourceData.cpu_percent.push(statsData.cpu_percent || 0);
  systemResourceData.memory_percent.push(statsData.memory_percent || 0);

  networkTrafficData.times.push(timeStr);
  networkTrafficData.recv_rate.push(statsData.network_recv_rate || 0);
  networkTrafficData.sent_rate.push(statsData.network_sent_rate || 0);

  // 限制数据点数量
  if (qpsData.times.length > maxDataPoints) {
    qpsData.times.shift();
    qpsData.qps.shift();
    qpsData.log_qps.shift();

    queueData.times.shift();
    queueData.main_queue.shift();
    queueData.log_queue.shift();
    queueData.stats_queue.shift();
    queueData.message_queue.shift();

    systemResourceData.times.shift();
    systemResourceData.cpu_percent.shift();
    systemResourceData.memory_percent.shift();

    networkTrafficData.times.shift();
    networkTrafficData.recv_rate.shift();
    networkTrafficData.sent_rate.shift();
  }

  updateCharts();
}

function updateCharts() {
  qpsChart?.setOption({
    xAxis: { data: qpsData.times },
    series: [{ data: qpsData.qps }, { data: qpsData.log_qps }],
  });
  queueChart?.setOption({
    xAxis: { data: queueData.times },
    series: [
      { data: queueData.main_queue },
      { data: queueData.log_queue },
      { data: queueData.stats_queue },
      { data: queueData.message_queue },
    ],
  });
  systemResourceChart?.setOption({
    xAxis: { data: systemResourceData.times },
    series: [{ data: systemResourceData.cpu_percent }, { data: systemResourceData.memory_percent }],
  });
  networkTrafficChart?.setOption({
    xAxis: { data: networkTrafficData.times },
    series: [{ data: networkTrafficData.recv_rate }, { data: networkTrafficData.sent_rate }],
  });
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}`;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function clearMessages() {
  recentMessages.value = [];
}

function exportToCSV() {
  if (recentMessages.value.length === 0) {
    return;
  }

  // CSV 列标题
  const headers = [
    t('dashboard.stats.time'),
    t('dashboard.stats.operation'),
    t('dashboard.stats.qps_label'),
    t('dashboard.stats.log_qps_label'),
    t('dashboard.stats.main_queue'),
    t('dashboard.stats.log_queue'),
    t('dashboard.stats.stats_queue'),
    t('dashboard.stats.message_queue'),
    t('dashboard.stats.cpu_usage'),
    t('dashboard.stats.memory_usage'),
    t('dashboard.stats.network_recv_rate'),
    t('dashboard.stats.network_sent_rate'),
  ];

  let csvContent = `${headers.join(',')}\n`;

  recentMessages.value.forEach((message) => {
    const row = [
      `"${formatTime(message.timestamp)}"`,
      `"${message.operatype || ''}"`,
      message.qps || 0,
      message.log_qps || 0,
      message.main_queue || 0,
      message.log_queue || 0,
      message.stats_queue || 0,
      message.message_queue || 0,
      `${(message.cpu_percent || 0).toFixed(1)}%`,
      `${(message.memory_percent || 0).toFixed(1)}%`,
      `"${formatBytes(message.network_recv_rate || 0)}"`,
      `"${formatBytes(message.network_sent_rate || 0)}"`,
    ];
    csvContent += `${row.join(',')}\n`;
  });

  // 创建并下载文件
  const blob = new Blob([`﻿${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);

  const now = new Date();
  const timestamp =
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  link.setAttribute('download', `waf_stats_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.stats-dashboard {
  padding: 0;
}

/* 页面标题 + 实时状态 */
.stats-head {
  margin-bottom: 20px;
}

.stats-head__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.stats-head__subtitle {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--td-success-color);
  box-shadow: 0 0 0 3px rgba(0, 168, 112, 0.15);
  animation: live-pulse 2s ease-in-out infinite;
}

@keyframes live-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}

@media (prefers-reduced-motion: reduce) {
  .live-dot {
    animation: none;
  }
}

/* 实时指标卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  position: relative;
  padding: 16px 18px 18px;
  overflow: hidden;
  border-radius: var(--td-radius-large);
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-component-stroke);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.stat-card__label {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--td-text-color-secondary);
}

.stat-card__value {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--td-text-color-primary);
  font-variant-numeric: tabular-nums;
}

.stat-card__unit {
  margin-left: 4px;
  font-size: 13px;
  font-weight: 400;
  color: var(--td-text-color-placeholder);
}

.stat-card__network {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-card__network-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--td-text-color-primary);
  font-variant-numeric: tabular-nums;
}

.network-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}

.network-dot--in {
  background: var(--td-success-color);
}

.network-dot--out {
  background: var(--td-brand-color);
}

/* 趋势图表 */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  overflow: hidden;
}

.chart-card :deep(.t-card__header) {
  padding-bottom: 8px;
}

.chart-card :deep(.t-card__title) {
  font-size: 15px;
  font-weight: 600;
}

.chart-card--full {
  grid-column: 1 / -1;
}

.chart-box {
  width: 100%;
  height: 300px;
}

/* 实时消息日志 */
.message-log {
  margin-bottom: 16px;
}

.message-log :deep(.t-card__header) {
  padding-bottom: 8px;
}

.message-log :deep(.t-card__title) {
  font-size: 15px;
  font-weight: 600;
}

.log-container {
  max-height: 320px;
  overflow-y: auto;
  padding: 8px 12px;
  background: var(--td-bg-color-secondarycontainer);
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-medium);
}

.log-item {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--td-component-stroke);
  font-size: 12px;
  line-height: 1.5;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  flex: none;
  color: var(--td-text-color-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.log-operation {
  flex: none;
  color: var(--td-brand-color);
  font-weight: 600;
}

.log-data {
  color: var(--td-text-color-primary);
  word-break: break-all;
}

.system-monitor-section {
  margin: -16px;
}
</style>
