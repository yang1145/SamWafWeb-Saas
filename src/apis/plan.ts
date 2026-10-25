import request from '@/utils/request';

/**
 * 套餐管理（平台域，platform:admin 权限门之后的 /api/v1/plan/*）。
 *
 * 套餐是租户差异化的配置源：
 *   - permissions：该套餐租户可持有的权限码上限（后端限制在租户可分配集内，
 *     platform:admin / permission:manage / system:config 等平台码会被整单拒绝）；
 *   - max_hosts / max_accounts / grace_days：开通租户时的配额与宽限默认值
 *     （显式传值优先，0 = 不限）；
 *   - 编辑权限集会同步刷新引用该套餐的全部租户的管理员权限组；配额变化不回写存量租户；
 *   - 仍有租户引用的套餐不可删除。
 */

/** 套餐行（plans 表，平台豁免模型） */
export interface PlanItem {
  id: string;
  plan_code: string;
  plan_name: string;
  status: number; // 1启用 0停用
  permissions: string; // 逗号分隔权限码
  max_hosts: number; // 0=不限
  max_accounts: number; // 0=不限
  grace_days: number;
  remarks: string;
  create_time?: string;
  update_time?: string;
}

/** 套餐新增入参 */
export interface PlanAddParams {
  plan_code: string;
  plan_name: string;
  permissions: string;
  max_hosts: number;
  max_accounts: number;
  grace_days: number;
  status?: number;
  remarks?: string;
}

/** 套餐编辑入参（指针语义：null=不修改） */
export interface PlanEditParams {
  id: string;
  plan_name: string;
  permissions: string;
  max_hosts?: number | null;
  max_accounts?: number | null;
  grace_days?: number | null;
  status?: number | null;
  remarks?: string;
}

/** 分页查询套餐 */
export function plan_list_api(data: { pageIndex: number; pageSize: number; plan_name?: string; status?: number | null }) {
  return request({
    url: 'plan/list',
    method: 'post',
    data,
  });
}

/** 套餐详情 */
export function plan_detail_api(params: { id: string }) {
  return request({
    url: '/plan/detail',
    method: 'get',
    params,
  });
}

/** 新增套餐 */
export function plan_add_api(data: PlanAddParams) {
  return request({
    url: '/plan/add',
    method: 'post',
    data,
  });
}

/** 编辑套餐（权限集变化会同步到引用该套餐的租户） */
export function plan_edit_api(data: PlanEditParams) {
  return request({
    url: '/plan/edit',
    method: 'post',
    data,
  });
}

/** 删除套餐（仍有租户引用会被拒绝） */
export function plan_del_api(params: { id: string }) {
  return request({
    url: '/plan/del',
    method: 'post',
    params,
  });
}
