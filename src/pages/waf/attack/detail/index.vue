<template>
  <div class="detail-base">
    <!-- 加载态：避免先亮出空壳再填数据的闪动 -->
    <div v-if="!detailLoaded" class="vd-loading">
      <t-loading size="28px" />
      <span class="vd-loading-text">{{ t('page.visit_log.detail.loading') }}</span>
    </div>
    <t-alert v-else-if="detailError" theme="error" :message="detailError" />

    <template v-else>
      <!-- 结论横幅：防御动作、命中规则与关键操作先给结论，细节往下展开 -->
      <div class="vd-hero" :class="'vd-hero--' + verdictTheme">
        <div class="vd-hero-top">
          <div class="vd-hero-badge">
            <component :is="verdictIconComp" />
          </div>
          <div class="vd-hero-main">
            <div class="vd-hero-title">
              <span class="vd-verdict-label">{{ t('page.visit_log.detail.defense_status_step') }}</span>
              <span class="vd-verdict">{{ detail_data.action || '—' }}</span>
              <t-tag v-if="detail_data.rule" class="vd-rule-tag" theme="danger" variant="light" :title="detail_data.rule">
                {{ t('page.visit_log.detail.rule_hit') }} · {{ detail_data.rule }}
              </t-tag>
              <t-tag
                v-if="detail_data.rule && detail_data.log_only_mode != '0'"
                :theme="detail_data.log_only_mode == '1' ? 'danger' : 'success'"
                variant="light-outline"
              >
                {{ t('page.visit_log.log_only_mode') }}：{{
                  detail_data.log_only_mode == '1' ? t('page.visit_log.log_only_mode_on') : t('page.visit_log.log_only_mode_off')
                }}
              </t-tag>
            </div>
            <div class="vd-hero-sub">
              <span v-if="detail_data.method" class="vd-method">{{ detail_data.method }}</span>
              <span class="vd-host">{{ detail_data.host }}</span>
              <span class="vd-path" :title="detail_data.url">{{ detail_data.url || '/' }}</span>
            </div>
            <div class="vd-hero-meta">
              <span class="vd-meta-item">
                <t-icon name="time" />{{ detail_data.create_time }}
              </span>
              <span v-if="detail_data.shard_name" class="vd-meta-item">
                <t-icon name="folder" />{{ t('page.visit_log.detail.shard_name') }}：{{ detail_data.shard_name }}
              </span>
              <span class="vd-meta-item vd-uuid">
                <t-icon name="data" />{{ t('page.visit_log.detail.request_identifier') }}：
                <code>{{ detail_data.req_uuid }}</code>
                <t-tooltip :content="t('common.copy')">
                  <a class="vd-copy" @click="copyText(detail_data.req_uuid)"><t-icon name="file-copy" /></a>
                </t-tooltip>
              </span>
            </div>
          </div>
          <div class="vd-hero-actions">
            <t-button theme="primary" @click="beforeSendAi">
              <template #icon><logo-android-icon /></template>
              {{ t('page.visit_log.detail.ai.log_ai_analysis') }}
            </t-button>
            <t-tooltip :content="t('page.visit_log.detail.http_copy_mask_tip')">
              <t-button variant="outline" theme="default" @click="loadHttpCopyMask">
                <template #icon><t-icon name="file-copy" /></template>
                {{ t('page.visit_log.detail.fp_report') }}
              </t-button>
            </t-tooltip>
            <t-button v-if="isOwaspRule && isPlatform" variant="outline" theme="default" @click="goToOwaspRule">
              {{ t('page.visit_log.detail.owasp_view_rule') }}
            </t-button>
            <t-button v-if="isOwaspRule && isPlatform" variant="outline" theme="default" @click="goToOwaspSandbox">
              {{ t('page.visit_log.detail.owasp_sandbox_test') }}
            </t-button>
            <t-button v-if="!isEmbedded" variant="text" theme="default" @click="backPage">
              <template #icon><t-icon name="backward" /></template>
              {{ t('common.return') }}
            </t-button>
          </div>
        </div>
        <div v-if="payloadMissing" class="vd-hero-note">
          <t-icon name="info-circle" />
          <span>{{ t('page.visit_log.detail.payload_missing') }}</span>
        </div>
      </div>

      <!-- 关键指标带 -->
      <div class="vd-kpis">
        <div v-for="k in kpis" :key="k.key" class="vd-kpi" :class="['vd-kpi--' + k.theme, { 'is-colored': k.valueColor }]">
          <div class="vd-kpi-label">{{ k.label }}</div>
          <div class="vd-kpi-value" :title="k.title || k.value">{{ k.value }}</div>
          <div v-if="k.sub" class="vd-kpi-sub" :title="k.sub">{{ k.sub }}</div>
        </div>
      </div>

      <!-- 主体：左报文 / 右上下文 -->
      <div class="vd-grid">
        <div class="vd-col-main">
          <!-- 请求报文 -->
          <div class="vd-card">
            <div class="vd-card-head">
              <span class="vd-card-title">{{ t('page.visit_log.detail.request_payload') }}</span>
              <span class="vd-card-actions">
                <t-tooltip :content="t('page.visit_log.detail.mouse_select_tooltip')">
                  <span class="vd-quick-rule">
                    {{ t('page.visit_log.detail.quick_add_rule') }}
                    <t-switch v-model="quickAddRuleChecked" size="small" />
                  </span>
                </t-tooltip>
              </span>
            </div>
            <div class="vd-card-body">
              <div v-for="f in requestFields" :key="'rq-' + f.key" class="pl-block">
                <div class="pl-head">
                  <span class="pl-label">{{ f.label }}</span>
                  <span class="pl-ops">
                    <span v-if="f.value" class="pl-size">{{ fmtSize(f.value.length) }}</span>
                    <t-link v-if="canExpand(f)" theme="primary" size="small" @click="toggleField(f.key)">
                      {{
                        expandedMap[f.key]
                          ? t('page.visit_log.detail.body_show_less')
                          : t('page.visit_log.detail.body_show_more')
                      }}
                    </t-link>
                    <t-tooltip v-if="f.value" :content="t('common.copy')">
                      <a class="pl-copy" @click="copyText(f.value)"><t-icon name="file-copy" /></a>
                    </t-tooltip>
                  </span>
                </div>
                <pre
                  v-if="f.value"
                  class="pl-code"
                  :class="{ 'is-expanded': expandedMap[f.key] }"
                  @mouseup="captureSelection(f.key, $event)"
                  >{{ displayValue(f) }}</pre>
                <div v-else class="pl-empty">{{ t('page.visit_log.detail.empty_content') }}</div>
              </div>
            </div>
          </div>

          <!-- 响应信息 -->
          <div class="vd-card">
            <div class="vd-card-head">
              <span class="vd-card-title">{{ t('page.visit_log.detail.response.response_title') }}</span>
            </div>
            <div class="vd-card-body">
              <div class="pl-block">
                <div class="pl-head">
                  <span class="pl-label">{{ t('page.visit_log.detail.response.response_status') }}</span>
                </div>
                <div class="pl-status">
                  <t-tag v-if="statusChip" :theme="statusTheme" variant="light">{{ statusChip }}</t-tag>
                  <span v-else class="pl-none">—</span>
                </div>
              </div>
              <div v-for="f in responseFields" :key="'rs-' + f.key" class="pl-block">
                <div class="pl-head">
                  <span class="pl-label">{{ f.label }}</span>
                  <span class="pl-ops">
                    <span v-if="f.value" class="pl-size">{{ fmtSize(f.value.length) }}</span>
                    <t-link v-if="canExpand(f)" theme="primary" size="small" @click="toggleField(f.key)">
                      {{
                        expandedMap[f.key]
                          ? t('page.visit_log.detail.body_show_less')
                          : t('page.visit_log.detail.body_show_more')
                      }}
                    </t-link>
                    <t-tooltip v-if="f.value" :content="t('common.copy')">
                      <a class="pl-copy" @click="copyText(f.value)"><t-icon name="file-copy" /></a>
                    </t-tooltip>
                  </span>
                </div>
                <pre
                  v-if="f.value"
                  class="pl-code"
                  :class="{ 'is-expanded': expandedMap[f.key] }"
                  @mouseup="captureSelection(f.key, $event)"
                  >{{ displayValue(f) }}</pre>
                <div v-else class="pl-empty">{{ t('page.visit_log.detail.empty_content') }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="vd-col-side">
          <!-- 访问者信息 -->
          <div class="vd-card">
            <div class="vd-card-head">
              <span class="vd-card-title">{{ t('page.visit_log.detail.visitor_info') }}</span>
            </div>
            <div class="vd-card-body">
              <div class="vd-ip-row">
                <code class="vd-ip">{{ detail_data.src_ip || '—' }}</code>
                <t-button
                  v-if="detail_data.src_ip"
                  size="small"
                  theme="danger"
                  variant="outline"
                  @click="handleAddipblock(detail_data.src_ip)"
                  >{{ t('page.visit_log.detail.add_to_deny_list') }}</t-button
                >
              </div>
              <div class="vd-ip-sub">
                <span>{{ t('page.visit_log.detail.visitor_port') }}：{{ detail_data.src_port || '—' }}</span>
                <a class="vd-link" @click="handleIPExtractIssue">{{ t('page.visit_log.detail.ip_extract_issue') }}</a>
              </div>
              <div v-if="detail_data.src_ip != detail_data.net_src_ip" class="vd-sub-block">
                <div class="vd-sub-label vd-sub-label--warn">{{ t('page.visit_log.detail.visitor_net_ip') }}</div>
                <div class="vd-ip-row">
                  <code class="vd-ip vd-ip--warn">{{ detail_data.net_src_ip }}</code>
                  <t-button size="small" theme="danger" variant="outline" @click="handleAddipblock(detail_data.net_src_ip)">{{
                    t('page.visit_log.detail.add_to_deny_list')
                  }}</t-button>
                </div>
              </div>
              <div v-if="detail_data.is_balance == 1" class="vd-sub-block">
                <div class="vd-sub-label">{{ t('page.visit_log.detail.balance_info') }}</div>
                <div class="vd-sub-value">{{ detail_data.balance_info }}</div>
              </div>
            </div>
          </div>

          <!-- 防御链路 -->
          <div class="vd-card">
            <div class="vd-card-head">
              <span class="vd-card-title">{{ t('page.visit_log.detail.defense_status') }}</span>
            </div>
            <div class="vd-card-body">
              <div class="vd-chain">
                <div v-for="(n, i) in chainNodes" :key="'ch-' + i" class="vd-node" :class="'vd-node--' + n.theme">
                  <div class="vd-node-rail">
                    <span class="vd-node-dot"></span>
                    <span v-if="i < chainNodes.length - 1" class="vd-node-line"></span>
                  </div>
                  <div class="vd-node-body">
                    <div class="vd-node-title">{{ n.title }}</div>
                    <div class="vd-node-value" :class="{ 'is-muted': n.muted }" :title="n.value">
                      <t-tag v-if="n.tag" size="small" :theme="n.tag.theme" variant="light">{{ n.tag.text }}</t-tag>
                      <template v-else>{{ n.value }}</template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 耗时构成 -->
          <div class="vd-card">
            <div class="vd-card-head">
              <span class="vd-card-title">{{ t('page.visit_log.detail.time_cost.title') }}</span>
              <span class="pl-size">{{ t('page.visit_log.detail.time_cost.total_cost') }} {{ totalCost }}ms</span>
            </div>
            <div class="vd-card-body vd-costs">
              <div v-for="c in costRows" :key="c.key" class="vd-cost">
                <div class="vd-cost-head">
                  <span>{{ c.label }}</span>
                  <b>{{ c.value }}ms</b>
                </div>
                <div class="vd-cost-track">
                  <div class="vd-cost-bar" :class="'vd-cost-bar--' + c.theme" :style="{ width: c.pct + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 快捷加入规则：选中内容后浮出的确认按钮。
         不再用「点击页面空白」这种隐式触发——那个方案会把 AI 分析、误报反馈等
         任何一次点击都吞掉并劫持成跳转；改成显式点击本按钮才跳。 -->
    <button
      v-if="pendingSel"
      class="vd-sel-btn"
      :style="{ left: pendingSel.x + 'px', top: pendingSel.y + 'px' }"
      @mousedown.prevent
      @click="applySelRule"
    >
      <t-icon name="add" />{{ t('page.visit_log.detail.quick_add_rule_apply') }}
    </button>

    <t-dialog
      v-model:visible="httpCopyMaskVisible"
      :header="t('page.visit_log.detail.http_copy_mask')"
      :on-cancel="() => (httpCopyMaskVisible = false)"
      @confirm="httpCopyMaskVisible = false"
    >
      <t-alert theme="info" :message="t('page.visit_log.detail.http_copy_mask_tip')" />
      <t-textarea v-model="httpCopyMask" :autosize="{ minRows: 5, maxRows: 10 }" />
    </t-dialog>

    <t-dialog
      v-model:visible="httpAiMaskVisible"
      :header="t('page.visit_log.detail.ai.before_send_ai')"
      width="700px"
      :on-cancel="() => (httpAiMaskVisible = false)"
      @confirm="handelToAi"
    >
      <t-alert theme="info" :message="t('page.visit_log.detail.ai.before_send_ai_tip')" />
      <t-textarea v-model="httpAiMask" :autosize="{ minRows: 5, maxRows: 10 }" />
    </t-dialog>

    <!-- IP提取问题对话框 -->
    <t-dialog v-model:visible="ipExtractDialogVisible" :header="t('page.visit_log.detail.ip_extract_issue')" :width="800" :footer="false">
      <p>{{ t('page.visit_log.detail.ip_extract_issue_desc') }}</p>

      <!-- 视频教程链接 -->
      <t-alert theme="success" style="margin-bottom: 16px">
        <template #icon>
          <span style="font-size: 20px">📺</span>
        </template>
        <div style="display: flex; align-items: center; justify-content: space-between">
          <span>{{ t('page.visit_log.detail.ip_extract_video_tutorial') }}</span>
          <t-button theme="primary" size="small" @click="openVideoTutorial">
            {{ t('page.visit_log.detail.ip_extract_watch_tutorial') }}
          </t-button>
        </div>
      </t-alert>

      <!-- 常用头信息提示区域 -->
      <t-card :title="t('page.visit_log.detail.ip_extract_common_headers')" style="margin-bottom: 20px">
        <p style="margin-bottom: 12px; color: #666">{{ t('page.visit_log.detail.ip_extract_common_headers_desc') }}</p>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px">
          <t-button size="small" variant="outline" @click="selectIPHeader('CF-Connecting-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.cloudflare') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('True-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.cloudflare_enterprise') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('X-Forwarded-For')">
            {{ t('page.visit_log.detail.ip_extract_headers.x_forwarded_for') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('X-Real-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.x_real_ip') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('X-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.x_client_ip') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('Fastly-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.fastly') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('Incap-Client-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.incapsula') }}
          </t-button>
          <t-button size="small" variant="outline" @click="selectIPHeader('CF-Connecting-IP,X-Forwarded-For,X-Real-IP')">
            {{ t('page.visit_log.detail.ip_extract_headers.multiple') }}
          </t-button>
        </div>
        <t-alert theme="info" :message="t('page.visit_log.detail.ip_extract_multiple_tips')" style="margin-top: 8px" />
        <div style="margin-top: 8px; color: #999; font-size: 12px">
          {{ t('page.visit_log.detail.ip_extract_example') }}
        </div>
      </t-card>

      <t-form ref="ipExtractForm" :data="ipExtractFormData" :rules="ipExtractRules" :label-width="150" @submit="onSubmitIPExtract">
        <t-form-item :label="t('page.systemconfig.label_configuration_item')" name="item">
          <t-input v-model="ipExtractFormData.item" :style="{ width: '600px' }" disabled></t-input>
        </t-form-item>
        <t-form-item :label="t('page.systemconfig.label_configuration_value')" name="value">
          <t-input
            v-model="ipExtractFormData.value"
            :style="{ width: '600px' }"
            :placeholder="t('page.visit_log.detail.ip_extract_issue_tips')"
          ></t-input>
          <div class="form-item-tips">{{ t('page.visit_log.detail.ip_extract_issue_tips') }}</div>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="ipExtractDialogVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import type { FormProps } from 'tdesign-vue-next';
import {
  LogoAndroidIcon,
  SecuredFilledIcon,
  ShieldErrorFilledIcon,
  ErrorTriangleFilledIcon,
  InfoCircleFilledIcon,
} from 'tdesign-icons-vue-next';

import bus from '@/utils/bus';
import { usePermissionStore } from '@/store/modules/permission';
import { geWebLogDetail, getHeaderCopyDetail } from '@/apis/waflog/attacklog';
import { wafIPBlockAddApi } from '@/apis/ipblock';
import { edit_system_config_api, get_detail_by_item_api } from '@/apis/systemconfig';

// 可映射到规则引擎请求侧字段的报文块，必须与规则编辑页 setRuleContentByMode 的 case 一一对应：
// url/header/user_agent/cookies/body 是同名字段；post_form 在规则编辑页映射到 POST_FORM。
// 响应侧（res_header / res_body）在请求检测字段里没有对应物，不能进快捷加规则流程。
const QUICK_RULE_FIELDS = ['url', 'header', 'user_agent', 'cookies', 'body', 'post_form'];

const props = defineProps({
  prop_req_uuid: {
    type: String,
    default: '',
  },
  prop_current_db: {
    type: String,
    default: '',
  },
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const detail_data = ref<Record<string, any>>({});
const detailLoaded = ref(false); // 详情已返回（payloadMissing 提示要等数据回来再判断）
const detailError = ref('');
const quickAddRuleChecked = ref(false);
// 各报文块的展开状态：>300 字符的块默认折叠，逐块展开
const expandedMap = ref<Record<string, boolean>>({
  url: false,
  header: false,
  user_agent: false,
  cookies: false,
  body: false,
  post_form: false,
  res_header: false,
  res_body: false,
});
const pendingSel = ref<{ text: string; sourcePoint: string; x: number; y: number } | null>(null); // 快捷加入规则：选中待用的文本 + 来源块
const detail_req = reactive({
  req_uuid: '',
  current_db: '',
});
const httpCopyMask = ref('');
const httpCopyMaskVisible = ref(false);
const httpAiMask = ref('');
const httpAiMaskVisible = ref(false);
const ipExtractDialogVisible = ref(false);
const ipExtractFormData = ref<Record<string, any>>({
  item: 'gwaf_proxy_header',
  value: '',
  remarks: '获取访客IP头信息（按照顺序）',
});
const ipExtractRules: FormProps['rules'] = {
  item: [{ required: true, message: t('page.systemconfig.label_configuration_item'), type: 'error' }],
  value: [{ required: false, message: t('page.systemconfig.label_configuration_value'), type: 'error' }],
};

// 弹窗内嵌场景：由父组件传 prop_req_uuid
const isEmbedded = computed(() => !!props.prop_req_uuid);
// 报文列全空 = 这条没有报文行：正常请求默认只记访问行，
// 采样命中或观察名单内的请求才有报文（user_agent/url 是窄行字段，不算报文）
const payloadMissing = computed(() => {
  if (!detailLoaded.value) return false;
  const d = detail_data.value || {};
  return !d.header && !d.cookies && !d.body && !d.post_form && !d.res_header && !d.res_body;
});
const isOwaspRule = computed(() => {
  const rule = detail_data.value.rule || '';
  return rule.startsWith('OWASP:');
});
// OWASP 规则管理已移入系统设置域（system:config），跳转入口仅平台侧可见
const isPlatform = computed(() => usePermissionStore().isPlatform);
const owaspRuleId = computed(() => {
  const rule = detail_data.value.rule || '';
  const m = rule.match(/^OWASP:(\d+)/);
  return m ? m[1] : '';
});
// 防御动作 → 语义色。action 的完整取值来自后端 web_logs.ACTION，共 5 种：
// 放行（通过全部检测正常代理）、通过（日志创建时的初始值，正常完成会被覆写成「放行」，
// 只有个别提前返回的异常路径会残留）、阻止（检测命中被拦截）、禁止（闸门类拒绝）、
// 客户端断开（代理过程中访客主动断开）；记录不存在时还可能为空串。
const verdictTheme = computed(() => {
  const a = detail_data.value.action || '';
  if (a === '放行' || a === '通过') return 'success';
  if (a === '阻止' || a === '禁止') return 'error';
  if (a === '客户端断开') return 'warning';
  return 'default';
});
const verdictTagTheme = computed(() => (verdictTheme.value === 'error' ? 'danger' : verdictTheme.value));
const verdictIconComp = computed(() => {
  if (verdictTheme.value === 'success') return SecuredFilledIcon;
  if (verdictTheme.value === 'error') return ShieldErrorFilledIcon;
  if (verdictTheme.value === 'warning') return ErrorTriangleFilledIcon;
  return InfoCircleFilledIcon;
});
// 响应状态文案：后端 status 如 "200 OK" / 403 等
const statusChip = computed(() => {
  const d = detail_data.value;
  if (d.status) return String(d.status);
  if (d.status_code) return String(d.status_code);
  return '';
});
const statusTheme = computed(() => {
  const code = Number(detail_data.value.status_code) || 0;
  if (code >= 400) return 'danger';
  if (code >= 300) return 'warning';
  if (code > 0) return 'success';
  return 'default';
});
const totalCost = computed(() => {
  const d = detail_data.value;
  return (Number(d.pre_check_cost) || 0) + (Number(d.forward_cost) || 0) + (Number(d.backend_check_cost) || 0);
});
// 关键指标带
const kpis = computed<any[]>(() => {
  const d = detail_data.value;
  const region = [d.country, d.province, d.city].filter(Boolean).join(' ') || '—';
  const len = Number(d.content_length) || 0;
  return [
    {
      key: 'action',
      label: t('page.visit_log.detail.defense_status_step'),
      value: d.action || '—',
      theme: verdictTheme.value,
      valueColor: true,
    },
    {
      key: 'status',
      label: t('page.visit_log.response_code'),
      value: d.status_code ? String(d.status_code) : '—',
      sub: d.status || '',
      theme: statusTheme.value === 'default' ? 'brand' : statusTheme.value,
      valueColor: true,
    },
    {
      key: 'method',
      label: t('page.visit_log.detail.request_method'),
      value: d.method || '—',
      theme: 'brand',
    },
    {
      key: 'size',
      label: t('page.visit_log.detail.request_content_size'),
      value: fmtSize(len),
      title: `${len} bytes`,
      theme: 'brand',
    },
    {
      key: 'cost',
      label: t('page.visit_log.detail.time_cost.total_cost'),
      value: `${totalCost.value} ms`,
      theme: 'brand',
    },
    {
      key: 'region',
      label: t('page.visit_log.detail.request_region'),
      value: region,
      title: region,
      theme: 'brand',
    },
  ];
});
// 耗时构成：条形按占比，总量为 0 时全部收起
const costRows = computed<any[]>(() => {
  const d = detail_data.value;
  const total = totalCost.value;
  const pct = (v: number) => (total > 0 ? Math.max((v / total) * 100, v > 0 ? 4 : 0) : 0);
  const pre = Number(d.pre_check_cost) || 0;
  const fwd = Number(d.forward_cost) || 0;
  const bk = Number(d.backend_check_cost) || 0;
  return [
    {
      key: 'pre',
      label: t('page.visit_log.detail.time_cost.pre_check_cost'),
      value: pre,
      pct: pct(pre),
      theme: 'brand',
    },
    {
      key: 'fwd',
      label: t('page.visit_log.detail.time_cost.forward_cost'),
      value: fwd,
      pct: pct(fwd),
      theme: 'cyan',
    },
    {
      key: 'bk',
      label: t('page.visit_log.detail.time_cost.backend_check_cost'),
      value: bk,
      pct: pct(bk),
      theme: 'purple',
    },
  ];
});
// 防御链路：访问 → 检测 → 防御 → 响应
const chainNodes = computed<any[]>(() => {
  const d = detail_data.value;
  return [
    {
      title: t('page.visit_log.detail.visit_time'),
      value: d.create_time || '—',
      theme: 'brand',
    },
    {
      title: t('page.visit_log.detail.detection_time'),
      value: d.rule ? `${t('page.visit_log.detail.rule_hit')}：${d.rule}` : t('page.visit_log.detail.not_hit'),
      muted: !d.rule,
      theme: d.rule ? 'error' : 'success',
    },
    {
      title: t('page.visit_log.detail.defense_status_step'),
      tag: { text: d.action || '—', theme: verdictTagTheme.value },
      theme: verdictTheme.value,
    },
    {
      title: t('page.visit_log.detail.response_status'),
      value: statusChip.value || '—',
      muted: !statusChip.value,
      theme: statusTheme.value,
    },
  ];
});
const requestFields = computed<any[]>(() => {
  const d = detail_data.value;
  return [
    { key: 'url', label: t('page.visit_log.detail.request_path'), value: d.url || '' },
    { key: 'header', label: t('page.visit_log.detail.request_header'), value: d.header || '' },
    { key: 'user_agent', label: t('page.visit_log.detail.request_user_browser'), value: d.user_agent || '' },
    { key: 'cookies', label: t('page.visit_log.detail.request_cookies'), value: d.cookies || '' },
    { key: 'body', label: t('page.visit_log.detail.request_body'), value: d.body || '' },
    { key: 'post_form', label: t('page.visit_log.detail.request_form'), value: d.post_form || '' },
  ];
});
const responseFields = computed<any[]>(() => {
  const d = detail_data.value;
  return [
    { key: 'res_header', label: t('page.visit_log.detail.response.response_header'), value: d.res_header || '' },
    { key: 'res_body', label: t('page.visit_log.detail.response.response_body'), value: d.res_body || '' },
  ];
});

onMounted(() => {
  // 快捷加入规则：选区被取消（点别处 / 拖拽取消）或页面滚动时，收起浮出的确认按钮
  document.addEventListener('selectionchange', onSelectionChange);
  document.addEventListener('scroll', dismissSel, true);
  const target = props.prop_req_uuid ? `${props.prop_req_uuid}#${props.prop_current_db}` : (route.query.req_uuid as string);
  getDetail(target);
});

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onSelectionChange);
  document.removeEventListener('scroll', dismissSel, true);
});

watch(
  () => route.query.req_uuid,
  (newVal) => {
    if (newVal !== undefined) {
      getDetail(newVal as string);
    }
  },
);

watch(
  () => props.prop_req_uuid,
  (newVal) => {
    if (newVal !== undefined) {
      getDetail(`${newVal}#${props.prop_current_db}`);
    }
  },
);

watch(quickAddRuleChecked, (v) => {
  if (!v) {
    pendingSel.value = null;
  }
});

function goToOwaspRule() {
  router.push({
    path: '/sys/OwaspManage',
    query: { tab: 'rules', rule_id: owaspRuleId.value },
  });
}

function goToOwaspSandbox() {
  const d = detail_data.value;
  sessionStorage.setItem(
    'owasp_sandbox_prefill',
    JSON.stringify({
      method: d.method || 'GET',
      url: d.url || '/',
      headers: d.header || '',
    }),
  );
  router.push({
    path: '/sys/OwaspManage',
    query: { tab: 'sandbox' },
  });
}

function handleIPExtractIssue() {
  ipExtractDialogVisible.value = true;
  get_detail_by_item_api({ item: 'gwaf_proxy_header' })
    .then((res) => {
      if (res.code === 0 && res.data) {
        ipExtractFormData.value = res.data;
      }
    })
    .catch(() => {
      // 失败提示由请求层统一处理，这里不重复打扰
    });
}

const onSubmitIPExtract: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult === true) {
    edit_system_config_api(ipExtractFormData.value)
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          ipExtractDialogVisible.value = false;
        } else {
          MessagePlugin.error(res.msg);
        }
      })
      .catch((err: Error) => {
        MessagePlugin.error(err.message);
      });
  }
};

// 快捷选择IP头信息
function selectIPHeader(headerValue: string) {
  ipExtractFormData.value.value = headerValue;
  MessagePlugin.success(`已选择: ${headerValue}`);
}

// 打开视频教程
function openVideoTutorial() {
  window.open('https://www.bilibili.com/video/BV1pn8Ez2ELQ/', '_blank', 'noopener,noreferrer');
}

function handelToAi() {
  // 日志详情走"安全风险分析"提示词
  bus.emit('sendAi', { q: httpAiMask.value, scene: 'security_log' });
  httpAiMaskVisible.value = false;
}

function beforeSendAi() {
  httpAiMask.value = '';
  httpAiMaskVisible.value = false;
  getHeaderCopyDetail({
    req_uuid: detail_req.req_uuid,
    current_db_name: detail_req.current_db,
    output_format: 'raw',
  })
    .then((res) => {
      if (res.code === 0 && typeof res.data === 'string' && res.data.trim()) {
        httpAiMask.value = res.data;
        httpAiMaskVisible.value = true;
      } else {
        MessagePlugin.error(res.code !== 0 && res.msg ? res.msg : t('page.visit_log.detail.copy_failed'));
      }
    })
    .catch((e: Error) => {
      MessagePlugin.error(e.message || t('page.visit_log.detail.copy_failed'));
    });
}

function loadHttpCopyMask() {
  httpCopyMask.value = '';
  httpCopyMaskVisible.value = false;
  getHeaderCopyDetail({
    req_uuid: detail_req.req_uuid,
    current_db_name: detail_req.current_db,
    output_format: 'curl',
  })
    .then((res) => {
      if (res.code === 0 && typeof res.data === 'string' && res.data.trim()) {
        httpCopyMask.value = res.data;
        httpCopyMaskVisible.value = true;
      } else {
        MessagePlugin.error(res.code !== 0 && res.msg ? res.msg : t('page.visit_log.detail.copy_failed'));
      }
    })
    .catch((e: Error) => {
      MessagePlugin.error(e.message || t('page.visit_log.detail.copy_failed'));
    });
}

function backPage() {
  window.history.go(-1);
}

function getDetail(uuidAndName?: string) {
  if (!uuidAndName) {
    return;
  }
  const arr = String(uuidAndName).split('#');
  const id = arr[0];
  const currentDbName = arr[1];

  detail_req.req_uuid = id;
  detail_req.current_db = currentDbName;
  detailLoaded.value = false;
  detailError.value = '';
  detail_data.value = {};
  pendingSel.value = null;
  expandedMap.value = {
    url: false,
    header: false,
    user_agent: false,
    cookies: false,
    body: false,
    post_form: false,
    res_header: false,
    res_body: false,
  };
  geWebLogDetail({
    req_uuid: id,
    current_db_name: currentDbName,
  })
    .then((res) => {
      if (res.code === 0 && res.data && res.data.req_uuid) {
        detail_data.value = res.data;
      } else {
        detailError.value = res.code !== 0 && res.msg ? res.msg : t('page.visit_log.detail.load_failed');
      }
      detailLoaded.value = true;
    })
    .catch((e: Error) => {
      detailError.value = e.message || t('page.visit_log.detail.load_failed');
      detailLoaded.value = true;
    });
}

function handleAddipblock(ip: string) {
  if (detail_data.value.host_code === '') {
    MessagePlugin.warning(t('page.visit_log.detail.website_not_exist_warning'));
    return;
  }
  const confirmDia = DialogPlugin.confirm({
    header: t('page.visit_log.detail.add_to_deny_list_confirm_header'),
    body: t('page.visit_log.detail.add_to_deny_list_confirm_body'),
    confirmBtn: t('common.confirm'),
    cancelBtn: t('common.cancel'),
    onConfirm: () => {
      wafIPBlockAddApi({
        host_code: detail_data.value.host_code,
        ip,
        remarks: '手工增加',
      })
        .then((res) => {
          if (res.code === 0) {
            MessagePlugin.success(res.msg);
          } else {
            MessagePlugin.warning(res.msg);
          }
        })
        .catch((e: Error) => {
          console.log(e);
        });
      confirmDia.destroy();
    },
    onClose: () => {
      confirmDia.hide();
    },
  });
}

// ===== 报文查看辅助 =====
function fmtSize(n: number) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

function canExpand(f: any) {
  return (f.value || '').length > 300;
}

function displayValue(f: any) {
  const v = f.value || '';
  if (expandedMap.value[f.key] || v.length <= 300) return v;
  return `${v.slice(0, 300)} …`;
}

function toggleField(key: string) {
  expandedMap.value[key] = !expandedMap.value[key];
}

function copyText(text: string) {
  const val = String(text || '');
  if (!val) return;
  const done = () => MessagePlugin.success(t('page.visit_log.detail.copied'));
  const failed = () => MessagePlugin.error(t('page.visit_log.detail.copy_failed'));
  // 管理端可能跑在 http 下，navigator.clipboard 不可用，退回 execCommand
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(val).then(done).catch(() => fallbackCopy(val, done, failed));
  } else {
    fallbackCopy(val, done, failed);
  }
}

function fallbackCopy(text: string, done: () => void, failed: () => void) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(ta);
    if (copied) done();
    else failed();
  } catch (e) {
    failed();
  }
}

// ===== 快捷加入规则：选中文本 → 选区旁浮出「加入规则」按钮 =====
function captureSelection(sourcePoint: string, e: MouseEvent) {
  // 不在可映射白名单里的报文块（如响应报文）不提供入口：选中只当普通复制，
  // 顺带清掉可能残留的按钮（选区已经换到了别的块）
  if (QUICK_RULE_FIELDS.indexOf(sourcePoint) < 0 || !quickAddRuleChecked.value) {
    pendingSel.value = null;
    return;
  }
  const sel = window.getSelection ? window.getSelection() : null;
  const text = sel ? sel.toString() : '';
  if (!text) {
    // 同一块里的空 mouseup（点一下取消选择）也要收起按钮
    pendingSel.value = null;
    return;
  }
  const x = Math.min((e && e.clientX ? e.clientX : 0) + 10, window.innerWidth - 132);
  const y = Math.min((e && e.clientY ? e.clientY : 0) + 16, window.innerHeight - 46);
  pendingSel.value = { text, sourcePoint, x, y };
}

/** 选区被取消（点别处、拖拽取消）时收起浮出按钮 */
function onSelectionChange() {
  const sel = window.getSelection ? window.getSelection() : null;
  const hasText = sel && !sel.isCollapsed && String(sel.toString()).length > 0;
  if (!hasText && pendingSel.value) {
    pendingSel.value = null;
  }
}

function dismissSel() {
  if (pendingSel.value) {
    pendingSel.value = null;
  }
}

/** 点击浮出按钮：带选中文本跳到规则编辑器 */
function applySelRule() {
  if (!pendingSel.value) return;
  const { text, sourcePoint } = pendingSel.value;
  pendingSel.value = null;
  router.push({
    path: '/waf-host/wafruleedit',
    query: {
      type: 'add',
      host_code: detail_data.value.host_code,
      contentstr: text,
      is_manual_rule: 1,
      sourcePoint,
    },
  });
}
</script>

<style scoped>
/* ============================================================
   防护详情页（企业级改版，移植自 Vue2 的 index.less 纯 CSS 版）
   布局：结论横幅 → 关键指标带 → 左（请求/响应报文）右（访问者/链路/耗时）
   颜色全部走 TDesign 变量，跟随主题与暗色模式
   ============================================================ */

.detail-base {
  --vd-mono: 'SFMono-Regular', 'JetBrains Mono', Menlo, Consolas, 'Liberation Mono', monospace;
}

/* 通用卡片 */
.vd-card {
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-medium, 6px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

.vd-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--td-component-stroke);
}

.vd-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.vd-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vd-card-body {
  padding: 10px 14px 14px;
}

/* ==================== 加载态 ==================== */
.vd-loading {
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-medium, 6px);
}

.vd-loading-text {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

/* ==================== 结论横幅 ==================== */
.vd-hero {
  position: relative;
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-medium, 6px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  padding: 14px 16px 12px;
  margin-bottom: 14px;
  overflow: hidden;
}

.vd-hero::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--td-brand-color);
}

.vd-hero--success::before {
  background: var(--td-success-color);
}

.vd-hero--error::before {
  background: var(--td-error-color);
}

.vd-hero--warning::before {
  background: var(--td-warning-color);
}

.vd-hero--default::before {
  background: var(--td-text-color-placeholder);
}

.vd-hero-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.vd-hero-badge {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--td-brand-color);
  background: var(--td-brand-color-light);
}

.vd-hero--success .vd-hero-badge {
  color: var(--td-success-color);
  background: var(--td-success-color-light);
}

.vd-hero--error .vd-hero-badge {
  color: var(--td-error-color);
  background: var(--td-error-color-light);
}

.vd-hero--warning .vd-hero-badge {
  color: var(--td-warning-color);
  background: var(--td-warning-color-light);
}

.vd-hero--default .vd-hero-badge {
  color: var(--td-text-color-secondary);
  background: var(--td-bg-color-secondarycontainer);
}

.vd-hero-main {
  flex: 1;
  min-width: 260px;
}

.vd-hero-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-height: 30px;
}

.vd-verdict-label {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.vd-verdict {
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  color: var(--td-text-color-primary);
}

.vd-hero--success .vd-verdict {
  color: var(--td-success-color);
}

.vd-hero--error .vd-verdict {
  color: var(--td-error-color);
}

.vd-hero--warning .vd-verdict {
  color: var(--td-warning-color);
}

.vd-rule-tag {
  max-width: 460px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vd-hero-sub {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--td-text-color-primary);
}

.vd-method {
  font-family: var(--vd-mono);
  font-size: 12px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 4px;
  color: var(--td-brand-color);
  background: var(--td-brand-color-light);
  flex: none;
}

.vd-host {
  color: var(--td-text-color-primary);
  flex: none;
}

.vd-path {
  font-family: var(--vd-mono);
  font-size: 12px;
  color: var(--td-text-color-secondary);
  max-width: 560px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vd-hero-meta {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.vd-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.vd-meta-item .t-icon {
  font-size: 13px;
  flex: none;
}

.vd-uuid code {
  font-family: var(--vd-mono);
  font-size: 12px;
  color: var(--td-text-color-secondary);
  background: var(--td-bg-color-secondarycontainer);
  padding: 1px 6px;
  border-radius: 3px;
  user-select: all;
}

.vd-copy {
  display: inline-flex;
  align-items: center;
  color: var(--td-text-color-placeholder);
  cursor: pointer;
}

.vd-copy:hover {
  color: var(--td-brand-color);
}

.vd-hero-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}

.vd-hero-note {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed var(--td-component-stroke);
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--td-text-color-placeholder);
}

.vd-hero-note .t-icon {
  margin-top: 3px;
  flex: none;
}

/* ==================== 关键指标带 ==================== */
.vd-kpis {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

@media (max-width: 1500px) {
  .vd-kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .vd-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.vd-kpi {
  position: relative;
  padding: 10px 12px 11px;
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-medium, 6px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

.vd-kpi::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--td-brand-color);
  opacity: 0.9;
}

.vd-kpi--success::before {
  background: var(--td-success-color);
}

.vd-kpi--warning::before {
  background: var(--td-warning-color);
}

.vd-kpi--danger::before {
  background: var(--td-error-color);
}

.vd-kpi--default::before {
  background: var(--td-text-color-placeholder);
}

.vd-kpi-label {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.vd-kpi-value {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--td-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vd-kpi-sub {
  margin-top: 3px;
  font-size: 11px;
  color: var(--td-text-color-placeholder);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vd-kpi--success.is-colored .vd-kpi-value {
  color: var(--td-success-color);
}

.vd-kpi--warning.is-colored .vd-kpi-value {
  color: var(--td-warning-color);
}

.vd-kpi--danger.is-colored .vd-kpi-value {
  color: var(--td-error-color);
}

/* ==================== 双栏主体 ==================== */
.vd-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 14px;
  align-items: start;
}

@media (max-width: 960px) {
  .vd-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.vd-col-main,
.vd-col-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

/* ==================== 报文块 ==================== */
.vd-quick-rule {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
  cursor: default;
}

/* 快捷加入规则：选区旁浮出的确认按钮（fixed 定位，坐标为 mouseup 时的视口坐标） */
.vd-sel-btn {
  position: fixed;
  z-index: 3000;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 15px;
  background: var(--td-brand-color);
  color: #fff;
  font-size: 12px;
  line-height: 30px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

.vd-sel-btn:hover {
  background: var(--td-brand-color-hover);
}

.pl-block + .pl-block {
  margin-top: 12px;
}

.pl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.pl-label {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.pl-ops {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pl-size {
  font-size: 11px;
  color: var(--td-text-color-placeholder);
  font-variant-numeric: tabular-nums;
}

.pl-copy {
  display: inline-flex;
  align-items: center;
  color: var(--td-text-color-placeholder);
  cursor: pointer;
}

.pl-copy:hover {
  color: var(--td-brand-color);
}

.pl-code {
  margin: 0;
  padding: 8px 10px;
  background: var(--td-bg-color-secondarycontainer);
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-default, 3px);
  font-family: var(--vd-mono);
  font-size: 12px;
  line-height: 1.7;
  color: var(--td-text-color-primary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 220px;
  overflow: auto;
}

.pl-code.is-expanded {
  max-height: 520px;
}

.pl-empty {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  padding: 2px 0;
}

.pl-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.pl-none {
  font-size: 13px;
  color: var(--td-text-color-placeholder);
}

/* ==================== 访问者信息 ==================== */
.vd-ip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.vd-ip {
  font-family: var(--vd-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--td-text-color-primary);
  word-break: break-all;
}

.vd-ip--warn {
  color: var(--td-error-color);
}

.vd-ip-sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.vd-link {
  color: var(--td-brand-color);
  cursor: pointer;
}

.vd-link:hover {
  color: var(--td-brand-color-hover);
}

.vd-sub-block {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--td-component-stroke);
}

.vd-sub-label {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-bottom: 6px;
}

.vd-sub-label--warn {
  color: var(--td-warning-color);
}

.vd-sub-value {
  font-size: 13px;
  color: var(--td-text-color-primary);
  word-break: break-all;
}

/* ==================== 防御链路 ==================== */
.vd-chain {
  padding-top: 2px;
}

.vd-node {
  display: flex;
  gap: 10px;
}

.vd-node-rail {
  position: relative;
  flex: none;
  width: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vd-node-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  background: var(--td-brand-color);
}

.vd-node-line {
  flex: 1;
  width: 1px;
  margin-top: 3px;
  background: var(--td-component-stroke);
}

.vd-node--success .vd-node-dot {
  background: var(--td-success-color);
}

.vd-node--error .vd-node-dot {
  background: var(--td-error-color);
}

.vd-node--warning .vd-node-dot {
  background: var(--td-warning-color);
}

.vd-node--default .vd-node-dot {
  background: var(--td-text-color-placeholder);
}

.vd-node-body {
  min-width: 0;
  padding-bottom: 16px;
}

.vd-node:last-child .vd-node-body {
  padding-bottom: 0;
}

.vd-node-title {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.vd-node-value {
  margin-top: 3px;
  font-size: 13px;
  color: var(--td-text-color-primary);
  word-break: break-all;
}

.vd-node-value.is-muted {
  color: var(--td-text-color-placeholder);
}

/* ==================== 耗时构成 ==================== */
.vd-costs {
  padding-top: 12px;
}

.vd-cost + .vd-cost {
  margin-top: 10px;
}

.vd-cost-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.vd-cost-head b {
  color: var(--td-text-color-primary);
  font-variant-numeric: tabular-nums;
}

.vd-cost-track {
  margin-top: 5px;
  height: 6px;
  border-radius: 3px;
  background: var(--td-bg-color-secondarycontainer);
  overflow: hidden;
}

.vd-cost-bar {
  height: 100%;
  border-radius: 3px;
  background: var(--td-brand-color);
  transition: width 0.3s ease;
}

.vd-cost-bar--cyan {
  background: #0594fa;
}

.vd-cost-bar--purple {
  background: #7a4bd4;
}

/* ==================== 弹窗内小提示 ==================== */
.form-item-tips {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
</style>
