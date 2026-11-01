import { createApp } from 'vue';
import TDesign from 'tdesign-vue-next';
import 'tdesign-vue-next/es/style/index.css';
import './style/global.css';

import App from './App.vue';
// 页面顶部的功能说明区：说明短了原地折叠、长了自动进右侧抽屉，全站统一入口
import HelpBlock from './components/help-block/index.vue';
// IP 归属查询：封禁源分散在七八个页面，这个组件一次查完
import IpLookup from './components/ip-lookup/index.vue';
import router from './router';
import pinia from './store';
import i18n from './i18n';
import './permission';
import { setupDialogOverlayGuard } from './utils/dialogOverlayGuard';
import { setupMessageGuard } from './utils/messageguard';
import { loadAdminTitles } from './utils/adminTitles';
import { BRAND } from './config/brand';

// 品牌文案注入 i18n：页面统一用 t('brand.product')，改名只动 config/brand.ts
i18n.global.mergeLocaleMessage('zh_CN', { brand: { product: BRAND.nameZh } });
i18n.global.mergeLocaleMessage('en_US', { brand: { product: BRAND.nameEn } });

setupDialogOverlayGuard();
// 全局提示去重 + 跳登录后抑制回声，见
// SamWafTechDoc/开发规则规范/2026-08-28-前端全局提示与铃铛消息.md
setupMessageGuard();

async function bootstrap() {
  await loadAdminTitles();
  createApp(App)
    .use(TDesign)
    .use(pinia)
    .use(router)
    .use(i18n)
    .component('help-block', HelpBlock)
    .component('ip-lookup', IpLookup)
    .mount('#app');
}

void bootstrap();
