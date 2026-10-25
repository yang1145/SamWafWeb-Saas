import request from '@/utils/request';

// ===== 权限组管理（多租户自定义角色） =====
// 后端契约：permissions 是权限码的英文逗号分隔字符串，非法码后端整单拒绝；
// 列表/详情行含 built_in（1=系统预置组，不允许删除）。

/** 查询权限组列表 */
export function permission_group_list_api(data: Record<string, any>) {
  return request({
    url: 'permission/group/list',
    method: 'post',
    data,
  });
}

/** 权限组详情 */
export function permission_group_detail_api(params: Record<string, any>) {
  return request({
    url: '/permission/group/detail',
    method: 'get',
    params,
  });
}

/** 添加权限组 */
export function permission_group_add_api(data: Record<string, any>) {
  return request({
    url: '/permission/group/add',
    method: 'post',
    data,
  });
}

/** 编辑权限组 */
export function permission_group_edit_api(data: Record<string, any>) {
  return request({
    url: '/permission/group/edit',
    method: 'post',
    data,
  });
}

/** 删除权限组（后端为 POST；预置组与仍被账号绑定的组会被拒绝） */
export function permission_group_del_api(params: Record<string, any>) {
  return request({
    url: '/permission/group/del',
    method: 'post',
    params,
  });
}

/** 启用中的权限组下拉（id+group_name+permissions），供账号绑定选择 */
export function permission_group_options_api() {
  return request({
    url: '/permission/group/options',
    method: 'get',
  });
}

/** 全部权限码目录（[{code, name}]），供权限组/开放平台 Key 的授权范围多选 */
export function permission_group_codes_api() {
  return request({
    url: '/permission/group/codes',
    method: 'get',
  });
}
