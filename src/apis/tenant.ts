import request from '@/utils/request';

// ===== 租户管理（平台视角生命周期：开通/续期/编辑/注销） =====
// 后端契约要点：
//   - add：建租户行 + 复制预置权限组 + 建租户管理员账号（admin_account/admin_password 必填）
//   - edit：max_hosts/max_accounts/grace_days/status/expire_time 为指针字段，传 null=不修改；
//           expire_time 传空串=永久
//   - renew：expire_time（绝对时间）与 add_days（顺延天数）二选一，都传时绝对时间优先
//   - del：注销为软删除（status=-1），平台自身租户后端会拒绝
// 状态：1 正常 / 0 停用 / 2 已过期 / -1 已注销

/** 查询租户列表（平台视角全量） */
export function tenant_list_api(data: Record<string, any>) {
  return request({
    url: 'tenant/list',
    method: 'post',
    data,
  });
}

/** 租户详情（按记录ID） */
export function tenant_detail_api(params: Record<string, any>) {
  return request({
    url: '/tenant/detail',
    method: 'get',
    params,
  });
}

/** 开通租户 */
export function tenant_add_api(data: Record<string, any>) {
  return request({
    url: '/tenant/add',
    method: 'post',
    data,
  });
}

/** 编辑租户（指针字段：null=不修改） */
export function tenant_edit_api(data: Record<string, any>) {
  return request({
    url: '/tenant/edit',
    method: 'post',
    data,
  });
}

/** 注销租户（软删除；后端为 POST，平台自身租户会被拒绝） */
export function tenant_del_api(params: Record<string, any>) {
  return request({
    url: '/tenant/del',
    method: 'post',
    params,
  });
}

/** 续期租户：expire_time 与 add_days 二选一 */
export function tenant_renew_api(data: Record<string, any>) {
  return request({
    url: '/tenant/renew',
    method: 'post',
    data,
  });
}

/**
 * 探测当前登录账号是否有平台管理权限（tenant/list 仅平台角色可调）。
 * 仅用于租户菜单的显隐门控：background 静默探测，403 不打扰用户。
 */
export function tenant_probe_access_api() {
  return request({
    url: 'tenant/list',
    method: 'post',
    data: { pageIndex: 1, pageSize: 1 },
    background: true,
  });
}
