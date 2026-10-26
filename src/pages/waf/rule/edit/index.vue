<template>
  <div class="detail-base">
    <t-alert theme="info" :message="t('page.rule.detail.recommend_message')" close>
      <template #operation>
        <span @click="handleJumpAttackLogOperation">{{ t('page.rule.detail.jump_visit_log') }}</span>
        <span @click="handleJumpOnlineUrl">{{ t('page.rule.detail.jump_visit_log') }}</span>
      </template>
    </t-alert>
    <t-form :data="formData" :label-width="180" @submit="onSubmit">
      <!--Base Info Begin-->
      <t-card :title="t('page.rule.detail.base_info')">
        <t-form-item :label="t('page.rule.detail.rule_name')" name="rule_name">
          <t-input v-model="formData.rule_base.rule_name" :placeholder="t('common.placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.rule_domain_code')" name="rule_domain_code">
          <t-select v-model="formData.rule_base.rule_domain_code" clearable filterable :style="{ width: '480px' }">
            <t-option v-for="(item, index) in host_options" :key="index" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.rule_salience')" name="salience">
          <div>
            <t-input v-model="formData.rule_base.salience" :placeholder="t('common.placeholder')" />
            <div class="form-item-tips">
              <div>{{ t('page.rule.detail.rule_salience_tips_1') }}</div>
              <div>{{ t('page.rule.detail.rule_salience_tips_2') }}</div>
              <div>{{ t('page.rule.detail.rule_salience_tips_3') }}</div>
            </div>
          </div>
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.rule_manual')" name="is_manual_rule">
          <t-select v-model="formData.is_manual_rule" :style="{ width: '480px' }" @change="changeManualRule">
            <t-option v-for="(item, index) in ruleManualOptions" :key="index" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.rule_status')" name="rule_status">
          <t-select v-model="formData.rule_status" :style="{ width: '480px' }">
            <t-option v-for="(item, index) in ruleStatusOptions" :key="index" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>
      </t-card>
      <!--Base Info End-->

      <!--UI Rule -->
      <div v-if="formData.is_manual_rule == '0'">
        <!--命中动作 开始-->
        <t-card :title="t('page.rule.detail.rule_action')">
          <t-form-item :label="t('page.rule.detail.rule_action')" name="rule_action">
            <t-select v-model="formData.rule_action" :style="{ width: '480px' }" @change="onRuleActionChange">
              <t-option v-for="(item, index) in ruleActionOptions" :key="index" :value="item.value" :label="item.label">
                {{ item.label }}
              </t-option>
            </t-select>
          </t-form-item>
          <t-form-item v-if="formData.rule_action === 'allow'" :label="t('page.rule.detail.rule_action_skips')" name="rule_action_skips">
            <t-select
              v-model="formData.rule_action_skips"
              :style="{ width: '480px' }"
              multiple
              :min-collapsed-num="4"
              :placeholder="t('page.rule.detail.rule_action_skips_placeholder')"
              @change="onRuleActionSkipsChange"
            >
              <t-option v-for="(item, index) in ruleSkipModuleOptions" :key="index" :value="item.value" :label="item.label">
                {{ item.label }}
              </t-option>
            </t-select>
            <t-tooltip :content="t('page.rule.detail.rule_action_skips_tip')">
              <help-circle-icon style="margin-left: 8px; color: #999" />
            </t-tooltip>
          </t-form-item>
        </t-card>
        <!--命中动作 结束-->
        <!--规则编排 开始-->
        <t-card :title="t('page.rule.detail.write_rule')">
          <t-button theme="primary" @click="ruleDynAdd('cond')">
            {{ t('common.new') }}
          </t-button>
          <t-form-item v-if="formData.rule_condition.relation_detail.length > 1" :label="t('page.rule.detail.relation')" name="relation_symbol">
            <t-select v-model="formData.rule_condition.relation_symbol" clearable :style="{ width: '480px' }" @change="onFormChange">
              <t-option v-for="(item, index) in relationSymbolOptions" :key="index" :value="item.value" :label="item.label">
                {{ item.label }}
              </t-option>
            </t-select>
          </t-form-item>
          <t-card
            v-for="(condition_item, condition_index) in formData.rule_condition.relation_detail"
            :key="condition_index"
            :title="t('page.rule.detail.condition')"
          >
            <t-row :gutter="{ xs: 8, sm: 12, md: 16, lg: 16, xl: 16, xxl: 16 }">
              <t-col :span="5">
                <t-form-item :label="t('page.rule.detail.scope')" name="attr" :label-width="80">
                  <t-select v-model="condition_item.attr" clearable :style="{ width: '200px' }" @change="onAttrChange(condition_item)">
                    <t-option
                      v-for="(item, index) in attrOptions.filter((option) => !option.value.toLowerCase().startsWith('get'))"
                      :key="index"
                      :value="item.value"
                      :label="item.label"
                    >
                      {{ item.label }}
                    </t-option>
                  </t-select>
                </t-form-item>
              </t-col>
              <t-col :span="5">
                <t-form-item :label="t('page.rule.detail.judgment')" name="attr_judge" :label-width="80">
                  <t-select v-model="condition_item.attr_judge" clearable :style="{ width: '200px' }" @change="onAttrJudgeChange(condition_item)">
                    <t-option v-for="(item, index) in attrJudgeOptions" :key="index" :value="item.value" :label="item.label">
                      {{ item.label }}
                    </t-option>
                  </t-select>
                </t-form-item>
              </t-col>
              <t-col :span="5">
                <t-form-item :label="t('page.rule.detail.value')" name="att_val" :label-width="80">
                  <t-input v-model="condition_item.attr_val" :style="{ width: '200px' }" placeholder="请输入内容" @change="onFormChange" />
                </t-form-item>
              </t-col>
              <t-col v-if="(condition_item.attr_judge || '').startsWith('system.')" :span="3">
                <t-form-item :label="t('page.rule.detail.function_judgment_result')" name="att_val2" :label-width="80">
                  <t-select v-model="condition_item.attr_val2" clearable :style="{ width: '160px' }" @change="onFormChange">
                    <t-option value="true" label="true" />
                    <t-option value="false" label="false" />
                  </t-select>
                </t-form-item>
              </t-col>
              <t-col :span="1" style="text-align: right">
                <t-button theme="danger" @click="ruleDynDel('cond', condition_index)">{{ t('common.delete') }}</t-button>
              </t-col>
            </t-row>
          </t-card>
        </t-card>
        <!--规则编排 结束-->

        <!-- 规则脚本内容预览（仅 UI 模式显示） -->
        <t-card :title="t('page.rule.detail.rule_script_content')">
          <pre class="rule-example-code">{{ rulePreviewContent || ruleDetail.rule_content }}</pre>
        </t-card>
      </div>
      <!--UI Rule End-->

      <!--Manual Rule-->
      <div v-if="formData.is_manual_rule == '1'">
        <t-card :title="t('page.rule.detail.write_rule')">
          <t-row>
            <!-- 左侧代码编辑区域 -->
            <t-col flex="auto">
              <!-- AI 生成规则面板 -->
              <!-- AI 生成/GPT 配置走平台统一模型服务（后端仅平台侧可用），租户隐藏 -->
              <div v-if="isPlatform" class="ai-gen-panel">
                <div class="ai-gen-head">
                  <help-circle-icon class="ai-gen-icon" />
                  <span class="ai-gen-title">{{ t('page.rule.detail.ai_gen_title') }}</span>
                  <t-link theme="primary" hover="color" size="small" @click="openAiPrompt">
                    {{ t('page.rule.detail.ai_prompt_entry') }}
                  </t-link>
                  <t-link theme="default" hover="color" size="small" class="ai-gen-setting" @click="openGptConfig">
                    <setting-icon />
                    <span>{{ t('page.gpt.config.entry') }}</span>
                  </t-link>
                </div>
                <div class="ai-gen-body">
                  <!-- 没配密钥先提示，别让用户填完意图才发现生成不了 -->
                  <div v-if="gptChecked && !gptHasToken" class="ai-gen-unset">
                    <span>{{ t('page.rule.detail.gpt_not_configured') }}</span>
                    <t-link theme="primary" hover="color" size="small" @click="openGptConfig">
                      {{ t('page.gpt.unset_action') }}
                    </t-link>
                  </div>
                  <t-textarea v-model="aiGenIntent" :autosize="{ minRows: 2, maxRows: 4 }" :placeholder="t('page.rule.detail.ai_gen_placeholder')" />
                  <div class="ai-gen-ops">
                    <t-button theme="primary" :loading="aiGenLoading" @click="onAiGenRule">
                      {{ t('page.rule.detail.ai_gen_btn') }}
                    </t-button>
                    <span class="ai-gen-hint">{{ t('page.rule.detail.ai_gen_hint') }}</span>
                  </div>
                  <!-- 生成结果 -->
                  <div v-if="aiGenResult" class="ai-gen-result">
                    <div class="ai-gen-result-head">
                      <t-tag v-if="aiGenResult.valid" theme="success" variant="light" size="small">
                        {{ t('page.rule.detail.ai_gen_valid') }}
                      </t-tag>
                      <t-tag v-else theme="warning" variant="light" size="small">
                        {{ t('page.rule.detail.ai_gen_invalid') }}
                      </t-tag>
                      <t-tag v-if="aiGenResult.action" :theme="ruleActionTheme(aiGenResult.action)" variant="light" size="small">
                        {{ ruleActionLabel(aiGenResult.action) }}
                      </t-tag>
                      <span v-if="!aiGenResult.valid && aiGenResult.error" class="ai-gen-err">{{ aiGenResult.error }}</span>
                    </div>
                    <pre class="example-code">{{ aiGenResult.rule_content }}</pre>
                    <div class="ai-gen-result-ops">
                      <t-button size="small" theme="primary" @click="applyAiGenRule">{{ t('page.rule.detail.example_apply') }}</t-button>
                      <t-button size="small" variant="outline" @click="copyExample(aiGenResult.rule_content)">{{ t('page.rule.detail.example_copy') }}</t-button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="rule-example-header">
                <code-icon />
                <span class="rule-example-title">{{ t('page.rule.detail.manual_code_rule_edit') }}</span>
              </div>
              <write-rule :valuecontent="formCodemirrorContent" @edtinput="(v: string) => (formCodemirrorContent = v)" />

              <div class="rule-example-container">
                <!-- 顶部工具条：分类 + 视图切换 -->
                <div class="example-toolbar">
                  <t-radio-group v-model="exampleCategory" variant="default-filled" size="small">
                    <t-radio-button v-for="cat in ruleExampleCategories" :key="cat.value" :value="cat.value">
                      {{ cat.label }}
                    </t-radio-button>
                  </t-radio-group>
                  <t-radio-group v-model="exampleViewMode" variant="primary-filled" size="small" class="example-view-switch">
                    <t-radio-button v-for="mode in ruleExampleViewModes" :key="mode.value" :value="mode.value">
                      {{ mode.label }}
                    </t-radio-button>
                  </t-radio-group>
                </div>

                <div class="example-body">
                  <!-- 卡片模式 -->
                  <div v-if="exampleViewMode === 'card'" class="example-cards">
                    <div v-for="(ex, exIndex) in filteredExamples" :key="exIndex" class="example-card">
                      <div class="example-card-head">
                        <t-tag :theme="ruleActionTheme(ex.action)" variant="light" size="small">{{ ruleActionLabel(ex.action) }}</t-tag>
                        <span class="example-card-title">{{ ex.title }}</span>
                        <div class="example-card-ops">
                          <t-button size="small" variant="text" @click="copyExample(ex.code)">{{ t('page.rule.detail.example_copy') }}</t-button>
                          <t-button v-if="!ex.multi" size="small" variant="text" theme="primary" @click="applyExample(ex)">{{ t('page.rule.detail.example_apply') }}</t-button>
                        </div>
                      </div>
                      <div class="example-card-desc">{{ ex.desc }}</div>
                      <pre class="example-code">{{ ex.code }}</pre>
                    </div>
                  </div>

                  <!-- 表格模式 -->
                  <t-table
                    v-else-if="exampleViewMode === 'table'"
                    :data="filteredExamples"
                    :columns="exampleTableColumns"
                    size="small"
                    row-key="title"
                    stripe
                    hover
                    bordered
                  >
                    <template #actionTag="{ row }">
                      <t-tag :theme="ruleActionTheme(row.action)" variant="light" size="small">{{ ruleActionLabel(row.action) }}</t-tag>
                    </template>
                    <template #ops="{ row }">
                      <t-button size="small" variant="text" @click="copyExample(row.code)">{{ t('page.rule.detail.example_copy') }}</t-button>
                      <t-button v-if="!row.multi" size="small" variant="text" theme="primary" @click="applyExample(row)">{{ t('page.rule.detail.example_apply') }}</t-button>
                    </template>
                  </t-table>

                  <!-- 详解模式 -->
                  <div v-else class="example-explain">
                    <div v-for="(ex, exIndex) in filteredExamples" :key="exIndex" class="explain-item">
                      <div class="explain-scene">
                        <t-tag :theme="ruleActionTheme(ex.action)" variant="light" size="small">{{ ruleActionLabel(ex.action) }}</t-tag>
                        <span class="explain-title">{{ ex.title }}</span>
                      </div>
                      <div class="explain-desc">{{ ex.desc }}</div>
                      <pre class="example-code">{{ ex.code }}</pre>
                      <div v-if="ex.effect" class="explain-effect">
                        <strong>{{ t('page.rule.detail.example_effect') }}：</strong>{{ ex.effect }}
                      </div>
                      <div class="explain-ops">
                        <t-button size="small" variant="outline" @click="copyExample(ex.code)">{{ t('page.rule.detail.example_copy') }}</t-button>
                        <t-button v-if="!ex.multi" size="small" theme="primary" @click="applyExample(ex)">{{ t('page.rule.detail.example_apply') }}</t-button>
                        <span v-if="ex.multi" class="explain-multi-tip">{{ t('page.rule.detail.example_multi_tip') }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </t-col>

            <!-- 右侧系统变量参考区域 -->
            <t-col flex="450px">
              <div class="reference-container">
                <t-tabs default-value="variables" theme="card">
                  <t-tab-panel value="variables" :label="t('page.rule.detail.system_variable')">
                    <t-table :data="attrOptions" :columns="referenceColumns" size="small" :pagination="{ pageSize: 10 }" row-key="value" stripe hover />
                  </t-tab-panel>
                  <t-tab-panel value="judge" :label="t('page.rule.detail.system_judge_symbol')">
                    <t-table :data="attrJudgeOptions" :columns="referenceColumns" size="small" :pagination="{ pageSize: 10 }" row-key="value" stripe hover />
                  </t-tab-panel>
                  <t-tab-panel value="relation" :label="t('page.rule.detail.system_relation_symbol')">
                    <t-table :data="relationSymbolOptions" :columns="referenceColumns" size="small" :pagination="{ pageSize: 10 }" row-key="value" stripe hover />
                  </t-tab-panel>
                </t-tabs>
              </div>
            </t-col>
          </t-row>
        </t-card>
      </div>

      <t-form-item style="margin-left: 100px">
        <t-space size="10px">
          <t-button theme="primary" type="submit">{{ t('common.submit') }}</t-button>
          <t-button theme="warning" type="button" @click="handleTestRule">{{ t('page.rule.detail.test_rule') }}</t-button>
          <t-button theme="primary" type="button" @click="backPage">{{ t('common.return') }}</t-button>
        </t-space>
      </t-form-item>
    </t-form>

    <!-- AI 提示词弹窗 -->
    <t-dialog v-model:visible="aiPromptDialogVisible" :header="t('page.rule.detail.ai_prompt_title')" width="720px" :footer="false">
      <div class="ai-prompt-tip">{{ t('page.rule.detail.ai_prompt_tip') }}</div>
      <t-textarea v-model="aiPromptText" :autosize="{ minRows: 12, maxRows: 20 }" class="ai-prompt-textarea" />
      <div class="ai-prompt-ops">
        <t-button theme="primary" @click="copyAiPrompt">{{ t('page.rule.detail.example_copy') }}</t-button>
        <t-button variant="outline" @click="aiPromptDialogVisible = false">{{ t('common.close') }}</t-button>
      </div>
    </t-dialog>

    <!-- GPT 参数设置弹窗（与 AI 助手共用同一个组件） -->
    <gpt-config-dialog v-model:visible="gptConfigDialogVisible" @saved="checkGptConfig" />

    <!-- 测试规则弹窗 -->
    <t-dialog
      v-model:visible="testDialogVisible"
      :header="t('page.rule.detail.test_rule_title')"
      width="800px"
      :confirm-btn="t('page.rule.detail.test_start')"
      :cancel-btn="t('page.rule.detail.test_cancel')"
      @confirm="onConfirmTest"
      @cancel="onCancelTest"
    >
      <t-form :data="testFormData" :label-width="120">
        <t-form-item :label="t('page.rule.detail.test_src_ip')" name="test_src_ip">
          <t-input v-model="testFormData.test_src_ip" :placeholder="t('page.rule.detail.test_src_ip_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_host')" name="test_host">
          <t-input v-model="testFormData.test_host" :placeholder="t('page.rule.detail.test_host_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_url')" name="test_url">
          <t-input v-model="testFormData.test_url" :placeholder="t('page.rule.detail.test_url_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_method')" name="test_method">
          <t-select v-model="testFormData.test_method" :placeholder="t('page.rule.detail.test_method_placeholder')">
            <t-option value="GET" label="GET" />
            <t-option value="POST" label="POST" />
            <t-option value="PUT" label="PUT" />
            <t-option value="DELETE" label="DELETE" />
            <t-option value="HEAD" label="HEAD" />
            <t-option value="OPTIONS" label="OPTIONS" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_user_agent')" name="test_user_agent">
          <t-input v-model="testFormData.test_user_agent" :placeholder="t('page.rule.detail.test_user_agent_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_referer')" name="test_referer">
          <t-input v-model="testFormData.test_referer" :placeholder="t('page.rule.detail.test_referer_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_header')" name="test_header">
          <t-textarea v-model="testFormData.test_header" :placeholder="t('page.rule.detail.test_header_placeholder')" :autosize="{ minRows: 3, maxRows: 6 }" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_cookies')" name="test_cookies">
          <t-input v-model="testFormData.test_cookies" :placeholder="t('page.rule.detail.test_cookies_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.rule.detail.test_body')" name="test_body">
          <t-textarea v-model="testFormData.test_body" :placeholder="t('page.rule.detail.test_body_placeholder')" :autosize="{ minRows: 3, maxRows: 6 }" />
        </t-form-item>

        <!-- 测试结果显示 -->
        <t-form-item v-if="testResult !== null" :label="t('page.rule.detail.test_result')">
          <t-alert v-if="testResult.is_match" theme="warning">
            <template #message>
              <div>{{ t('page.rule.detail.test_matched') }}</div>
              <div v-if="testResult.effective_action" style="margin-top: 6px">
                <strong>{{ t('page.rule.detail.test_effective_action') }}:</strong>
                <t-tag :theme="ruleActionTheme(testResult.effective_action)" variant="light" style="margin-left: 6px">
                  {{ ruleActionLabel(testResult.effective_action) }}
                </t-tag>
                <span v-if="testResult.effective_skip_modules && testResult.effective_skip_modules.length > 0" style="margin-left: 6px">
                  {{ t('page.rule.detail.rule_action_skips') }}: {{ testResult.effective_skip_modules.join(', ') }}
                </span>
              </div>
              <div v-if="testResult.matched_rule_details && testResult.matched_rule_details.length > 0" style="margin-top: 6px">
                <strong>{{ t('page.rule.detail.test_matched_rules') }}:</strong>
                <ul>
                  <li v-for="(rule, index) in testResult.matched_rule_details" :key="index">
                    {{ rule.rule_description }}
                    <t-tag :theme="ruleActionTheme(rule.action)" variant="light" size="small" style="margin-left: 6px">
                      {{ ruleActionLabel(rule.action) }}
                    </t-tag>
                    <span v-if="rule.skip_modules && rule.skip_modules.length > 0" style="color: #999; margin-left: 6px">
                      ({{ rule.skip_modules.join(', ') }})
                    </span>
                  </li>
                </ul>
              </div>
              <div v-else-if="testResult.matched_rules && testResult.matched_rules.length > 0">
                <strong>{{ t('page.rule.detail.test_matched_rules') }}:</strong>
                <ul>
                  <li v-for="(rule, index) in testResult.matched_rules" :key="index">{{ rule }}</li>
                </ul>
              </div>
              <div v-if="testResult.parsed_country || testResult.parsed_province || testResult.parsed_city">
                <strong>{{ t('page.rule.detail.test_parsed_location') }}:</strong>
                {{ testResult.parsed_country }} / {{ testResult.parsed_province }} / {{ testResult.parsed_city }}
              </div>
            </template>
          </t-alert>
          <t-alert v-else theme="success">
            <template #message>
              <div>{{ t('page.rule.detail.test_not_matched') }}</div>
              <div v-if="testResult.parsed_country || testResult.parsed_province || testResult.parsed_city">
                <strong>{{ t('page.rule.detail.test_parsed_location') }}:</strong>
                {{ testResult.parsed_country }} / {{ testResult.parsed_province }} / {{ testResult.parsed_city }}
              </div>
            </template>
          </t-alert>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps } from 'tdesign-vue-next';
import { CodeIcon, HelpCircleIcon, SettingIcon } from 'tdesign-icons-vue-next';
import { v4 as uuidv4 } from 'uuid';

import { RULE, RULE_RELATION_DETAIL, RULE_DO_ASSIGNMENT, RULE_DO_METHOD, RULE_DO_METHOD_PARM } from '@/service/service-rule';
import { copyObj, getOnlineUrl } from '@/utils/usuallytool';
import WriteRule from '@/components/write-rule/index.vue';
import { allhost } from '@/apis/host';
import {
  wafRuleEditApi,
  wafRuleAddApi,
  wafRuleDetailApi,
  wafRuleFormatApi,
  wafRuleTestApi,
  wafRuleAiGenApi,
  wafRuleAiPromptApi,
} from '@/apis/rules';
import { wafGptConfigGetApi } from '@/apis/gpt';
import GptConfigDialog from '@/components/gpt-config/index.vue';
import { usePermissionStore } from '@/store/modules/permission';

// 平台侧判定（权限探针）：实例级/破坏性按钮仅平台账号可见
const isPlatform = computed(() => usePermissionStore().isPlatform);

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const op_type = ref('add');
const op_rule_no = ref(''); // 规则识别号

const ruleManualOptions = computed(() => [
  { label: t('page.rule.detail.ui_rule_edit'), value: '0' },
  { label: t('page.rule.detail.manual_code_rule_edit'), value: '1' },
]);
const ruleStatusOptions = computed(() => [
  { label: t('page.rule.rule_on'), value: 1 },
  { label: t('page.rule.rule_off'), value: 0 },
]);

// 命中动作：拦截 / 放行 / 仅记录
const ruleActionOptions = computed(() => [
  { label: t('page.rule.detail.rule_action_deny'), value: 'deny' },
  { label: t('page.rule.detail.rule_action_allow'), value: 'allow' },
  { label: t('page.rule.detail.rule_action_log'), value: 'log' },
]);

// 放行时可跳过的检测模块（与后端 utils.RuleSkipModules 保持一致）
const ruleSkipModuleOptions = computed(() => [
  { label: t('page.rule.detail.skip_module_all'), value: 'ALL' },
  { label: t('page.rule.detail.skip_module_bot'), value: 'BOT' },
  { label: t('page.rule.detail.skip_module_sqli'), value: 'SQLI' },
  { label: t('page.rule.detail.skip_module_xss'), value: 'XSS' },
  { label: t('page.rule.detail.skip_module_scan'), value: 'SCAN' },
  { label: t('page.rule.detail.skip_module_rce'), value: 'RCE' },
  { label: t('page.rule.detail.skip_module_dir'), value: 'DIR' },
  { label: t('page.rule.detail.skip_module_cc'), value: 'CC' },
  { label: t('page.rule.detail.skip_module_ai'), value: 'AI' },
  { label: t('page.rule.detail.skip_module_sensitive'), value: 'SENSITIVE' },
  { label: t('page.rule.detail.skip_module_owasp'), value: 'OWASP' },
  { label: t('page.rule.detail.skip_module_antileech'), value: 'ANTILEECH' },
  { label: t('page.rule.detail.skip_module_csrf'), value: 'CSRF' },
  { label: t('page.rule.detail.skip_module_upload'), value: 'UPLOAD' },
  { label: t('page.rule.detail.skip_module_captcha'), value: 'CAPTCHA' },
]);

const attrOptions = computed(() => [
  { label: t('page.rule.detail.inner_option_host'), value: 'HOST' },
  { label: t('page.rule.detail.inner_option_url'), value: 'URL' },
  { label: t('page.rule.detail.inner_option_referrer'), value: 'REFERER' },
  { label: t('page.rule.detail.inner_option_user_agent'), value: 'USER_AGENT' },
  { label: t('page.rule.detail.inner_option_method'), value: 'METHOD' },
  { label: t('page.rule.detail.inner_option_cookies'), value: 'COOKIES' },
  { label: t('page.rule.detail.inner_option_body'), value: 'BODY' },
  { label: t('page.rule.detail.inner_option_port'), value: 'PORT' },
  { label: t('page.rule.detail.inner_option_src_ip'), value: 'SRC_IP' },
  { label: t('page.rule.detail.inner_option_country'), value: 'COUNTRY' },
  { label: t('page.rule.detail.inner_option_province'), value: 'PROVINCE' },
  { label: t('page.rule.detail.inner_option_city'), value: 'CITY' },
  { label: t('page.rule.detail.inner_option_getheadervalue'), value: 'GetHeaderValue("HeaderKeyName")' },
  { label: t('page.rule.detail.inner_option_getipfailurecount'), value: 'GetIPFailureCount(5)' },
  { label: t('page.rule.detail.inner_option_issafebot'), value: 'IsSafeBot()' },
]);

const attrJudgeOptions = computed(() => [
  { label: t('page.rule.detail.judge_equal'), value: '==' },
  { label: t('page.rule.detail.judge_not_equal'), value: '!=' },
  { label: t('page.rule.detail.judge_greater_than'), value: '>' },
  { label: t('page.rule.detail.judge_less_than'), value: '<' },
  { label: t('page.rule.detail.judge_greater_than_equal'), value: '>=' },
  { label: t('page.rule.detail.judge_less_than_equal'), value: '<=' },
  { label: t('page.rule.detail.judge_contain'), value: 'system.Contains' },
  { label: t('page.rule.detail.judge_has_prefix'), value: 'system.HasPrefix' },
  { label: t('page.rule.detail.judge_has_suffix'), value: 'system.HasSuffix' },
]);

const relationSymbolOptions = computed(() => [
  { label: t('page.rule.detail.judge_logic_and'), value: '&&' },
  { label: t('page.rule.detail.judge_logic_or'), value: '||' },
]);

const referenceColumns = computed(() => [
  { colKey: 'label', title: t('page.rule.detail.variable_name') },
  { colKey: 'value', title: t('page.rule.detail.variable_key') },
]);

// 示例浏览器：分类 / 视图 / 表格列
const exampleCategory = ref('action');
const exampleViewMode = ref('card');
const ruleExampleCategories = computed(() => [
  { value: 'action', label: t('page.rule.detail.example_cat_action') },
  { value: 'scenario', label: t('page.rule.detail.example_cat_scenario') },
  { value: 'combo', label: t('page.rule.detail.example_cat_combo') },
  { value: 'function', label: t('page.rule.detail.example_cat_function') },
]);
const ruleExampleViewModes = computed(() => [
  { value: 'card', label: t('page.rule.detail.example_view_card') },
  { value: 'table', label: t('page.rule.detail.example_view_table') },
  { value: 'explain', label: t('page.rule.detail.example_view_explain') },
]);
const exampleTableColumns = computed(() => [
  { colKey: 'title', title: t('page.rule.detail.example_col_scene'), width: 200 },
  { colKey: 'cond', title: t('page.rule.detail.example_col_cond'), ellipsis: true },
  { colKey: 'actionTag', title: t('page.rule.detail.example_col_action'), width: 90 },
  { colKey: 'ops', title: t('page.rule.detail.example_col_ops'), width: 130 },
]);

const formData = ref<Record<string, any>>({ ...copyObj(RULE) });
const formCodemirrorContent = ref(''); // 代码编辑器内容
const host_options = ref<{ value: string; label: string }[]>([]);
const ruleuuid = ref(uuidv4());
const fromLogContentStr = ref(''); // 来源日志的字符串
const fromSourcePoint = ref(''); // 来源的字段
const ruleDetail = ref<Record<string, any>>({});
const rulePreviewContent = ref(''); // 规则预览内容

// 测试规则相关
const testDialogVisible = ref(false);
const testFormData = reactive({
  test_src_ip: '127.0.0.1',
  test_host: 'example.com:80',
  test_url: '/api/test',
  test_method: 'GET',
  test_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  test_referer: '',
  test_header: '',
  test_cookies: '',
  test_body: '',
});
const testResult = ref<Record<string, any> | null>(null);

// AI 提示词弹窗
const aiPromptDialogVisible = ref(false);
const aiPromptText = ref('');

// GPT 参数设置弹窗
const gptConfigDialogVisible = ref(false);
const gptChecked = ref(false); // 是否已检测过 AI 配置
const gptHasToken = ref(false); // AI 密钥是否已配置

// AI 生成规则
const aiGenIntent = ref('');
const aiGenLoading = ref(false);
const aiGenResult = ref<Record<string, any> | null>(null);

// 构造示例数据（四类：命中动作/实战场景/组合条件/函数大全）
function buildRuleExamples() {
  const mk = (o: Record<string, any>) => ({
    cat: o.cat,
    action: o.action || 'deny',
    title: o.title,
    desc: o.desc || '',
    cond: o.cond || '',
    effect: o.effect || '',
    multi: o.multi || false,
    code:
      o.code ||
      `rule Rexample "${o.title}" salience ${o.salience || 10} {\n    when\n        ${o.cond}\n    then\n        ${o.then || 'RF.Deny();'}\n}`,
  });
  return [
    // ===== 命中动作 =====
    mk({ cat: 'action', action: 'deny', title: '拦截（默认动作，可不写）', desc: '命中规则即阻止请求并返回拦截页。不写任何动作时默认就是拦截。', cond: 'MF.URL.Contains("/wp-admin") == true', then: 'RF.Deny();', effect: '命中的请求被拦截并记入攻击日志' }),
    mk({ cat: 'action', action: 'ban', title: '封禁（拦截并临时封禁IP）', desc: '命中拦截当前请求，并将客户端 IP 在当前站点临时封禁指定分钟数（正整数）。已有封禁不续期，封禁在「网站防护 → IP封禁」管理。', cond: 'MF.URL.Contains("/wp-admin") == true', then: 'RF.Ban(10);', effect: '该 IP 在此站点 10 分钟内无法再访问' }),
    mk({ cat: 'action', action: 'allow', title: '放行（后续检测照常）', desc: '命中后不被自定义规则拦截，但 SQLI/XSS/CC 等后续检测仍会执行。', cond: 'RF.IPInCIDR(MF.SRC_IP, "192.168.0.0/16") == true && MF.URL.HasPrefix("/admin") == true', then: 'RF.Allow();', salience: 100, effect: '内网访问后台不被规则拦，但仍受其他防护保护' }),
    mk({ cat: 'action', action: 'allow', title: '放行并跳过指定检测（CC/AI）', desc: '放行的同时跳过 CC、AI 检测。需在系统配置把"规则编排模式"设为"规则优先"才能跳过 CC 等前置检测。', cond: 'RF.IPEquals(MF.SRC_IP, "10.0.0.5") == true', then: 'RF.Allow("CC", "AI");', salience: 100, effect: '监控探针不触发限流和AI检测' }),
    mk({ cat: 'action', action: 'allow', title: '完全放行（跳过后续所有检测）', desc: '白名单式直通后端，跳过后面全部检测环节。', cond: 'RF.IPInRanges(MF.SRC_IP, "203.0.113.10-203.0.113.20") == true', then: 'RF.AllowAll();', salience: 200, effect: '可信来源直达后端' }),
    mk({ cat: 'action', action: 'log', title: '仅记录（灰度观察）', desc: '命中只记日志不拦截，用于新规则上线前观察是否会误伤。', cond: 'MF.USER_AGENT.Contains("python-requests") == true', then: 'RF.Log();', effect: '命中写入日志但请求正常放行，确认无误后再改为拦截' }),

    // ===== 实战场景 =====
    mk({ cat: 'scenario', action: 'deny', title: '拦截海外访问', desc: '只允许中国大陆访客，其余国家/地区一律拦截。', cond: 'MF.COUNTRY != "中国"', then: 'RF.Deny();', effect: '非中国大陆来源被拦截' }),
    mk({ cat: 'scenario', action: 'deny', title: '拦截扫描器/攻击工具', desc: '通过 User-Agent 识别常见扫描器并拦截。', cond: 'RF.ContainsAnyIgnoreCase(MF.USER_AGENT, "sqlmap", "nikto", "nmap", "masscan", "acunetix") == true', then: 'RF.Deny();', effect: '常见扫描工具被挡在门外' }),
    mk({ cat: 'scenario', action: 'deny', title: '登录接口暴力破解防护', desc: '5分钟内登录失败超过10次的IP，访问登录接口时拦截。', cond: 'MF.URL.HasPrefix("/login") == true && MF.GetIPFailureCount(5) > 10', then: 'RF.Deny();', effect: '高频失败的IP被封，防撞库/爆破' }),
    mk({ cat: 'scenario', action: 'deny', title: '拦截危险文件访问', desc: '阻止访问 php/asp/jsp 等动态脚本文件（适合纯静态站）。', cond: 'RF.EndsWithAny(MF.URL, ".php", ".asp", ".jsp", ".aspx") == true', then: 'RF.Deny();', effect: '脚本文件访问被拒' }),
    mk({ cat: 'scenario', action: 'deny', title: '拦截WordPress后台探测', desc: '挡掉针对 WordPress 常见路径的探测。', cond: 'RF.ContainsAny(MF.URL, "/wp-admin", "/wp-login.php", "/xmlrpc.php") == true', then: 'RF.Deny();', effect: 'WordPress 常见攻击面被保护' }),
    mk({ cat: 'scenario', action: 'allow', title: '放行健康检查探针', desc: '放行监控探针对健康检查接口的访问，并跳过CC限流。', cond: 'RF.IPEquals(MF.SRC_IP, "10.0.0.5") == true && MF.URL.HasPrefix("/health") == true', then: 'RF.Allow("CC");', salience: 100, effect: '探针不被限流误封' }),
    mk({ cat: 'scenario', action: 'log', title: '灰度观察可疑UA', desc: '先用仅记录观察一段时间，确认不会误伤真实用户后再改为拦截。', cond: 'RF.ContainsAnyIgnoreCase(MF.USER_AGENT, "curl", "wget", "python") == true', then: 'RF.Log();', effect: '命中只记录，方便评估规则准确度' }),

    // ===== 组合条件 =====
    mk({ cat: 'combo', action: 'deny', title: '多条件 AND（&&）', desc: '同时满足多个条件才命中：海外访客 且 访问登录接口。', cond: 'MF.COUNTRY != "中国" && MF.URL.HasPrefix("/login") == true', then: 'RF.Deny();', effect: '仅海外访问登录接口时才拦截' }),
    mk({ cat: 'combo', action: 'deny', title: '多条件 OR（||）', desc: '满足任意一个条件即命中：多个内网段任一。', cond: 'RF.IPInCIDR(MF.SRC_IP, "10.0.0.0/8") == true || RF.IPInCIDR(MF.SRC_IP, "192.168.0.0/16") == true', then: 'RF.Deny();', effect: '任一内网段来源都会命中' }),
    mk({ cat: 'combo', action: 'deny', title: '复合条件（非安全Bot + 高频失败）', desc: '不是搜索引擎等安全Bot，且短时间大量失败，判定为恶意。', cond: 'RF.Not(MF.IsSafeBot()) == true && MF.GetIPFailureCount(1) > 30', then: 'RF.Deny();', effect: '排除正规爬虫后拦截高频失败来源' }),
    mk({ cat: 'combo', action: 'allow', title: 'salience 优先级（放行优先于拦截）', desc: '两条规则配合：办公室IP用高 salience 放行，海外访问用低 salience 拦截。命中多条时 salience 高者生效。需分两条规则分别创建。', multi: true, effect: '办公室IP即使来自海外也放行，其余海外访问被拦', code: `rule Roffice "办公室出口IP放行" salience 100 {\n    when\n        RF.IPInRanges(MF.SRC_IP, "203.0.113.10-203.0.113.20") == true\n    then\n        RF.Allow();\n}\n\nrule Roverseas "海外访问拦截" salience 10 {\n    when\n        MF.COUNTRY != "中国"\n    then\n        RF.Deny();\n}` }),

    // ===== 函数大全 =====
    mk({ cat: 'function', action: 'deny', title: 'IPInRange — IP区间判断', desc: '判断IP是否落在起止区间内。', cond: 'RF.IPInRange(MF.SRC_IP, "172.16.0.0", "172.20.255.254") == true', then: 'RF.Deny();' }),
    mk({ cat: 'function', action: 'deny', title: 'IPInRanges — 多区间/CIDR（类似SQL IN）', desc: '一次判断多个区间或CIDR，任一命中即真。', cond: 'RF.IPInRanges(MF.SRC_IP, "172.16.0.0-172.20.255.254", "10.0.0.0/8") == true', then: 'RF.Deny();' }),
    mk({ cat: 'function', action: 'deny', title: 'IPInCIDR — CIDR网段判断', desc: '判断IP是否在CIDR网段内。', cond: 'RF.IPInCIDR(MF.SRC_IP, "192.168.1.0/24") == true', then: 'RF.Deny();' }),
    mk({ cat: 'function', action: 'deny', title: 'IPEquals — IP精确相等', desc: '标准化比较两个IP是否相等（支持IPv4/IPv6）。', cond: 'RF.IPEquals(MF.SRC_IP, "1.2.3.4") == true', then: 'RF.Deny();' }),
    mk({ cat: 'function', action: 'deny', title: 'In / InIgnoreCase — 值在列表中', desc: '判断值是否等于列表中任意一个（IgnoreCase 忽略大小写）。', cond: 'RF.In(MF.METHOD, "PUT", "DELETE", "TRACE") == true', then: 'RF.Deny();' }),
    mk({ cat: 'function', action: 'deny', title: 'ContainsAny — 包含任意子串', desc: '字符串是否包含列表中任意一个子串。', cond: 'RF.ContainsAny(MF.URL, "../", "%2e%2e", "..;/") == true', then: 'RF.Deny();' }),
    mk({ cat: 'function', action: 'deny', title: 'ContainsAnyIgnoreCase — 包含任意（忽略大小写）', desc: '忽略大小写地判断是否包含任意子串。', cond: 'RF.ContainsAnyIgnoreCase(MF.USER_AGENT, "bot", "spider", "crawler") == true', then: 'RF.Deny();' }),
    mk({ cat: 'function', action: 'deny', title: 'ContainsAll — 同时包含全部', desc: '字符串是否同时包含列表中全部子串。', cond: 'RF.ContainsAll(MF.URL, "/admin", ".php") == true', then: 'RF.Deny();' }),
    mk({ cat: 'function', action: 'deny', title: 'StartsWithAny — 以任意前缀开头', desc: '字符串是否以列表中任意一个前缀开头。', cond: 'RF.StartsWithAny(MF.URL, "/admin", "/manage", "/api/internal") == true', then: 'RF.Deny();' }),
    mk({ cat: 'function', action: 'deny', title: 'EndsWithAny — 以任意后缀结尾', desc: '字符串是否以列表中任意一个后缀结尾。', cond: 'RF.EndsWithAny(MF.URL, ".php", ".asp", ".jsp") == true', then: 'RF.Deny();' }),
    mk({ cat: 'function', action: 'deny', title: 'IntInRange / IntIn — 数值判断', desc: 'IntInRange 判断整数是否在区间内；IntIn 判断是否等于列表中任意一个。', cond: 'RF.IntInRange(MF.PORT, 8000, 9000) == true', then: 'RF.Deny();' }),
    mk({ cat: 'function', action: 'deny', title: 'Not / IsEmpty / IsNotEmpty — 逻辑辅助', desc: 'Not 取反；IsEmpty / IsNotEmpty 判断字符串是否为空。', cond: 'RF.IsEmpty(MF.USER_AGENT) == true', then: 'RF.Deny();', effect: '例如拦截没有 User-Agent 的请求' }),
    mk({ cat: 'function', action: 'deny', title: 'LengthBetween — 长度区间', desc: '判断字符串长度是否在指定范围内。', cond: 'RF.LengthBetween(MF.URL, 512, 99999) == true', then: 'RF.Deny();', effect: '例如拦截超长URL' }),
    mk({ cat: 'function', action: 'deny', title: 'GetHeaderValue — 取请求头', desc: '取指定请求头的值再做判断。', cond: 'MF.GetHeaderValue("X-Forwarded-For").Contains("127.0.0.1") == true', then: 'RF.Deny();' }),
    mk({ cat: 'function', action: 'deny', title: 'GetIPFailureCount — 近N分钟失败次数', desc: '取该IP最近N分钟内的失败次数。', cond: 'MF.GetIPFailureCount(5) > 10', then: 'RF.Deny();' }),
    mk({ cat: 'function', action: 'allow', title: 'IsSafeBot — 是否安全爬虫', desc: '识别搜索引擎等正规爬虫，可放行避免误伤SEO。', cond: 'MF.IsSafeBot() == true', then: 'RF.Allow();', salience: 100, effect: '放行 Google/Bing 等正规爬虫' }),
  ];
}

const ruleExamples = ref(buildRuleExamples());
const filteredExamples = computed(() => ruleExamples.value.filter((e) => e.cat === exampleCategory.value));

watch(
  () => route.query.type,
  (newVal) => {
    if (newVal != undefined) op_type.value = String(newVal);
  },
);

watch(
  () => route.query.code,
  (newVal) => {
    if (newVal != undefined) {
      op_rule_no.value = String(newVal);
      getDetail(op_rule_no.value);
    }
  },
);

function resetFormData() {
  ruleuuid.value = uuidv4();
  formData.value = { ...copyObj(RULE) };
  formCodemirrorContent.value = '';
  fromLogContentStr.value = '';
  fromSourcePoint.value = '';
  op_rule_no.value = '';
}

function backPage() {
  history.go(-1);
}

function loadHostList() {
  allhost()
    .then((res) => {
      if (res.code === 0) {
        host_options.value = res.data;
      }
    })
    .catch((e: Error) => console.log(e));
}

function getDetail(id: string) {
  wafRuleDetailApi({ code: id })
    .then((res) => {
      if (res.code === 0) {
        formData.value = JSON.parse(res.data.rule_content_json);
        formData.value.rule_status = res.data.rule_status;
        // 老规则没有动作字段，补默认值（拦截），保证界面正常显示且行为不变
        if (!formData.value.rule_action) formData.value.rule_action = 'deny';
        if (!formData.value.rule_action_skips) formData.value.rule_action_skips = [];
        ruleDetail.value = res.data;
        formCodemirrorContent.value = formData.value.rule_content || res.data.rule_content || '';
      }
    })
    .catch((e: Error) => console.log(e));
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (firstError) {
    MessagePlugin.warning(firstError);
    return;
  }
  formData.value.rule_base.salience = parseInt(formData.value.rule_base.salience);
  formData.value.rule_content = formCodemirrorContent.value;
  formData.value.rule_content = formData.value.rule_content.replace(/salience\s+\d+/g, `salience ${formData.value.rule_base.salience}`);

  if (op_type.value === 'add') {
    const postdata = {
      rule_json: JSON.stringify(formData.value),
      is_manual_rule: parseInt(formData.value.is_manual_rule),
      rule_content: formCodemirrorContent.value,
      rule_code: ruleuuid.value,
      rule_status: formData.value.rule_status,
    };
    wafRuleAddApi(postdata)
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          resetFormData();
          router.push({ path: '/waf-host/wafrule' });
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => console.log(e));
  } else {
    const postdata = {
      code: op_rule_no.value,
      rule_json: JSON.stringify(formData.value),
      is_manual_rule: parseInt(formData.value.is_manual_rule),
      rule_content: formCodemirrorContent.value,
      rule_status: formData.value.rule_status,
    };
    wafRuleEditApi(postdata)
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          resetFormData();
          router.push({ path: '/waf-host/wafrule' });
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => console.log(e));
  }
};

function ruleDynAdd(add_type: string, parent_index?: number) {
  switch (add_type) {
    case 'cond':
      formData.value.rule_condition.relation_detail.push(copyObj(RULE_RELATION_DETAIL));
      break;
    case 'assignment':
      formData.value.rule_do_assignment.push(copyObj(RULE_DO_ASSIGNMENT));
      break;
    case 'method':
      formData.value.rule_do_method.push(copyObj(RULE_DO_METHOD));
      break;
    case 'parms':
      if (parent_index !== undefined) {
        formData.value.rule_do_method[parent_index].parms.push(copyObj(RULE_DO_METHOD_PARM));
      }
      break;
    default:
      break;
  }
}

function ruleDynDel(del_type: string, index: number, parent_index?: number) {
  switch (del_type) {
    case 'cond':
      formData.value.rule_condition.relation_detail.splice(index, 1);
      break;
    case 'assignment':
      formData.value.rule_do_assignment.splice(index, 1);
      break;
    case 'method':
      formData.value.rule_do_method.splice(index, 1);
      break;
    case 'parms':
      if (parent_index !== undefined) {
        formData.value.rule_do_method[parent_index].parms.splice(index, 1);
      }
      break;
    default:
      break;
  }
}

// 切换 UI 编排/手工代码模式
function changeManualRule(e: any) {
  if (e == '1') {
    setRuleContentByMode();
  } else {
    onFormChange();
  }
}

// 把字符串转义成 GRL 双引号字面量内容，剔除换行/控制字符（与后端 model.EscapeGrlString 一致）
function escapeGrlString(s: any): string {
  if (s == null) return '';
  let out = '';
  for (const ch of String(s)) {
    const code = ch.charCodeAt(0);
    if (ch === '\\') out += '\\\\';
    else if (ch === '"') out += '\\"';
    else if (ch === '\r' || ch === '\n' || ch === '\t') {
      /* 丢弃 */
    } else if (code < 0x20 || code === 0x7f) {
      /* 丢弃控制字符 */
    } else out += ch;
  }
  return out;
}

// 根据界面选择生成 then 块里的动作语句
function genRuleActionStmt(): string {
  const action = formData.value.rule_action || 'deny';
  if (action === 'log') return 'RF.Log();';
  if (action === 'allow') {
    const skips = (formData.value.rule_action_skips || []).map((m: any) => String(m).toUpperCase());
    if (skips.indexOf('ALL') >= 0) return 'RF.AllowAll();';
    if (skips.length === 0) return 'RF.Allow();';
    return `RF.Allow(${skips.map((m: string) => `"${m}"`).join(', ')});`;
  }
  return 'RF.Deny();';
}

function setRuleContentByMode() {
  const rulename = ruleuuid.value.replace(/-/g, '');
  const ruleremark = formData.value.rule_base.rule_name;
  const rule_salience = parseInt(formData.value.rule_base.salience);
  let bean = 'USER_AGENT';
  switch (fromSourcePoint.value) {
    case 'url':
      bean = 'URL';
      break;
    case 'header':
      bean = 'HEADER';
      break;
    case 'user_agent':
      bean = 'USER_AGENT';
      break;
    case 'cookies':
      bean = 'COOKIES';
      break;
    case 'body':
      bean = 'BODY';
      break;
    // 攻击详情页的「请求 Form」块：日志里单独存 POST_FORM，规则引擎的事实对象同名可引用
    case 'post_form':
      bean = 'POST_FORM';
      break;
  }
  // fromLogContentStr 来自攻击日志，是攻击者可控的原文，拼进规则前必须转义（真正的防线在后端，这里是第一道）
  const safeContent = escapeGrlString(fromLogContentStr.value);
  const safeRemark = escapeGrlString(ruleremark);
  const rule_condition = `MF.${bean}.Contains("${safeContent}")==true`;
  const rule_action = genRuleActionStmt();
  const str = `rule R${rulename} "${safeRemark}" salience ${rule_salience} {
            when
                ${rule_condition}
            then
                ${rule_action}
        } `;
  nextTick(() => {
    formCodemirrorContent.value = str;
  });
}

// 动作变更后刷新预览
function onRuleActionChange() {
  if (formData.value.rule_action !== 'allow') {
    formData.value.rule_action_skips = [];
  }
  onFormChange();
}

// 跳过模块变更：选了"全部"就清掉其他选项
function onRuleActionSkipsChange(val: any) {
  if (Array.isArray(val) && val.length > 1 && val.indexOf('ALL') >= 0) {
    formData.value.rule_action_skips = ['ALL'];
  }
  onFormChange();
}

function handleJumpOnlineUrl() {
  window.open(`${getOnlineUrl()}/guide/Rule.html#_1-脚本编辑`, '_blank', 'noopener,noreferrer');
}

// 跳转到攻击日志（用于从日志创建规则）
function handleJumpAttackLogOperation() {
  router.push({ path: '/waf/wafattacklog', query: { sourcePage: 'AddRule' } });
}

function onAttrChange(item: Record<string, any>) {
  if ((item.attr || '').toUpperCase() === 'PORT') {
    item.attr_type = 'int';
  } else {
    item.attr_type = 'string';
  }
  onFormChange();
}

function onFormChange() {
  fetchRulePreview();
}

function buildPreviewPayload() {
  const ruleJsonObj = {
    is_manual_rule: formData.value.is_manual_rule,
    rule_content: formData.value.rule_content,
    rule_action: formData.value.rule_action || 'deny',
    rule_action_skips: formData.value.rule_action_skips || [],
    rule_base: formData.value.rule_base,
    rule_condition: formData.value.rule_condition,
    rule_do_assignment: formData.value.rule_do_assignment,
    rule_do_method: formData.value.rule_do_method,
  };
  let ruleCode: string;
  if (ruleDetail.value && ruleDetail.value.rule_code) {
    ruleCode = ruleDetail.value.rule_code;
  } else {
    ruleCode = ruleuuid.value.replace(/-/g, '');
  }
  return {
    rule_code: ruleCode,
    rule_json: JSON.stringify(ruleJsonObj),
    is_manual_rule: Number(formData.value.is_manual_rule),
    rule_content: formData.value.rule_content || '',
  };
}

async function fetchRulePreview() {
  try {
    const payload = buildPreviewPayload();
    const res = await wafRuleFormatApi(payload);
    if (res.code === 0) {
      rulePreviewContent.value = res.data && res.data.rule_content ? res.data.rule_content : '';
    } else {
      MessagePlugin.warning(res.msg || '预览格式化失败');
    }
  } catch (e) {
    console.log(e);
    MessagePlugin.error('预览请求异常');
  }
}

function onAttrJudgeChange(item: Record<string, any>) {
  const isFunc = (item.attr_judge || '').startsWith('system.');
  if (!isFunc) {
    item.attr_val2 = '';
  } else if (item.attr_val2 !== 'true' && item.attr_val2 !== 'false') {
    item.attr_val2 = 'true';
  }
  onFormChange();
}

// 动作标签配色：拦截红/放行绿/仅记录蓝
function ruleActionTheme(action: string) {
  switch (action) {
    case 'allow':
      return 'success';
    case 'log':
      return 'primary';
    case 'ban':
      return 'warning';
    default:
      return 'danger';
  }
}
function ruleActionLabel(action: string) {
  switch (action) {
    case 'allow':
      return t('page.rule.detail.rule_action_allow');
    case 'log':
      return t('page.rule.detail.rule_action_log');
    case 'ban':
      return t('page.rule.detail.rule_action_ban');
    default:
      return t('page.rule.detail.rule_action_deny');
  }
}

// 打开 AI 提示词弹窗（提示词唯一来源在后端，按当前界面语言取用）
async function openAiPrompt() {
  aiPromptDialogVisible.value = true;
  try {
    const res = await wafRuleAiPromptApi({ lang: locale.value });
    if (res.code === 0 && res.data) {
      aiPromptText.value = res.data;
    } else {
      MessagePlugin.warning(res.msg || t('page.rule.detail.ai_gen_fail'));
    }
  } catch (e) {
    console.log(e);
    MessagePlugin.error(t('page.rule.detail.ai_gen_fail'));
  }
}
function copyAiPrompt() {
  copyExample(aiPromptText.value);
}

// 打开 GPT 参数设置弹窗（表单/预设都在共用组件里）
function openGptConfig() {
  gptConfigDialogVisible.value = true;
}

// 检测 AI 是否已配置密钥（后端只回 has_token，不下发明文）
async function checkGptConfig() {
  try {
    const res = await wafGptConfigGetApi();
    gptHasToken.value = !!(res && res.code === 0 && res.data && res.data.has_token);
  } catch (e) {
    console.log(e);
    gptHasToken.value = false;
  } finally {
    gptChecked.value = true;
  }
  return gptHasToken.value;
}

// 调用后台 AI 生成规则（后端已做校验/修复闭环）
async function onAiGenRule() {
  const intent = (aiGenIntent.value || '').trim();
  if (!intent) {
    MessagePlugin.warning(t('page.rule.detail.ai_gen_empty'));
    return;
  }
  // 没配密钥直接引导去配置，不用等后端报错
  if (!gptHasToken.value) {
    const configured = await checkGptConfig();
    if (!configured) {
      MessagePlugin.warning(t('page.rule.detail.gpt_not_configured'));
      gptConfigDialogVisible.value = true;
      return;
    }
  }
  aiGenLoading.value = true;
  aiGenResult.value = null;
  try {
    const res = await wafRuleAiGenApi({
      intent,
      lang: locale.value,
      host_code: formData.value.rule_base.rule_domain_code || '',
    });
    if (res.code === 0 && res.data) {
      aiGenResult.value = res.data;
    } else {
      MessagePlugin.warning(res.msg || t('page.rule.detail.ai_gen_fail'));
    }
  } catch (e) {
    console.log(e);
    MessagePlugin.error(t('page.rule.detail.ai_gen_fail'));
  } finally {
    aiGenLoading.value = false;
  }
}

// 把 AI 生成的规则应用到编辑器（复用示例应用逻辑）
function applyAiGenRule() {
  if (!aiGenResult.value || !aiGenResult.value.rule_content) return;
  applyExample({ code: aiGenResult.value.rule_content, multi: false });
}

// 复制示例代码到剪贴板
function copyExample(code: string) {
  const ok = () => MessagePlugin.success(t('page.rule.detail.example_copied'));
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code).then(ok).catch(() => fallbackCopy(code, ok));
  } else {
    fallbackCopy(code, ok);
  }
}
function fallbackCopy(text: string, ok: () => void) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    ok();
  } catch (e) {
    MessagePlugin.error(t('page.rule.detail.example_copy_fail'));
  }
  document.body.removeChild(ta);
}

// 把示例应用到手工代码编辑器（自动把规则名替换成当前规则的唯一码）
function applyExample(ex: Record<string, any>) {
  if (ex.multi) {
    MessagePlugin.warning(t('page.rule.detail.example_multi_tip'));
    return;
  }
  const realname = ruleuuid.value.replace(/-/g, '');
  const applied = ex.code.replace(/rule\s+R[A-Za-z0-9]+/, `rule R${realname}`);
  formData.value.rule_content = applied;
  formCodemirrorContent.value = applied;
  MessagePlugin.success(t('page.rule.detail.example_applied'));
}

// 测试规则相关方法
function handleTestRule() {
  testResult.value = null;
  testDialogVisible.value = true;
}

async function onConfirmTest() {
  const testData = {
    rule_json: JSON.stringify(formData.value),
    rule_content: formCodemirrorContent.value,
    is_manual_rule: parseInt(formData.value.is_manual_rule),
    rule_code: ruleuuid.value,
    ...testFormData,
  };

  try {
    const res = await wafRuleTestApi(testData);
    if (res.code === 0) {
      testResult.value = {
        is_match: res.data.is_match,
        matched_rules: res.data.matched_rules || [],
        matched_rule_details: res.data.matched_rule_details || [],
        effective_action: res.data.effective_action || '',
        effective_skip_modules: res.data.effective_skip_modules || [],
        parsed_country: res.data.parsed_country || '',
        parsed_province: res.data.parsed_province || '',
        parsed_city: res.data.parsed_city || '',
      };
      MessagePlugin.success('测试完成');
    } else {
      MessagePlugin.warning(res.msg || '测试失败');
    }
  } catch (e) {
    console.log(e);
    MessagePlugin.error('测试请求异常');
  }
}

function onCancelTest() {
  testDialogVisible.value = false;
  testResult.value = null;
}

onMounted(() => {
  loadHostList();
  // 进页面就检测一次 AI 密钥，没配的话在 AI 生成面板里先提示
  checkGptConfig();

  if (route.query.code != undefined) {
    op_rule_no.value = String(route.query.code);
    getDetail(op_rule_no.value);
  }
  if (route.query.type != undefined) {
    op_type.value = String(route.query.type);

    if (op_type.value === 'add' && route.query.sourcePoint != undefined) {
      formData.value.is_manual_rule = String(route.query.is_manual_rule ?? '1');
      fromLogContentStr.value = String(route.query.contentstr ?? '');
      formData.value.rule_base.rule_domain_code = String(route.query.host_code ?? '');
      fromSourcePoint.value = String(route.query.sourcePoint);
      setRuleContentByMode();
    } else if (op_type.value === 'add' && route.query.sourcePoint == undefined) {
      fromSourcePoint.value = 'url';
      setRuleContentByMode();
    }
  }
});
</script>

<style scoped>
.detail-base :deep(.t-card) {
  padding: 8px;
  margin-bottom: 16px;
}

.form-item-tips {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.5;
}

.detail-base :deep(.t-card__title) {
  font-size: 20px;
  font-weight: 500;
}

.rule-example-container {
  margin-top: 16px;
  border: 1px solid var(--td-component-stroke);
  border-radius: 6px;
  overflow: hidden;
  min-height: 500px;
  max-height: 760px;
  display: flex;
  flex-direction: column;
}

.rule-example-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--td-bg-color-container-hover);
  border-bottom: 1px solid var(--td-component-stroke);
}

.rule-example-header .t-icon {
  margin-right: 8px;
  color: var(--td-brand-color);
}

.rule-example-title {
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.rule-example-code {
  margin: 0;
  padding: 12px;
  background-color: var(--td-bg-color-container-hover);
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre;
  overflow-x: auto;
}

.reference-container {
  min-height: 500px;
  max-height: 760px;
}

.reference-container :deep(.t-tabs__content) {
  overflow-y: auto;
  max-height: 600px;
}

/* 示例浏览器：工具条 */
.example-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--td-component-stroke);
  background-color: var(--td-bg-color-container-hover);
}

.example-view-switch {
  margin-left: auto;
}

/* 示例浏览器：内容区（可滚动） */
.example-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 12px 12px 24px;
  min-height: 0;
}

.example-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.example-card {
  border: 1px solid var(--td-component-stroke);
  border-radius: 6px;
  overflow: hidden;
}

.example-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background-color: var(--td-bg-color-container-hover);
  border-bottom: 1px solid var(--td-component-stroke);
}

.example-card-title {
  font-weight: 500;
  color: var(--td-text-color-primary);
  flex: 1 1 auto;
  min-width: 0;
}

.example-card-ops {
  flex: 0 0 auto;
}

.example-card-desc {
  padding: 8px 10px 0;
  color: var(--td-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.example-code {
  margin: 8px 10px 10px;
  padding: 10px;
  background-color: var(--td-bg-color-container-hover);
  border-radius: 4px;
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre;
  overflow-x: auto;
}

.example-explain {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.explain-item {
  border-left: 3px solid var(--td-brand-color);
  padding-left: 12px;
}

.explain-scene {
  display: flex;
  align-items: center;
  gap: 8px;
}

.explain-title {
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.explain-desc {
  margin-top: 6px;
  color: var(--td-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.explain-effect {
  margin: 6px 0 8px;
  color: var(--td-text-color-secondary);
  font-size: 12px;
}

.explain-ops {
  display: flex;
  align-items: center;
  gap: 8px;
}

.explain-multi-tip {
  color: var(--td-warning-color);
  font-size: 12px;
}

.ai-prompt-tip {
  margin-bottom: 8px;
  color: var(--td-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.ai-prompt-textarea :deep(textarea) {
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 12px;
  line-height: 1.55;
}

.ai-prompt-ops {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* GPT 参数设置入口（表单样式在 components/gpt-config 里） */
.ai-gen-setting {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* 未配置密钥提示条 */
.ai-gen-unset {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  background-color: var(--td-warning-color-1);
  color: var(--td-warning-color-7);
  font-size: 12px;
  line-height: 1.6;
}

/* 编辑器内 AI 生成规则面板 */
.ai-gen-panel {
  border: 1px solid var(--td-brand-color-3);
  border-radius: 6px;
  margin-bottom: 12px;
  overflow: hidden;
}

.ai-gen-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--td-brand-color-1);
  border-bottom: 1px solid var(--td-brand-color-2);
}

.ai-gen-icon {
  color: var(--td-brand-color);
}

.ai-gen-title {
  font-weight: 500;
  color: var(--td-text-color-primary);
  flex: 1 1 auto;
}

.ai-gen-body {
  padding: 12px;
}

.ai-gen-ops {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.ai-gen-hint {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
}

.ai-gen-result {
  margin-top: 12px;
  border-top: 1px dashed var(--td-component-stroke);
  padding-top: 10px;
}

.ai-gen-result-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ai-gen-err {
  color: var(--td-warning-color);
  font-size: 12px;
}

.ai-gen-result-ops {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
</style>
