import { defineStore } from 'pinia';

import { probe_permissions } from '@/apis/permission_probe';

/**
 * 当前账号的有效权限面（SaaS 租户权限差异化）。
 *
 * 数据来源是登录后的权限探针套件（apis/permission_probe.ts）：
 * 每个权限码探一个只读端点，按业务码判定。探针结果反映的是
 * 「当前令牌真实能访问什么」——天然包含后端的权限组判定与套餐天花板，
 * 前端不需要理解租户/套餐/权限组的细节。
 *
 * 生命周期：登录后首次路由导航触发 ensureLoaded()（路由门控里 await），
 * 登出/被踢回 /login 时 reset()，换账号登录后重新探测。
 * 不落 localStorage：权限面跟随会话，避免换账号/套餐调整后沿用旧判定。
 */
export const usePermissionStore = defineStore('permission', {
  state: () => ({
    /** code → 是否有权；未加载完成时视为全部无权（fail-closed） */
    perms: {} as Record<string, boolean>,
    /** 探测是否完成（完成前菜单按无权隐藏，导航守卫会等待） */
    loaded: false,
    /** 进行中的探测 Promise：导航守卫与菜单首次渲染共用，避免重复打探测 */
    probing: null as Promise<void> | null,
  }),
  getters: {
    /**
     * 是否拥有指定权限码。code 为空（路由未标注 permission，仅需登录态）恒 true；
     * 探测未完成或未授予一律 false——与后端 RequirePermission 的 fail-closed 同口径。
     */
    has: (state) => (code?: string) => {
      if (!code) return true;
      return state.perms[code] === true;
    },
    /** 是否平台侧账号（platform:admin：租户/套餐/SQL/开放平台等平台域可达） */
    isPlatform: (state) => state.perms['platform:admin'] === true,
  },
  actions: {
    /** 确保探测完成（幂等：进行中/已完成直接复用） */
    async ensureLoaded() {
      if (this.loaded) return;
      if (!this.probing) {
        this.probing = (async () => {
          try {
            this.perms = await probe_permissions();
          } finally {
            this.loaded = true;
            this.probing = null;
          }
        })();
      }
      await this.probing;
    },
    /** 登出/回到登录页时复位，换账号后重新探测 */
    reset() {
      this.perms = {};
      this.loaded = false;
      this.probing = null;
    },
  },
});
