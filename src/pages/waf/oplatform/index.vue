<template>
  <div>
    <t-card class="list-card-container">
      <!-- 开放平台总开关。默认是关的，而"调不通"的头号原因就是这个开关没开——
           以前它藏在「参数配置」里，用户在这页建完 Key 直接去调，然后来问为什么 401。
           放在整页最上面靠右，进页面第一眼就能看到当前是开还是关 -->
      <div class="op-master">
        <t-tooltip :content="openPlatformEnabled ? t('page.oplatform.master_on_tips') : t('page.oplatform.master_off_tips')">
          <div class="op-master__box">
            <t-switch v-model="openPlatformEnabled" :loading="masterLoading" @change="handleToggleMaster" />
            <span class="op-master__t">{{ t('page.oplatform.master_switch') }}</span>
            <t-tag v-if="openPlatformEnabled" theme="success" variant="light">{{ t('page.oplatform.master_on') }}</t-tag>
            <t-tag v-else theme="warning" variant="light">{{ t('page.oplatform.master_off') }}</t-tag>
          </div>
        </t-tooltip>
      </div>

      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd">{{ t('page.oplatform.new_key') }}</t-button>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" layout="inline" colon :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.oplatform.key_name')" name="key_name">
              <t-input v-model="searchformData.key_name" style="width: 200px" clearable />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>

      <help-block
        :summary="t('page.oplatform.help_summary')"
        :items="helpItems"
        :note="t('page.oplatform.help_note')"
        :title="t('page.oplatform.help_title')"
        doc="https://doc.samwaf.com/api/"
        storage-key="oplatform-key"
      />

      <div class="table-container">
        <t-table
          :columns="columns"
          :data="data"
          row-key="id"
          hover
          :pagination="pagination"
          :loading="dataLoading"
          @page-change="rehandlePageChange"
        >
          <template #api_key="slotProps">
            <span>{{ slotProps.row.api_key }}</span>
          </template>
          <template #status="slotProps">
            <t-tag :theme="slotProps.row.status === 1 ? 'success' : 'danger'">
              {{ slotProps.row.status === 1 ? t('page.oplatform.status_enabled') : t('page.oplatform.status_disabled') }}
            </t-tag>
          </template>
          <template #permissions="slotProps">
            <template v-if="permissionLabels(slotProps.row.permissions).length">
              <t-tag
                v-for="label in permissionLabels(slotProps.row.permissions)"
                :key="label"
                theme="primary"
                variant="light"
                class="perm-tag"
              >
                {{ label }}
              </t-tag>
            </template>
            <t-tag v-else theme="default" variant="light">{{ t('page.oplatform.permissions_all') }}</t-tag>
          </template>
          <template #rate_limit="slotProps">
            {{
              slotProps.row.rate_limit > 0
                ? slotProps.row.rate_limit + ' ' + t('page.oplatform.per_minute')
                : t('page.oplatform.no_limit')
            }}
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleEdit(slotProps)">{{ t('common.edit') }}</a>
            <a class="t-button-link" @click="handleToggleStatus(slotProps)">
              {{ slotProps.row.status === 1 ? t('page.oplatform.disable') : t('page.oplatform.enable') }}
            </a>
            <a class="t-button-link" @click="handleResetSecret(slotProps)">{{ t('page.oplatform.reset_key') }}</a>
            <a class="t-button-link" style="color: #e34d59" @click="handleDelete(slotProps)">{{ t('common.delete') }}</a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 新增 Key 对话框 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('page.oplatform.new_key')" :width="580" :footer="false">
      <t-form ref="addForm" :data="formData" :rules="rules" :label-width="120" @submit="onSubmitAdd">
        <t-form-item :label="t('page.oplatform.key_name')" name="key_name">
          <t-input v-model="formData.key_name" :style="{ width: '380px' }" :placeholder="t('page.oplatform.key_name_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.oplatform.permissions')" name="permissions" :help="t('page.oplatform.permissions_help')">
          <t-select
            v-model="formData.permissionList"
            multiple
            clearable
            filterable
            :style="{ width: '380px' }"
            :placeholder="t('page.oplatform.permissions_placeholder')"
          >
            <t-option v-for="item in codeOptions" :key="item.code" :value="item.code" :label="item.name" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.oplatform.rate_limit')" name="rate_limit">
          <t-input-number
            v-model="formData.rate_limit"
            :style="{ width: '380px' }"
            :min="0"
            :placeholder="t('page.oplatform.rate_limit_tip')"
          />
        </t-form-item>
        <t-form-item :label="t('page.oplatform.ip_whitelist')" name="ip_whitelist">
          <t-input
            v-model="formData.ip_whitelist"
            :style="{ width: '380px' }"
            :placeholder="t('page.oplatform.ip_whitelist_placeholder')"
          />
        </t-form-item>
        <t-form-item :label="t('page.oplatform.expire_time')" name="expire_time">
          <t-input
            v-model="formData.expire_time"
            :style="{ width: '380px' }"
            :placeholder="t('page.oplatform.expire_time_placeholder')"
          />
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remark">
          <t-textarea v-model="formData.remark" :style="{ width: '380px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="addFormVisible = false">{{ t('common.cancel') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 编辑 Key 对话框 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="580" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="rules" :label-width="120" @submit="onSubmitEdit">
        <t-form-item :label="t('page.oplatform.key_name')" name="key_name">
          <t-input v-model="formEditData.key_name" :style="{ width: '380px' }" />
        </t-form-item>
        <t-form-item :label="t('page.oplatform.status')" name="status">
          <t-radio-group v-model="formEditData.status">
            <t-radio :value="1">{{ t('page.oplatform.status_enabled') }}</t-radio>
            <t-radio :value="0">{{ t('page.oplatform.status_disabled') }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item :label="t('page.oplatform.permissions')" name="permissions" :help="t('page.oplatform.permissions_help')">
          <t-select
            v-model="formEditData.permissionList"
            multiple
            clearable
            filterable
            :style="{ width: '380px' }"
            :placeholder="t('page.oplatform.permissions_placeholder')"
          >
            <t-option v-for="item in codeOptions" :key="item.code" :value="item.code" :label="item.name" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('page.oplatform.rate_limit')" name="rate_limit">
          <t-input-number v-model="formEditData.rate_limit" :style="{ width: '380px' }" :min="0" />
        </t-form-item>
        <t-form-item :label="t('page.oplatform.ip_whitelist')" name="ip_whitelist">
          <t-input
            v-model="formEditData.ip_whitelist"
            :style="{ width: '380px' }"
            :placeholder="t('page.oplatform.ip_whitelist_placeholder')"
          />
        </t-form-item>
        <t-form-item :label="t('page.oplatform.expire_time')" name="expire_time">
          <t-input
            v-model="formEditData.expire_time"
            :style="{ width: '380px' }"
            :placeholder="t('page.oplatform.expire_time_placeholder')"
          />
        </t-form-item>
        <t-form-item :label="t('common.remarks')" name="remark">
          <t-textarea v-model="formEditData.remark" :style="{ width: '380px' }" />
        </t-form-item>
        <t-form-item style="float: right">
          <t-button variant="outline" @click="editFormVisible = false">{{ t('common.cancel') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 新建/重置 Key 结果对话框 -->
    <t-dialog
      v-model:visible="secretDialogVisible"
      :header="secretDialogTitle"
      :width="520"
      :cancel-btn="null"
      @confirm="secretDialogVisible = false"
    >
      <t-alert theme="warning" :message="t('page.oplatform.key_once_warning')" style="margin-bottom: 16px" />
      <t-form :label-width="120">
        <t-form-item label="API Key">
          <t-input v-model="newSecret" readonly :style="{ width: '300px' }">
            <template #suffix>
              <t-button size="small" variant="text" @click="copyText(newSecret)">{{ t('page.oplatform.copy') }}</t-button>
            </template>
          </t-input>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 删除确认对话框 -->
    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.delete')"
      :width="400"
      @confirm="onConfirmDelete"
      @cancel="confirmVisible = false"
    >
      <div>{{ t('page.oplatform.delete_confirm') }}</div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormProps, PageInfo, TableProps } from 'tdesign-vue-next';

import {
  oplatform_key_add_api,
  oplatform_key_del_api,
  oplatform_key_detail_api,
  oplatform_key_edit_api,
  oplatform_key_list_api,
  oplatform_key_reset_secret_api,
} from '@/apis/oplatform';
import { edit_system_config_by_item_api, get_detail_by_item_api } from '@/apis/systemconfig';
import { permission_group_codes_api } from '@/apis/permission_group';

// 开放平台总开关在「参数配置」里的键名。它是个普通的系统配置项，
// 后端 editByItem 改完会立刻 TaskLoadSetting，不需要重启。
const MASTER_ITEM = 'open_platform_enabled';

const { t } = useI18n();

const openPlatformEnabled = ref(false);
const masterLoading = ref(false);

// 权限码目录（/permission/group/codes）：Key 授权范围多选与列表标签翻译共用
const codeOptions = ref<{ code: string; name: string }[]>([]);

function fetchCodes() {
  permission_group_codes_api()
    .then((res) => {
      if (res.code === 0) {
        codeOptions.value = res.data ?? [];
      }
    })
    .catch((error) => {
      console.error('获取权限码目录失败:', error);
    });
}

/** 权限码逗号串 -> 权限中文名标签数组（未选=全部权限） */
function permissionLabels(permissions: string) {
  if (!permissions) return [];
  return permissions
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
    .map((code) => {
      const found = codeOptions.value.find((o) => o.code === code);
      return found ? found.name : code;
    });
}

// 说明条目挑的是实际会被问到的：开关没开、请求头怎么带、为什么返回不是密文、
// 哪些接口用 Key 调不了。不是把 API 文档抄一遍。
const helpItems = computed(() => [
  { k: t('page.oplatform.help_k_switch'), v: t('page.oplatform.help_v_switch'), tone: 'brand' },
  { k: t('page.oplatform.help_k_header'), v: t('page.oplatform.help_v_header'), tone: 'brand' },
  { k: t('page.oplatform.help_k_limit'), v: t('page.oplatform.help_v_limit') },
  { k: t('page.oplatform.help_k_plain'), v: t('page.oplatform.help_v_plain') },
  { k: t('page.oplatform.help_k_forbid'), v: t('page.oplatform.help_v_forbid'), tone: 'danger' },
]);

function fetchMasterSwitch() {
  get_detail_by_item_api({ item: MASTER_ITEM })
    .then((res) => {
      if (res.code === 0) {
        openPlatformEnabled.value = String(res.data?.value) === '1';
      }
    })
    .catch((error) => {
      // 取不到不影响建 Key，静默即可；开关维持关闭的保守显示
      console.error('获取开放平台开关失败:', error);
    });
}

function handleToggleMaster(value: any) {
  masterLoading.value = true;
  edit_system_config_by_item_api({ item: MASTER_ITEM, value: value ? '1' : '0' })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(t('common.tips.save_success'));
      } else {
        MessagePlugin.error(res.msg || t('common.tips.save_failed'));
        openPlatformEnabled.value = !value;
      }
    })
    .catch((error) => {
      console.error('更新开放平台开关失败:', error);
      MessagePlugin.error(t('common.tips.save_failed'));
      openPlatformEnabled.value = !value;
    })
    .finally(() => {
      masterLoading.value = false;
    });
}

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
});
const searchformData = reactive({
  key_name: '',
});

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'key_name', title: t('page.oplatform.key_name'), width: 150 },
  { colKey: 'api_key', title: 'API Key', width: 240 },
  { colKey: 'status', title: t('page.oplatform.status'), width: 100 },
  { colKey: 'permissions', title: t('page.oplatform.permissions'), width: 200 },
  { colKey: 'rate_limit', title: t('page.oplatform.rate_limit'), width: 120 },
  { colKey: 'ip_whitelist', title: t('page.oplatform.ip_whitelist'), width: 160, ellipsis: true },
  { colKey: 'call_count', title: t('page.oplatform.call_count'), width: 100 },
  { colKey: 'last_use_time', title: t('page.oplatform.last_use_time'), width: 160 },
  { colKey: 'expire_time', title: t('page.oplatform.expire_time'), width: 150 },
  { colKey: 'op', title: t('common.operation'), width: 260, fixed: 'right' },
]);

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const secretDialogVisible = ref(false);
const confirmVisible = ref(false);
const confirmDeleteId = ref('');
const newSecret = ref('');
const secretDialogTitle = ref('');
const formData = ref<Record<string, any>>({
  key_name: '',
  remark: '',
  rate_limit: 0,
  ip_whitelist: '',
  expire_time: '',
  permissionList: [] as string[],
});
const formEditData = ref<Record<string, any>>({
  id: '',
  key_name: '',
  status: 1,
  remark: '',
  rate_limit: 0,
  ip_whitelist: '',
  expire_time: '',
  permissionList: [] as string[],
});

const rules: FormProps['rules'] = {
  key_name: [{ required: true, message: t('page.oplatform.key_name_required'), type: 'error' }],
};

onMounted(() => {
  getList();
  fetchMasterSwitch();
  fetchCodes();
});

function getList() {
  dataLoading.value = true;
  oplatform_key_list_api({
    pageIndex: pagination.current,
    pageSize: pagination.pageSize,
    key_name: searchformData.key_name,
  })
    .then((res) => {
      dataLoading.value = false;
      if (res && res.code === 0) {
        data.value = res.data.list || [];
        pagination.total = res.data.total;
      }
    })
    .catch(() => {
      dataLoading.value = false;
    });
}

/** 后端 permissions 是逗号分隔串，表单里换成数组给多选下拉 */
function toKeyFormModel(d: Record<string, any>) {
  const permissions = typeof d.permissions === 'string' ? d.permissions : '';
  return {
    ...d,
    permissionList: permissions
      .split(',')
      .map((code) => code.trim())
      .filter(Boolean),
  };
}

/** 提交契约：permissions 传逗号分隔权限码字符串，空串=全部权限 */
function toKeySubmitPayload(form: Record<string, any>) {
  return {
    ...form,
    permissions: (form.permissionList ?? []).join(','),
  };
}

function handleAdd() {
  formData.value = { key_name: '', remark: '', rate_limit: 0, ip_whitelist: '', expire_time: '', permissionList: [] };
  addFormVisible.value = true;
}

const onSubmitAdd: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult !== true) return;
  oplatform_key_add_api(toKeySubmitPayload(formData.value)).then((res) => {
    if (res && res.code === 0) {
      addFormVisible.value = false;
      newSecret.value = res.data.api_key;
      secretDialogTitle.value = t('page.oplatform.new_key_created');
      secretDialogVisible.value = true;
      getList();
    } else {
      MessagePlugin.error(res ? res.msg : t('page.oplatform.add_fail'));
    }
  });
};

function handleEdit(slotProps: { row: Record<string, any> }) {
  const { row } = slotProps;
  oplatform_key_detail_api({ id: row.id }).then((res) => {
    if (res && res.code === 0) {
      formEditData.value = toKeyFormModel({
        id: res.data.id,
        key_name: res.data.key_name,
        status: res.data.status,
        remark: res.data.remark,
        rate_limit: res.data.rate_limit,
        ip_whitelist: res.data.ip_whitelist,
        expire_time: res.data.expire_time,
        permissions: res.data.permissions,
      });
      editFormVisible.value = true;
    }
  });
}

const onSubmitEdit: FormProps['onSubmit'] = ({ validateResult }) => {
  if (validateResult !== true) return;
  oplatform_key_edit_api(toKeySubmitPayload(formEditData.value)).then((res) => {
    if (res && res.code === 0) {
      MessagePlugin.success(t('page.oplatform.edit_success'));
      editFormVisible.value = false;
      getList();
    } else {
      MessagePlugin.error(res ? res.msg : t('page.oplatform.edit_fail'));
    }
  });
};

function handleToggleStatus(slotProps: { row: Record<string, any> }) {
  const { row } = slotProps;
  const newStatus = row.status === 1 ? 0 : 1;
  // 后端 edit 是整体覆盖式提交：启用/停用必须把授权范围原样带回，否则会被清成"全部权限"
  oplatform_key_edit_api({
    id: row.id,
    key_name: row.key_name,
    status: newStatus,
    remark: row.remark,
    rate_limit: row.rate_limit,
    ip_whitelist: row.ip_whitelist,
    expire_time: row.expire_time,
    permissions: row.permissions ?? '',
  }).then((res) => {
    if (res && res.code === 0) {
      MessagePlugin.success(newStatus === 1 ? t('page.oplatform.enable_success') : t('page.oplatform.disable_success'));
      getList();
    }
  });
}

function handleResetSecret(slotProps: { row: Record<string, any> }) {
  oplatform_key_reset_secret_api({ id: slotProps.row.id }).then((res) => {
    if (res && res.code === 0) {
      newSecret.value = res.data.api_key;
      secretDialogTitle.value = t('page.oplatform.reset_key');
      secretDialogVisible.value = true;
      getList();
    }
  });
}

function handleDelete(slotProps: { row: Record<string, any> }) {
  confirmDeleteId.value = slotProps.row.id;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  confirmVisible.value = false;
  oplatform_key_del_api({ id: confirmDeleteId.value }).then((res) => {
    if (res && res.code === 0) {
      MessagePlugin.success(t('page.oplatform.delete_success'));
      getList();
    }
  });
}

function rehandlePageChange(curr: PageInfo) {
  pagination.current = curr.current;
  pagination.pageSize = curr.pageSize;
  getList();
}

function copyText(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      MessagePlugin.success(t('page.oplatform.copy_success'));
    })
    .catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      MessagePlugin.success(t('page.oplatform.copy_success'));
    });
}
</script>

<style scoped>
.list-card-container {
  padding: 16px;
}

.op-master {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.op-master__box {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-medium);
  background: var(--td-bg-color-container-hover);
}

.op-master__t {
  font-weight: 500;
}

.perm-tag {
  margin: 2px 4px 2px 0;
}

.left-operation-container {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.right-operation-container {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
</style>
