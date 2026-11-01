<template>
  <div class="login-wrapper">
    <!-- 左侧品牌区：品牌色渐变 + 网格纹理 + 产品价值点（窄屏隐藏） -->
    <section class="login-brand" aria-hidden="true">
      <div class="brand-blob brand-blob--1" />
      <div class="brand-blob brand-blob--2" />
      <div class="brand-grid" />
      <div class="brand-content">
        <!-- 平台「品牌设置」覆盖：Logo 图片 / 品牌名 / 登录欢迎语（未配置走默认） -->
        <img v-if="brandRuntime.logo" :src="brandRuntime.logo" class="brand-logo-img" alt="logo" />
        <span v-else class="brand-badge">{{ BRAND.logoBadge }}</span>
        <h1 class="brand-title">{{ brandDisplayName() }}</h1>
        <p class="brand-tagline">{{ brandRuntime.loginWelcome || t('login.welcome_subtitle') }}</p>
        <ul class="brand-features">
          <li v-for="f in features" :key="f.title" class="brand-feature">
            <span class="brand-feature-icon"><component :is="f.icon" /></span>
            <span class="brand-feature-text">
              <b>{{ f.title }}</b>
              <span>{{ f.desc }}</span>
            </span>
          </li>
        </ul>
      </div>
    </section>

    <!-- 右侧登录区 -->
    <section class="login-side">
      <div class="login-container">
        <h1 class="login-title">{{ adminTitles.admin_title || t('brand.product') }}</h1>
        <p class="login-subtitle">{{ t('login.welcome_title') }}</p>
        <!-- 登录失败的原因就摆在表单上方（视线必经之路），不再飘到右上角去。
             同一时刻只留一条，新的覆盖旧的 -->
        <t-alert v-if="loginError" theme="error" :message="loginError" class="login-error-tip" close @close="loginError = ''" />
        <t-form
          :data="formData"
          :rules="rules"
          label-width="0"
          @submit="onSubmit"
        >
          <t-form-item name="account">
            <t-input v-model="formData.account" size="large" clearable :placeholder="t('login.input_account_placeholder')">
              <template #prefix-icon><user-icon /></template>
            </t-input>
          </t-form-item>
          <t-form-item name="password">
            <t-input
              v-model="formData.password"
              size="large"
              :type="showPsw ? 'text' : 'password'"
              clearable
              :placeholder="t('login.input_password_placeholder')"
            >
              <template #prefix-icon><lock-on-icon /></template>
              <template #suffix-icon>
                <browse-icon v-if="showPsw" style="cursor: pointer" @click="showPsw = !showPsw" />
                <browse-off-icon v-else style="cursor: pointer" @click="showPsw = !showPsw" />
              </template>
            </t-input>
          </t-form-item>
          <!-- 安全码：仅在后端返回需要安全码（code=-2）时显示 -->
          <t-form-item v-if="showSecretCode" name="secretCode">
            <t-input
              v-model="formData.secretCode"
              size="large"
              type="password"
              autocomplete="one-time-code"
              clearable
              :placeholder="t('login.input_secret_code_placeholder')"
            >
              <template #prefix-icon><secured-icon /></template>
            </t-input>
          </t-form-item>
          <t-form-item>
            <t-button block size="large" type="submit" :loading="loading">
              {{ t('login.login_btn_title') }}
            </t-button>
          </t-form-item>
        </t-form>
      </div>

      <footer class="copyright">{{ copyright }}</footer>
    </section>

    <!-- 首次登录/口令到期 强制改密弹窗 -->
    <change-password-dialog
      v-model:visible="showChangePwd"
      :forced="true"
      :reason="changePwdReason"
      :preset-old-password="formData.password"
      @success="onChangePwdSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps } from 'tdesign-vue-next';
import {
  ChartBarIcon,
  InternetIcon,
  SecuredIcon,
  UserIcon,
  LockOnIcon,
  BrowseIcon,
  BrowseOffIcon,
} from 'tdesign-icons-vue-next';
import { useUserStore } from '@/store/modules/user';
import { CODE } from '@/utils/request';
import { getSafeRedirectUrl } from '@/constants';
import { takeLogoutReason } from '@/utils/localnotice';
import { adminTitles } from '@/utils/adminTitles';
import { BRAND } from '@/config/brand';
import { brandCopyrightText, brandDisplayName, brandRuntime, loadBrandLogo } from '@/config/brandRuntime';
import ChangePasswordDialog from '@/pages/waf/account/components/ChangePasswordDialog.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

// 品牌运行态：Logo/名称/欢迎语/版权（未配置回落静态默认）
const copyright = brandCopyrightText();
void loadBrandLogo();

/** 品牌区价值点：标题 + 描述走 i18n，图标用 TDesign 内置图标 */
const features = computed(() => [
  { icon: InternetIcon, title: t('login.feature_access_title'), desc: t('login.feature_access_desc') },
  { icon: SecuredIcon, title: t('login.feature_block_title'), desc: t('login.feature_block_desc') },
  { icon: ChartBarIcon, title: t('login.feature_analytics_title'), desc: t('login.feature_analytics_desc') },
]);

const loading = ref(false);
const showPsw = ref(false);
const showSecretCode = ref(false);
const showChangePwd = ref(false);
const changePwdReason = ref('');
const loginError = ref('');

// 被踢回登录页时告诉用户一次「为什么」——右上角那一串回声已被抑制，
// 但「登录状态已失效」这条本身是有信息量的，摆在表单上方说一次
if (takeLogoutReason() === 'auth') {
  loginError.value = t('login.session_expired');
}

const formData = reactive({
  account: '',
  password: '',
  secretCode: '',
});

const rules: FormProps['rules'] = {
  account: [{ required: true, message: t('login.rule.account'), type: 'error' }],
  password: [{ required: true, message: t('login.rule.password'), type: 'error' }],
};

const onSubmit: FormProps['onSubmit'] = async ({ validateResult }) => {
  if (validateResult !== true) return;
  loading.value = true;
  loginError.value = '';
  try {
    const res = await userStore.login({
      login_account: formData.account,
      login_password: formData.password,
      login_otp_secret_code: formData.secretCode,
    });
    if (res.code === CODE.REQUEST_SUCCESS) {
      // 首次登录/口令到期：强制改密，改密成功后再进入系统
      if (res.data?.need_change_password) {
        changePwdReason.value = res.data.change_password_reason || '';
        showChangePwd.value = true;
        return;
      }
      MessagePlugin.success(t('login.login_success'));
      const redirect = (route.query.redirect as string) || getSafeRedirectUrl();
      router.replace(redirect);
    } else if (res.code === CODE.NEED_OTP_CODE) {
      // 该账号开启了 2FA，显示安全码输入框让用户补填
      showSecretCode.value = true;
      formData.secretCode = '';
      loginError.value = res.msg;
    } else {
      loginError.value = res.msg || 'Login failed';
    }
  } catch (e: any) {
    // 连不上后端 / 超时：登录页没有铃铛可收，直接摆在表单上方
    loginError.value = t('login.login_request_failed');
  } finally {
    loading.value = false;
  }
};

// 强制改密成功后进入系统
function onChangePwdSuccess() {
  MessagePlugin.success(t('login.login_success'));
  const redirect = (route.query.redirect as string) || getSafeRedirectUrl();
  router.replace(redirect);
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  height: 100vh;
  background: var(--td-bg-color-page);
}

/* ===== 左侧品牌区 ===== */
.login-brand {
  position: relative;
  flex: 1 1 55%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: var(--td-text-color-anti);
  background: linear-gradient(160deg, var(--td-brand-color-7) 0%, var(--td-brand-color-9) 55%, var(--td-brand-color-10) 100%);
}

/* 网格纹理：中心亮、四周淡出 */
.brand-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
  background-size: 36px 36px;
  -webkit-mask-image: radial-gradient(ellipse at 35% 40%, #000 25%, transparent 72%);
  mask-image: radial-gradient(ellipse at 35% 40%, #000 25%, transparent 72%);
}

.brand-blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.brand-blob--1 {
  width: 460px;
  height: 460px;
  right: -140px;
  top: -160px;
  background: radial-gradient(circle at 32% 32%, rgba(255, 255, 255, 0.16), transparent 62%);
}

.brand-blob--2 {
  width: 560px;
  height: 560px;
  left: -180px;
  bottom: -220px;
  background: radial-gradient(circle, rgba(0, 0, 0, 0.16), transparent 62%);
}

.brand-content {
  position: relative;
  max-width: 460px;
  padding: 48px 40px;
}

.brand-logo-img {
  max-height: 44px;
  max-width: 180px;
  object-fit: contain;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
}

.brand-title {
  margin: 22px 0 12px;
  font-size: 34px;
  line-height: 1.25;
  letter-spacing: 0.5px;
}

.brand-tagline {
  margin: 0 0 44px;
  font-size: 15px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.78);
}

.brand-features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 24px;
}

.brand-feature {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.brand-feature-icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.14);
  font-size: 20px;
}

.brand-feature-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-feature-text b {
  font-size: 15px;
  font-weight: 600;
}

.brand-feature-text > span {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
}

/* ===== 右侧登录区 ===== */
.login-side {
  position: relative;
  flex: 1 1 45%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.login-container {
  width: 400px;
  max-width: 100%;
  padding: 40px 32px 32px;
  border-radius: var(--td-radius-large);
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-component-stroke);
  box-shadow: var(--td-shadow-1);
}

.login-title {
  margin: 0 0 6px;
  font-size: 22px;
  text-align: center;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.login-subtitle {
  margin: 0 0 28px;
  text-align: center;
  color: var(--td-text-color-secondary);
  font-size: 13px;
}

.copyright {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 24px;
  text-align: center;
  color: var(--td-text-color-placeholder);
  font-size: 12px;
}

.login-error-tip {
  margin-bottom: 16px;
}

/* 窄屏：隐藏品牌区，登录卡片居中承担全部信息 */
@media (max-width: 900px) {
  .login-brand {
    display: none;
  }
}
</style>
