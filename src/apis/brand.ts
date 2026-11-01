import request from '@/utils/request';

/**
 * 品牌设置（商业化，平台域 /api/v1/brand/*）。
 *
 * 品牌内容（名称/Logo/登录欢迎语/版权文案）配置后在前端页面实时生效：
 * 侧栏文字标识与折叠徽标、登录页主标题/欢迎语/版权、浏览器标题后缀。
 * 保存入参指针语义：null=保留该字段旧值，空串=清除（恢复默认展示）。
 */

/** 平台侧读取品牌设置（含 Logo，编辑回显用） */
export function brand_get_api() {
  return request({
    url: '/brand/get',
    method: 'get',
  });
}

/** 保存品牌设置 */
export function brand_save_api(data: {
  brand_name?: string | null;
  brand_logo?: string | null;
  brand_login_welcome?: string | null;
  brand_copyright?: string | null;
}) {
  return request({
    url: '/brand/save',
    method: 'post',
    data,
  });
}
