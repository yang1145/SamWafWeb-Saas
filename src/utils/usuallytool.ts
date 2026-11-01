import { API_HOST } from '@/config/host';
import { BRAND } from '@/config/brand';

/** 深拷贝对象 */
export function copyObj<T>(obj: T): T {
  const newObj: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (typeof obj[key] !== 'object' || obj[key] === null) {
      newObj[key] = obj[key];
    } else {
      newObj[key] = copyObj(obj[key]);
    }
  }
  return newObj;
}

/** 获取 API 基础地址（用于文件上传等需要拼完整 URL 的场景） */
export function getBaseUrl() {
  return API_HOST;
}

/** 获取在线文档前缀（brand.docUrl 留空时返回空串，各入口据此隐藏） */
export function getOnlineUrl() {
  return BRAND.docUrl;
}

/** 判断是否是对象 */
export const isObject = (obj: any, isEffective = false): boolean => {
  if (Object.prototype.toString.call(obj) === '[object Object]') {
    if (isEffective) {
      return !!Object.keys(obj).length;
    }
    return true;
  }
  return false;
};

/** value 是否在 list 中 */
export const isInList = (value: string, list: string[]): boolean => list.includes(value);

/**
 * 取对象字段值（转字符串），不存在时返回默认值（转字符串）
 * 与 Vue2 版本行为一致：返回值始终为 string
 */
export const getOrDefault = (obj: Record<string, any> = {}, key = '', defaultValue: any = 1): string => {
  return obj[key] !== undefined ? obj[key].toString() : defaultValue.toString();
};
