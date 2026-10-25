<template>
  <div>
    <t-card class="list-card-container">
      <t-row justify="space-between">
        <div class="left-operation-container">
          <t-button @click="handleAdd"> {{ t('page.permission_group.create_group') }} </t-button>
        </div>
        <div class="right-operation-container">
          <t-form ref="searchForm" :data="searchformData" :label-width="120" colon layout="inline" :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.permission_group.group_name')" name="group_name">
              <t-input v-model="searchformData.group_name" :placeholder="t('common.placeholder_content')" clearable> </t-input>
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList('all')"> {{ t('common.search') }} </t-button>
            </t-form-item>
          </t-form>
        </div>
      </t-row>

      <help-block
        :summary="t('page.permission_group.help_summary')"
        :items="helpItems"
        :note="t('page.permission_group.help_note')"
        :title="t('page.permission_group.help_title')"
        storage-key="permission-group"
      />

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
          <template #permissions="{ row }">
            <template v-if="permissionLabels(row.permissions).length">
              <t-tag v-for="label in permissionLabels(row.permissions)" :key="label" theme="primary" variant="light" class="perm-tag">
                {{ label }}
              </t-tag>
            </template>
            <span v-else>-</span>
          </template>
          <template #status="{ row }">
            <t-tag :theme="row.status === 1 ? 'success' : 'default'">
              {{ row.status === 1 ? t('page.permission_group.status_enabled') : t('page.permission_group.status_disabled') }}
            </t-tag>
          </template>
          <template #built_in="{ row }">
            <t-tag v-if="row.built_in === 1" theme="warning" variant="light">{{ t('page.permission_group.built_in') }}</t-tag>
            <span v-else>-</span>
          </template>
          <template #op="slotProps">
            <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
            <a
              class="t-button-link"
              :class="{ 'op-disabled': slotProps.row.built_in === 1 }"
              @click="slotProps.row.built_in === 1 ? undefined : handleClickDelete(slotProps)"
            >
              {{ t('common.delete') }}
            </a>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 新建权限组弹窗 -->
    <t-dialog v-model:visible="addFormVisible" :header="t('page.permission_group.create_group')" :width="680" :footer="false">
      <t-form ref="addForm" :data="formData" :rules="rules" :label-width="150" @submit="onSubmit">
        <t-form-item :label="t('page.permission_group.group_name')" name="group_name">
          <t-input
            v-model="formData.group_name"
            :style="{ width: '480px' }"
            :placeholder="t('common.placeholder') + t('page.permission_group.group_name')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.permission_group.permissions')" name="permissions">
          <t-select
            v-model="formData.permissionList"
            multiple
            clearable
            filterable
            :style="{ width: '480px' }"
            :placeholder="t('common.select_placeholder')"
          >
            <t-option v-for="item in codeOptions" :key="item.code" :value="item.code" :label="item.name" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('common.status')" name="status">
          <t-switch v-model="formData.status" :custom-value="[1, 0]"></t-switch>
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

    <!-- 编辑权限组弹窗 -->
    <t-dialog v-model:visible="editFormVisible" :header="t('common.edit')" :width="680" :footer="false">
      <t-form ref="editForm" :data="formEditData" :rules="rules" :label-width="150" @submit="onSubmitEdit">
        <t-form-item :label="t('page.permission_group.group_name')" name="group_name">
          <t-input
            v-model="formEditData.group_name"
            :style="{ width: '480px' }"
            :disabled="formEditData.built_in === 1"
            :placeholder="t('common.placeholder') + t('page.permission_group.group_name')"
          ></t-input>
        </t-form-item>
        <t-form-item :label="t('page.permission_group.permissions')" name="permissions">
          <t-select
            v-model="formEditData.permissionList"
            multiple
            clearable
            filterable
            :style="{ width: '480px' }"
            :placeholder="t('common.select_placeholder')"
          >
            <t-option v-for="item in codeOptions" :key="item.code" :value="item.code" :label="item.name" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('common.status')" name="status">
          <t-switch v-model="formEditData.status" :custom-value="[1, 0]"></t-switch>
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

import {
  permission_group_add_api,
  permission_group_codes_api,
  permission_group_del_api,
  permission_group_detail_api,
  permission_group_edit_api,
  permission_group_list_api,
} from '@/apis/permission_group';

const { t } = useI18n();

const INITIAL_DATA = {
  id: '',
  group_name: '',
  remarks: '',
  status: 1,
  built_in: 0,
  permissionList: [] as string[],
};

const addFormVisible = ref(false);
const editFormVisible = ref(false);
const confirmVisible = ref(false);
const formData = ref<Record<string, any>>({ ...INITIAL_DATA, permissionList: [] });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA, permissionList: [] });

const rules: FormProps['rules'] = {
  group_name: [{ required: true, message: t('common.placeholder') + t('page.permission_group.group_name'), type: 'error' }],
};

const helpItems = computed(() => [
  { k: t('page.permission_group.help_k_binding'), v: t('page.permission_group.help_v_binding') },
  { k: t('page.permission_group.help_k_override'), v: t('page.permission_group.help_v_override') },
  { k: t('page.permission_group.help_k_builtin'), v: t('page.permission_group.help_v_builtin'), tone: 'danger' },
]);

// 权限码目录：来自后端 codes 接口（[{code, name}]），多选下拉与表格标签翻译共用
const codeOptions = ref<{ code: string; name: string }[]>([]);

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

/** 权限码逗号串 -> 权限中文名标签数组 */
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

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);

const columns = computed<TableProps['columns']>(() => [
  { title: t('page.permission_group.group_name'), align: 'left', width: 180, ellipsis: true, colKey: 'group_name' },
  { title: t('page.permission_group.permissions'), align: 'left', width: 320, colKey: 'permissions' },
  { title: t('common.status'), align: 'left', width: 90, colKey: 'status' },
  { title: t('page.permission_group.built_in_col'), align: 'left', width: 100, colKey: 'built_in' },
  { title: t('common.remarks'), width: 220, ellipsis: true, colKey: 'remarks' },
  { align: 'left', width: 140, colKey: 'op', title: t('common.op') },
]);

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
});

const searchformData = reactive({
  group_name: '',
});

const deleteIdx = ref(-1);

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

function getList(keyword?: string) {
  if (keyword === 'all') {
    pagination.current = 1;
  }
  dataLoading.value = true;
  permission_group_list_api({
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

function handleAdd() {
  addFormVisible.value = true;
  formData.value = { ...INITIAL_DATA, permissionList: [] };
}

function handleClickEdit(e: { row: Record<string, any> }) {
  const { id } = e.row;
  editFormVisible.value = true;
  getDetail(id);
}

/** 后端 permissions 是逗号分隔串，表单里换成数组给多选下拉 */
function toFormModel(bean: Record<string, any>) {
  const permissions = typeof bean.permissions === 'string' ? bean.permissions : '';
  return {
    ...bean,
    permissionList: permissions
      .split(',')
      .map((code) => code.trim())
      .filter(Boolean),
  };
}

/** 提交契约：permissions 传逗号分隔权限码字符串 */
function toSubmitPayload(form: Record<string, any>) {
  return {
    ...form,
    permissions: (form.permissionList ?? []).join(','),
  };
}

const onSubmit: FormProps['onSubmit'] = ({ firstError }) => {
  if (!firstError) {
    permission_group_add_api(toSubmitPayload(formData.value))
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
    permission_group_edit_api(toSubmitPayload(formEditData.value))
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
  formData.value = { ...INITIAL_DATA, permissionList: [] };
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = { ...INITIAL_DATA, permissionList: [] };
}

function handleClickDelete(e: { rowIndex: number }) {
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const { id } = data.value[deleteIdx.value];
  permission_group_del_api({ id })
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
  permission_group_detail_api({ id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = toFormModel(res.data ?? {});
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

.perm-tag {
  margin: 2px 4px 2px 0;
}

.op-disabled {
  color: var(--td-text-color-disabled);
  cursor: not-allowed;
  pointer-events: none;
}
</style>
