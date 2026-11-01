<template>
  <div class="rule-builder">
    <t-card :title="t('page.rule.detail.write_rule')">
      <t-button theme="primary" @click="ruleDynAdd()">
        {{ t('common.new') }}
      </t-button>
      <t-form-item v-if="localFormData.rule_condition.relation_detail.length > 1" :label="t('page.rule.detail.relation')" name="relation_symbol">
        <t-select v-model="localFormData.rule_condition.relation_symbol" clearable :style="{ width: '480px' }" @change="onFormChange">
          <t-option v-for="(item, index) in relationSymbolOptions" :key="index" :value="item.value" :label="item.label">
            {{ item.label }}
          </t-option>
        </t-select>
      </t-form-item>

      <t-card
        v-for="(condition_item, condition_index) in localFormData.rule_condition.relation_detail"
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
              <t-input v-model="condition_item.attr_val" :style="{ width: '200px' }" :placeholder="t('common.placeholder')" @change="onFormChange" />
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
            <t-button theme="danger" @click="ruleDynDel(condition_index)">{{ t('common.delete') }}</t-button>
          </t-col>
        </t-row>
      </t-card>
    </t-card>

    <t-card :title="t('page.rule.detail.rule_script_content')">
      <pre class="rule-example-code">{{ rulePreviewContent }}</pre>
    </t-card>

    <t-space style="margin-top: 12px">
      <t-button theme="primary" @click="confirm">{{ t('common.confirm') }}</t-button>
      <t-button theme="default" @click="emit('cancel')">{{ t('common.cancel') }}</t-button>
    </t-space>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { v4 as uuidv4 } from 'uuid';
import { RULE, RULE_RELATION_DETAIL } from '@/service/service-rule';
import { copyObj } from '@/utils/usuallytool';
import { wafRuleFormatApi } from '@/apis/rules';

const props = withDefaults(
  defineProps<{
    hostCode?: string;
    defaultSalience?: number;
    ruleNamePrefix?: string;
  }>(),
  { hostCode: '', defaultSalience: 10, ruleNamePrefix: 'WafRule' },
);
const emit = defineEmits<{
  (e: 'confirm', content: string): void;
  (e: 'change', payload: { ruleJson: Record<string, any>; preview: string }): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();

const localFormData = ref<Record<string, any>>({ ...copyObj(RULE) });
const rulePreviewContent = ref('');

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

function ruleDynAdd() {
  const item = { ...copyObj(RULE_RELATION_DETAIL) };
  item.fact_name = 'MF';
  item.attr_type = 'string';
  localFormData.value.rule_condition.relation_detail.push(item);
  onFormChange();
}

function ruleDynDel(index: number) {
  localFormData.value.rule_condition.relation_detail.splice(index, 1);
  onFormChange();
}

function onAttrChange(condition_item: Record<string, any>) {
  condition_item.attr_val = '';
  condition_item.attr_val2 = '';
  condition_item.attr_type = 'string';
  onFormChange();
}

function onAttrJudgeChange(condition_item: Record<string, any>) {
  const isFunc = (condition_item.attr_judge || '').startsWith('system.');
  if (isFunc) {
    if (condition_item.attr_val2 !== 'true' && condition_item.attr_val2 !== 'false') {
      condition_item.attr_val2 = 'true';
    }
  } else {
    condition_item.attr_val2 = '';
  }
  onFormChange();
}

function onFormChange() {
  emit('change', { ruleJson: localFormData.value, preview: rulePreviewContent.value });
  fetchRulePreview();
}

function buildPreviewPayload() {
  return {
    rule_code: uuidv4(),
    rule_json: JSON.stringify(localFormData.value),
    is_manual_rule: 0,
    rule_content: '',
    form_source: 'builder',
  };
}

function fetchRulePreview() {
  wafRuleFormatApi(buildPreviewPayload())
    .then((res) => {
      if (res.code === 0) {
        rulePreviewContent.value = res.data.rule_content;
      }
    })
    .catch(() => {});
}

function confirm() {
  emit('confirm', rulePreviewContent.value);
}

onMounted(() => {
  localFormData.value.is_manual_rule = '0';
  localFormData.value.rule_base.rule_domain_code = props.hostCode || localFormData.value.rule_base.rule_domain_code;
  localFormData.value.rule_base.salience = props.defaultSalience;
  localFormData.value.rule_base.rule_name = props.ruleNamePrefix;

  if (localFormData.value.rule_condition.relation_detail.length === 0) {
    ruleDynAdd();
  }
  fetchRulePreview();
});
</script>

<style scoped>
.rule-builder :deep(.t-card) {
  margin-bottom: 12px;
}

.rule-example-code {
  background: var(--td-bg-color-container-hover);
  padding: 12px;
  border-radius: 6px;
  font-family: monospace;
  white-space: pre-wrap;
}
</style>
