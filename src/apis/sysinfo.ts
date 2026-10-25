import request from '@/utils/request';

/** 查询版本信息 */
export function SysVersionApi(params?: Record<string, any>) {
  return request({
    url: 'sysinfo/version',
    method: 'get',
    params,
  });
}

/** 查询系统运行环境信息（操作系统/内核/容器/运行时长等） */
export function SysRuntimeInfoApi() {
  return request({
    url: 'sysinfo/runtimeinfo',
    method: 'get',
  });
}


/** 获取登录后的系统参数（含应急路径等） */
export function GetSystemParamsApi() {
  return request({ url: 'sysinfo/systemparams', method: 'get' });
}

