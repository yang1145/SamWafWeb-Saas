import { reactive } from 'vue';
import request from '@/utils/request';

import { applyBrandBootstrap } from '@/config/brandRuntime';

export interface AdminTitles {
  admin_title: string;
}

export const adminTitles = reactive<AdminTitles>({ admin_title: '' });

export function applyAdminTitles(value: unknown) {
  const title = value && typeof value === 'object' && 'admin_title' in value ? value.admin_title : '';
  adminTitles.admin_title = typeof title === 'string' ? title : '';
  // 品牌字段（品牌名称/登录欢迎语/版权）随同一份数据到达，转交运行态
  applyBrandBootstrap(value);
}

export async function loadAdminTitles() {
  const bootstrap = document.getElementById('samwaf-ui-config');
  if (bootstrap instanceof HTMLScriptElement && bootstrap.type === 'application/json') {
    try {
      applyAdminTitles(JSON.parse(bootstrap.textContent || '{}'));
      return;
    } catch { /* 无法读取启动配置时改走接口 */ }
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // 同时限制握手和请求的总等待时间。
    const deadline = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), 2500);
    });
    const res = await Promise.race([
      request<AdminTitles>({
        url: 'public/uiconfig', method: 'get', timeout: 2500, signal: controller.signal,
      }),
      deadline,
    ]);
    if (res?.code === 0) applyAdminTitles(res.data);
  } catch { /* 保留默认标题，继续加载页面 */ }
  finally {
    clearTimeout(timer);
    controller.abort();
  }
}
