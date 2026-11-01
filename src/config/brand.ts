/**
 * 品牌配置 —— 全站品牌文案的唯一来源。
 *
 * 改名只需改这里的几个字段：界面文案（经 i18n `brand.product`）、
 * 浏览器标题后缀、页脚版权、侧栏文字标识会一并生效。
 * supportEmail / docUrl / serviceUrl 留空即在全站隐藏对应入口。
 */
export interface BrandConfig {
  /** 中文产品名（默认语言使用） */
  nameZh: string;
  /** 英文产品名（English 界面使用） */
  nameEn: string;
  /** 侧栏折叠态的文字徽标 */
  logoBadge: string;
  /** 版权归属主体（页脚 / 登录页） */
  copyrightHolder: string;
  /** 版权起始年份 */
  copyrightStartYear: number;
  /** 技术支持邮箱，留空则全站隐藏邮件联系入口 */
  supportEmail: string;
  /** 在线文档地址，留空则全站隐藏文档入口（顶栏、帮助块、关于弹窗等） */
  docUrl: string;
  /** 在线客服地址，留空则隐藏在线客服入口 */
  serviceUrl: string;
}

export const BRAND: BrandConfig = {
  /** 中文产品名（默认语言使用） */
  nameZh: 'WAF 安全管理平台',
  /** 英文产品名（English 界面使用） */
  nameEn: 'WAF Security Console',
  /** 侧栏折叠态的文字徽标 */
  logoBadge: 'WAF',
  /** 版权归属主体（页脚 / 登录页） */
  copyrightHolder: 'WAF',
  /** 版权起始年份 */
  copyrightStartYear: 2022,
  /** 技术支持邮箱，留空则全站隐藏邮件联系入口 */
  supportEmail: '',
  /** 在线文档地址，留空则全站隐藏文档入口（顶栏、帮助块、关于弹窗等） */
  docUrl: '',
  /** 在线客服地址，留空则隐藏在线客服入口 */
  serviceUrl: '',
};

/** 按当前界面语言返回产品名 */
export function getBrandName(): string {
  const lang = localStorage.getItem('lang') || 'zh_CN';
  return lang.toLowerCase().startsWith('zh') ? BRAND.nameZh : BRAND.nameEn;
}

/** 版权文案（页脚 / 登录页共用） */
export function getCopyright(): string {
  return `Copyright © ${BRAND.copyrightStartYear}-${new Date().getFullYear()} ${BRAND.copyrightHolder}. All Rights Reserved.`;
}
