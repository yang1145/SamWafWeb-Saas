<template>
  <div class="dashboard-page">
    <!-- 降级运行：旧程序 + 新库（容器重建后回退），过去只在日志里，现在摆到台面上 -->
    <t-alert
      v-if="upgradeSummary.downgrade"
      theme="error"
      class="row-container"
      :message="upgradeSummary.downgrade_msg"
      close
      @close="handleDowngradeAck"
    />

    <t-swiper
      v-if="tipsVisable"
      class="tips-container"
      :duration="300"
      :interval="5000"
      :navigation="navigation"
      trigger="click"
    >
      <t-swiper-item v-for="(item, index) in visibleTips" :key="index">
        <t-alert :theme="item.tipsType" :message="t(item.message)">
          <template #operation>
            <span v-if="item.name === 'emptyHost'" class="tips-link" @click="handleCreateWebOperation">{{
              t('dashboard.tip_create_website_link')
            }}</span>
            <span v-if="item.name === 'defaultAccount'" class="tips-link" @click="handleModifyDefaultPassWebOperation">{{
              t('dashboard.tip_modify_pwd_link')
            }}</span>
            <span v-if="item.name === 'emptyOtp'" class="tips-link" @click="handleModify2FaWebOperation">{{
              t('dashboard.tip_empty_otp_link')
            }}</span>
          </template>
        </t-alert>
      </t-swiper-item>
    </t-swiper>

    <!-- 顶部指标卡片 -->
    <top-panel class="row-container" />
    <!-- 中部图表 -->
    <middle-chart class="row-container" />
    <!-- 列表排名 -->
    <rank-list class="row-container" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

import TopPanel from './components/TopPanel.vue';
import MiddleChart from './components/MiddleChart.vue';
import RankList from './components/RankList.vue';
import { wafStatSysinfoapi } from '@/apis/stats';
import { upgrade_notice_downgrade_ack_api, upgrade_notice_summary_api } from '@/apis/upgrade_notice';

const { t } = useI18n();
const router = useRouter();

const navigation = {
  type: 'bars' as const,
  size: 'small' as const,
  showSlideBtn: 'never' as const,
  placement: 'inside' as const,
};

const tipsVisable = ref(false);
const tips = ref([
  {
    name: 'emptyHost',
    visable: false,
    message: 'dashboard.tip_create_website_title',
    tipsType: 'success' as const,
  },
  {
    name: 'defaultAccount',
    visable: false,
    message: 'dashboard.tip_modify_pwd_title',
    tipsType: 'error' as const,
  },
  {
    name: 'emptyOtp',
    visable: false,
    message: 'dashboard.tip_empty_otp_title',
    tipsType: 'error' as const,
  },
]);

const visibleTips = computed(() => tips.value.filter((item) => item.visable));

// 降级运行告警（升级须知里的升级提示条/弹窗已随商业化改造移除，仅保留运维需要的降级告警）
const upgradeSummary = reactive({
  downgrade: false,
  downgrade_msg: '',
});

onMounted(() => {
  loadSysInfo();
  loadUpgradeSummary();
});

// 引导创建网站
function handleCreateWebOperation() {
  router.push({
    path: '/waf-host/wafhost',
    query: { sourcePage: 'HomeFrist' },
  });
}

// 引导修改默认密码
function handleModifyDefaultPassWebOperation() {
  router.push({
    path: '/account/Account',
    query: { sourcePage: 'HomeFrist' },
  });
}

// 引导用户去设置2fa
function handleModify2FaWebOperation() {
  router.push({
    path: '/account/OTP',
    query: { sourcePage: 'HomeFirst' },
  });
}

function loadSysInfo() {
  wafStatSysinfoapi({})
    .then((res) => {
      tips.value[0].visable = res.data.is_empty_host;
      tips.value[1].visable = res.data.is_default_account;
      tips.value[2].visable = res.data.is_empty_otp;
      tipsVisable.value = tips.value[0].visable || tips.value[1].visable || tips.value[2].visable;
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

// 降级告警数据：仅取 summary 里的降级字段
function loadUpgradeSummary() {
  upgrade_notice_summary_api({ lang: localStorage.getItem('lang') || 'zh_CN' })
    .then((res) => {
      if (res.code !== 0 || !res.data) return;
      upgradeSummary.downgrade = !!res.data.downgrade;
      upgradeSummary.downgrade_msg = res.data.downgrade_msg || '';
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

// 确认降级告警：记下当前这个"历史最高版本"，此后不再提示；
// 若之后最高版本又变高（又升级又回退了一次），告警会重新出现
function handleDowngradeAck() {
  upgradeSummary.downgrade = false;
  upgrade_notice_downgrade_ack_api().catch((e: Error) => {
    console.log(e);
  });
}
</script>

<style scoped>
.dashboard-page :deep(.t-row) {
  row-gap: 16px;
}

.row-container {
  margin-bottom: 16px;
}

.tips-container {
  margin-bottom: 16px;
}

.tips-container .tips-link {
  color: var(--td-brand-color);
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
}

.tips-container .tips-link:hover {
  text-decoration: underline;
}
</style>
