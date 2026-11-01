<template>
  <div class="doc-container">
    <t-card class="doc-card">
      <p class="doc-title">{{ t('menu.oplatform.doc_title') }}</p>
      <!-- 未配置文档站时给出占位说明；配置后点击跳转且不带 Referer -->
      <template v-if="docUrl">
        <t-link theme="primary" :href="docUrl" target="_blank" rel="noopener noreferrer">
          {{ docUrl }}
        </t-link>
      </template>
      <p v-else class="doc-empty">{{ t('common.doc_not_configured') }}</p>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { BRAND } from '@/config/brand';

const { t } = useI18n();
const docUrl = BRAND.docUrl ? `${BRAND.docUrl.replace(/\/+$/, '')}/api/` : '';
</script>

<style scoped>
.doc-container {
  padding: 16px;
}
.doc-card {
  max-width: 640px;
}
.doc-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}
.doc-empty {
  margin: 0;
  color: var(--td-text-color-secondary);
}
</style>
