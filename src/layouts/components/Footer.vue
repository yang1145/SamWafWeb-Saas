<template>
  <div class="layout-footer">{{ copyright }}</div>
</template>

<script setup lang="ts">
import { getCopyright } from '@/config/brand';

const copyright = getCopyright();
</script>

<style scoped>
.layout-footer {
  color: var(--td-text-color-placeholder);
  line-height: 20px;
  text-align: center;
  padding: 16px 0 8px;
}
</style>
