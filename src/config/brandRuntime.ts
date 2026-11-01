/**
 * 品牌运行时配置 —— 后端「品牌设置」（商业化）下发到前端的运行态。
 *
 * 与静态品牌点（config/brand.ts，编译期常量）的关系：
 *   - 静态 BRAND 是未配置品牌时的默认值来源；
 *   - brandRuntime 是平台在「品牌设置」里配置的内容（品牌名称/登录欢迎语/
 *     版权文案/Logo），非空字段覆盖静态默认。
 *
 * 数据通道：
 *   - 短文本（名称/欢迎语/版权）随 index.html 的 samwaf-ui-config 注入脚本与
 *     /public/uiconfig 一起到达，由 utils/adminTitles 的 applyAdminTitles 转交
 *     applyBrandBootstrap（在 pinia 挂载前就要可用，因此用独立 reactive 模块
 *     而不是 pinia store）；
 *   - Logo 体积大，单独经 /public/brand/logo 拉取（loadBrandLogo，进程内缓存一次）。
 */
import { reactive } from 'vue';

import request from '@/utils/request';
import { BRAND, getBrandName, getCopyright } from '@/config/brand';

export const brandRuntime = reactive({
  name: '',
  loginWelcome: '',
  copyright: '',
  logo: '',
});

let logoPromise: Promise<void> | null = null;

/** 注入脚本 / uiconfig 的品牌字段落库（空值不覆盖已拉取的运行态） */
export function applyBrandBootstrap(value: unknown) {
  if (!value || typeof value !== 'object') return;
  const v = value as Record<string, unknown>;
  if (typeof v.brand_name === 'string') brandRuntime.name = v.brand_name;
  if (typeof v.brand_login_welcome === 'string') brandRuntime.loginWelcome = v.brand_login_welcome;
  if (typeof v.brand_copyright === 'string') brandRuntime.copyright = v.brand_copyright;
}

/** 拉取品牌 Logo（幂等：进行中/已完成复用；force=保存品牌后强制刷新） */
export async function loadBrandLogo(force = false) {
  if (force) {
    logoPromise = null;
    brandRuntime.logo = '';
  }
  if (!logoPromise) {
    logoPromise = request<{ logo: string }>({ url: 'public/brand/logo', method: 'get', background: true })
      .then((res) => {
        if (res?.code === 0 && res.data && typeof res.data.logo === 'string') {
          brandRuntime.logo = res.data.logo;
        }
      })
      .catch(() => { /* Logo 拉取失败回落默认徽标，不打扰用户 */ });
  }
  await logoPromise;
}

/** 品牌显示名：平台配置优先，回落静态产品名 */
export function brandDisplayName(): string {
  return brandRuntime.name || getBrandName();
}

/** 版权文案：平台配置优先，回落静态默认 */
export function brandCopyrightText(): string {
  return brandRuntime.copyright || getCopyright();
}

/** 侧栏折叠徽标：有 Logo 显示图片，否则回落静态文字徽标 */
export function brandLogoBadge(): string {
  return brandRuntime.logo || BRAND.logoBadge;
}
