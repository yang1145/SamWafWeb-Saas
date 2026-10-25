// localStorage 保留字段配置
export const LOCALSTORAGE_PRESERVE_KEYS = [
  'lang', // 语言设置
  'attack_table_display_columns', // 访问日志列配置本地缓存（服务端为准，这里只是首屏秒开+兜底）
  'lastVisitedUrl', // 上次访问的URL
  '__samwaf_security_path__', // 安全路径前缀，决定 API/WS 地址，清掉会连不上后端
  'samwaf_page_setting', // 页面布局/主题设置 (store/modules/setting.ts)
  'samwaf_host_tab_placement', // 网站编辑 Tab 横竖排布偏好
  'waf_request_timeout_ms', // 前端请求超时 (config/requestTimeout.ts)
];

// localStorage 清理工具函数
export const clearLocalStorageExceptPreserved = () => {
  Object.keys(localStorage).forEach((key) => {
    if (!LOCALSTORAGE_PRESERVE_KEYS.includes(key)) {
      localStorage.removeItem(key);
    }
  });
};

// URL安全验证函数：仅允许相对路径或同源完整 URL
export const isValidRedirectUrl = (url: string): boolean => {
  if (!url) return false;

  try {
    if (url.startsWith('/')) {
      return true;
    }
    const urlObj = new URL(url);
    return urlObj.origin === window.location.origin;
  } catch {
    return false;
  }
};

// 保存当前访问URL（hash 路由只保存 hash 部分）
export const saveCurrentUrl = () => {
  const currentUrl = window.location.hash ? window.location.hash.substring(1) : window.location.pathname;
  if (!currentUrl.includes('/login')) {
    localStorage.setItem('lastVisitedUrl', currentUrl);
  }
};

// 获取安全的重定向URL
export const getSafeRedirectUrl = (): string => {
  const savedUrl = localStorage.getItem('lastVisitedUrl');

  if (savedUrl && isValidRedirectUrl(savedUrl)) {
    localStorage.removeItem('lastVisitedUrl');
    return savedUrl;
  }

  return '/dashboard';
};

interface IOption {
  value: number | string;
  label: string;
}

// 规则状态枚举
export const RULE_STATUS = {
  STOPPING: 0,
  RUNNING: 1,
};

// 防护状态枚举
export const GUARD_STATUS = {
  UN_GUARDDING: 0,
  GUARDDING: 1,
};

// SSL证书状态枚举
export const SSL_STATUS = {
  NOT_SSL: 0,
  SSL: 1,
};

// 启动状态枚举
export const START_STATUS = {
  START: 0,
  NOT_START: 1,
};

// 通知的优先级对应的TAG类型
export const NOTIFICATION_TYPES = {
  low: 'primary',
  middle: 'warning',
  high: 'danger',
};

// 攻击类型TAG类型
export const ATTACK_TYPES = {
  CC: 0,
  CMD: 1,
  WEBUPLOAD: 2,
};

export type { IOption };
