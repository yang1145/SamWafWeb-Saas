import request from '@/utils/request';

export interface LoginParams {
  login_account: string;
  login_password: string;
  login_otp_secret_code?: string;
  /** 图形验证码ID（/public/captcha 下发） */
  captcha_id?: string;
  /** 用户输入的图形验证码（单次有效，2 分钟过期） */
  captcha_code?: string;
}

/** 登录图形验证码 */
export interface LoginCaptcha {
  captcha_id: string;
  /** PNG data URL，直接绑到 <img :src>，点击图片换一张 */
  image: string;
}

/** 登录来源提醒：本次 IP/归属地，以及与上次是否一致 */
export interface LoginNotice {
  current_ip: string;
  current_area: string;
  current_time: string;
  last_ip: string;
  last_area: string;
  last_time: string;
  is_first: boolean;
  is_changed: boolean;
}

export interface LoginResult {
  access_token: string;
  need_change_password?: boolean;
  change_password_reason?: string;
  login_notice?: LoginNotice;
  [key: string]: any;
}

/** 登录 */
export function loginapi(params: LoginParams) {
  return request<LoginResult>({
    url: 'public/login',
    method: 'post',
    data: params,
    // 登录页自己在表单上方有内联提示条，右上角再弹一张「无法连接后端」就重复了
    background: true,
  });
}

/** 获取登录图形验证码（免登录；验证码 2 分钟过期、单次有效） */
export function login_captcha_api() {
  return request<LoginCaptcha>({
    url: 'public/captcha',
    method: 'get',
    background: true,
  });
}

/** 注销 */
export function logoutapi() {
  return request({
    url: 'logout',
    method: 'post',
    data: {},
  });
}
