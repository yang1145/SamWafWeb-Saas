<template>
  <div class="diagnostic-container">
    <t-alert theme="info" :message="t('page.diagnostic.alert_message')" style="margin-bottom: 16px" />
    <t-tabs v-model="activeTab" @change="handleTabChange">
      <!-- 整机监控：复用现有系统监控组件 -->
      <t-tab-panel value="machine" :label="t('page.diagnostic.tab_machine')">
        <system-monitor />
      </t-tab-panel>

      <!-- SamWaf 进程 -->
      <t-tab-panel value="process" :label="t('page.diagnostic.tab_process')">
        <div style="padding-top: 16px">
          <t-space style="margin-bottom: 12px">
            <t-button theme="primary" :loading="snapshotLoading" @click="fetchSnapshot">
              {{ t('page.diagnostic.refresh') }}
            </t-button>
            <span v-if="snapshot.sampled_at" class="sample-time">
              {{ t('page.diagnostic.sampled_at') }}: {{ formatTime(snapshot.sampled_at) }}
            </span>
          </t-space>
          <div class="card-row">
            <t-card :title="t('page.diagnostic.process_card')" :bordered="false" class="diag-card">
              <div class="kv"><span class="k">PID</span><span class="v">{{ snapshot.process.pid }}</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.uptime') }}</span><span class="v">{{ formatDuration(snapshot.process.uptime_seconds) }}</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.proc_cpu') }}</span><span class="v">{{ snapshot.process.cpu_percent }}%</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.rss') }}</span><span class="v">{{ formatBytes(snapshot.process.rss_bytes) }}</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.vms') }}</span><span class="v">{{ formatBytes(snapshot.process.vms_bytes) }}</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.threads') }}</span><span class="v">{{ snapshot.process.num_threads }}</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.fds') }}</span><span class="v">{{ snapshot.process.num_fds >= 0 ? snapshot.process.num_fds : t('page.diagnostic.not_supported') }}</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.cgo_mem') }}</span><span class="v">{{ cgoMemory }}</span></div>
            </t-card>
            <t-card :title="t('page.diagnostic.runtime_card')" :bordered="false" class="diag-card">
              <div class="kv"><span class="k">Goroutines</span><span class="v">{{ snapshot.runtime.goroutines }}</span></div>
              <div class="kv"><span class="k">GOMAXPROCS / CPU</span><span class="v">{{ snapshot.runtime.gomaxprocs }} / {{ snapshot.runtime.num_cpu }}</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.heap_alloc') }}</span><span class="v">{{ formatBytes(snapshot.runtime.heap_alloc) }}</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.heap_inuse') }}</span><span class="v">{{ formatBytes(snapshot.runtime.heap_inuse) }}</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.heap_idle') }}</span><span class="v">{{ formatBytes(snapshot.runtime.heap_idle) }}</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.stack_inuse') }}</span><span class="v">{{ formatBytes(snapshot.runtime.stack_inuse) }}</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.go_sys') }}</span><span class="v">{{ formatBytes(snapshot.runtime.sys) }}</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.gc_count') }}</span><span class="v">{{ snapshot.runtime.num_gc }}</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.gc_pause') }}</span><span class="v">{{ snapshot.runtime.pause_total_ms }} ms</span></div>
              <div class="kv"><span class="k">{{ t('page.diagnostic.last_gc') }}</span><span class="v">{{ snapshot.runtime.last_gc_unix ? formatTime(snapshot.runtime.last_gc_unix) : '-' }}</span></div>
              <div class="kv"><span class="k">Go</span><span class="v">{{ snapshot.runtime.go_version }}</span></div>
            </t-card>
            <t-card :title="t('page.diagnostic.db_card')" :bordered="false" class="diag-card">
              <div v-for="db in snapshot.databases" :key="db.name" class="kv">
                <span class="k">{{ db.name }}</span><span class="v">{{ db.file_size_mb }} MB</span>
              </div>
              <div v-if="!snapshot.databases || snapshot.databases.length === 0" class="empty-hint">-</div>
            </t-card>
          </div>
        </div>
      </t-tab-panel>

      <!-- 内部组件 -->
      <t-tab-panel value="components" :label="t('page.diagnostic.tab_components')">
        <div style="padding-top: 16px">
          <t-space style="margin-bottom: 12px">
            <t-button theme="primary" :loading="snapshotLoading" @click="fetchSnapshot">
              {{ t('page.diagnostic.refresh') }}
            </t-button>
          </t-space>
          <t-alert v-if="hasQueueBacklog" theme="warning" :message="t('page.diagnostic.queue_backlog_warn')" style="margin-bottom: 12px" />
          <div class="card-row">
            <t-card
              v-for="comp in snapshot.components"
              :key="comp.name"
              :title="componentTitle(comp.name)"
              :bordered="false"
              class="diag-card"
            >
              <div v-for="(val, key) in comp.items" :key="key" class="kv">
                <span class="k mono">{{ key }}</span>
                <span class="v" :class="valueClass(comp.name, val)">{{ val }}</span>
              </div>
            </t-card>
          </div>
        </div>
      </t-tab-panel>

      <!-- 趋势 -->
      <t-tab-panel value="trend" :label="t('page.diagnostic.tab_trend')">
        <div style="padding-top: 16px">
          <t-space style="margin-bottom: 12px">
            <t-button theme="primary" :loading="trendLoading" @click="fetchTrend">
              {{ t('page.diagnostic.refresh') }}
            </t-button>
            <span class="sample-time">{{ t('page.diagnostic.trend_hint') }}</span>
          </t-space>
          <t-card :bordered="false">
            <div ref="trendChartRef" style="width: 100%; height: 400px"></div>
          </t-card>
        </div>
      </t-tab-panel>

      <!-- 诊断包 -->
      <t-tab-panel value="package" :label="t('page.diagnostic.tab_package')">
        <div style="padding-top: 16px">
          <t-card :title="t('page.diagnostic.cpu_profile_card')" :bordered="false" style="margin-bottom: 16px">
            <p class="desc">{{ t('page.diagnostic.cpu_profile_desc') }}</p>
            <div v-if="cpuStatus.running" style="margin: 12px 0">
              <t-progress :percentage="cpuProgress" :label="true" />
              <p class="desc">{{ t('page.diagnostic.cpu_profile_running') }}</p>
            </div>
            <div v-else-if="cpuStatus.has_result" class="kv" style="margin: 8px 0">
              <span class="k">{{ t('page.diagnostic.cpu_profile_done') }}</span>
              <span class="v">{{ formatTime(cpuStatus.finished_unix) }} ({{ formatBytes(cpuStatus.result_size) }})</span>
            </div>
            <t-popconfirm :content="t('page.diagnostic.cpu_profile_confirm')" @confirm="startCpuProfile">
              <t-button theme="warning" :disabled="cpuStatus.running || cpuStatus.cooldown_sec > 0" :loading="cpuStarting">
                {{ cpuButtonLabel }}
              </t-button>
            </t-popconfirm>
          </t-card>

          <t-card :title="t('page.diagnostic.package_card')" :bordered="false">
            <p class="desc">{{ t('page.diagnostic.package_desc') }}</p>
            <p class="desc">{{ t('page.diagnostic.package_privacy') }}</p>
            <t-button theme="primary" :loading="packageDownloading" style="margin-top: 8px" @click="downloadPackage">
              {{ t('page.diagnostic.download_package') }}
            </t-button>
          </t-card>
        </div>
      </t-tab-panel>
    </t-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import * as echarts from 'echarts/core';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

import SystemMonitor from '@/pages/waf/monitor/index.vue';
import {
  downloadDiagPackageApi,
  getCpuProfileStatusApi,
  getDiagSnapshotApi,
  getDiagTrendApi,
  startCpuProfileApi,
} from '@/apis/monitor';

echarts.use([GridComponent, TooltipComponent, LegendComponent, LineChart, CanvasRenderer]);

const { t } = useI18n();
const router = useRouter();

const emptySnapshot = () => ({
  version: '',
  version_tag: '',
  os: '',
  arch: '',
  process: { pid: 0, cpu_percent: 0, rss_bytes: 0, vms_bytes: 0, num_threads: 0, num_fds: -1, uptime_seconds: 0 },
  runtime: {
    goroutines: 0,
    gomaxprocs: 0,
    num_cpu: 0,
    heap_alloc: 0,
    heap_inuse: 0,
    heap_idle: 0,
    stack_inuse: 0,
    sys: 0,
    num_gc: 0,
    pause_total_ms: 0,
    last_gc_unix: 0,
    go_version: '',
  },
  components: [] as Array<{ name: string; items: Record<string, number> }>,
  databases: [] as Array<{ name: string; file_size_mb: number }>,
  sampled_at: 0,
});

const activeTab = ref('machine');
const snapshot = ref(emptySnapshot());
const snapshotLoading = ref(false);
const trendLoading = ref(false);
const trendChartRef = ref<HTMLElement | null>(null);
let trendChart: echarts.ECharts | null = null;
const cpuStatus = ref({
  running: false,
  has_result: false,
  result_size: 0,
  finished_unix: 0,
  elapsed_second: 0,
  duration_sec: 30,
  cooldown_sec: 0,
  last_error: '',
});
const cpuStarting = ref(false);
let cpuPollTimer: ReturnType<typeof setInterval> | null = null;
let cpuPollFailCount = 0;
const packageDownloading = ref(false);

// RSS 与 Go 申请内存的差值 ≈ CGO/C 侧（主要是 SQLite）占用
const cgoMemory = computed(() => {
  const rss = snapshot.value.process.rss_bytes || 0;
  const goSys = snapshot.value.runtime.sys || 0;
  if (rss <= 0 || goSys <= 0 || rss <= goSys) return '-';
  return formatBytes(rss - goSys);
});

const hasQueueBacklog = computed(() => {
  const queueComp = (snapshot.value.components || []).find((c) => c.name === 'db_queue');
  if (!queueComp) return false;
  return Object.values(queueComp.items || {}).some((v) => v > 5000);
});

const cpuProgress = computed(() => {
  const total = cpuStatus.value.duration_sec || 30;
  return Math.min(100, Math.round(((cpuStatus.value.elapsed_second || 0) / total) * 100));
});

const cpuButtonLabel = computed(() => {
  if (cpuStatus.value.running) return t('page.diagnostic.cpu_profile_running_btn');
  if (cpuStatus.value.cooldown_sec > 0) {
    return `${t('page.diagnostic.cpu_profile_cooldown')} (${cpuStatus.value.cooldown_sec}s)`;
  }
  return t('page.diagnostic.start_cpu_profile');
});

onMounted(() => {
  fetchSnapshot();
  fetchCpuStatus();
});

onBeforeUnmount(() => {
  stopCpuPolling();
  if (trendChart) {
    trendChart.dispose();
    trendChart = null;
  }
});

function handleTabChange(value: string | number) {
  if (value === 'process' || value === 'components') {
    if (!snapshotLoading.value) fetchSnapshot();
  } else if (value === 'trend') {
    fetchTrend();
  } else if (value === 'package') {
    fetchCpuStatus();
  }
}

function fetchSnapshot() {
  snapshotLoading.value = true;
  getDiagSnapshotApi()
    .then((res: any) => {
      if (res.code === 0) {
        snapshot.value = { ...emptySnapshot(), ...res.data };
      } else {
        MessagePlugin.error(res.msg || t('page.diagnostic.load_failed'));
      }
    })
    .catch(() => MessagePlugin.error(t('page.diagnostic.load_failed')))
    .finally(() => {
      snapshotLoading.value = false;
    });
}

function fetchTrend() {
  trendLoading.value = true;
  getDiagTrendApi()
    .then((res: any) => {
      if (res.code === 0) {
        renderTrend(res.data);
      } else {
        MessagePlugin.error(res.msg || t('page.diagnostic.load_failed'));
      }
    })
    .catch(() => MessagePlugin.error(t('page.diagnostic.load_failed')))
    .finally(() => {
      trendLoading.value = false;
    });
}

function renderTrend(trend: any) {
  nextTick(() => {
    const el = trendChartRef.value;
    if (!el) return;
    if (!trendChart) {
      trendChart = echarts.init(el);
    }
    const points = (trend && trend.points) || [];
    const times = points.map((p: any) => formatTime(p.ts, true));
    trendChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: {
        data: [
          t('page.diagnostic.series_cpu'),
          t('page.diagnostic.series_rss'),
          t('page.diagnostic.series_goroutines'),
          t('page.diagnostic.series_queue_log'),
        ],
      },
      grid: { left: 50, right: 60, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: times },
      yAxis: [
        { type: 'value', name: 'CPU %', max: 100 },
        { type: 'value', name: '' },
      ],
      series: [
        { name: t('page.diagnostic.series_cpu'), type: 'line', yAxisIndex: 0, showSymbol: false, data: points.map((p: any) => p.cpu_percent) },
        { name: t('page.diagnostic.series_rss'), type: 'line', yAxisIndex: 1, showSymbol: false, data: points.map((p: any) => Math.round((p.rss_bytes || 0) / 1048576)) },
        { name: t('page.diagnostic.series_goroutines'), type: 'line', yAxisIndex: 1, showSymbol: false, data: points.map((p: any) => p.goroutines) },
        { name: t('page.diagnostic.series_queue_log'), type: 'line', yAxisIndex: 1, showSymbol: false, data: points.map((p: any) => p.queue_log) },
      ],
    });
    trendChart.resize();
  });
}

function startCpuProfile() {
  cpuStarting.value = true;
  startCpuProfileApi()
    .then((res: any) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || 'OK');
        fetchCpuStatus();
      } else {
        MessagePlugin.error(res.msg || t('page.diagnostic.load_failed'));
      }
    })
    .catch(() => MessagePlugin.error(t('page.diagnostic.load_failed')))
    .finally(() => {
      cpuStarting.value = false;
    });
}

function fetchCpuStatus() {
  getCpuProfileStatusApi()
    .then((res: any) => {
      if (res.code === 0) {
        cpuPollFailCount = 0;
        cpuStatus.value = res.data;
        if (res.data.running) {
          startCpuPolling();
        } else {
          stopCpuPolling();
        }
      }
    })
    .catch(() => {
      // 连续失败（网络断/已登出）就停掉轮询，避免定时器空转
      cpuPollFailCount += 1;
      if (cpuPollFailCount >= 5) {
        stopCpuPolling();
      }
    });
}

function startCpuPolling() {
  if (cpuPollTimer) return;
  cpuPollTimer = setInterval(() => fetchCpuStatus(), 3000);
}

function stopCpuPolling() {
  if (cpuPollTimer) {
    clearInterval(cpuPollTimer);
    cpuPollTimer = null;
  }
}

function downloadPackage() {
  packageDownloading.value = true;
  downloadDiagPackageApi()
    .then(async (blob: any) => {
      if (!(blob instanceof Blob)) {
        MessagePlugin.error(t('page.diagnostic.load_failed'));
        return;
      }
      // 后端拒绝（鉴权失效/频控等）时返回的是 JSON 信封而非 zip，
      // blob 响应不会走全局拦截器的错误处理，这里必须自行识别
      if (blob.type && blob.type.indexOf('application/json') !== -1) {
        try {
          const body = JSON.parse(await blob.text());
          if (body.code === -999) {
            router.replace({ path: '/login' });
            return;
          }
          MessagePlugin.error(body.msg || t('page.diagnostic.load_failed'));
        } catch (e) {
          MessagePlugin.error(t('page.diagnostic.load_failed'));
        }
        return;
      }
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const fileName = `waf_diag_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      MessagePlugin.success(t('page.diagnostic.download_ok'));
    })
    .catch(() => MessagePlugin.error(t('page.diagnostic.load_failed')))
    .finally(() => {
      packageDownloading.value = false;
    });
}

function componentTitle(name: string) {
  const key = `page.diagnostic.comp_${name}`;
  const label = t(key);
  return label === key ? name : label;
}

function valueClass(compName: string, val: number) {
  if (compName === 'db_queue') {
    if (val > 5000) return 'val-danger';
    if (val > 500) return 'val-warn';
  }
  return '';
}

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let idx = 0;
  let value = bytes;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(1)} ${units[idx]}`;
}

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return '-';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${seconds % 60}s`;
}

function formatTime(ts: number, short = false) {
  if (!ts) return '-';
  const date = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  if (short) return hm;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${hm}`;
}
</script>

<style scoped>
.diagnostic-container {
  padding: 16px;
}

.card-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: stretch;
}

.diag-card {
  flex: 1;
  min-width: 300px;
}

.kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.k {
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.v {
  color: var(--td-text-color-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.mono {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-weight: 400;
}

.val-warn {
  color: #ed7b2f;
  font-weight: 600;
}

.val-danger {
  color: #e34d59;
  font-weight: 600;
}

.sample-time {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  line-height: 32px;
}

.desc {
  color: var(--td-text-color-secondary);
  margin: 4px 0;
}

.empty-hint {
  color: var(--td-text-color-placeholder);
}
</style>
