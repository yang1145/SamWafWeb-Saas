<template>
  <t-row :gutter="[16, 16]">
    <t-col :xs="12" :xl="9">
      <t-card :title="t('dashboard.cycle_title')" :subtitle="t('dashboard.cycle_subtitle')" class="dashboard-chart-card">
        <template #actions>
          <div class="dashboard-chart-title-container">
            <t-date-range-picker
              class="card-date-picker-container"
              theme="primary"
              mode="date"
              :default-value="LAST_7_DAYS"
              @change="onDateRangeChange"
            />
          </div>
        </template>
        <div class="chart-wrap">
          <div v-if="isLineEmpty" class="chart-empty">
            <chart-line-icon class="chart-empty__icon" />
            <span>{{ t('dashboard.empty_data') }}</span>
          </div>
          <div id="monitorContainer" ref="monitorContainer" :style="{ width: '100%', height: `${resizeTime * 326}px` }"></div>
        </div>
      </t-card>
    </t-col>
    <t-col :xs="12" :xl="3">
      <t-card :title="t('dashboard.cycle_percent_title')" :subtitle="t('dashboard.cycle_percent_subtitle')" class="dashboard-chart-card">
        <div class="chart-wrap">
          <div v-if="isPieEmpty" class="chart-empty">
            <chart-pie-icon class="chart-empty__icon" />
            <span>{{ t('dashboard.empty_data') }}</span>
          </div>
          <div
            id="countContainer"
            ref="countContainer"
            :style="{ width: '100%', height: '300px' }"
          ></div>
        </div>
      </t-card>
    </t-col>
  </t-row>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import * as echarts from 'echarts/core';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { LineChart, PieChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { ChartLineIcon, ChartPieIcon } from 'tdesign-icons-vue-next';

import { LAST_7_DAYS } from '@/utils/date';
import { getLineChartDataSet, getPieChartDataSet } from '../../index';
import { wafstatsumdayrangeapi } from '@/apis/stats';

echarts.use([TooltipComponent, LegendComponent, PieChart, GridComponent, LineChart, CanvasRenderer]);

const { t } = useI18n();

const resizeTime = ref(1);
const rangeStartDay = ref('');
const rangeEndDay = ref('');
const rangeDateTimeArray = ref<string[]>([]);
const rangeAttackArray = ref<number[]>([]);
const rangeNormalArray = ref<number[]>([]);
const rangeSumAttackCount = ref(0);
const rangeSumNormalCount = ref(0);
let isInitialed = false;
const isLineEmpty = ref(false); // 折线图是否无数据
const isPieEmpty = ref(false); // 环形图是否无数据

let monitorChart: echarts.ECharts | null = null;
let countChart: echarts.ECharts | null = null;

onMounted(() => {
  rangeStartDay.value = LAST_7_DAYS[0].replace(/-/g, '');
  rangeEndDay.value = LAST_7_DAYS[1].replace(/-/g, '');
  loadSumDayRange();
  nextTick(() => {
    updateContainer();
  });
  window.addEventListener('resize', updateContainer, false);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateContainer, false);
  monitorChart?.dispose();
  countChart?.dispose();
});

function loadSumDayRange() {
  wafstatsumdayrangeapi({ start_day: rangeStartDay.value, end_day: rangeEndDay.value })
    .then((res) => {
      rangeDateTimeArray.value = [];
      rangeAttackArray.value = [];
      rangeSumAttackCount.value = 0;
      rangeSumNormalCount.value = 0;
      for (const key in res.data.AttackCountOfRange) {
        const item = res.data.AttackCountOfRange[key];
        rangeAttackArray.value.push(item);
        rangeDateTimeArray.value.push(key);
        rangeSumAttackCount.value += item;
      }

      rangeNormalArray.value = [];
      for (const key in res.data.NormalCountOfRange) {
        const item = res.data.NormalCountOfRange[key];
        rangeNormalArray.value.push(item);
        rangeSumNormalCount.value += item;
      }
      // 空数据时展示空态
      isLineEmpty.value = rangeDateTimeArray.value.length === 0;
      isPieEmpty.value = rangeSumAttackCount.value + rangeSumNormalCount.value === 0;
      if (isInitialed === false) {
        renderCharts();
        isInitialed = true;
      } else {
        monitorChart?.setOption(
          getLineChartDataSet({
            dateTime: rangeDateTimeArray.value,
            inchartarr: rangeAttackArray.value,
            outchartarr: rangeNormalArray.value,
          }),
        );
        countChart?.setOption(
          getPieChartDataSet({ attackCount: rangeSumAttackCount.value, normalCount: rangeSumNormalCount.value }),
        );
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

/** 正常请求和异常请求走趋选择 */
function onDateRangeChange(checkedValues: any) {
  rangeStartDay.value = checkedValues[0].replace(/-/g, '');
  rangeEndDay.value = checkedValues[1].replace(/-/g, '');
  loadSumDayRange();
}

function updateContainer() {
  if (document.documentElement.clientWidth >= 1400 && document.documentElement.clientWidth < 1920) {
    resizeTime.value = Number((document.documentElement.clientWidth / 2080).toFixed(2));
  } else if (document.documentElement.clientWidth < 1080) {
    resizeTime.value = Number((document.documentElement.clientWidth / 1080).toFixed(2));
  } else {
    resizeTime.value = 1;
  }
  // 容器尺寸变化后让 echarts 按新尺寸重绘（占比图宽度已改为随卡片自适应，
  // 不重绘的话画布保持旧像素尺寸，会在窄卡片里溢出/与卡片内容重叠）
  nextTick(() => {
    monitorChart?.resize();
    countChart?.resize();
  });
}

function renderCharts() {
  // 攻击和访问走势
  const monitorContainer = document.getElementById('monitorContainer');
  monitorChart = echarts.init(monitorContainer);
  monitorChart.setOption(
    getLineChartDataSet({
      dateTime: rangeDateTimeArray.value,
      inchartarr: rangeAttackArray.value,
      outchartarr: rangeNormalArray.value,
    }),
  );
  // 攻击/正常占比
  const countContainer = document.getElementById('countContainer');
  countChart = echarts.init(countContainer);
  countChart.setOption(getPieChartDataSet({ attackCount: rangeSumAttackCount.value, normalCount: rangeSumNormalCount.value }));
}
</script>

<style scoped>
.dashboard-chart-card {
  padding: 8px;
}

.dashboard-chart-card :deep(.t-card__header) {
  padding-bottom: 24px;
}

.dashboard-chart-card :deep(.t-card__title) {
  font-size: 16px;
  font-weight: 600;
}

.dashboard-chart-card :deep(.t-card__subtitle) {
  margin-left: 8px;
}

.chart-wrap {
  position: relative;
}

.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  z-index: 1;
  color: var(--td-text-color-placeholder);
  font-size: 14px;
}

.chart-empty__icon {
  font-size: 28px;
  opacity: 0.6;
}
</style>
