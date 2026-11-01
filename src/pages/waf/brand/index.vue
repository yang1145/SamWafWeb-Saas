<template>
  <div>
    <t-card class="list-card-container">
      <!-- 页面级说明：品牌内容覆盖点一览 -->
      <help-block
        :summary="t('page.brand.help_summary')"
        :items="helpItems"
        :title="t('page.brand.title')"
        storage-key="brand"
      ></help-block>

      <t-form :data="formData" :label-width="140" colon @submit="onSubmit">
        <t-form-item :label="t('page.brand.name')" name="brand_name">
          <t-input
            v-model="formData.brand_name"
            :style="{ width: '480px' }"
            :maxlength="64"
            :placeholder="t('page.brand.name_placeholder')"
          ></t-input>
          <div class="form-hint">{{ t('page.brand.name_hint') }}</div>
        </t-form-item>

        <t-form-item :label="t('page.brand.logo')" name="brand_logo">
          <div>
            <div class="logo-preview-box">
              <img v-if="formData.brand_logo" :src="formData.brand_logo" class="logo-preview-img" alt="logo" />
              <span v-else class="logo-preview-badge">{{ BRAND.logoBadge }}</span>
            </div>
            <div class="logo-ops">
              <t-button variant="outline" size="small" @click="logoInput?.click()">
                {{ t('page.brand.logo_upload') }}
              </t-button>
              <t-button v-if="formData.brand_logo" variant="outline" theme="danger" size="small" @click="clearLogo">
                {{ t('page.brand.logo_clear') }}
              </t-button>
              <!-- Logo 不进表单提交通道：选择即转 data URL 随保存一起落库 -->
              <input ref="logoInput" type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" style="display: none" @change="onLogoFile" />
            </div>
            <div class="form-hint">{{ t('page.brand.logo_hint') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.brand.login_welcome')" name="brand_login_welcome">
          <div>
            <t-textarea
              v-model="formData.brand_login_welcome"
              :style="{ width: '480px' }"
              :maxlength="200"
              :autosize="{ minRows: 2, maxRows: 4 }"
              :placeholder="t('page.brand.login_welcome_placeholder')"
            ></t-textarea>
            <div class="form-hint">{{ t('page.brand.login_welcome_hint') }}</div>
          </div>
        </t-form-item>

        <t-form-item :label="t('page.brand.copyright')" name="brand_copyright">
          <div>
            <t-textarea
              v-model="formData.brand_copyright"
              :style="{ width: '480px' }"
              :maxlength="200"
              :autosize="{ minRows: 2, maxRows: 4 }"
              :placeholder="t('page.brand.copyright_placeholder')"
            ></t-textarea>
            <div class="form-hint">{{ t('page.brand.copyright_hint') }}</div>
          </div>
        </t-form-item>

        <t-form-item style="margin-top: 8px">
          <t-button theme="primary" type="submit" :loading="saving">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';

import { brand_get_api, brand_save_api } from '@/apis/brand';
import { BRAND } from '@/config/brand';
import { brandRuntime, loadBrandLogo } from '@/config/brandRuntime';

const { t } = useI18n();

const formData = ref({
  brand_name: '',
  brand_logo: '',
  brand_login_welcome: '',
  brand_copyright: '',
});
const saving = ref(false);
const logoInput = ref<HTMLInputElement | null>(null);

const helpItems = computed(() => [
  { k: t('page.brand.help_k_scope'), v: t('page.brand.help_v_scope') },
  { k: t('page.brand.help_k_effect'), v: t('page.brand.help_v_effect') },
  { k: t('page.brand.help_k_default'), v: t('page.brand.help_v_default') },
]);

onMounted(async () => {
  try {
    const res = await brand_get_api();
    if (res.code === 0 && res.data) {
      formData.value = {
        brand_name: res.data.brand_name || '',
        brand_logo: res.data.brand_logo || '',
        brand_login_welcome: res.data.brand_login_welcome || '',
        brand_copyright: res.data.brand_copyright || '',
      };
    }
  } catch (e) {
    console.log(e);
  }
});

// Logo 客户端预检与 data URL 转换（与后端校验同口径：格式白名单 + 解码后 ≤300KB）
function onLogoFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!/^image\/(png|jpe?g|gif|webp|svg\+xml)$/i.test(file.type)) {
    MessagePlugin.warning(t('page.brand.logo_format_warning'));
    return;
  }
  if (file.size > 300 * 1024) {
    MessagePlugin.warning(t('page.brand.logo_size_warning'));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    formData.value.brand_logo = typeof reader.result === 'string' ? reader.result : '';
  };
  reader.readAsDataURL(file);
}

function clearLogo() {
  formData.value.brand_logo = '';
}

const onSubmit = async () => {
  saving.value = true;
  try {
    const res = await brand_save_api({
      brand_name: formData.value.brand_name,
      brand_logo: formData.value.brand_logo,
      brand_login_welcome: formData.value.brand_login_welcome,
      brand_copyright: formData.value.brand_copyright,
    });
    if (res.code === 0) {
      MessagePlugin.success(res.msg || t('common.success'));
      // 运行态即时生效：侧栏/登录页/浏览器标题响应式刷新（Logo 强制重拉）
      brandRuntime.name = formData.value.brand_name;
      brandRuntime.loginWelcome = formData.value.brand_login_welcome;
      brandRuntime.copyright = formData.value.brand_copyright;
      await loadBrandLogo(true);
    } else {
      MessagePlugin.warning(res.msg);
    }
  } catch (e) {
    console.log(e);
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.form-hint {
  width: 480px;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--td-text-color-placeholder);
}

.logo-preview-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 220px;
  height: 64px;
  padding: 8px 12px;
  border: 1px dashed var(--td-component-stroke);
  border-radius: var(--td-radius-medium);
  background: var(--td-bg-color-container);
}

.logo-preview-img {
  max-height: 44px;
  max-width: 190px;
  object-fit: contain;
}

.logo-preview-badge {
  padding: 4px 12px;
  border-radius: 999px;
  background-color: var(--td-brand-color);
  color: var(--td-text-color-anti);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
}

.logo-ops {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
</style>
