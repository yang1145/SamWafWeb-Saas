import { markRaw, reactive } from 'vue';
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

import { tenant_probe_access_api } from '@/apis/tenant';

/**
 * WAF 业务路由（挂载在根布局 '/' 下）
 * 按迁移里程碑逐组补充，路由 path 与老项目保持一致以便书签/跳转兼容
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
        meta: { title: 'menu.host.host_title' },
      },
      {
        path: 'wafrule',
        name: 'WafRule',
        component: () => import('@/pages/waf/rule/index.vue'),
        meta: { title: 'menu.host.host_protect_rule' },
      },
      {
        path: 'wafruleedit',
        name: 'Wafruleedit',
        component: () => import('@/pages/waf/rule/edit/index.vue'),
        meta: { title: 'menu.host.host_protect_rule_edit', hidden: true },
      },
      {
        path: 'wafipwhitelist',
        name: 'WafIpWhiteList',
        component: () => import('@/pages/waf/ipallow/index.vue'),
        meta: { title: 'menu.host.allow_ip' },
      },
      {
        path: 'wafurlwhitelist',
        name: 'WafUrlWhiteList',
        component: () => import('@/pages/waf/urlallow/index.vue'),
        meta: { title: 'menu.host.allow_url' },
      },
      {
        path: 'wafipBlocklist',
        name: 'WafIpBlockList',
        component: () => import('@/pages/waf/ipblock/index.vue'),
        meta: { title: 'menu.host.deny_ip' },
      },
      {
        path: 'wafipgroup',
        name: 'WafIpGroup',
        component: () => import('@/pages/waf/ipgroup/index.vue'),
        meta: { title: 'menu.host.ip_group' },
      },
      {
        path: 'wafurlblocklist',
        name: 'WafUrlBlockList',
        component: () => import('@/pages/waf/urlblock/index.vue'),
        meta: { title: 'menu.host.deny_url' },
      },
      {
        path: 'wafldpurllist',
        name: 'WafLdpUrlList',
        component: () => import('@/pages/waf/ldpurl/index.vue'),
        meta: { title: 'menu.host.ldp_url' },
      },
      {
        path: 'wafanticclist',
        name: 'WafAntiCCList',
        component: () => import('@/pages/waf/anticc/index.vue'),
        meta: { title: 'menu.host.cc' },
      },
      {
        path: 'wafsensitivelist',
        name: 'WafSensitiveList',
        component: () => import('@/pages/waf/sensitive/index.vue'),
        meta: { title: 'menu.host.sensitive' },
      },
      {
        path: 'wafsslconfiglist',
        name: 'WafSSLConfigList',
        component: () => import('@/pages/waf/sslconfig/index.vue'),
        meta: { title: 'menu.host.sslconfig' },
      },
      {
        path: 'wafbatchtasklist',
        name: 'WafBatchTaskList',
        component: () => import('@/pages/waf/batchtask/index.vue'),
        meta: { title: 'menu.host.batchtask' },
      },
      {
        path: 'wafsslOrderlist',
        name: 'WafSSLOrderList',
        component: () => import('@/pages/waf/sslorder/index.vue'),
        meta: { title: 'menu.host.sslorder' },
      },
      {
        path: 'wafsslExpirelist',
        name: 'WafsslExpireList',
        component: () => import('@/pages/waf/ssl_expire/index.vue'),
        meta: { title: 'menu.host.ssl_expire' },
      },
      {
        path: 'wafBlockingPagelist',
        name: 'WafBlockingPagelist',
        component: () => import('@/pages/waf/bLocking_page/index.vue'),
        meta: { title: 'menu.host.blocking_page' },
      },
      {
        path: 'wafIPBan',
        name: 'WafIPBan',
        component: () => import('@/pages/waf/ip_ban/index.vue'),
        meta: { title: 'menu.host.ip_ban', keepAlive: false },
      },
      {
        path: 'wafIPFailure',
        name: 'WafIPFailure',
        // 旧入口保留为隐藏重定向：老链接/书签跳到统一入口并带上来源，
        // 目标页按 query.source 选中对应封禁列表
        redirect: (to) => ({ name: 'WafIPBan', query: { ...to.query, source: 'failure' }, hash: to.hash }),
        meta: { title: 'menu.host.ip_ban', hidden: true },
      },
      {
        path: 'wafRuleBan',
        name: 'WafRuleBan',
        redirect: (to) => ({ name: 'WafIPBan', query: { ...to.query, source: 'rule' }, hash: to.hash }),
        meta: { title: 'menu.host.ip_ban', hidden: true },
      },
      {
        path: 'wafFirewallIPBlock',
        name: 'WafFirewallIPBlock',
        component: () => import('@/pages/waf/firewall_ipblock/index.vue'),
        meta: { title: 'menu.host.firewall_ip_block' },
      },
      {
        path: 'wafThreatIP',
        name: 'WafThreatIP',
        component: () => import('@/pages/waf/threatip/index.vue'),
        meta: { title: 'menu.host.threat_ip' },
      },
      {
        path: 'wafCDNIP',
        name: 'WafCDNIP',
        component: () => import('@/pages/waf/cdnip/index.vue'),
        meta: { title: 'menu.host.cdn_ip' },
      },
      {
        path: 'wafPathRulelist',
        name: 'WafPathRuleList',
        component: () => import('@/pages/waf/path_rule/index.vue'),
        meta: { title: 'menu.host.path_rule', hidden: true },
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
        meta: { title: 'menu.analysis.analysis_title' },
      },
      {
        path: 'wafanalysisSpiderlog',
        name: 'WafAnalysisSpiderLog',
        component: () => import('@/pages/waf/analysis/SpiderActive.vue'),
        meta: { title: 'menu.analysis.analysis_spider_title' },
      },
      {
        path: 'wafanalysissourcepath',
        name: 'WafAnalysisSourcePath',
        component: () => import('@/pages/waf/analysis/SourcePath.vue'),
        meta: { title: 'menu.analysis.analysis_source_path_title' },
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
        meta: { title: 'menu.visit_log.visit_title' },
      },
      {
        path: 'wafattacklog',
        name: 'WafAttackLog',
        component: () => import('@/pages/waf/attack/attack_index.vue'),
        meta: { title: 'menu.visit_log.attack_title' },
      },
      {
        path: 'wafattacklogdetail',
        name: 'WafAttackLogDetail',
        component: () => import('@/pages/waf/attack/detail/index.vue'),
        meta: { title: 'menu.visit_log.visit_detail_title', hidden: true },
      },
      {
        path: 'logfilewrite',
        name: 'LogFileWrite',
        component: () => import('@/pages/waf/logfilewrite/index.vue'),
        meta: { title: 'menu.visit_log.logfilewrite_title' },
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
        meta: { title: 'menu.tunnel.list_title' },
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
        component: () => import('@/pages/waf/application/index.vue'),
        meta: { title: 'menu.application.list_title' },
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
        meta: { title: 'menu.access.config' },
      },
      {
        path: 'wafaccessaccount',
        name: 'WafAccessAccount',
        component: () => import('@/pages/waf/access_account/index.vue'),
        meta: { title: 'menu.access.account' },
      },
      {
        path: 'wafaccesssession',
        name: 'WafAccessSession',
        component: () => import('@/pages/waf/access_session/index.vue'),
        meta: { title: 'menu.access.session' },
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
        component: () => import('@/pages/waf/account/index.vue'),
        meta: { title: 'menu.account.account_list_title' },
      },
      {
        path: 'PermissionGroup',
        name: 'PermissionGroup',
        component: () => import('@/pages/waf/permission_group/index.vue'),
        meta: { title: 'menu.account.permission_group_title' },
      },
      {
        path: 'AccountLog',
        name: 'AccountLog',
        component: () => import('@/pages/waf/accountlog/index.vue'),
        meta: { title: 'menu.account.account_log_title' },
      },
      {
        path: 'LoginHistory',
        name: 'LoginHistory',
        component: () => import('@/pages/waf/login_history/index.vue'),
        meta: { title: 'menu.account.login_history_title' },
      },
      {
        path: 'OTP',
        name: 'OTP',
        component: () => import('@/pages/waf/otp/index.vue'),
        meta: { title: 'menu.account.otp_title' },
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
        meta: { title: 'menu.system.vpconfig_title' },
      },
      {
        path: 'HostGuard',
        name: 'HostGuard',
        component: () => import('@/pages/waf/hostguard/index.vue'),
        meta: { title: 'menu.system.host_guard_title' },
      },
      {
        path: 'FileManage',
        name: 'FileManage',
        component: () => import('@/pages/waf/filemanage/index.vue'),
        meta: { title: 'menu.system.filemanage_title' },
      },
      {
        path: 'IPLocation',
        name: 'IPLocation',
        component: () => import('@/pages/waf/iplocation/index.vue'),
        meta: { title: 'menu.system.iplocation_title' },
      },
      {
        path: 'SysLog',
        name: 'SysLog',
        component: () => import('@/pages/waf/syslog/index.vue'),
        meta: { title: 'menu.system.system_log_title' },
      },
      {
        path: 'wafaccessaudit',
        name: 'WafAccessAudit',
        component: () => import('@/pages/waf/access_audit/index.vue'),
        meta: { title: 'menu.system.security_audit_title' },
      },
      {
        path: 'SystemConfig',
        name: 'SystemConfig',
        component: () => import('@/pages/waf/systemconfig/index.vue'),
        meta: { title: 'menu.system.system_config_title' },
      },
      {
        path: 'UpgradeNotice',
        name: 'UpgradeNotice',
        component: () => import('@/pages/waf/upgradenotice/index.vue'),
        meta: { title: 'menu.system.upgrade_notice_title' },
      },
      {
        path: 'PrivateInfo',
        name: 'PrivateInfo',
        component: () => import('@/pages/waf/private_info/index.vue'),
        meta: { title: 'menu.system.private_info_title' },
      },
      {
        path: 'DataRetention',
        name: 'DataRetention',
        component: () => import('@/pages/waf/data_retention/index.vue'),
        meta: { title: 'menu.system.data_retention_title' },
      },
      {
        path: 'OwaspManage',
        name: 'OwaspManage',
        component: () => import('@/pages/waf/owasp/index.vue'),
        meta: { title: 'menu.system.owasp_title' },
      },
      {
        path: 'AIModelManage',
        name: 'AIModelManage',
        component: () => import('@/pages/waf/ai/index.vue'),
        meta: { title: 'menu.system.ai_title' },
      },
      {
        path: 'RumtimeSysteminfo',
        name: 'RumtimeSysteminfo',
        component: () => import('@/pages/waf/sysruntime/index.vue'),
        meta: { title: 'menu.system.system_runtime_title' },
      },
      {
        path: 'RunDiagnostic',
        name: 'RunDiagnostic',
        component: () => import('@/pages/waf/diagnostic/index.vue'),
        meta: { title: 'menu.system.diagnostic_title' },
      },
      {
        path: 'OneKeyMod',
        name: 'OneKeyMod',
        component: () => import('@/pages/waf/onekeymod/index.vue'),
        meta: { title: 'menu.system.system_one_key_modify_title' },
      },
      {
        path: 'task',
        name: 'Task',
        component: () => import('@/pages/waf/task/index.vue'),
        meta: { title: 'menu.system.task' },
      },
      {
        path: 'sqlquery',
        name: 'SqlQuery',
        component: () => import('@/pages/waf/sqlquery/index.vue'),
        meta: { title: 'menu.system.sql_query_title' },
      },
      {
        path: 'Tenant',
        name: 'Tenant',
        component: () => import('@/pages/waf/tenant/index.vue'),
        // 仅平台角色可见（superAdmin / 带 platform:admin 权限的账号）：
        // meta 用 reactive 包装，探针结果改 hidden 后侧边菜单能实时刷新；
        // 默认先隐藏（fail-closed，与后端权限门同口径），探针通过后再放出
        meta: reactive({ title: 'menu.system.tenant_title', platformOnly: true, hidden: true }),
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
        meta: { title: 'menu.notify.channel_title' },
      },
      {
        path: 'subscription',
        name: 'NotifySubscription',
        component: () => import('@/pages/waf/notify_subscription/index.vue'),
        meta: { title: 'menu.notify.subscription_title' },
      },
      {
        path: 'log',
        name: 'NotifyLog',
        component: () => import('@/pages/waf/notify_log/index.vue'),
        meta: { title: 'menu.notify.log_title' },
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
        meta: { title: 'menu.oplatform.key_title' },
      },
      {
        path: 'log',
        name: 'OPlatformLog',
        component: () => import('@/pages/waf/oplatform/log.vue'),
        meta: { title: 'menu.oplatform.log_title' },
      },
      {
        path: 'doc',
        name: 'OPlatformDoc',
        component: () => import('@/pages/waf/oplatform/doc.vue'),
        meta: { title: 'menu.oplatform.doc_title' },
      },
    ],
  },
];

/**
 * 租户菜单显隐门控。
 *
 * 背景：前端此前没有按角色显隐菜单的机制（菜单全量静态展示，越权由后端 403 兜底），
 * 租户管理接口挂在平台权限门（RequirePermission(platform:admin, systemAdmin)）之后，
 * 普通租户账号不该看到这个菜单，所以这里补一个最小实现：
 * 登录后静默探测一次 tenant/list（平台角色才放行），通过才把菜单 hidden 打开。
 *
 * 设计要点：
 *   - fail-closed：路由默认 hidden，探测失败/403 一律保持隐藏；
 *   - 探测请求带 background，非平台账号的 403 不弹通知只静默；
 *   - 登出/被踢回登录页时复位探针并重新隐藏，换账号登录后重新判定；
 *   - tenant 路由 meta 是 reactive 的，MenuContent 的 computed 读取 hidden，
 *     探针翻转后侧边菜单会实时刷新，无需整页刷新。
 */
export function setupPlatformMenuGate(router: Router) {
  const tenantRoute = wafRoutes
    .find((r) => r.path === 'sys')
    ?.children?.find((r) => r.name === 'Tenant');
  if (!tenantRoute) return;

  let probed = false;

  router.afterEach(() => {
    const toPath = router.currentRoute.value.path;
    if (toPath === '/login') {
      // 登出/令牌失效回登录页：复位探针，避免换账号登录后沿用上一次的判定
      probed = false;
      (tenantRoute.meta as { hidden: boolean }).hidden = true;
      return;
    }
    if (probed) return;
    if (!localStorage.getItem('access_token')) return;
    probed = true;
    tenant_probe_access_api()
      .then((res) => {
        if (res.code === 0) {
          (tenantRoute.meta as { hidden: boolean }).hidden = false;
        }
      })
      .catch(() => {
        // 探测失败保持隐藏（fail-closed），不影响其它功能
      });
  });
}

export default wafRoutes;
