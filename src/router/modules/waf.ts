import { markRaw } from 'vue';
import type { Router, RouteRecordRaw } from 'vue-router';
import {
  ApplicationIcon,
  CloudIcon,
  ForkIcon,
  LightingCircleIcon,
  NotificationIcon,
  ServerIcon,
  SystemLogIcon,
  SystemSettingIcon,
  UserCircleIcon,
  UsergroupIcon,
} from 'tdesign-icons-vue-next';

import { usePermissionStore } from '@/store/modules/permission';

/**
 * WAF 业务路由（挂载在根布局 '/' 下）
 * 按迁移里程碑逐组补充，路由 path 与老项目保持一致以便书签/跳转兼容
 *
 * SaaS 租户权限差异化：每个路由按后端 wafmangeweb/localserver.go 的权限分组
 * 标注 meta.permission（权限码目录 enums/permissions.go）。菜单显隐在
 * MenuContent.toMenuNodes 按权限 store 过滤；导航拦截在 setupPermissionMenuGate
 * 的 beforeEach——租户（含受限套餐）看不到也进不去无权页面，平台侧菜单
 * （租户/套餐/SQL/开放平台/AI/诊断/实例配置）对租户一律不可见。
 */
const wafRoutes: RouteRecordRaw[] = [
  {
    path: 'waf-host',
    meta: { title: 'menu.host.parent_title', icon: markRaw(ApplicationIcon) },
    children: [
      {
        path: 'wafhost',
        name: 'WafHost',
        component: () => import('@/pages/waf/host/index.vue'),
        meta: { title: 'menu.host.host_title', permission: 'host:manage' },
      },
      {
        path: 'wafrule',
        name: 'WafRule',
        component: () => import('@/pages/waf/rule/index.vue'),
        meta: { title: 'menu.host.host_protect_rule', permission: 'security:policy' },
      },
      {
        path: 'wafruleedit',
        name: 'Wafruleedit',
        component: () => import('@/pages/waf/rule/edit/index.vue'),
        meta: { title: 'menu.host.host_protect_rule_edit', hidden: true, permission: 'security:policy' },
      },
      {
        path: 'wafipwhitelist',
        name: 'WafIpWhiteList',
        component: () => import('@/pages/waf/ipallow/index.vue'),
        meta: { title: 'menu.host.allow_ip', permission: 'security:policy' },
      },
      {
        path: 'wafurlwhitelist',
        name: 'WafUrlWhiteList',
        component: () => import('@/pages/waf/urlallow/index.vue'),
        meta: { title: 'menu.host.allow_url', permission: 'security:policy' },
      },
      {
        path: 'wafipBlocklist',
        name: 'WafIpBlockList',
        component: () => import('@/pages/waf/ipblock/index.vue'),
        meta: { title: 'menu.host.deny_ip', permission: 'security:policy' },
      },
      {
        path: 'wafipgroup',
        name: 'WafIpGroup',
        component: () => import('@/pages/waf/ipgroup/index.vue'),
        meta: { title: 'menu.host.ip_group', permission: 'security:policy' },
      },
      {
        path: 'wafurlblocklist',
        name: 'WafUrlBlockList',
        component: () => import('@/pages/waf/urlblock/index.vue'),
        meta: { title: 'menu.host.deny_url', permission: 'security:policy' },
      },
      {
        path: 'wafldpurllist',
        name: 'WafLdpUrlList',
        component: () => import('@/pages/waf/ldpurl/index.vue'),
        meta: { title: 'menu.host.ldp_url', permission: 'security:policy' },
      },
      {
        path: 'wafanticclist',
        name: 'WafAntiCCList',
        component: () => import('@/pages/waf/anticc/index.vue'),
        meta: { title: 'menu.host.cc', permission: 'security:policy' },
      },
      {
        path: 'wafsensitivelist',
        name: 'WafSensitiveList',
        component: () => import('@/pages/waf/sensitive/index.vue'),
        meta: { title: 'menu.host.sensitive', permission: 'security:policy' },
      },
      {
        path: 'wafsslconfiglist',
        name: 'WafSSLConfigList',
        component: () => import('@/pages/waf/sslconfig/index.vue'),
        meta: { title: 'menu.host.sslconfig', permission: 'host:manage' },
      },
      {
        path: 'wafbatchtasklist',
        name: 'WafBatchTaskList',
        component: () => import('@/pages/waf/batchtask/index.vue'),
        // 批量任务在后端属 system:ops 域（虽挂在「网站防护」菜单组下）
        meta: { title: 'menu.host.batchtask', permission: 'system:ops' },
      },
      {
        path: 'wafsslOrderlist',
        name: 'WafSSLOrderList',
        component: () => import('@/pages/waf/sslorder/index.vue'),
        meta: { title: 'menu.host.sslorder', permission: 'host:manage' },
      },
      {
        path: 'wafsslExpirelist',
        name: 'WafsslExpireList',
        component: () => import('@/pages/waf/ssl_expire/index.vue'),
        meta: { title: 'menu.host.ssl_expire', permission: 'host:manage' },
      },
      {
        path: 'wafBlockingPagelist',
        name: 'WafBlockingPagelist',
        component: () => import('@/pages/waf/bLocking_page/index.vue'),
        meta: { title: 'menu.host.blocking_page', permission: 'host:manage' },
      },
      {
        path: 'wafIPBan',
        name: 'WafIPBan',
        component: () => import('@/pages/waf/ip_ban/index.vue'),
        meta: { title: 'menu.host.ip_ban', keepAlive: false, permission: 'security:policy' },
      },
      {
        path: 'wafIPFailure',
        name: 'WafIPFailure',
        // 旧入口保留为隐藏重定向：老链接/书签跳到统一入口并带上来源，
        // 目标页按 query.source 选中对应封禁列表
        redirect: (to) => ({ name: 'WafIPBan', query: { ...to.query, source: 'failure' }, hash: to.hash }),
        meta: { title: 'menu.host.ip_ban', hidden: true, permission: 'security:policy' },
      },
      {
        path: 'wafRuleBan',
        name: 'WafRuleBan',
        redirect: (to) => ({ name: 'WafIPBan', query: { ...to.query, source: 'rule' }, hash: to.hash }),
        meta: { title: 'menu.host.ip_ban', hidden: true, permission: 'security:policy' },
      },
      {
        path: 'wafFirewallIPBlock',
        name: 'WafFirewallIPBlock',
        component: () => import('@/pages/waf/firewall_ipblock/index.vue'),
        meta: { title: 'menu.host.firewall_ip_block', permission: 'security:policy' },
      },
      {
        path: 'wafThreatIP',
        name: 'WafThreatIP',
        component: () => import('@/pages/waf/threatip/index.vue'),
        meta: { title: 'menu.host.threat_ip', permission: 'security:policy' },
      },
      {
        path: 'wafCDNIP',
        name: 'WafCDNIP',
        component: () => import('@/pages/waf/cdnip/index.vue'),
        meta: { title: 'menu.host.cdn_ip', permission: 'host:manage' },
      },
      {
        path: 'wafPathRulelist',
        name: 'WafPathRuleList',
        component: () => import('@/pages/waf/path_rule/index.vue'),
        meta: { title: 'menu.host.path_rule', hidden: true, permission: 'host:manage' },
      },
    ],
  },
  {
    path: 'wafanalysis',
    meta: { title: 'menu.analysis.parent_title', icon: markRaw(SystemLogIcon) },
    children: [
      {
        path: 'wafanalysislog',
        name: 'WafAnalysisLog',
        component: () => import('@/pages/waf/analysis/index.vue'),
        meta: { title: 'menu.analysis.analysis_title', permission: 'dashboard:view' },
      },
      {
        path: 'wafanalysisSpiderlog',
        name: 'WafAnalysisSpiderLog',
        component: () => import('@/pages/waf/analysis/SpiderActive.vue'),
        meta: { title: 'menu.analysis.analysis_spider_title', permission: 'dashboard:view' },
      },
      {
        path: 'wafanalysissourcepath',
        name: 'WafAnalysisSourcePath',
        component: () => import('@/pages/waf/analysis/SourcePath.vue'),
        meta: { title: 'menu.analysis.analysis_source_path_title', permission: 'dashboard:view' },
      },
    ],
  },
  {
    path: 'waf',
    meta: { title: 'menu.visit_log.parent_title', icon: markRaw(LightingCircleIcon) },
    children: [
      {
        path: 'wafvisitlog',
        name: 'WafvisitLog',
        component: () => import('@/pages/waf/attack/index.vue'),
        meta: { title: 'menu.visit_log.visit_title', permission: 'log:view' },
      },
      {
        path: 'wafattacklog',
        name: 'WafAttackLog',
        component: () => import('@/pages/waf/attack/attack_index.vue'),
        meta: { title: 'menu.visit_log.attack_title', permission: 'log:view' },
      },
      {
        path: 'wafattacklogdetail',
        name: 'WafAttackLogDetail',
        component: () => import('@/pages/waf/attack/detail/index.vue'),
        meta: { title: 'menu.visit_log.visit_detail_title', hidden: true, permission: 'log:view' },
      },
      {
        path: 'logfilewrite',
        name: 'LogFileWrite',
        component: () => import('@/pages/waf/logfilewrite/index.vue'),
        meta: { title: 'menu.visit_log.logfilewrite_title', permission: 'log:view' },
      },
    ],
  },
  {
    path: 'tunnel',
    meta: { title: 'menu.tunnel.parent_title', icon: markRaw(ForkIcon) },
    children: [
      {
        path: 'Tunnel',
        name: 'Tunnel',
        component: () => import('@/pages/waf/tunnel/index.vue'),
        meta: { title: 'menu.tunnel.list_title', permission: 'host:manage' },
      },
    ],
  },
  {
    path: 'application',
    meta: { title: 'menu.application.parent_title', icon: markRaw(ServerIcon) },
    children: [
      {
        path: 'AppList',
        name: 'AppList',
        // 应用管理属平台域（可执行任意命令的实例级资源），租户不可见
        component: () => import('@/pages/waf/application/index.vue'),
        meta: { title: 'menu.application.list_title', permission: 'platform:admin' },
      },
    ],
  },
  {
    // 统一访问认证(Access 模式)自成一个菜单组：它是一套完整的访客身份体系
    // （账号 / 策略 / 会话 / 审计），与「网站防护」里那些按站点配的防护规则不是一类东西。
    path: 'waf-access',
    meta: { title: 'menu.access.parent_title', icon: markRaw(UserCircleIcon) },
    children: [
      {
        path: 'wafaccessconfig',
        name: 'WafAccessConfig',
        component: () => import('@/pages/waf/access_config/index.vue'),
        meta: { title: 'menu.access.config', permission: 'security:policy' },
      },
      {
        path: 'wafaccessaccount',
        name: 'WafAccessAccount',
        component: () => import('@/pages/waf/access_account/index.vue'),
        meta: { title: 'menu.access.account', permission: 'security:policy' },
      },
      {
        path: 'wafaccesssession',
        name: 'WafAccessSession',
        component: () => import('@/pages/waf/access_session/index.vue'),
        meta: { title: 'menu.access.session', permission: 'security:policy' },
      },
    ],
  },
  {
    path: 'account',
    meta: { title: 'menu.account.parent_title', icon: markRaw(UsergroupIcon) },
    children: [
      {
        path: 'Account',
        name: 'Account',
        // 账号管理：租户管理员可自助管理本租户账号（后端按请求租户收敛数据面）
        component: () => import('@/pages/waf/account/index.vue'),
        meta: { title: 'menu.account.account_list_title', permission: 'account:manage' },
      },
      {
        path: 'PermissionGroup',
        name: 'PermissionGroup',
        // 权限组管理属平台域权限码 permission:manage（当前仅平台侧持有）
        component: () => import('@/pages/waf/permission_group/index.vue'),
        meta: { title: 'menu.account.permission_group_title', permission: 'permission:manage' },
      },
      {
        path: 'AccountLog',
        name: 'AccountLog',
        component: () => import('@/pages/waf/accountlog/index.vue'),
        meta: { title: 'menu.account.account_log_title', permission: 'audit:view' },
      },
      {
        path: 'LoginHistory',
        name: 'LoginHistory',
        component: () => import('@/pages/waf/login_history/index.vue'),
        meta: { title: 'menu.account.login_history_title', permission: 'audit:view' },
      },
      {
        path: 'OTP',
        name: 'OTP',
        component: () => import('@/pages/waf/otp/index.vue'),
        meta: { title: 'menu.account.otp_title', permission: 'account:manage' },
      },
    ],
  },
  {
    path: 'sys',
    meta: { title: 'menu.system.parent_title', icon: markRaw(SystemSettingIcon) },
    children: [
      {
        path: 'VpConfig',
        name: 'VpConfig',
        component: () => import('@/pages/waf/vpconfig/index.vue'),
        meta: { title: 'menu.system.vpconfig_title', permission: 'platform:admin' },
      },
      {
        path: 'HostGuard',
        name: 'HostGuard',
        component: () => import('@/pages/waf/hostguard/index.vue'),
        meta: { title: 'menu.system.host_guard_title', permission: 'platform:admin' },
      },
      {
        path: 'FileManage',
        name: 'FileManage',
        component: () => import('@/pages/waf/filemanage/index.vue'),
        meta: { title: 'menu.system.filemanage_title', permission: 'platform:admin' },
      },
      {
        path: 'IPLocation',
        name: 'IPLocation',
        component: () => import('@/pages/waf/iplocation/index.vue'),
        meta: { title: 'menu.system.iplocation_title', permission: 'log:view' },
      },
      {
        path: 'SysLog',
        name: 'SysLog',
        component: () => import('@/pages/waf/syslog/index.vue'),
        meta: { title: 'menu.system.system_log_title', permission: 'audit:view' },
      },
      {
        path: 'wafaccessaudit',
        name: 'WafAccessAudit',
        component: () => import('@/pages/waf/access_audit/index.vue'),
        meta: { title: 'menu.system.security_audit_title', permission: 'audit:view' },
      },
      {
        path: 'SystemConfig',
        name: 'SystemConfig',
        // 参数设置是实例级全局配置（system:config，租户套餐不含该码）
        component: () => import('@/pages/waf/systemconfig/index.vue'),
        meta: { title: 'menu.system.system_config_title', permission: 'system:config' },
      },
      {
        path: 'UpgradeNotice',
        name: 'UpgradeNotice',
        // 升级须知属基础组（登录即可见，无权限码）
        component: () => import('@/pages/waf/upgradenotice/index.vue'),
        meta: { title: 'menu.system.upgrade_notice_title' },
      },
      {
        path: 'PrivateInfo',
        name: 'PrivateInfo',
        component: () => import('@/pages/waf/private_info/index.vue'),
        meta: { title: 'menu.system.private_info_title', permission: 'security:policy' },
      },
      {
        path: 'DataRetention',
        name: 'DataRetention',
        component: () => import('@/pages/waf/data_retention/index.vue'),
        meta: { title: 'menu.system.data_retention_title', permission: 'platform:admin' },
      },
      {
        path: 'OwaspManage',
        name: 'OwaspManage',
        component: () => import('@/pages/waf/owasp/index.vue'),
        meta: { title: 'menu.system.owasp_title', permission: 'security:policy' },
      },
      {
        path: 'AIModelManage',
        name: 'AIModelManage',
        // AI 模型管理属平台域（模型被引擎加载、训练数据出库）
        component: () => import('@/pages/waf/ai/index.vue'),
        meta: { title: 'menu.system.ai_title', permission: 'platform:admin' },
      },
      {
        path: 'RumtimeSysteminfo',
        name: 'RumtimeSysteminfo',
        component: () => import('@/pages/waf/sysruntime/index.vue'),
        meta: { title: 'menu.system.system_runtime_title', permission: 'dashboard:view' },
      },
      {
        path: 'RunDiagnostic',
        name: 'RunDiagnostic',
        // 运行诊断属平台域（进程内部状态导出）
        component: () => import('@/pages/waf/diagnostic/index.vue'),
        meta: { title: 'menu.system.diagnostic_title', permission: 'platform:admin' },
      },
      {
        path: 'OneKeyMod',
        name: 'OneKeyMod',
        component: () => import('@/pages/waf/onekeymod/index.vue'),
        meta: { title: 'menu.system.system_one_key_modify_title', permission: 'host:manage' },
      },
      {
        path: 'task',
        name: 'Task',
        // 任务管理是实例级资源（system:config 域，随本轮从 system:ops 拆出）
        component: () => import('@/pages/waf/task/index.vue'),
        meta: { title: 'menu.system.task', permission: 'system:config' },
      },
      {
        path: 'sqlquery',
        name: 'SqlQuery',
        // SQL 查询直接执行数据库语句，极度敏感，平台域专属
        component: () => import('@/pages/waf/sqlquery/index.vue'),
        meta: { title: 'menu.system.sql_query_title', permission: 'platform:admin' },
      },
      {
        path: 'Tenant',
        name: 'Tenant',
        component: () => import('@/pages/waf/tenant/index.vue'),
        // 租户管理：平台域专属（platform:admin），租户侧探针不通过即隐藏+拦截
        meta: { title: 'menu.system.tenant_title', permission: 'platform:admin' },
      },
      {
        path: 'Plan',
        name: 'Plan',
        component: () => import('@/pages/waf/plan/index.vue'),
        // 套餐管理：租户差异化的配置源（权限集/配额/宽限默认值），平台域专属
        meta: { title: 'menu.system.plan_title', permission: 'platform:admin' },
      },
    ],
  },
  {
    path: 'notify',
    meta: { title: 'menu.notify.parent_title', icon: markRaw(NotificationIcon) },
    children: [
      {
        path: 'channel',
        name: 'NotifyChannel',
        component: () => import('@/pages/waf/notify_channel/index.vue'),
        meta: { title: 'menu.notify.channel_title', permission: 'system:ops' },
      },
      {
        path: 'subscription',
        name: 'NotifySubscription',
        component: () => import('@/pages/waf/notify_subscription/index.vue'),
        meta: { title: 'menu.notify.subscription_title', permission: 'system:ops' },
      },
      {
        path: 'log',
        name: 'NotifyLog',
        component: () => import('@/pages/waf/notify_log/index.vue'),
        meta: { title: 'menu.notify.log_title', permission: 'system:ops' },
      },
    ],
  },
  {
    path: 'oplatform',
    meta: { title: 'menu.oplatform.parent_title', icon: markRaw(CloudIcon) },
    children: [
      {
        path: 'key',
        name: 'OPlatformKey',
        component: () => import('@/pages/waf/oplatform/index.vue'),
        meta: { title: 'menu.oplatform.key_title', permission: 'platform:admin' },
      },
      {
        path: 'log',
        name: 'OPlatformLog',
        component: () => import('@/pages/waf/oplatform/log.vue'),
        meta: { title: 'menu.oplatform.log_title', permission: 'platform:admin' },
      },
      {
        path: 'doc',
        name: 'OPlatformDoc',
        component: () => import('@/pages/waf/oplatform/doc.vue'),
        meta: { title: 'menu.oplatform.doc_title', permission: 'platform:admin' },
      },
    ],
  },
];

/**
 * 权限菜单门控（原 setupPlatformMenuGate 的泛化版本）。
 *
 * 背景：登录响应不携带权限信息，前端按「每个权限码探一个只读端点」还原当前
 * 账号的有效权限面（store/modules/permission.ts + apis/permission_probe.ts）。
 * 探针结果天然包含后端的权限组判定与套餐天花板——受限套餐租户的菜单与
 * 平台侧账号的菜单都会被正确裁剪。
 *
 * 行为：
 *   - 导航到 /login：复位权限面（换账号登录后重新探测）；
 *   - 首次认证导航：beforeEach 里 await 探测完成（深链直达受限页面时，
 *     页面壳不会先渲染再被打回，严格 fail-closed）；
 *   - 目标路由标注了 meta.permission 且无权 → 重定向 /dashboard。
 *
 * 菜单侧边栏的显隐在 MenuContent.toMenuNodes 按同一 store 过滤（响应式），
 * 这里只负责导航拦截，两处共用一份判定数据，不会出现「菜单可见但进不去」。
 *
 * 探测失败（网络异常等）按无权限处理（fail-closed，与后端 RequirePermission
 * 同口径）：宁可菜单空也不给租户看一堆点了就 403 的入口。
 */
export function setupPermissionMenuGate(router: Router) {
  router.beforeEach(async (to) => {
    if (to.path === '/login') {
      usePermissionStore().reset();
      return true;
    }
    if (!localStorage.getItem('access_token')) return true;

    const permStore = usePermissionStore();
    await permStore.ensureLoaded();

    const code = to.meta?.permission;
    if (code && !permStore.has(code)) {
      // 兜底目标自身不可达（如自定义套餐不含 dashboard:view）时放行本路由，
      // 避免重定向循环：菜单仍隐藏、后端仍拦截，只是不再无限跳转
      if (to.path === '/dashboard' || to.path.startsWith('/dashboard/')) return true;
      return { path: '/dashboard' };
    }
    return true;
  });
}

export default wafRoutes;
