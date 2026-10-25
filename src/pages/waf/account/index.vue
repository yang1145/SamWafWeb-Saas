<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAddAccount"> {{ t('page.account.create_account') }} </t-button>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="120" colon layout="inline" :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.account.login_account_label')" name="login_account">
              <t-input v-model="searchformData.login_account" :placeholder="t('common.placeholder_content')" clearable> </t-input>
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList('all')"> {{ t('common.search') }} </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>

      <div class="table-container">
        <t-table
          :columns="columns"
          :data="data"
          :row-key="rowKey"
          vertical-align="top"
          hover
          :pagination="pagination"
          :selected-row-keys="selectedRowKeys"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
          @select-change="rehandleSelectChange"
        >
          <template #role="{ row }">
            <t-tag theme="primary" variant="light">{{ roleLabel(row.role) }}</t-tag>
          </template>
          <template #group_name="{ row }">
            <t-tag v-if="row.group_name" theme="warning" variant="light">{{ row.group_name }}</t-tag>
            <span v-else>-</span>
          </template>
          <template #op="slotProps">
            <!-- 重置密码/重置2FA 后端仅超管可操作（前者需超管密码、后者按用户名全局删），
                 租户管理员不显示这两个入口，删除本租户普通账号/编辑对租户开放 -->
            <a v-if="permissionStore.isPlatform" class="t-button-link" @click="handleClickResetPwd(slotProps)">{{ t('page.account.reset_password') }}</a>
            <a v-if="permissionStore.isPlatform" class="t-button-link" @click="handleClickResetOtp(slotProps)">{{ t('page.account.reset_otp') }}</a>
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 新建账号弹窗 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('page.account.create_account')" :width="680" :footer="false">
      <!-- autocomplete 必须显式关掉：浏览器看到「文本框 + 紧跟着的密码框」就当成登录表单，
           会把保存的管理端 admin 账号密码填进来。Chrome 只认 new-password（off 对密码框无效）。 -->
      <t-form ref="addForm" :data="formData" :rules="rules" :label-width="150" autocomplete="off" @submit="onSubmit">
        <t-form-item :label="t('page.account.login_account_label')" name="login_account">
          <t-input
            v-model="formData.login_account"
            :style="{ width: '480px' }"
            autocomplete="off"
            :placeholder="t('common.placeholder') + t('page.account.login_account_label')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.account.role')" name="role">
          <!-- 平台侧可选旧四角色；租户管理员建号后端强制 tenantAdmin（防提权），这里锁定展示 -->
          <t-select v-model="formData.role" :disabled="!permissionStore.isPlatform" :style="{ width: '480px' }">
            <t-option v-for="item in roleType" :key="item.value" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
          <div v-if="!permissionStore.isPlatform" class="form-hint">{{ t('page.account.tenant_role_hint') }}</div>
        </t-form-item>
        <t-form-item :label="t('page.account.permission_group')" name="group_id">
          <t-select v-model="formData.group_id" clearable filterable :style="{ width: '480px' }" :placeholder="t('page.account.group_unbind')">
            <t-option v-for="item in groupOptions" :key="item.id" :value="item.id" :label="item.group_name" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.account.login_password')" name="login_password">
          <t-input
            v-model="formData.login_password"
            :style="{ width: '480px' }"
            type="password"
            autocomplete="new-password"
            :placeholder="t('common.placeholder') + t('page.account.login_password')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('common.status')" name="status">
          <t-input-number
            v-model="formData.status"
            :style="{ width: '480px' }"
            :placeholder="t('common.placeholder') + t('common.status')"
          ></t-input-number>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea
            v-model="formData.remarks"
            :style="{ width: '480px' }"
            :placeholder="t('common.placeholder') + t('common.remarks')"
            name="remarks"
          >
          </t-textarea>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 编辑账号弹窗 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="rules" :label-width="150" @submit="onSubmitEdit">
        <t-form-item :label="t('page.account.login_account_label')" name="login_account">
          <t-input
            v-model="formEditData.login_account"
            :style="{ width: '480px' }"
            :placeholder="t('common.placeholder') + t('page.account.login_account_label')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.account.role')" name="role">
          <!-- 角色变更后端仅超管可为：租户管理员侧锁定只读展示；编辑用全量角色集（含 tenantAdmin） -->
          <t-select v-model="formEditData.role" :disabled="!permissionStore.isPlatform" :style="{ width: '480px' }">
            <t-option v-for="item in allRoleLabels" :key="item.value" :value="item.value" :label="item.label">
              {{ item.label }}
            </t-option>
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.account.permission_group')" name="group_id">
          <t-select v-model="formEditData.group_id" clearable filterable :style="{ width: '480px' }" :placeholder="t('page.account.group_unbind')">
            <t-option v-for="item in groupOptions" :key="item.id" :value="item.id" :label="item.group_name" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('common.status')" name="status">
          <t-input-number
            v-model="formEditData.status"
            :style="{ width: '480px' }"
            :placeholder="t('common.placeholder') + t('common.status')"
          ></t-input-number>
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remarks">
          <t-textarea
            v-model="formEditData.remarks"
            :style="{ width: '480px' }"
            :placeholder="t('common.placeholder') + t('common.remarks')"
            name="remarks"
          >
          </t-textarea>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="onClickCloseEditBtn">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 重置密码弹窗 -->
    <t-dialog v-model:visible="resetPwdFormVisible" :header="t('page.account.reset_password')" :width="680" :footer="false">
      <t-form ref="resetPwdForm" :data="formResetPwdData" :rules="resetPwdRules" :label-width="150" @submit="onSubmitResetPwd">
        <t-form-item :label="t('page.account.login_account_label')" name="login_account">
          <t-input
            v-model="formResetPwdData.login_account"
            :style="{ width: '480px' }"
            autocomplete="off"
            :placeholder="t('common.placeholder') + t('page.account.login_account_label')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.account.super_admin_password')" name="login_super_password">
          <t-input
            v-model="formResetPwdData.login_super_password"
            :style="{ width: '480px' }"
            type="password"
            autocomplete="new-password"
            :placeholder="t('common.placeholder') + t('page.account.super_admin_password')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.account.new_password')" name="login_new_password">
          <t-input
            v-model="formResetPwdData.login_new_password"
            :style="{ width: '480px' }"
            type="password"
            autocomplete="new-password"
            :placeholder="t('common.placeholder') + t('page.account.new_password')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.account.confirm_password')" name="login_new_password2">
          <t-input
            v-model="formResetPwdData.login_new_password2"
            :style="{ width: '480px' }"
            type="password"
            autocomplete="new-password"
            :placeholder="t('common.placeholder') + t('page.account.confirm_password')"
          ></t-input>
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="resetPwdFormVisible = false">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    >
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormProps, PageInfo, TableProps } from 'tdesign-vue-next';

import {
  account_add_api,
  account_del_api,
  account_detail_api,
  account_edit_api,
  account_list_api,
  account_reset_2fa_api,
  account_reset_pwd_api,
} from '@/apis/account';
import { permission_group_options_api } from '@/apis/permission_group';
import { usePermissionStore } from '@/store/modules/permission';

const { t } = useI18n();
// 平台/租户视角（登录后权限探针）：平台侧可建旧四角色账号并用超管密码重置；
// 租户管理员仅可管理本租户账号（后端按请求租户收敛数据面），角色强制 tenantAdmin
const permissionStore = usePermissionStore();

const INITIAL_DATA = {
  login_account: '',
  login_password: '',
  role: '',
  group_id: '',
  status: 1,
  remarks: '',
};

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const resetPwdFormVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formResetPwdData = ref({
  login_account: '',
  login_super_password: '',
  login_new_password: '',
  login_new_password2: '',
  id: '',
});

const rules: FormProps['rules'] = {
  login_account: [
    { required: true, message: t('common.placeholder') + t('page.account.login_account_label'), type: 'error' },
  ],
  login_password: [{ required: true, message: t('common.placeholder') + t('page.account.login_password'), type: 'error' }],
};

const resetPwdRules: FormProps['rules'] = {
  login_account: [
    { required: true, message: t('common.placeholder') + t('page.account.login_account_label'), type: 'error' },
  ],
  login_super_password: [
    { required: true, message: t('common.placeholder') + t('page.account.super_admin_password'), type: 'error' },
  ],
  login_new_password: [{ required: true, message: t('common.placeholder') + t('page.account.new_password'), type: 'error' }],
  login_new_password2: [
    { required: true, message: t('common.placeholder') + t('page.account.confirm_password'), type: 'error' },
  ],
};

// 全部角色的展示映射（表格标签 + 编辑弹窗下拉）：含租户管理员——多租户下
// 租户内账号都是 tenantAdmin 角色
const allRoleLabels = computed(() => [
  { label: t('page.account.role_super_admin'), value: 'superAdmin' },
  { label: t('page.account.role_system_admin'), value: 'systemAdmin' },
  { label: t('page.account.role_security_admin'), value: 'securityAdmin' },
  { label: t('page.account.role_audit_admin'), value: 'auditAdmin' },
  { label: t('page.account.role_tenant_admin'), value: 'tenantAdmin' },
]);

// 新建弹窗的角色可选项：平台侧给旧四角色（租户管理员账号由「租户管理」开通流程创建）；
// 租户管理员建号后端强制 tenantAdmin（防提权），这里只给锁定项
const roleType = computed(() =>
  permissionStore.isPlatform
    ? allRoleLabels.value.filter((o) => o.value !== 'tenantAdmin')
    : allRoleLabels.value.filter((o) => o.value === 'tenantAdmin'),
);

// 列表里存的是 superAdmin 这类原始值，直接显示用户看不懂，转成配置里的中文名
function roleLabel(v: string) {
  const found = allRoleLabels.value.find((o) => o.value === v);
  return found ? found.label : v || '-';
}

// 权限组下拉（/permission/group/options）：绑组后按组权限码判定，清空=不绑定走旧角色
const groupOptions = ref<Record<string, any>[]>([]);

function fetchGroupOptions() {
  permission_group_options_api()
    .then((res) => {
      if (res.code === 0) {
        groupOptions.value = res.data ?? [];
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'id';

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.account.login_account_label'), align: 'left', width: 200, ellipsis: true, colKey: 'login_account' },
  { title: t('page.account.role'), align: 'left', width: 160, ellipsis: true, colKey: 'role', cell: 'role' },
  { title: t('page.account.permission_group'), align: 'left', width: 160, ellipsis: true, colKey: 'group_name' },
  { title: t('common.remarks'), width: 180, ellipsis: true, colKey: 'remarks' },
  { title: t('common.create_time'), width: 180, ellipsis: true, colKey: 'create_time' },
  { align: 'left', width: 200, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

const searchformData = reactive({
  login_account: '',
});

const deleteIdx = ref(-1);

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

onMounted(() => {
  getList('');
  fetchGroupOptions();
});

function getList(keyword?: string) {
  if (keyword === 'all') {
    pagination.current = 1;
  }
  dataLoading.value = true;
  account_list_api({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    ...searchformData,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      dataLoading.value = false;
    });
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  if (pagination.pageSize !== curr.pageSize) {
    pagination.current = 1;
    pagination.pageSize = curr.pageSize;
  }
  getList('');
}

function rehandleSelectChange(val: (string | number)[]) {
  selectedRowKeys.value = val;
}

function handleClickEdit(e: { row: Record<string, any> }) {
  const { id } = e.row;
  editFormVisible.value = true;
  getDetail(id);
}

function handleAddAccount() {
  addFormVisible.value = true;
  // 租户管理员建号：角色预置并锁定 tenantAdmin；平台侧保持可选
  formData.value = { ...INITIAL_DATA, role: permissionStore.isPlatform ? '' : 'tenantAdmin' };
}

function handleClickResetPwd(e: { row: Record<string, any> }) {
  const { id } = e.row;
  resetPwdFormVisible.value = true;
  getDetailModifyPwd(id);
}

function handleClickResetOtp(e: { row: Record<string, any> }) {
  const { login_account } = e.row;
  account_reset_2fa_api({ login_account }).then((res) => {
    if (res.code === 0) {
      MessagePlugin.success(res.msg);
      getList('');
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    account_add_api({ ...formData.value })
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          addFormVisible.value = false;
          pagination.current = 1;
          getList('');
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => {
        console.log(e);
      });
  } else {
    MessagePlugin.warning(firstError);
  }
};

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    account_edit_api({ ...formEditData.value })
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          editFormVisible.value = false;
          getList('');
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => {
        console.log(e);
      });
  } else {
    MessagePlugin.warning(firstError);
  }
};

/** 重置密码 */
const onSubmitResetPwd: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    if (formResetPwdData.value.login_new_password !== formResetPwdData.value.login_new_password2) {
      MessagePlugin.warning(t('page.account.password_mismatch_warning'));
      return;
    }
    account_reset_pwd_api({ ...formResetPwdData.value })
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          resetPwdFormVisible.value = false;
          formResetPwdData.value.login_super_password = '';
          formResetPwdData.value.login_new_password = '';
          formResetPwdData.value.login_new_password2 = '';
          pagination.current = 1;
          getList('');
        } else {
          MessagePlugin.warning(res.msg);
        }
      })
      .catch((e: Error) => {
        console.log(e);
      });
  } else {
    MessagePlugin.warning(firstError);
  }
};

function onClickCloseBtn() {
  addFormVisible.value = false;
  formData.value = { ...INITIAL_DATA };
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = { ...INITIAL_DATA };
}

function handleClickDelete(e: { rowIndex: number }) {
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const { id } = data.value[deleteIdx.value];
  account_del_api({ id })
    .then((res) => {
      if (res.code === 0) {
        getList('');
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
  resetIdx();
}

function onCancel() {
  resetIdx();
}

function resetIdx() {
  deleteIdx.value = -1;
}

function getDetail(id: string | number) {
  account_detail_api({ id })
    .then((res) => {
      if (res.code === 0) {
        // 未绑定权限组时后端返回空，归一成 '' 让下拉走占位文案
        formEditData.value = { ...res.data, group_id: res.data?.group_id || '' };
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function getDetailModifyPwd(id: string | number) {
  account_detail_api({ id })
    .then((res) => {
      if (res.code === 0) {
        formResetPwdData.value.login_account = res.data.login_account;
        formResetPwdData.value.id = String(id);
        formResetPwdData.value.login_super_password = '';
        formResetPwdData.value.login_new_password = '';
        formResetPwdData.value.login_new_password2 = '';
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}
</script>

<style scoped>
.left-operation-container {
  padding: 0 0 6px 0;
  margin-bottom: 16px;
}

.search-input {
  width: 360px;
}

.t-button + .t-button {
  margin-left: 8px;
}

.form-hint {
  width: 480px;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--td-text-color-placeholder);
}
</style>
