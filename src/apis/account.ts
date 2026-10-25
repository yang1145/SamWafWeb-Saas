import request from '@/utils/request';

/** 查询所有账号列表 */
export function account_list_api(data: Record<string, any>) {
  return request({
    url: 'account/list',
    method: 'post',
    data,
  });
}

/**
 * 添加账号
 * 请求体含 group_id（权限组ID，空=不绑定走旧四角色判定），见账号页表单
 */
export function account_add_api(data: Record<string, any>) {
  return request({
    url: '/account/add',
    method: 'post',
    data,
  });
}

/**
 * 编辑账号
 * 请求体含 group_id（空=解绑并回落旧四角色判定；绑定变化会强制该账号下线）
 */
export function account_edit_api(data: Record<string, any>) {
  return request({
    url: '/account/edit',
    method: 'post',
    data,
  });
}

/** 删除账号 */
export function account_del_api(params: Record<string, any>) {
  return request({
    url: '/account/del',
    method: 'get',
    params,
  });
}

/** 账号详情 */
export function account_detail_api(params: Record<string, any>) {
  return request({
    url: '/account/detail',
    method: 'get',
    params,
  });
}

/** 重置密码 */
export function account_reset_pwd_api(data: Record<string, any>) {
  return request({
    url: '/account/resetpwd',
    method: 'post',
    data,
  });
}

/** 重置2FA */
export function account_reset_2fa_api(data: Record<string, any>) {
  return request({
    url: 'account/resetotp',
    method: 'post',
    data,
  });
}

/** 当前登录账号自助改密（首次登录/口令到期强制改密 或 个人主动修改） */
export function account_change_my_password_api(data: Record<string, any>) {
  return request({
    url: 'account/changemypwd',
    method: 'post',
    data,
  });
}

/** 查询所有账号操作日志列表 */
export function account_log_list_api(params: Record<string, any>) {
  return request({
    url: 'account_log/list',
    method: 'get',
    params,
  });
}

/** 账号操作日志详情 */
export function account_log_detail_api(params: Record<string, any>) {
  return request({
    url: '/account_log/detail',
    method: 'get',
    params,
  });
}
