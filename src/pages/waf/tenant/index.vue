<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd"> {{ t('page.tenant.provision_tenant') }} </t-button>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="120" colon layout="inline" :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.tenant.tenant_name')" name="tenant_name">
              <t-input v-model="searchformData.tenant_name" :placeholder="t('common.placeholder_content')" clearable> </t-input>
            </t-form-item>
            <t-form-item :label="t('common.status')" name="status">
              <t-select v-model="searchformData.status" clearable :style="{ width: '140px' }">
                <t-option v-for="item in statusOptions" :key="item.value" :value="item.value" :label="item.label" />
              </t-select>
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
          row-key="id"
          vertical-align="top"
          hover
          :pagination="pagination"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
        >
          <template #status="{ row }">
            <t-tag :theme="statusTheme(row.status)">{{ statusLabel(row.status) }}</t-tag>
          </template>
          <template #quota="{ row }">
            {{ quotaText(row.max_hosts, row.max_accounts) }}
          </template>
          <template #expire_time="{ row }">
            {{ row.expire_time || t('page.tenant.never_expire') }}
          </template>
          <template #grace_days="{ row }">
            {{ row.grace_days > 0 ? row.grace_days + ' ' + t('page.tenant.days') : t('page.tenant.no_grace') }}
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleClickRenew(slotProps)">{{ t('common.renew') }}</a>
            <a class="t-button-link" style="color: #e34d59" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 开通租户弹窗 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('page.tenant.provision_tenant')" :width="680" :footer="false">
      <t-form ref="addForm" :data="formData" :rules="addRules" :label-width="150" autocomplete="off" @submit="onSubmit">
        <t-form-item :label="t('page.tenant.tenant_id')" name="tenant_id">
          <t-input
            v-model="formData.tenant_id"
            :style="{ width: '480px' }"
            :placeholder="t('page.tenant.tenant_id_placeholder')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.tenant.tenant_name')" name="tenant_name">
          <t-input
            v-model="formData.tenant_name"
            :style="{ width: '480px' }"
            :placeholder="t('common.placeholder') + t('page.tenant.tenant_name')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.tenant.max_hosts')" name="max_hosts">
          <t-input-number
            v-model="formData.max_hosts"
            :style="{ width: '480px' }"
            :min="0"
            :placeholder="t('page.tenant.quota_placeholder')"
          ></t-input-number>
        </t-form-item>
        <t-form-item :label="t('page.tenant.max_accounts')" name="max_accounts">
          <t-input-number
            v-model="formData.max_accounts"
            :style="{ width: '480px' }"
            :min="0"
            :placeholder="t('page.tenant.quota_placeholder')"
          ></t-input-number>
        </t-form-item>
        <t-form-item :label="t('page.tenant.expire_time')" name="expire_time">
          <t-date-picker
            v-model="formData.expire_time"
            :style="{ width: '480px' }"
            clearable
            enable-time-picker
            value-type="YYYY-MM-DD HH:mm:ss"
            :placeholder="t('page.tenant.expire_time_placeholder')"
          />
        </t-form-item>
        <t-form-item :label="t('page.tenant.grace_days')" name="grace_days">
          <t-input-number
            v-model="formData.grace_days"
            :style="{ width: '480px' }"
            :min="0"
            :placeholder="t('page.tenant.grace_days_placeholder')"
          ></t-input-number>
        </t-form-item>
        <t-form-item :label="t('page.tenant.admin_account')" name="admin_account">
          <t-input
            v-model="formData.admin_account"
            :style="{ width: '480px' }"
            autocomplete="off"
            :placeholder="t('common.placeholder') + t('page.tenant.admin_account')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.tenant.admin_password')" name="admin_password">
          <t-input
            v-model="formData.admin_password"
            :style="{ width: '480px' }"
            type="password"
            autocomplete="new-password"
            :placeholder="t('common.placeholder') + t('page.tenant.admin_password')"
          ></t-input>
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

    <!-- 编辑租户弹窗 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="editRules" :label-width="150" @submit="onSubmitEdit">
        <t-form-item :label="t('page.tenant.tenant_id')" name="tenant_id">
          <t-input v-model="formEditData.tenant_id" :style="{ width: '480px' }" :disabled="true"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.tenant.tenant_name')" name="tenant_name">
          <t-input
            v-model="formEditData.tenant_name"
            :style="{ width: '480px' }"
            :placeholder="t('common.placeholder') + t('page.tenant.tenant_name')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('common.status')" name="status">
          <t-radio-group v-model="formEditData.status">
            <t-radio :value="1">{{ t('page.tenant.status_active') }}</t-radio>
            <t-radio :value="0">{{ t('page.tenant.status_suspended') }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item :label="t('page.tenant.max_hosts')" name="max_hosts">
          <t-input-number v-model="formEditData.max_hosts" :style="{ width: '480px' }" :min="0" />
        </t-form-item>
        <t-form-item :label="t('page.tenant.max_accounts')" name="max_accounts">
          <t-input-number v-model="formEditData.max_accounts" :style="{ width: '480px' }" :min="0" />
        </t-form-item>
        <t-form-item :label="t('page.tenant.expire_time')" name="expire_time">
          <t-date-picker
            v-model="formEditData.expire_time"
            :style="{ width: '480px' }"
            clearable
            enable-time-picker
            value-type="YYYY-MM-DD HH:mm:ss"
            :placeholder="t('page.tenant.expire_time_placeholder')"
          />
        </t-form-item>
        <t-form-item :label="t('page.tenant.grace_days')" name="grace_days">
          <t-input-number v-model="formEditData.grace_days" :style="{ width: '480px' }" :min="0" />
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

    <!-- 续期弹窗：天数 或 绝对日期，二选一 -->
    <t-dialog v-model:visible="renewFormVisible" :header="t('common.renew')" :width="560" :footer="false">
      <t-form ref="renewForm" :data="formRenewData" :label-width="150" @submit="onSubmitRenew">
        <t-form-item :label="t('page.tenant.tenant_name')">
          <span>{{ renewTenantName }}</span>
        </t-form-item>
        <t-form-item :label="t('page.tenant.renew_mode')">
          <t-radio-group v-model="formRenewData.mode">
            <t-radio value="days">{{ t('page.tenant.renew_by_days') }}</t-radio>
            <t-radio value="date">{{ t('page.tenant.renew_by_date') }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item v-if="formRenewData.mode === 'days'" :label="t('page.tenant.add_days')" name="add_days">
          <t-input-number
            v-model="formRenewData.add_days"
            :style="{ width: '320px' }"
            :min="1"
            :placeholder="t('page.tenant.add_days_placeholder')"
          ></t-input-number>
        </t-form-item>
        <t-form-item v-else :label="t('page.tenant.expire_time')" name="expire_time">
          <t-date-picker
            v-model="formRenewData.expire_time"
            :style="{ width: '320px' }"
            enable-time-picker
            value-type="YYYY-MM-DD HH:mm:ss"
            :placeholder="t('page.tenant.renew_date_placeholder')"
          />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="renewFormVisible = false">{{ t('common.close') }}</t-button>
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

import { tenant_add_api, tenant_del_api, tenant_detail_api, tenant_edit_api, tenant_list_api, tenant_renew_api } from '@/apis/tenant';

const { t } = useI18n();

// 后端租户状态机：1 正常 / 0 停用 / 2 已过期 / -1 已注销
const TENANT_STATUS = {
  ACTIVE: 1,
  SUSPENDED: 0,
  EXPIRED: 2,
  CANCELLED: -1,
} as const;

const INITIAL_ADD_DATA = {
  tenant_id: '',
  tenant_name: '',
  max_hosts: 0,
  max_accounts: 0,
  expire_time: '',
  grace_days: 0,
  admin_account: '',
  admin_password: '',
  remarks: '',
};

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const renewFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_ADD_DATA });
const formEditData = ref<Record<string, any>>({});
const formRenewData = ref<{ tenant_id: string; mode: 'days' | 'date'; add_days: number | null; expire_time: string }>({
  tenant_id: '',
  mode: 'days',
  add_days: 365,
  expire_time: '',
});
const renewTenantName = ref('');

const tenantIdPattern = /^[a-z0-9_-]{3,32}$/;

const addRules: FormProps['rules'] = {
  tenant_id: [
    { required: true, message: t('common.placeholder') + t('page.tenant.tenant_id'), type: 'error' },
    {
      validator: (val: string) => tenantIdPattern.test(val || ''),
      message: t('page.tenant.tenant_id_invalid'),
      type: 'error',
    },
  ],
  tenant_name: [{ required: true, message: t('common.placeholder') + t('page.tenant.tenant_name'), type: 'error' }],
  admin_account: [{ required: true, message: t('common.placeholder') + t('page.tenant.admin_account'), type: 'error' }],
  admin_password: [{ required: true, message: t('common.placeholder') + t('page.tenant.admin_password'), type: 'error' }],
};

const editRules: FormProps['rules'] = {
  tenant_name: [{ required: true, message: t('common.placeholder') + t('page.tenant.tenant_name'), type: 'error' }],
};

const statusOptions = computed(() => [
  { label: t('page.tenant.status_active'), value: TENANT_STATUS.ACTIVE },
  { label: t('page.tenant.status_suspended'), value: TENANT_STATUS.SUSPENDED },
  { label: t('page.tenant.status_expired'), value: TENANT_STATUS.EXPIRED },
  { label: t('page.tenant.status_cancelled'), value: TENANT_STATUS.CANCELLED },
]);

function statusLabel(status: number) {
  const found = statusOptions.value.find((o) => o.value === status);
  return found ? found.label : String(status ?? '-');
}

function statusTheme(status: number) {
  switch (status) {
    case TENANT_STATUS.ACTIVE:
      return 'success'; // 正常绿
    case TENANT_STATUS.SUSPENDED:
      return 'default'; // 停用灰
    case TENANT_STATUS.EXPIRED:
      return 'warning'; // 过期橙
    case TENANT_STATUS.CANCELLED:
      return 'danger'; // 注销红
    default:
      return 'default';
  }
}

function quotaText(maxHosts: number, maxAccounts: number) {
  const unlimited = t('page.tenant.unlimited');
  const hosts = maxHosts > 0 ? maxHosts : unlimited;
  const accounts = maxAccounts > 0 ? maxAccounts : unlimited;
  return `${t('page.tenant.max_hosts')} ${hosts} / ${t('page.tenant.max_accounts')} ${accounts}`;
}

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.tenant.tenant_id'), align: 'left', width: 140, ellipsis: true, colKey: 'tenant_id' },
  { title: t('page.tenant.tenant_name'), align: 'left', width: 180, ellipsis: true, colKey: 'tenant_name' },
  { title: t('common.status'), align: 'left', width: 90, colKey: 'status' },
  { title: t('page.tenant.quota'), align: 'left', width: 240, colKey: 'quota' },
  { title: t('page.tenant.expire_time'), align: 'left', width: 170, ellipsis: true, colKey: 'expire_time' },
  { title: t('page.tenant.grace_days'), align: 'left', width: 100, colKey: 'grace_days' },
  { align: 'left', width: 170, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

const searchformData = reactive<{ tenant_name: string; status: number | null }>({
  tenant_name: '',
  status: null,
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
});

function getList(keyword?: string) {
  if (keyword === 'all') {
    pagination.current = 1;
  }
  dataLoading.value = true;
  // 状态筛选留空时不带该字段（后端指针语义：nil=全部）
  const payload: Record<string, any> = {
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    tenant_name: searchformData.tenant_name,
  };
  if (searchformData.status !== null && searchformData.status !== undefined) {
    payload.status = searchformData.status;
  }
  tenant_list_api(payload)
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

function handleAdd() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_ADD_DATA };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    // 到期时间留空 = 永久
    const payload = { ...formData.value, expire_time: formData.value.expire_time || '' };
    tenant_add_api(payload)
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

function handleClickEdit(e: { row: Record<string, any> }) {
  const { id } = e.row;
  editFormVisible.value = true;
  getDetail(id);
}

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    const d = formEditData.value;
    // 后端指针字段语义：null=不修改；expire_time 指向空串=永久。
    // 清空数字输入视为不修改（想改成 0=不限 就显式填 0）。
    const payload = {
      tenant_id: d.tenant_id,
      tenant_name: d.tenant_name,
      status: d.status,
      max_hosts: d.max_hosts === undefined || d.max_hosts === null ? null : d.max_hosts,
      max_accounts: d.max_accounts === undefined || d.max_accounts === null ? null : d.max_accounts,
      grace_days: d.grace_days === undefined || d.grace_days === null ? null : d.grace_days,
      // 日期选择器：清空 = 永久（空串），有值 = 指定到期时间
      expire_time: d.expire_time || '',
      remarks: d.remarks,
    };
    tenant_edit_api(payload)
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

function handleClickRenew(e: { row: Record<string, any> }) {
  renewTenantName.value = e.row.tenant_name || e.row.tenant_id;
  formRenewData.value = {
    tenant_id: e.row.tenant_id,
    mode: 'days',
    add_days: 365,
    expire_time: '',
  };
  renewFormVisible.value = true;
}

const onSubmitRenew: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    const d = formRenewData.value;
    if (d.mode === 'days' && !(Number(d.add_days) > 0)) {
      MessagePlugin.warning(t('page.tenant.add_days_required'));
      return;
    }
    if (d.mode === 'date' && !d.expire_time) {
      MessagePlugin.warning(t('page.tenant.renew_date_required'));
      return;
    }
    // 二选一：只带当前模式对应的字段，避免都传时歧义（后端以绝对时间优先）
    const payload =
      d.mode === 'days'
        ? { tenant_id: d.tenant_id, add_days: Number(d.add_days) }
        : { tenant_id: d.tenant_id, expire_time: d.expire_time };
    tenant_renew_api(payload)
      .then((res) => {
        if (res.code === 0) {
          MessagePlugin.success(res.msg);
          renewFormVisible.value = false;
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
  formData.value = { ...INITIAL_ADD_DATA };
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = {};
}

function handleClickDelete(e: { rowIndex: number }) {
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const row = data.value[deleteIdx.value];
  // 注销走租户码（软删除），平台自身租户后端会拒绝并提示
  tenant_del_api({ tenant_id: row.tenant_id })
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
  tenant_detail_api({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
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
</style>
