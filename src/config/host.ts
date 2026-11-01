import { BRAND } from '@/config/brand';

declare global {
  interface Window {
    __SAMWAF_SECURITY_PATH__?: string;
  }
}

/**
 * 安全路径前缀：
 * 1. 优先读 window.__SAMWAF_SECURITY_PATH__（后端 release 模式注入到 index.html）
 * 2. 其次读 localStorage（开发模式或跨 session 持久化）
 */
const securityPath: string = (() => {
  if (typeof window === 'undefined') return '';
  if (window.__SAMWAF_SECURITY_PATH__) return window.__SAMWAF_SECURITY_PATH__;
  try {
    return localStorage.getItem('__samwaf_security_path__') || '';
  } catch {
    return '';
  }
})();

// 开发环境由 vite 代理 /api → http://127.0.0.1:26666，生产环境与后端同源部署
export const API_HOST = `${securityPath}/api/v1`;

/** 在线文档前缀（brand.docUrl 留空时返回空串，各入口据此隐藏） */
export function getOnlineUrl() {
  return BRAND.docUrl;
}
