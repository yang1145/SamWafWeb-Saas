import request from '@/utils/request';

/**
 * 权限探针套件（SaaS 租户权限差异化）。
 *
 * 登录响应不携带权限信息（后端令牌是 opaque 的，权限码在服务侧判定），
 * 前端按「每个权限码探一个最轻量的只读端点」还原当前账号的有效权限面：
 * 探测端点与后端 wafmangeweb/localserver.go 的权限分组一一对应，
 * 请求全部 background（静默，无铃铛/通知）+ pageSize=1。
 *
 * fail-closed 口径与后端一致：HTTP 非 2xx、业务码非 0、网络异常都判无权限。
 * 后端 RequirePermission/套餐天花板才是真正的执行点，探针只负责菜单显隐
 * 与导航拦截，避免租户看到一堆点了就 403 的页面。
 */

/** 权限码 → 探测端点（与后端权限码目录 enums/permissions.go 对齐） */
const PROBE_TARGETS: { code: string; url: string; method: 'get' | 'post'; data?: any }[] = [
  // dashboard:view → 仪表盘与总览（sysinfo 在 dashboardGroup）
  { code: 'dashboard:view', url: 'sysinfo/version', method: 'get' },
  // host:manage → 站点与转发
  { code: 'host:manage', url: 'wafhost/host/list', method: 'post', data: { pageIndex: 1, pageSize: 1 } },
  // log:view → 访问日志
  { code: 'log:view', url: '/waflog/attack/list', method: 'post', data: { pageIndex: 1, pageSize: 1 } },
  // security:policy → 防护策略（自定义规则）
  { code: 'security:policy', url: '/wafhost/rule/list', method: 'post', data: { pageIndex: 1, pageSize: 1 } },
  // audit:view → 审计（系统日志）
  { code: 'audit:view', url: 'sys_log/list', method: 'post', data: { pageIndex: 1, pageSize: 1 } },
  // system:ops → 系统运维（通知渠道，租户隔离资源）
  { code: 'system:ops', url: '/notify/channel/list', method: 'post', data: { pageIndex: 1, pageSize: 1 } },
  // system:config → 实例级系统配置（平台侧，租户套餐不含）
  { code: 'system:config', url: 'systemconfig/list', method: 'post', data: { pageIndex: 1, pageSize: 1 } },
  // account:manage → 账号域
  { code: 'account:manage', url: 'account/list', method: 'post', data: { pageIndex: 1, pageSize: 1 } },
  // platform:admin → 平台域（沿用原租户菜单探针的端点）
  { code: 'platform:admin', url: 'tenant/list', method: 'post', data: { pageIndex: 1, pageSize: 1 } },
  // permission:manage → 权限组管理
  { code: 'permission:manage', url: 'permission/group/list', method: 'post', data: { pageIndex: 1, pageSize: 1 } },
];

/**
 * 并行探测全部权限码，返回 code → 是否有权 的映射。
 * 任何异常（网络/HTTP/业务码）都按无权限处理，不抛出——调用方拿到的永远是完整映射。
 */
export async function probe_permissions(): Promise<Record<string, boolean>> {
  const settled = await Promise.all(
    PROBE_TARGETS.map((target) =>
      request({
        url: target.url,
        method: target.method,
        ...(target.data !== undefined ? { data: target.data } : {}),
        background: true,
      })
        .then((res) => ({ code: target.code, ok: res.code === 0 }))
        .catch(() => ({ code: target.code, ok: false })),
    ),
  );
  const result: Record<string, boolean> = {};
  for (const item of settled) {
    result[item.code] = item.ok;
  }
  return result;
}
