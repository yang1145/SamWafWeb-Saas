<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd"> {{ t('page.plan.add_plan') }} </t-button>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="100" colon layout="inline" :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.plan.plan_name')" name="plan_name">
              <t-input v-model="searchformData.plan_name" :placeholder="t('common.placeholder_content')" clearable> </t-input>
            </t-form-item>
            <t-form-item :label="t('common.status')" name="status">
              <t-select v-model="searchformData.status" clearable :style="{ width: '120px' }">
                <t-option :value="1" :label="t('page.plan.status_enabled')" />
                <t-option :value="0" :label="t('page.plan.status_disabled')" />
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
            <t-tag :theme="row.status === 1 ? 'success' : 'default'">
              {{ row.status === 1 ? t('page.plan.status_enabled') : t('page.plan.status_disabled') }}
            </t-tag>
          </template>
          <template #permissions="{ row }">
            <div class="perm-tags">
              <t-tag v-for="code in splitPerms(row.permissions)" :key="code" variant="light" size="small">
                {{ permLabel(code) }}
              </t-tag>
              <span v-if="!splitPerms(row.permissions).length">-</span>
            </div>
          </template>
          <template #quota="{ row }">
            {{ quotaText(row.max_hosts, row.max_accounts) }}
          </template>
          <template #grace_days="{ row }">
            {{ row.grace_days > 0 ? row.grace_days + ' ' + t('page.tenant.days') : t('page.tenant.no_grace') }}
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" style="color: #e34d59" @click="handleClickDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 新增套餐弹窗 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('page.plan.add_plan')" :width="680" :footer="false">
      <t-form ref="addForm" :data="formData" :rules="addRules" :label-width="150" autocomplete="off" @submit="onSubmit">
        <t-form-item :label="t('page.plan.plan_code')" name="plan_code">
          <t-input
            v-model="formData.plan_code"
            :style="{ width: '480px' }"
            :placeholder="t('page.plan.plan_code_placeholder')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.plan.plan_name')" name="plan_name">
          <t-input
            v-model="formData.plan_name"
            :style="{ width: '480px' }"
            :placeholder="t('common.placeholder') + t('page.plan.plan_name')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.plan.permissions')" name="permissionList">
          <t-select
            v-model="formData.permissionList"
            multiple
            clearable
            filterable
            :style="{ width: '480px' }"
            :placeholder="t('page.plan.permissions_placeholder')"
          >
            <t-option v-for="item in assignableCodeOptions" :key="item.code" :value="item.code" :label="item.name" />
          </t-select>
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
        <t-form-item :label="t('page.tenant.grace_days')" name="grace_days">
          <t-input-number
            v-model="formData.grace_days"
            :style="{ width: '480px' }"
            :min="0"
            :placeholder="t('page.tenant.grace_days_placeholder')"
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

    <!-- 编辑套餐弹窗 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="editRules" :label-width="150" @submit="onSubmitEdit">
        <t-form-item :label="t('page.plan.plan_code')" name="plan_code">
          <t-input v-model="formEditData.plan_code" :style="{ width: '480px' }" :disabled="true"></t-input>
        </t-form-item>
        <t-form-item :label="t('page.plan.plan_name')" name="plan_name">
          <t-input
            v-model="formEditData.plan_name"
            :style="{ width: '480px' }"
            :placeholder="t('common.placeholder') + t('page.plan.plan_name')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.plan.permissions')" name="permissionList">
          <t-select
            v-model="formEditData.permissionList"
            multiple
            clearable
            filterable
            :style="{ width: '480px' }"
            :placeholder="t('page.plan.permissions_placeholder')"
          >
            <t-option v-for="item in assignableCodeOptions" :key="item.code" :value="item.code" :label="item.name" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('common.status')" name="status">
          <t-radio-group v-model="formEditData.status">
            <t-radio :value="1">{{ t('page.plan.status_enabled') }}</t-radio>
            <t-radio :value="0">{{ t('page.plan.status_disabled') }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item :label="t('page.tenant.max_hosts')" name="max_hosts">
          <t-input-number v-model="formEditData.max_hosts" :style="{ width: '480px' }" :min="0" />
        </t-form-item>
        <t-form-item :label="t('page.tenant.max_accounts')" name="max_accounts">
          <t-input-number v-model="formEditData.max_accounts" :style="{ width: '480px' }" :min="0" />
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

import { plan_add_api, plan_del_api, plan_detail_api, plan_edit_api, plan_list_api } from '@/apis/plan';
import { permission_group_codes_api } from '@/apis/permission_group';

const { t } = useI18n();

/**
 * 租户可分配权限码白名单（与后端 enums.TenantAssignableCodes 同口径）：
 * 套餐权限集只允许勾选这些码——平台级管理、权限组管理、实例级系统配置
 * 属平台侧能力，任何套餐都不得包含（后端写入侧同样 fail-closed 拒绝）。
 */
const TENANT_FORBIDDEN_CODES = ['platform:admin', 'permission:manage', 'system:config'];

const INITIAL_ADD_DATA = {
  plan_code: '',
  plan_name: '',
  permissionList: [] as string[],
  max_hosts: 0,
  max_accounts: 0,
  grace_days: 0,
  remarks: '',
};

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_ADD_DATA });
const formEditData = ref<Record<string, any>>({});
const deleteIdx = ref(-1);

const planCodePattern = /^[a-z0-9_-]{3,32}$/;

const addRules: FormProps['rules'] = {
  plan_code: [
    { required: true, message: t('common.placeholder') + t('page.plan.plan_code'), type: 'error' },
    { validator: (val: string) => planCodePattern.test(val || ''), message: t('page.plan.plan_code_invalid'), type: 'error' },
  ],
  plan_name: [{ required: true, message: t('common.placeholder') + t('page.plan.plan_name'), type: 'error' }],
};

const editRules: FormProps['rules'] = {
  plan_name: [{ required: true, message: t('common.placeholder') + t('page.plan.plan_name'), type: 'error' }],
};

/** 权限码目录（后端 /permission/group/codes），过滤出租户可分配集 */
const codeOptions = ref<{ code: string; name: string }[]>([]);
const assignableCodeOptions = computed(() => codeOptions.value.filter((o) => !TENANT_FORBIDDEN_CODES.includes(o.code)));

function permLabel(code: string) {
  const found = codeOptions.value.find((o) => o.code === code);
  return found ? found.name : code;
}

function splitPerms(perms?: string): string[] {
  if (!perms) return [];
  return perms
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
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
  { title: t('page.plan.plan_code'), align: 'left', width: 120, ellipsis: true, colKey: 'plan_code' },
  { title: t('page.plan.plan_name'), align: 'left', width: 130, ellipsis: true, colKey: 'plan_name' },
  { title: t('common.status'), align: 'left', width: 80, colKey: 'status' },
  { title: t('page.plan.permissions'), align: 'left', width: 300, colKey: 'permissions' },
  { title: t('page.tenant.quota'), align: 'left', width: 200, colKey: 'quota' },
  { title: t('page.tenant.grace_days'), align: 'left', width: 90, colKey: 'grace_days' },
  { title: t('common.remarks'), align: 'left', width: 140, ellipsis: true, colKey: 'remarks' },
  { align: 'left', width: 120, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

const searchformData = reactive<{ plan_name: string; status: number | null }>({
  plan_name: '',
  status: null,
});

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('common.data_delete_warning');
  }
  return '';
});

onMounted(() => {
  fetchCodes();
  getList('');
});

function fetchCodes() {
  permission_group_codes_api()
    .then((res) => {
      if (res.code === 0) {
        codeOptions.value = res.data ?? [];
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function getList(keyword?: string) {
  if (keyword === 'all') {
    pagination.current = 1;
  }
  dataLoading.value = true;
  // 状态筛选留空时不带该字段（后端指针语义：nil=全部）
  const payload = {
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    plan_name: searchformData.plan_name,
    ...(searchformData.status !== null && searchformData.status !== undefined ? { status: searchformData.status } : {}),
  };
  plan_list_api(payload)
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
  formData.value = { ...INITIAL_ADD_DATA, permissionList: [] };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    if (!formData.value.permissionList?.length) {
      MessagePlugin.warning(t('page.plan.permissions_required'));
      return;
    }
    const payload = {
      plan_code: formData.value.plan_code,
      plan_name: formData.value.plan_name,
      permissions: formData.value.permissionList.join(','),
      max_hosts: formData.value.max_hosts ?? 0,
      max_accounts: formData.value.max_accounts ?? 0,
      grace_days: formData.value.grace_days ?? 0,
      remarks: formData.value.remarks,
    };
    plan_add_api(payload)
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

function getDetail(id: string | number) {
  plan_detail_api({ id: String(id) })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data, permissionList: splitPerms(res.data?.permissions) };
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

const onSubmitEdit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    if (!formEditData.value.permissionList?.length) {
      MessagePlugin.warning(t('page.plan.permissions_required'));
      return;
    }
    const d = formEditData.value;
    // 后端指针字段语义：null=不修改。清空数字输入视为不修改（想改成 0=不限 就显式填 0）。
    // 权限集变化会由后端同步刷新引用该套餐的全部租户的管理员权限组（并在响应里提示同步结果）。
    const payload = {
      id: d.id,
      plan_name: d.plan_name,
      permissions: d.permissionList.join(','),
      status: d.status,
      max_hosts: d.max_hosts === undefined || d.max_hosts === null ? null : d.max_hosts,
      max_accounts: d.max_accounts === undefined || d.max_accounts === null ? null : d.max_accounts,
      grace_days: d.grace_days === undefined || d.grace_days === null ? null : d.grace_days,
      remarks: d.remarks,
    };
    plan_edit_api(payload)
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

function onClickCloseBtn() {
  addFormVisible.value = false;
  formData.value = { ...INITIAL_ADD_DATA, permissionList: [] };
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
  // 仍有租户引用的套餐后端会拒绝并提示先换套餐
  plan_del_api({ id: row.id })
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

.perm-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
