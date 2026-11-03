<template>
  <div>
    <!-- 站点态势总览：先给页面一个「重心」，关键指标集中呈现 -->
    <div class="host-overview">
      <t-loading :loading="statsLoading" show-overlay>
        <div class="ov-grid">
          <div v-for="card in kpiCards" :key="card.key" class="ov-card" :class="`ov-card--${card.theme}`">
            <div class="ov-head">
              <span class="ov-label">{{ card.label }}</span>
              <span class="ov-icon"><component :is="card.icon" /></span>
            </div>
            <div class="ov-value">{{ card.value }}</div>
            <div class="ov-sub" :title="card.sub">{{ card.sub }}</div>
          </div>
        </div>
      </t-loading>
    </div>

    <t-card class="list-card-container">
      <div class="host-toolbar">
        <div class="ht-left">
          <t-button theme="primary" @click="handleAddHost">＋ {{ t('page.host.new_protection') }}</t-button>
          <t-dropdown :options="batchMenuOptions()" trigger="click" @click="onBatchMenuClick">
            <t-button variant="outline" theme="default">{{ t('page.host.toolbar_batch') }} ▾</t-button>
          </t-dropdown>
          <t-dropdown :options="importExportMenuOptions()" trigger="click" @click="onImportExportMenuClick">
            <t-button variant="outline" theme="default">{{ t('page.host.toolbar_import') }} ▾</t-button>
          </t-dropdown>
          <t-button variant="outline" theme="default" @click="handlePortOverview">{{ t('page.host.port_listen.overview_title') }}</t-button>
        </div>
        <div class="ht-right">
          <t-form :data="searchformData" :label-width="80" colon layout="inline" :style="{ marginBottom: '8px' }">
            <t-form-item :label="t('page.host.website')" name="code">
              <t-select v-model="searchformData.code" clearable filterable :style="{ width: '200px' }">
                <t-option v-for="(item, index) in host_dic" :key="index" :value="index" :label="item">
                  {{ item }}
                </t-option>
              </t-select>
            </t-form-item>
            <t-form-item :label="t('common.remarks')" name="remarks">
              <t-input v-model="searchformData.remarks" clearable :placeholder="t('common.placeholder')"
                       :style="{ width: '160px' }" @enter="getList()" />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" :style="{ marginLeft: '8px' }" @click="getList()">
                {{ t('common.search') }}
              </t-button>
            </t-form-item>
          </t-form>
        </div>
      </div>

      <!-- 分组导航（轻量文本条）：放顶部而不是左栏——横向宽度已经卡死在「操作列点不到」的边缘，
           纵向多一行几乎无感。刻意去掉边框/底色、选中态只用主色文字+下划线，
           好让它明显低于上面那排动作按钮：分组是筛选维度，不是主操作 -->
      <div class="host-group-bar">
        <span class="hg-bar-label">{{ t('page.host.group.title') }}</span>
        <span class="hg-gl" :class="{ on: currentGroup === 'all' }" @click="pickGroup('all')">
          <span class="hg-nm">{{ t('page.host.group.all_hosts') }}</span><em>{{ groupAllCount }}</em>
        </span>
        <span class="hg-gl" :class="{ on: currentGroup === '__none__' }" @click="pickGroup('__none__')">
          <span class="hg-nm">{{ t('page.host.group.ungrouped') }}</span><em>{{ groupNoneCount }}</em>
        </span>
        <span v-if="hostGroups.length" class="hg-gsep"></span>
        <span
          v-for="(g, gi) in hostGroups"
          :key="g.group_code"
          class="hg-gl"
          :class="{ on: currentGroup === g.group_code }"
          :title="g.group_name"
          @click="pickGroup(g.group_code)"
        >
          <span class="hg-nm">{{ g.group_name }}</span><em>{{ g.host_count }}</em>
          <!-- click.stop 加在组件根元素上：阻止冒泡到「切换分组」，
               同时不影响 dropdown 自己挂在同一元素上的展开逻辑 -->
          <t-dropdown :options="groupMenuOptions(gi)" trigger="click" @click="onGroupMenuClick($event, g, gi)" @click.stop>
            <span class="hg-more">⋮</span>
          </t-dropdown>
        </span>
        <span class="hg-gsep"></span>
        <!-- 「新建分组」「移动到分组」都是分组域内的动作，和分组标签放一起；
             主工具栏只留网站维度的动作，主次才不会又混在一起 -->
        <span class="hg-gl add" @click="openGroupForm(null)">＋ {{ t('page.host.group.new_group') }}</span>
        <span
          class="hg-gl add"
          :class="{ disabled: selectedRowKeys.length === 0 }"
          :title="selectedRowKeys.length === 0 ? t('page.host.group.move_need_select') : ''"
          @click="selectedRowKeys.length && openAssignGroup()"
        >
          ⇄ {{ selectedRowKeys.length ? t('page.host.group.move_to_group_n', { n: selectedRowKeys.length }) : t('page.host.group.move_to_group') }}
        </span>
      </div>

      <div class="table-container">
        <help-block :summary="t('page.host.core_features')" doc="guide/Host" />
        <t-table
          ref="listTableRef"
          class="host-list-table"
          :columns="columns"
          size="small"
          :data="data"
          :row-key="rowKey"
          vertical-align="top"
          hover
          :pagination="pagination"
          :selected-row-keys="selectedRowKeys"
          :loading="dataLoading"
          resizable
          table-layout="fixed"
          :expanded-row="expandedRow"
          :expanded-row-keys="expandedRowKeys"
          @expand-change="onExpandChange"
          @page-change="rehandlePageChange"
          @select-change="rehandleSelectChange"
          @sort-change="onSortChange"
          @filter-change="onFilterChange"
        >
          <template #host="{ row }">
            <div class="host-cell">
              <!-- 第一行：域名（真实访问地址，可点开） -->
              <div class="hc-r1">
                <a
                  v-if="row.global_host !== 1 && siteUrl(row)"
                  class="hc-host hc-host--link"
                  :href="siteUrl(row)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="t('page.host.open_site') + ': ' + siteUrl(row)"
                >{{ row.host }}</a>
                <span v-else class="hc-host" :title="row.host">{{ row.host }}</span>
              </div>
              <!-- 第二行：昵称 + 绑定的其它域名 -->
              <div v-if="row.nickname || domains(row).length" class="hc-r2">
                <span v-if="row.nickname" class="hc-nick">{{ row.nickname }}</span>
                <a
                  v-for="(domain, i) in domains(row)"
                  :key="i"
                  class="hc-domain"
                  :href="domainUrl(row, domain)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="t('page.host.open_site') + ': ' + domainUrl(row, domain)"
                >{{ domain }}</a>
              </div>
              <!-- 第三行：badge（SSL / 监听端口 / 分组） -->
              <div v-if="hasHostBadges(row)" class="hc-r3">
                <t-tag v-if="row.ssl === SSL_STATUS.SSL" theme="success" variant="light" size="small" :title="t('page.host.ssl_yes')">SSL</t-tag>
                <t-tag
                  v-for="pt in portTags(row)"
                  :key="pt.key"
                  :theme="row.port_conflict ? 'danger' : (pt.proto === 'https' ? 'success' : 'primary')"
                  variant="light"
                  size="small"
                  :title="pt.title"
                >{{ pt.label }}</t-tag>
                <t-tooltip v-if="row.port_conflict" :content="t('page.host.port_listen.conflict_tip')" placement="top">
                  <t-tag theme="danger" size="small">{{ t('page.host.port_listen.conflict') }}</t-tag>
                </t-tooltip>
                <span v-if="row.global_host === 1" class="hg-tag none">{{ t('page.host.global_site') }}</span>
                <span v-else-if="row.group_code && !groupDict[row.group_code]" class="hg-tag unknown"
                      :title="t('page.host.group.unknown_group_tip')">{{ t('page.host.group.unknown_group') }}</span>
                <span v-else-if="row.group_code" class="hg-tag"
                      :style="{ background: hexToSoft(groupDict[row.group_code].color), color: groupDict[row.group_code].color }"
                      @click="pickGroup(row.group_code)">
                  <i class="hg-dot" :style="{ background: groupDict[row.group_code].color }"></i>{{ groupDict[row.group_code].group_name }}
                </span>
              </div>
            </div>
          </template>
          <template #data_stats="{ row }">
            <div class="stat-cell">
              <site-trend v-if="row.global_host !== 1 && row.code" :host-code="row.code" />
              <div class="stat-metrics">
                <div class="sm"><span class="sm-l">{{ t('page.host.today_pv_short') }}</span><span class="sm-v">{{ row.today_pv_count || 0 }}</span></div>
                <div class="sm"><span class="sm-l">{{ t('page.host.today_uv_short') }}</span><span class="sm-v">{{ row.today_uv_count || 0 }}</span></div>
                <div class="sm"><span class="sm-l">{{ t('page.host.today_attack_short') }}</span><span class="sm-v danger">{{ row.today_attack_count || 0 }}</span></div>
                <div class="sm"><span class="sm-l">{{ t('page.host.real_qps_short') }}</span><span class="sm-v">{{ row.real_time_qps }}</span></div>
                <div class="sm"><span class="sm-l">{{ t('page.host.traffic_total_short') }}</span><span class="sm-v">{{ formatTrafficBytes((row.today_traffic_in || 0) + (row.today_traffic_out || 0)) }}</span></div>
              </div>
            </div>
          </template>
          <template #backend="{ row }">
            <div class="backend-cell">
              <!-- 第一行：后端地址（过长自动换行；IPv6 用 [] 包起来避免和端口混淆） -->
              <div class="be-line1">
                <span class="mono be-addr">{{ formatBackendAddr(row) }}</span>
                <t-tag v-if="row.is_enable_load_balance === '1' || row.is_enable_load_balance === 1" theme="primary" variant="light" size="small">LB</t-tag>
              </div>
              <!-- 第二行：健康状态（图标 + 文案 + 最近检测时间），从「运行状态」列挪来 -->
              <t-tooltip v-if="row.global_host !== 1" :content="healthTip(row)" placement="top">
                <div class="be-health" :class="`is-${healthState(row)}`">
                  <check-circle-filled-icon v-if="healthState(row) === 'ok'" class="bh-ico" />
                  <error-circle-filled-icon v-else-if="healthState(row) === 'bad'" class="bh-ico" />
                  <help-circle-filled-icon v-else class="bh-ico" />
                  <span class="bh-text">{{ healthText(row) }}</span>
                  <span v-if="healthCheckTime(row)" class="bh-time">{{ healthCheckTime(row) }}</span>
                </div>
              </t-tooltip>
            </div>
          </template>
          <template #status_switches="{ row }">
            <div class="run-status">
              <!-- 防护：这列的行高已经不矮，干脆把主开关做成一块可视化控件，
                   盾牌 + 状态文字 + 轨道一起表达，一眼看清防护开没开（点一下即切换） -->
              <div
                class="guard-ctl"
                :class="row.guard_status === 1 ? 'is-on' : 'is-off'"
                :title="t('page.host.guard_status')"
                @click="changeGuardStatusHandle(row)"
              >
                <secured-icon class="gc-shield" />
                <span class="gc-text">
                  {{ row.guard_status === 1 ? t('page.host.guard_status_on') : t('page.host.guard_status_off') }}
                </span>
                <span class="gc-track"><i class="gc-knob"></i></span>
              </div>
              <div class="rs-row">
                <span class="rs-k">{{ t('page.host.start_status') }}</span>
                <t-switch size="small" :value="row.start_status === 0" @change="changeStartStatusHandle(row)" />
              </div>
              <div v-if="row.global_host !== 1 && isStaticSiteEnabled(row)" class="rs-row">
                <span class="rs-k">{{ t('page.host.static_service_label') }}</span>
                <t-tag theme="success" variant="light" size="small">{{ t('page.host.static_service_label_on') }}</t-tag>
              </div>
            </div>
          </template>
          <template #op="slotProps">
            <!-- 高频的「编辑」「证书申请」保持文字直出，低频的「复制」「删除」收进「更多」：
                 4 个链接平铺会折成两行且长度参差，收敛后一行、整齐，以后再加操作项也只是往「更多」里塞 -->
            <div v-if="slotProps.row.global_host !== 1" class="op-cell">
              <a class="t-button-link" @click="handleClickEdit(slotProps)">{{ t('common.edit') }}</a>
              <!-- 表格里用短标签，全称走 title：全称 8 个字，直出会把这一列重新撑破 -->
              <a class="t-button-link" :title="t('page.host.ssl_auto_apply')" @click="handleClickSSLApply(slotProps)">
                {{ t('page.host.ssl_auto_apply_short') }}
              </a>
              <span class="op-vline"></span>
              <t-dropdown :options="rowMoreOptions()" trigger="click" @click="onRowMoreClick($event, slotProps)">
                <span class="op-more">{{ t('page.host.group.more') }} ▾</span>
              </t-dropdown>
            </div>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 新建 / 编辑分组 -->
    <t-dialog
      v-model:visible="groupFormVisible"
      :header="groupForm.id ? t('page.host.group.edit_group') : t('page.host.group.new_group')"
      :width="480"
      :confirm-btn="t('common.confirm')"
      :cancel-btn="t('common.cancel')"
      @confirm="saveGroup"
    >
      <t-form :label-width="90" colon>
        <t-form-item :label="t('page.host.group.name')">
          <t-input v-model="groupForm.group_name" :maxlength="50" :placeholder="t('page.host.group.name_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.host.group.color')">
          <div class="hg-color-picker">
            <i v-for="c in groupColors" :key="c" :class="{ on: groupForm.color === c }" :style="{ background: c }" @click="groupForm.color = c"></i>
          </div>
        </t-form-item>
        <t-form-item :label="t('common.remarks')">
          <t-input v-model="groupForm.remarks" :maxlength="200" :placeholder="t('common.placeholder')" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 删除分组确认：必须写清楚有几个网站会回落到未分组 -->
    <t-dialog
      v-model:visible="groupDelVisible"
      :header="t('page.host.group.del_confirm_title', { name: groupDelTarget.group_name })"
      :width="460"
      theme="warning"
      :confirm-btn="{ content: t('common.confirm'), theme: 'danger' }"
      :cancel-btn="t('common.cancel')"
      @confirm="doDelGroup"
    >
      <p v-if="groupDelTarget.host_count > 0">{{ t('page.host.group.del_confirm_body', { n: groupDelTarget.host_count }) }}</p>
      <p v-else>{{ t('page.host.group.del_confirm_empty') }}</p>
      <p style="color: var(--td-text-color-secondary); font-size: 12px">{{ t('page.host.group.del_confirm_keep') }}</p>
    </t-dialog>

    <!-- 批量移动网站到分组 -->
    <t-dialog
      v-model:visible="assignVisible"
      :header="t('page.host.group.move_to_group')"
      :width="480"
      :confirm-btn="t('common.confirm')"
      :cancel-btn="t('common.cancel')"
      @confirm="doAssignGroup"
    >
      <p style="color: var(--td-text-color-secondary); font-size: 13px">
        {{ t('page.host.group.move_tip', { n: selectedRowKeys.length }) }}
        <span v-if="assignGlobalCount > 0">{{ t('page.host.group.move_tip_global', { n: assignGlobalCount }) }}</span>
      </p>
      <!-- 分组之间是并列关系，不是层级关系：TDesign 的 radio 自带横向间距，
           竖排时会表现成逐条往右递进的缩进，这里统一清零把它拉平 -->
      <t-radio-group v-model="assignGroupCode" class="assign-group-list">
        <t-radio value="">{{ t('page.host.group.move_out') }}</t-radio>
        <t-radio v-for="g in hostGroups" :key="g.group_code" :value="g.group_code">
          <i class="hg-dot" :style="{ background: g.color, marginRight: '6px' }"></i>{{ g.group_name }}
        </t-radio>
      </t-radio-group>
    </t-dialog>

    <!-- 端口占用总览（issue #955）：端口是全机共享资源，一个端口只能有一种协议 -->
    <t-dialog
      v-model:visible="portOverviewVisible"
      :header="t('page.host.port_listen.overview_title')"
      :width="900"
      :footer="false"
      attach="body"
    >
      <div style="margin-bottom: 12px; color: var(--td-text-color-secondary); font-size: 13px">
        {{ t('page.host.port_listen.overview_desc') }}
      </div>
      <t-loading :loading="portOverviewLoading" show-overlay>
        <t-table
          row-key="port"
          :data="portOverviewRows"
          :columns="portOverviewColumns"
          size="small"
          max-height="480"
          :row-class-name="portOverviewRowClass"
        >
          <template #port="{ row }">
            <b>{{ row.port }}</b>
          </template>
          <template #active="{ row }">
            <t-tag v-if="!row.online" theme="warning" variant="light" size="small">
              {{ t('page.host.port_listen.status_offline') }}
            </t-tag>
            <t-tag v-else :theme="row.conflict ? 'danger' : row.active_proto === 'https' ? 'success' : 'primary'" variant="light" size="small">
              {{ (row.active_proto || '').toUpperCase()
              }}<template v-if="row.active_ipv && row.active_ipv !== 'both'"> · {{ row.active_ipv }}</template>
            </t-tag>
          </template>
          <template #sites="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px">
              <t-tag
                v-for="(s, si) in row.sites"
                :key="si"
                variant="light"
                size="small"
                :theme="row.conflict ? 'danger' : 'default'"
                :title="s.host + (s.nickname ? `（${s.nickname}）` : '')"
              >
                {{ s.host }} · {{ s.proto.toUpperCase()
                }}<template v-if="s.is_main"> · {{ t('page.host.port_listen.main_suffix') }}</template
                ><template v-if="s.implied"> · {{ t('page.host.port_listen.implied_suffix') }}</template>
              </t-tag>
            </div>
          </template>
          <template #status="{ row }">
            <t-tag v-if="row.conflict" theme="danger" size="small">{{ t('page.host.port_listen.status_conflict') }}</t-tag>
            <t-tag v-else theme="success" variant="light" size="small">{{ t('page.host.port_listen.status_ok') }}</t-tag>
          </template>
        </t-table>
      </t-loading>
    </t-dialog>

    <!-- New WebSite Dialog -->
    <t-dialog
      v-model:visible="addFormVisible"
      :width="hostFormEffectiveWidth"
      :footer="false"
      :class="{ 'host-form-dialog-fullscreen': hostFormFullscreen }"
    >
      <template #header>
        {{ t('common.new') }}
        <t-link theme="primary" :href="hostAddUrl" target="_blank" rel="noopener noreferrer">
          <template #prefix-icon><link-icon /></template>
          {{ t('common.online_document') }}
        </t-link>
      </template>
      <host-form
        :value="formData"
        :dialog-visible="addFormVisible"
        :select-can-filter="selectCanFilter"
        :host-groups="hostGroups"
        @group-changed="loadHostGroups"
        @close="onClickCloseBtn"
        @submit="onSubmit"
        @tab-placement-change="onHostTabPlacementChange"
        @fullscreen-change="onHostFullscreenChange"
      />
    </t-dialog>

    <!-- Edit WebSite Dialog -->
    <t-dialog
      v-model:visible="editFormVisible"
      :width="hostFormEffectiveWidth"
      :footer="false"
      :class="{ 'host-form-dialog-fullscreen': hostFormFullscreen }"
    >
      <template #header>
        <div>
          {{ t('common.edit') }}
          <span v-if="editHostLabel" class="dialog-header-host">{{ editHostLabel }}</span>
          <div v-if="formEditData.code" class="dialog-header-code">
            <span>Host Code: {{ formEditData.code }}</span>
            <t-button size="small" variant="text" :title="t('common.copy')" :aria-label="t('common.copy')" @click="copyHostCode">
              <file-copy-icon style="font-size: 14px; margin-right: 0" />
            </t-button>
          </div>
        </div>
      </template>
      <host-form
        :value="formEditData"
        :dialog-visible="editFormVisible"
        :select-can-filter="selectCanFilter"
        :host-groups="hostGroups"
        @group-changed="loadHostGroups"
        :is-edit="true"
        :init-tab="editInitTab"
        @close="onClickCloseEditBtn"
        @submit="onSubmitEdit"
        @tab-placement-change="onHostTabPlacementChange"
        @fullscreen-change="onHostFullscreenChange"
      />
    </t-dialog>

    <t-dialog
      v-model:visible="confirmVisible"
      :header="t('common.confirm_delete')"
      :body="confirmBody"
      :on-cancel="onCancel"
      @confirm="onConfirmDelete"
    />

    <t-dialog v-model:visible="ImportXlsxVisible" @confirm="ImportXlsxVisible = false">
      <t-radio-group v-model="uploadParams.import_code_strategy">
        <t-radio value="0">{{ t('page.host.upload.import_auto_create_code') }}</t-radio>
        <t-radio value="1">{{ t('page.host.upload.import_remain_code') }}</t-radio>
      </t-radio-group>
      <t-upload
        v-model="files"
        :action="fileUploadUrl"
        :tips="tips"
        :headers="fileHeader"
        :data="uploadParams"
        :before-upload="beforeUpload"
        theme="file-input"
        :placeholder="t('page.host.upload_tips')"
        @fail="handleFail"
        @success="onUploadSuccess"
      />
    </t-dialog>

    <t-dialog
      v-model:visible="guardConfirmVisible"
      :header="t('page.host.guard_status_confirm')"
      :on-cancel="onGuardStatusCancel"
      @confirm="onGuardStatusConfirm"
    >
      <div>{{ t('page.host.guard_status_confirm_content') }}</div>
    </t-dialog>

    <t-dialog
      v-model:visible="startConfirmVisible"
      :header="t('page.host.start_status_confirm')"
      :on-cancel="onStartStatusCancel"
      @confirm="onStartStatusConfirm"
    >
      <div>{{ t('page.host.start_status_confirm_content') }}</div>
    </t-dialog>

    <t-dialog v-model:visible="sslAutoApplyVisible" :header="t('page.host.ssl_auto_apply')" :width="900" :footer="false">
      <ssl-order-list :src-host-code="currentHostCode" />
    </t-dialog>

    <t-dialog
      v-model:visible="guardAllConfirmVisible"
      :header="t('page.host.modify_all_guard_status')"
      :on-cancel="onGuardAllStatusCancel"
      @confirm="onGuardAllStatusConfirm"
    >
      <div>{{ t('page.host.confirm_modify_all_guard_status') }}</div>
      <t-radio-group v-model="guardAllStatus" style="margin-top: 16px">
        <t-radio value="1">{{ t('page.host.guard_status_on') }}</t-radio>
        <t-radio value="0">{{ t('page.host.guard_status_off') }}</t-radio>
      </t-radio-group>
    </t-dialog>

    <!-- 批量复制配置弹窗 -->
    <t-dialog
      v-model:visible="batchCopyVisible"
      :header="t('page.host.batch_copy.title')"
      :confirm-btn="{ content: t('page.host.batch_copy.execute_copy'), loading: batchCopyLoading }"
      :cancel-btn="{ content: t('common.cancel') }"
      width="600px"
      @confirm="executeBatchCopy"
      @cancel="cancelBatchCopy"
    >
      <!-- 源站点选择 -->
      <div class="batch-copy-section">
        <label class="batch-copy-label">{{ t('page.host.batch_copy.source_host') }}：</label>
        <t-select v-model="batchCopyForm.sourceHost" :placeholder="t('page.host.batch_copy.select_source_host')" style="width: 100%">
          <t-option v-for="item in sourceHostOptions" :key="item.code" :value="item.code" :label="item.host">
            {{ item.host }}
          </t-option>
        </t-select>
      </div>

      <!-- 功能模块选择 -->
      <div class="batch-copy-section">
        <label class="batch-copy-label">{{ t('page.host.batch_copy.copy_modules') }}：</label>
        <div class="module-checkboxes">
          <t-checkbox
            v-for="module in availableModules"
            :key="module.value"
            :checked="batchCopyForm.modules.includes(module.value)"
            class="module-checkbox"
            @change="(checked: boolean) => handleModuleChange(module.value, checked)"
          >
            {{ module.label }}
          </t-checkbox>
        </div>
      </div>

      <!-- 目标站点选择 -->
      <div class="batch-copy-section">
        <label class="batch-copy-label">{{ t('page.host.batch_copy.target_hosts') }}：</label>
        <div class="target-hosts-container">
          <div class="select-all-container">
            <t-checkbox
              :checked="isAllTargetsSelected"
              :indeterminate="batchCopyForm.targetHosts.length > 0 && !isAllTargetsSelected"
              @change="toggleSelectAllTargets"
            >
              {{ t('page.host.batch_copy.select_all') }}
            </t-checkbox>
          </div>
          <div class="target-hosts-list">
            <t-checkbox
              v-for="host in availableTargetHosts"
              :key="host.code"
              :checked="batchCopyForm.targetHosts.includes(host.code)"
              class="target-host-checkbox"
              @change="(checked: boolean) => handleTargetHostChange(host.code, checked)"
            >
              {{ host.host }}
            </t-checkbox>
          </div>
        </div>
      </div>

      <!-- 选择统计 -->
      <div class="batch-copy-summary">
        <t-tag theme="primary" variant="light">
          {{ t('page.host.batch_copy.selected_modules', { count: batchCopyForm.modules.length }) }}
        </t-tag>
        <t-tag theme="success" variant="light" style="margin-left: 8px">
          {{ t('page.host.batch_copy.selected_targets', { count: batchCopyForm.targetHosts.length }) }}
        </t-tag>
      </div>
    </t-dialog>

    <!-- 批量复制进度弹窗 -->
    <t-dialog
      v-model:visible="batchCopyProgress.visible"
      :header="t('page.host.batch_copy.progress_title')"
      :close-on-overlay-click="false"
      :close-btn="false"
      :footer="false"
      width="500px"
    >
      <div class="progress-container">
        <t-progress
          :percentage="batchCopyProgress.total > 0 ? Math.round((batchCopyProgress.current / batchCopyProgress.total) * 100) : 0"
          :status="batchCopyProgress.status === 'error' ? 'warning' : 'active'"
          style="margin-bottom: 16px"
        />

        <div class="progress-info">
          <div class="progress-text">
            <span v-if="batchCopyProgress.status === 'processing'">
              {{ t('page.host.batch_copy.copying_to') }} {{ batchCopyProgress.currentHost }}
            </span>
            <span v-else-if="batchCopyProgress.status === 'success'" class="success-text">
              {{ t('page.host.batch_copy.copy_completed') }}
            </span>
            <span v-else-if="batchCopyProgress.status === 'error'" class="error-text">
              {{ t('page.host.batch_copy.copy_error') }}
            </span>
          </div>
          <div class="progress-count">{{ batchCopyProgress.current }} / {{ batchCopyProgress.total }}</div>
        </div>

        <div v-if="batchCopyProgress.status !== 'processing'" class="progress-actions">
          <t-button theme="primary" @click="closeBatchCopyProgress">
            {{ t('common.close') }}
          </t-button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, markRaw, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, LoadingPlugin, type TableProps, type PageInfo } from 'tdesign-vue-next';
import {
  LinkIcon,
  FileCopyIcon,
  ViewListIcon,
  SecuredIcon,
  ErrorCircleIcon,
  CloseCircleIcon,
  ChartLineIcon,
  CloudUploadIcon,
  ThunderIcon,
  CheckCircleFilledIcon,
  ErrorCircleFilledIcon,
  HelpCircleFilledIcon,
} from 'tdesign-icons-vue-next';
import { v4 as uuidv4 } from 'uuid';

import { decryptIncoming } from '@/utils/seccrypto';
import { usePermissionStore } from '@/store/modules/permission';
import { getOnlineUrl } from '@/utils/usuallytool';
import { API_HOST } from '@/config/host';
import { SSL_STATUS } from '@/constants';
import { export_api } from '@/apis/common';
import {
  allhost,
  changeGuardStatus,
  changeStartStatus,
  hostlist,
  getHostDetail,
  delHost,
  addHost,
  editHost,
  modifyAllGuardStatus,
  batchCopyConfig,
  getPortOverview,
} from '@/apis/host';

import SslOrderList from '@/pages/waf/sslorder/index.vue';
import { allHostGroup, addHostGroup, editHostGroup, delHostGroup, sortHostGroup, assignHostGroup } from '@/apis/hostgroup';
import HostForm from './components/HostForm.vue';
import SiteTrend from './components/SiteTrend.vue';
import { INITIAL_DATA } from './constants';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

// 批量复制配置相关数据
const batchCopyVisible = ref(false);
const batchCopyLoading = ref(false);
const batchCopyProgress = reactive({
  visible: false,
  current: 0,
  total: 0,
  currentHost: '',
  status: 'processing' as 'processing' | 'success' | 'error',
});
const batchCopyForm = reactive({
  sourceHost: '',
  modules: ['cache'] as string[], // 默认选中缓存模块
  targetHosts: [] as string[],
});
const availableModules = computed(() => [
  { value: 'cache', label: t('page.host.batch_copy.module_cache') },
  { value: 'response_compress', label: t('page.host.batch_copy.module_response_compress') },
]);

const uploadParams = reactive({
  import_code_strategy: '0', // 编码导入策略 0 新增自动生成 1 保留原有
  import_table: 'hosts',
});
const files = ref<any[]>([]);
const tips = ref<string>(t('page.host.upload_file_limit_size'));
const fileUploadUrl = `${API_HOST}/import`;
const fileHeader = reactive<Record<string, string>>({
  'X-Token': localStorage.getItem('access_token') || '',
});

const addFormVisible = ref(false);
const editFormVisible = ref(false);
// 编辑弹窗打开时定位的 Tab(从访问日志"IP提取有问题?"跳来时定位到"其他配置")
const editInitTab = ref(1);
// 网站表单弹窗宽度：Tab 竖向布局(left)需要更宽，横向(top)保持 750
const hostFormDialogWidth = ref(localStorage.getItem('samwaf_host_tab_placement') === 'top' ? 750 : 920);
// HostForm 内切换 Tab 布局时联动调整弹窗宽度
const onHostTabPlacementChange = (placement: string) => {
  hostFormDialogWidth.value = placement === 'top' ? 750 : 920;
};
// HostForm 内的全屏开关：全屏时弹窗放宽到 96%
const hostFormFullscreen = ref(localStorage.getItem('samwaf_host_form_fullscreen') === '1');
const hostFormEffectiveWidth = computed<number | string>(() => (hostFormFullscreen.value ? '96%' : hostFormDialogWidth.value));
const onHostFullscreenChange = (full: boolean) => {
  hostFormFullscreen.value = full;
};

/* ===== 端口占用总览（issue #955） ===== */
const portOverviewVisible = ref(false);
const portOverviewLoading = ref(false);
const portOverviewRows = ref<Record<string, any>[]>([]);
const portOverviewColumns = computed(() => [
  { colKey: 'port', title: t('page.host.port_listen.col_port'), width: 90, cell: 'port' },
  { colKey: 'active', title: t('page.host.port_listen.col_active'), width: 130, cell: 'active' },
  { colKey: 'sites', title: t('page.host.port_listen.col_sites'), cell: 'sites' },
  { colKey: 'status', title: t('page.host.port_listen.col_status'), width: 110, cell: 'status' },
]);
const handlePortOverview = () => {
  portOverviewVisible.value = true;
  portOverviewLoading.value = true;
  // 响应拦截器返回的是整个报文 {code,msg,data}，列表在 data 里
  getPortOverview({})
    .then((res: any) => {
      if (res && res.code === 0) {
        portOverviewRows.value = Array.isArray(res.data) ? res.data : [];
      } else {
        portOverviewRows.value = [];
        if (res && res.msg) MessagePlugin.error(res.msg);
      }
    })
    .catch((e: any) => {
      MessagePlugin.error(e && e.message ? e.message : String(e));
    })
    .finally(() => {
      portOverviewLoading.value = false;
    });
};
const portOverviewRowClass = ({ row }: { row: Record<string, any> }) => (row && row.conflict ? 'port-overview-conflict-row' : '');
const confirmVisible = ref(false);
const sslAutoApplyVisible = ref(false);
const ImportXlsxVisible = ref(false);
const guardConfirmVisible = ref(false);
const startConfirmVisible = ref(false);
const guardAllConfirmVisible = ref(false);
const guardAllStatus = ref('1');

const formData = ref<Record<string, any>>({ ...INITIAL_DATA });
const formEditData = ref<Record<string, any>>({ ...INITIAL_DATA });

const dataLoading = ref(false);
const data = ref<Record<string, any>[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const rowKey = 'code';
const selectCanFilter = ref(true);
const currentHostCode = ref('');

// 列宽自适应量出的结果：columns 是 computed（i18n 换语言要重建标题），
// 宽度变化走这份 reactive 状态，computed 里合并即可，不必整个替换数组
const colWidths = reactive<{ host?: number; status_switches?: number; data_stats?: number; backend?: number; op?: number }>({});

const columns = computed<TableProps['columns']>(() => [
  // 多选列：目前唯一的使用方是「移动到分组」。
  // 全局网站不参与分组（它不是真实站点），直接禁选，省得用户勾了却没生效。
  { colKey: 'row-select', type: 'multiple', width: 46, fixed: 'left', disabled: ({ row }: { row: Record<string, any> }) => row.global_host === 1 },
  {
    title: t('page.host.host'),
    align: 'left',
    width: colWidths.host ?? 340,
    ellipsis: true,
    colKey: 'host',
    cell: 'host',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: { placeholder: t('page.host.host_filter_placeholder') },
      showConfirmAndReset: true,
    },
  },
  { title: t('page.host.run_status'), colKey: 'status_switches', width: colWidths.status_switches ?? 180, cell: 'status_switches' },
  { title: t('page.host.stats_info'), colKey: 'data_stats', width: colWidths.data_stats ?? 360, minWidth: 340, cell: 'data_stats' },
  {
    title: t('page.host.backend_service'),
    width: colWidths.backend ?? 170,
    colKey: 'backend',
    cell: 'backend',
    filter: {
      type: 'input',
      resetValue: '',
      confirmEvents: ['onEnter'],
      props: { placeholder: t('common.placeholder') },
      showConfirmAndReset: true,
    },
  },
  // 操作列吸附右侧：表格总列宽 ~1600px，窄屏必然横向滚动，
  // 不固定的话操作列会被推出可视区，得先把表格拖到底才点得到
  { align: 'left', width: colWidths.op ?? 160, colKey: 'op', title: t('common.op'), fixed: 'right' },
]);

const pagination = reactive({ total: 0, current: 1, pageSize: 10 });

// 顶部搜索
// group_code 一并随请求发出：走后端精确匹配，不进 filter_by 的 like 通道
const searchformData = reactive({ remarks: '', code: '', group_code: '' });

// ---------- 网站分组 ----------
const hostGroups = ref<Record<string, any>[]>([]);
const groupAllCount = ref(0);
const groupNoneCount = ref(0);
const currentGroup = ref('all');
const groupColors = ['#0052D9', '#2BA471', '#E37318', '#D54941', '#834EC2', '#0594FA', '#8B8B8B', '#D4A017'];
const groupFormVisible = ref(false);
const groupForm = ref<Record<string, any>>({ id: '', group_name: '', color: '#0052D9', remarks: '' });
const groupDelVisible = ref(false);
const groupDelTarget = ref<Record<string, any>>({ id: '', group_name: '', host_count: 0 });
const assignVisible = ref(false);
const assignGroupCode = ref('');
const assignGlobalCount = ref(0);

/**
 * group_code -> 分组对象 的字典，供站点列 badge 渲染。
 * 后端不做 join，组名与颜色都在前端映射；映射不到就是「未知分组」（跨实例导入没带 host_group 表的情形）。
 */
const groupDict = computed<Record<string, any>>(() => {
  const dict: Record<string, any> = {};
  (hostGroups.value || []).forEach((g) => {
    dict[g.group_code] = g;
  });
  return dict;
});
// 排序字段
const sorts = reactive({ sortBy: 'create_time', descending: true });
// 筛选字段
const filters = reactive({ filter_by: '', filter_value: '' });

// 索引区域
const deleteIdx = ref(-1);
const guardStatusIdx = ref(-1);
const startStatusIdx = ref(-1);

const hostAddUrl = `${getOnlineUrl()}/guide/Host.html#_2-新增可被防火墙保护的网站`;

// 主机字典
const host_dic = ref<Record<string, string>>({});

const confirmBody = computed(() => {
  if (deleteIdx.value > -1) {
    return t('page.host.delete_confirm_clear_relation');
  }
  return '';
});

/** 编辑弹窗标题上显示的站点信息，格式与顶部站点下拉一致：域名:端口(昵称,SSL,备注) */
const editHostLabel = computed(() => {
  const data = formEditData.value || {};
  if (!data.host) {
    return '';
  }
  const bracketContent: string[] = [];
  if (data.nickname) {
    bracketContent.push(data.nickname);
  }
  if (Number(data.ssl) === 1) {
    bracketContent.push('SSL');
  }
  if (data.remarks) {
    bracketContent.push(data.remarks);
  }
  const baseLabel = `${data.host}:${data.port}`;
  return bracketContent.length > 0 ? `${baseLabel}(${bracketContent.join(',')})` : baseLabel;
});

async function copyHostCode(event: MouseEvent) {
  const container = (event.currentTarget as HTMLElement).parentElement;
  const code = formEditData.value.code;
  if (!code) return;
  const done = () => MessagePlugin.success(t('page.visit_log.detail.copied'));
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(code);
      done();
      return;
    } catch {
      // HTTP 管理端或剪贴板权限受限时使用兼容方式。
    }
  }
  const input = document.createElement('textarea');
  input.value = code;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  (container || document.body).appendChild(input);
  try {
    input.select();
    if (document.execCommand('copy')) done();
    else MessagePlugin.error(t('page.visit_log.detail.copy_failed'));
  } catch {
    MessagePlugin.error(t('page.visit_log.detail.copy_failed'));
  } finally {
    input.remove();
  }
}

/** 批量复制源站点选项（排除全局网站） */
const sourceHostOptions = computed(() =>
  Object.keys(host_dic.value).map((code) => ({ code, host: host_dic.value[code] })).filter((item) => item.host !== '全局网站:0'),
);

/** 可用的目标主机列表（排除源主机与全局网站） */
const availableTargetHosts = computed(() => {
  const nonGlobalHosts = sourceHostOptions.value;
  if (batchCopyForm.sourceHost) {
    return nonGlobalHosts.filter((host) => host.code !== batchCopyForm.sourceHost);
  }
  return nonGlobalHosts;
});

/** 是否全选了所有目标站点 */
const isAllTargetsSelected = computed(
  () => batchCopyForm.targetHosts.length === availableTargetHosts.value.length && availableTargetHosts.value.length > 0,
);

/* ===== 站点态势总览（KPI） ===== */
const statsLoading = ref(false);
// 由一次独立的全量拉取计算，不随当前分页 / 筛选变化
const hostStats = reactive({
  total: 0,
  protected: 0,
  abnormal: 0,
  attack: 0,
  pv: 0,
  uv: 0,
  trafficIn: 0,
  trafficOut: 0,
  qps: 0,
  conn: 0,
  lbSites: 0,
  globalCount: 0,
  firstAbnormal: '',
});

/**
 * 顶部站点态势总览卡片。数据来自 hostStats（一次全量拉取），
 * 让页面在进入时先看到整体防护态势，而不是直接陷入列表。
 */
const kpiCards = computed(() => {
  const s = hostStats;
  const fmt = (v: number | string) => (Number(v) || 0).toLocaleString('en-US');
  const ratio = s.total > 0 ? Math.round((s.protected / s.total) * 1000) / 10 : 0;
  const traffic = (Number(s.trafficIn) || 0) + (Number(s.trafficOut) || 0);
  return [
    {
      key: 'sites',
      theme: 'brand',
      icon: markRaw(ViewListIcon),
      label: t('page.host.overview_sites'),
      value: fmt(s.total),
      sub: s.globalCount > 0 ? t('page.host.overview_sub_global', { n: s.globalCount }) : t('page.host.overview_sub_groups', { n: (hostGroups.value || []).length }),
    },
    {
      key: 'guard',
      theme: 'success',
      icon: markRaw(SecuredIcon),
      label: t('page.host.overview_guard'),
      value: `${s.protected}/${s.total}`,
      sub: t('page.host.overview_ratio', { n: ratio }),
    },
    {
      key: 'abnormal',
      theme: 'error',
      icon: markRaw(ErrorCircleIcon),
      label: t('page.host.overview_abnormal'),
      value: fmt(s.abnormal),
      sub: s.firstAbnormal || t('page.host.overview_all_sites'),
    },
    {
      key: 'attack',
      theme: 'error',
      icon: markRaw(CloseCircleIcon),
      label: t('page.host.overview_attack'),
      value: fmt(s.attack),
      sub: t('page.host.overview_all_sites'),
    },
    {
      key: 'pv',
      theme: 'cyan',
      icon: markRaw(ChartLineIcon),
      label: t('page.host.overview_pv'),
      value: fmt(s.pv),
      sub: t('page.host.overview_pv_sub', { n: fmt(s.uv) }),
    },
    {
      key: 'traffic',
      theme: 'purple',
      icon: markRaw(CloudUploadIcon),
      label: t('page.host.overview_traffic'),
      value: formatTrafficBytes(traffic),
      sub: t('page.host.overview_traffic_sub', {
        in: formatTrafficBytes(s.trafficIn),
        out: formatTrafficBytes(s.trafficOut),
      }),
    },
    {
      key: 'qps',
      theme: 'warning',
      icon: markRaw(ThunderIcon),
      label: t('page.host.overview_qps'),
      value: fmt(s.qps),
      sub: t('page.host.overview_all_sites'),
    },
    {
      key: 'conn',
      theme: 'success',
      icon: markRaw(LinkIcon),
      label: t('page.host.overview_conn'),
      value: fmt(s.conn),
      sub: t('page.host.overview_lb_sites', { n: s.lbSites }),
    },
  ];
});

// 展开行：承载备注 / 创建时间等次要信息，保持主行聚焦
const expandedRowKeys = ref<(string | number)[]>([]);

// 首次拿到数据后按内容自适应一次列宽，之后交给用户拖拽
const autoFitDone = ref(false);
const listTableRef = ref<any>(null);

function formatTrafficBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

// ==================== 站点访问地址 / 监听端口 ====================
/**
 * 站点主访问地址：优先用主监听（resolved_listens 里 is_main 的那条）的协议+端口拼，
 * 没有监听表时退回 ssl + port。默认端口（80/443）不写进 URL。
 */
function siteUrl(row: Record<string, any>): string {
  if (!row || !row.host || Number(row.global_host) === 1) return '';
  const listens: any[] = Array.isArray(row.resolved_listens) ? row.resolved_listens.filter((l: any) => l && !l.implied) : [];
  const main = listens.find((l: any) => l.is_main) || listens[0];
  const proto = (main && main.proto) || (row.ssl === SSL_STATUS.SSL ? 'https' : 'http');
  const port = Number((main && main.port) || row.port) || 0;
  const isDefault = (proto === 'https' && port === 443) || (proto === 'http' && port === 80);
  return `${proto}://${row.host}${isDefault || !port ? '' : `:${port}`}`;
}

/** 同站点的其它绑定域名 → 复用主地址的协议与端口 */
function domainUrl(row: Record<string, any>, domain: string): string {
  const base = siteUrl(row);
  if (!base || !domain) return '';
  try {
    const u = new URL(base);
    return `${u.protocol}//${domain}${u.port ? `:${u.port}` : ''}`;
  } catch {
    return '';
  }
}

/** 绑定域名列表（bind_more_host 按行） */
function domains(row: Record<string, any>): string[] {
  if (!row || !row.bind_more_host) return [];
  return String(row.bind_more_host)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

interface PortTag {
  key: string;
  proto: string;
  label: string;
  title: string;
}

/** 「监听端口」并入站点列后的标签；无 resolved_listens 时回退 port / bind_more_port */
function portTags(row: Record<string, any>): PortTag[] {
  if (!row) return [];
  const listens: any[] = Array.isArray(row.resolved_listens) ? row.resolved_listens.filter((l: any) => l && !l.implied) : [];
  if (listens.length > 0) {
    return listens.map((l: any, i: number) => {
      const proto = String(l.proto || '').toLowerCase();
      return {
        key: `rl-${l.port}-${proto}-${i}`,
        proto,
        label: `${l.port}·${proto.toUpperCase()}`,
        title: `${l.port} · ${proto.toUpperCase()}${l.ipv && l.ipv !== 'both' ? ` · ${l.ipv}` : ''}`,
      };
    });
  }
  const out: PortTag[] = [];
  if (row.port) {
    const proto = row.ssl === SSL_STATUS.SSL ? 'https' : 'http';
    out.push({
      key: `p-${row.port}`,
      proto,
      label: `${row.port}·${proto.toUpperCase()}`,
      title: `${row.port} · ${proto.toUpperCase()}`,
    });
  }
  String(row.bind_more_port || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)
    .forEach((p: string, i: number) => out.push({ key: `m-${i}-${p}`, proto: '', label: p, title: p }));
  return out;
}

/** 站点列是否有 badge 行（SSL / 监听端口 / 分组） */
function hasHostBadges(row: Record<string, any>): boolean {
  if (!row) return false;
  return row.ssl === SSL_STATUS.SSL || portTags(row).length > 0 || Number(row.global_host) === 1 || !!row.group_code;
}

/** 健康检测是否关闭（解析 healthy_json；空串/解析失败视为开启，与后端默认一致） */
function healthCheckOff(row: Record<string, any>): boolean {
  const raw = row && row.healthy_json;
  if (!raw) return false;
  try {
    return Number(JSON.parse(raw).is_enable_healthy) !== 1;
  } catch (e) {
    return false;
  }
}

/** 健康三态：ok 正常 / bad 异常 / unknown 未知（已开启暂无数据）/ off 检测已关闭；全局站点返回 none（不展示） */
function healthState(row: Record<string, any>): string {
  if (!row || Number(row.global_host) === 1) return 'none';
  if (healthCheckOff(row)) return 'off';
  const hs = row.healthy_status;
  if (!Array.isArray(hs) || hs.length === 0) return 'unknown';
  return hs.some((h: any) => h && h.IsHealthy === false) ? 'bad' : 'ok';
}

/** 健康状态文案：正常 / 异常 / 暂无数据 / 检测已关闭 */
function healthText(row: Record<string, any>): string {
  const st = healthState(row);
  if (st === 'ok') return t('page.host.healthy_status_normal');
  if (st === 'bad') return t('page.host.healthy_status_abnormal');
  if (st === 'off') return t('page.host.healthy_status_off');
  return t('page.host.healthy_status_unknown');
}

/** 最近检测时间：列里只放 时:分:秒，完整时间放 tooltip；检测关闭时不显示 */
function healthCheckTime(row: Record<string, any>): string {
  if (healthState(row) === 'off') return '';
  const hs = Array.isArray(row && row.healthy_status) ? row.healthy_status : [];
  const entry = hs.find((h: any) => h && h.IsHealthy === false) || hs[0] || {};
  const raw = entry.LastCheckTime;
  if (!raw) return '';
  const d = new Date(Number(raw) || raw);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 健康状态 tooltip：状态 + 完整检测时间 + 失败次数与原因（信息量比只有一个图标大）；检测关闭只显示文案 */
function healthTip(row: Record<string, any>): string {
  const st = healthState(row);
  if (st === 'off') return healthText(row);
  const hs = Array.isArray(row && row.healthy_status) ? row.healthy_status : [];
  const entry = hs.find((h: any) => h && h.IsHealthy === false) || hs[0] || {};
  const parts = [healthText(row)];
  if (entry.LastCheckTime) {
    const d = new Date(Number(entry.LastCheckTime) || entry.LastCheckTime);
    if (!Number.isNaN(d.getTime())) {
      parts.push(`${t('page.host.healthy_status_detail.check_time')} ${d.toLocaleString()}`);
    }
  }
  if (st === 'bad') {
    if (entry.FailCount) parts.push(`${t('page.host.healthy_status_detail.failure_cnt')} ${entry.FailCount}`);
    if (entry.LastErrorReason) parts.push(entry.LastErrorReason);
  }
  return parts.join(' · ');
}

/** 后端地址：IPv6 用 [] 包起来，否则会看成「地址:端口」连在一起 */
function formatBackendAddr(row: Record<string, any>): string {
  if (!row) return '';
  const ip = row.remote_ip || '';
  const host = ip.indexOf(':') >= 0 ? `[${ip}]` : ip;
  return row.remote_port ? `${host}:${row.remote_port}` : host;
}

/** 单站点是否健康异常：全局站点不计；检测关闭或无数据视为「未知」不算异常 */
function isHostAbnormal(row: Record<string, any>): boolean {
  if (!row || Number(row.global_host) === 1) return false;
  if (healthCheckOff(row)) return false;
  const hs = row.healthy_status;
  if (!Array.isArray(hs) || hs.length === 0) return false;
  return hs.some((h: any) => h && h.IsHealthy === false);
}

/**
 * 拉取全量站点用于计算顶部态势总览。独立于列表分页/筛选：
 * 列表是「当前作用域」，总览始终是「全站」。
 * 站点超过单页上限时分页拉全，保证汇总与「站点总数」同一口径——
 * 否则 >1000 站点时总数显示真实值、其余指标只算前 1000 条，相邻卡片互相矛盾。
 */
async function loadStats() {
  statsLoading.value = true;
  try {
    const pageSize = 1000;
    const rows: Record<string, any>[] = [];
    let total = 0;
    let pageIndex = 1;
    let gotAny = false;
    for (;;) {
      // 分页只能串行：下一翻要靠上一页返回的 total 判断是否已经拉完
      // eslint-disable-next-line no-await-in-loop
      const res = await hostlist({ pageSize, pageIndex, sort_by: 'create_time', sort_descending: 'desc' });
      if (!res || res.code !== 0) break;
      gotAny = true;
      const list = (res.data && res.data.list) || [];
      total = Number((res.data && res.data.total) || 0) || list.length;
      rows.push(...list);
      // 拉完 / 空页即停；用 rows >= total 兜底，防止服务端 total 与实际可翻页数不一致时死循环
      if (list.length === 0 || rows.length >= total) break;
      pageIndex += 1;
    }
    // 一页都没拿到时保留上一次汇总，避免请求失败把整排 KPI 清零
    if (!gotAny) return;
    const s = {
      total: total || rows.length,
      protected: 0,
      abnormal: 0,
      attack: 0,
      pv: 0,
      uv: 0,
      trafficIn: 0,
      trafficOut: 0,
      qps: 0,
      conn: 0,
      lbSites: 0,
      globalCount: 0,
      firstAbnormal: '',
    };
    rows.forEach((r) => {
      if (Number(r.guard_status) === 1) s.protected += 1;
      if (Number(r.global_host) === 1) s.globalCount += 1;
      if (Number(r.is_enable_load_balance) === 1) s.lbSites += 1;
      s.attack += Number(r.today_attack_count) || 0;
      s.pv += Number(r.today_pv_count) || 0;
      s.uv += Number(r.today_uv_count) || 0;
      s.trafficIn += Number(r.today_traffic_in) || 0;
      s.trafficOut += Number(r.today_traffic_out) || 0;
      s.qps += Number(r.real_time_qps) || 0;
      s.conn += Number(r.real_time_connect_cnt) || 0;
      if (isHostAbnormal(r)) {
        s.abnormal += 1;
        if (!s.firstAbnormal) s.firstAbnormal = r.nickname || r.host;
      }
    });
    Object.assign(hostStats, s);
  } catch (e) {
    console.log(e);
  } finally {
    statsLoading.value = false;
  }
}

const onExpandChange = (keys: (string | number)[]) => {
  expandedRowKeys.value = keys;
};

/** 展开行：承载备注 / 创建时间 / 多域名等次要信息，主行不再堆叠 */
const expandedRow = (_h: typeof h, { row }: { row: Record<string, any> }) => {
  const items = [
    { k: t('common.remarks'), v: row.remarks || '—' },
    { k: t('common.create_time'), v: row.create_time || '—' },
    { k: t('page.host.remote_ip'), v: formatBackendAddr(row) || '—' },
  ];
  // 「不限端口」是安全相关的工作模式，旧列表页每行会标出来；
  // 改版后主行不放次要标记，就在这里补上（只在开启时显示，与旧版一致）
  if (Number(row.global_host) !== 1 && (row.unrestricted_port === 0 || row.unrestricted_port === '0')) {
    items.push({
      k: t('page.host.unrestricted_port.label_unrestricted_port_is_enable'),
      v: t('page.host.unrestricted_port.label_unrestricted_port_is_enable_on'),
    });
  }
  if (row.bind_more_host && String(row.bind_more_host).trim()) {
    items.push({
      k: t('page.host.bind_domains'),
      v: String(row.bind_more_host)
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean)
        .join(' / '),
    });
  }
  // 说明：expandedRow 是运行时 h() 生成的 VNode，拿不到 scoped 的 data-v 作用域，
  // 因此这里用内联样式而不是 class，避免展开后没有样式。
  return h(
    'div',
    { style: 'display:flex;flex-wrap:wrap;gap:8px 28px;padding:2px 0;' },
    items.map((it) =>
      h('div', { style: 'display:flex;gap:8px;font-size:12.5px;' }, [
        h('span', { style: 'color:var(--td-text-color-placeholder);' }, it.k),
        h('span', { style: 'color:var(--td-text-color-primary);' }, it.v),
      ]),
    ),
  );
};

/**
 * 按内容自适应列宽：离屏克隆一份表格、放开 fixed 布局量出每列自然宽度，
 * 再写回 colWidths（columns computed 会合并，也就是 resizable 的拖拽基线）。首次拿到数据后跑一次。
 */
function autoFitColumns(): boolean {
  try {
    const root: HTMLElement | null = listTableRef.value?.$el;
    const table = root && root.querySelector('.t-table__content table');
    if (!table || !table.querySelector('tbody tr')) return false;

    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-99999px;top:-99999px;visibility:hidden;pointer-events:none;';
    const clone = table.cloneNode(true) as HTMLTableElement;
    clone.style.tableLayout = 'auto';
    clone.style.width = 'auto';
    // resizable 会把当前列宽写成 <col style="width:...">，auto 布局下这些宽度仍是「下限」，
    // 不清掉就只能量出≈当前配置宽度，域名短的场景永远收不回去
    clone.querySelectorAll<HTMLTableColElement>('col').forEach((col) => {
      col.removeAttribute('width');
      col.style.width = '';
      col.style.minWidth = '';
    });
    holder.appendChild(clone);
    document.body.appendChild(holder);

    const measure = (key: string) => {
      const th = clone.querySelector<HTMLElement>(`.t-table__th-${key}`);
      return th ? Math.ceil(th.getBoundingClientRect().width) : 0;
    };
    const got = {
      host: measure('host'),
      run: measure('status_switches'),
      stats: measure('data_stats'),
      backend: measure('backend'),
      op: measure('op'),
    };
    document.body.removeChild(holder);

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, (v || 0) + 4));
    colWidths.host = clamp(got.host, 300, 520);
    colWidths.status_switches = clamp(got.run, 176, 220);
    colWidths.data_stats = clamp(got.stats, 340, 560);
    colWidths.backend = clamp(got.backend, 170, 320);
    colWidths.op = clamp(got.op, 150, 220);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

// ==================== 工具栏分组下拉 ====================
function batchMenuOptions() {
  return [
    { content: t('page.host.modify_all_guard_status'), value: 'guardAll' },
    { content: t('page.host.batch_copy_config'), value: 'batchCopy' },
  ];
}

function onBatchMenuClick(data: any) {
  const act = data && data.value ? data.value : data;
  if (act === 'guardAll') {
    handleModifyAllGuardStatus();
  } else if (act === 'batchCopy') {
    handleBatchCopyConfig();
  }
}

function importExportMenuOptions() {
  const options = [
    { content: t('page.host.export_data'), value: 'export' },
    { content: t('page.host.import_data'), value: 'import' },
    // 一键修改（Nginx 导入）已移入平台域，租户不出现该入口
    ...(usePermissionStore().isPlatform ? [{ content: t('page.host.import_nginx'), value: 'nginx' }] : []),
  ];
  return options;
}

function onImportExportMenuClick(data: any) {
  const act = data && data.value ? data.value : data;
  if (act === 'export') {
    HandleExportExcel();
  } else if (act === 'import') {
    HandleImportExcel();
  } else if (act === 'nginx') {
    handleImportNginx();
  }
}

// 一键修改所有主机防护状态
function handleModifyAllGuardStatus() {
  guardAllConfirmVisible.value = true;
}

function onGuardAllStatusConfirm() {
  doModifyAllGuardStatus(guardAllStatus.value);
  guardAllConfirmVisible.value = false;
}

function onGuardAllStatusCancel() {
  guardAllConfirmVisible.value = false;
}

function doModifyAllGuardStatus(status: string) {
  const loading = LoadingPlugin({ fullscreen: true, text: t('common.loading') });
  modifyAllGuardStatus({ guard_status: parseInt(status) })
    .then((response) => {
      if (response.code === 0) {
        MessagePlugin.success(t('common.success'));
        getList();
        loadStats(); // 批量开关会影响「防护开启」等汇总
      } else {
        MessagePlugin.error(response.msg || t('common.failed'));
      }
    })
    .catch(() => {
      MessagePlugin.error(t('common.failed'));
    })
    .finally(() => {
      loading.hide();
    });
}

function loadHostList() {
  return new Promise<void>((resolve, reject) => {
    allhost()
      .then((res) => {
        if (res.code === 0) {
          const host_options = res.data as { value: string; label: string }[];
          for (let i = 0; i < host_options.length; i++) {
            host_dic.value[host_options[i].value] = host_options[i].label;
          }
        }
        resolve();
      })
      .catch((e: Error) => {
        console.log(e);
        reject(e);
      });
  });
}

// ==================== 网站分组 ====================
/** 拉取全部分组 + 未分组/全部计数（分组条与站点列 badge 共用一份数据） */
function loadHostGroups() {
  return allHostGroup({})
    .then((res: any) => {
      if (res.code === 0 && res.data) {
        hostGroups.value = res.data.list || [];
        groupNoneCount.value = res.data.none_count || 0;
        groupAllCount.value = res.data.all_count || 0;
        // 当前选中的分组被别处删掉了，退回「全部网站」，免得一直查一个不存在的组
        if (
          currentGroup.value !== 'all' &&
          currentGroup.value !== '__none__' &&
          !hostGroups.value.some((g) => g.group_code === currentGroup.value)
        ) {
          currentGroup.value = 'all';
          searchformData.group_code = '';
        }
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

/**
 * 切换分组：分页必须重置到第 1 页，
 * 否则停在第 3 页切到只有 1 页的组会显示空列表，看着像数据丢了。
 */
function pickGroup(code: string) {
  currentGroup.value = code;
  searchformData.group_code = code === 'all' ? '' : code;
  pagination.current = 1;
  selectedRowKeys.value = [];
  getList();
}

/** 预设色 -> 浅色底，用于分组标签背景（颜色本身来自后端白名单，不是任意字符串） */
function hexToSoft(hex: string) {
  if (!hex || hex.length !== 7) {
    return '#f3f3f3';
  }
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  return `rgba(${r}, ${g}, ${b}, 0.1)`;
}

function groupMenuOptions(idx: number) {
  return [
    { content: t('page.host.group.rename'), value: 'edit' },
    { content: t('page.host.group.move_left'), value: 'up', disabled: idx === 0 },
    { content: t('page.host.group.move_right'), value: 'down', disabled: idx === hostGroups.value.length - 1 },
    { content: t('common.delete'), value: 'del', theme: 'error' },
  ];
}

function onGroupMenuClick(data: any, group: Record<string, any>, idx: number) {
  const act = data && data.value ? data.value : data;
  if (act === 'edit') {
    openGroupForm(group);
  } else if (act === 'up') {
    moveGroup(idx, -1);
  } else if (act === 'down') {
    moveGroup(idx, 1);
  } else if (act === 'del') {
    askDelGroup(group);
  }
}

function openGroupForm(group: Record<string, any> | null) {
  if (group) {
    groupForm.value = {
      id: group.id,
      group_name: group.group_name,
      color: group.color || groupColors[0],
      remarks: group.remarks || '',
    };
  } else {
    groupForm.value = { id: '', group_name: '', color: groupColors[0], remarks: '' };
  }
  groupFormVisible.value = true;
}

function saveGroup() {
  const name = (groupForm.value.group_name || '').trim();
  if (!name) {
    MessagePlugin.warning(t('page.host.group.name_required'));
    return;
  }
  const body = { group_name: name, color: groupForm.value.color, remarks: groupForm.value.remarks };
  const req = groupForm.value.id ? editHostGroup({ ...body, id: groupForm.value.id }) : addHostGroup(body);
  req
    .then((res: any) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.success'));
        groupFormVisible.value = false;
        loadHostGroups();
        getList();
      } else {
        MessagePlugin.error(res.msg || t('common.failed'));
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function askDelGroup(group: Record<string, any>) {
  groupDelTarget.value = { id: group.id, group_name: group.group_name, host_count: group.host_count || 0 };
  groupDelVisible.value = true;
}

function doDelGroup() {
  delHostGroup({ id: groupDelTarget.value.id })
    .then((res: any) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.success'));
        groupDelVisible.value = false;
        // 被删的组正好是当前筛选条件时退回「全部网站」
        loadHostGroups().then(() => {
          pickGroup(currentGroup.value);
        });
      } else {
        MessagePlugin.error(res.msg || t('common.failed'));
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function moveGroup(idx: number, delta: number) {
  const target = idx + delta;
  if (target < 0 || target >= hostGroups.value.length) {
    return;
  }
  const arr = hostGroups.value.slice();
  const tmp = arr[idx];
  arr[idx] = arr[target];
  arr[target] = tmp;
  sortHostGroup({ ids: arr.map((g) => g.id) })
    .then((res: any) => {
      if (res.code === 0) {
        hostGroups.value = arr;
      } else {
        MessagePlugin.error(res.msg || t('common.failed'));
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function openAssignGroup() {
  if (selectedRowKeys.value.length === 0) {
    return;
  }
  // 全局网站不参与分组，后端也会剔除；这里只是先把数量告诉用户
  assignGlobalCount.value = (data.value || []).filter(
    (row) => selectedRowKeys.value.indexOf(row.code) > -1 && row.global_host === 1,
  ).length;
  assignGroupCode.value = '';
  assignVisible.value = true;
}

function doAssignGroup() {
  assignHostGroup({ host_codes: selectedRowKeys.value, group_code: assignGroupCode.value })
    .then((res: any) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg || t('common.success'));
        assignVisible.value = false;
        selectedRowKeys.value = [];
        loadHostGroups();
        getList();
      } else {
        MessagePlugin.error(res.msg || t('common.failed'));
        // 目标组可能刚被别处删掉，刷新分组条让用户看到最新的组
        loadHostGroups();
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

/** 行内「更多」里的低频操作。高频的「编辑」「证书申请」在单元格里直出，不进这里。 */
function rowMoreOptions() {
  return [
    { content: t('common.copy'), value: 'copy' },
    { content: t('common.delete'), value: 'del', theme: 'error' },
  ];
}

function onRowMoreClick(data: any, slotProps: { row: Record<string, any>; rowIndex: number }) {
  const act = data && data.value ? data.value : data;
  if (act === 'copy') {
    handleClickCopy(slotProps);
  } else if (act === 'del') {
    handleClickDelete(slotProps);
  }
}

/**
 * 组合筛选参数：表格列筛选（filters）+ 顶部「备注」搜索框。
 * 备注列改版后挪进了展开行、没有独立列了，但后端支持 remarks 的 like 查询，
 * 这里统一并入 filter_by / filter_value 通道，两种条件可叠加。
 */
function composeFilterParams() {
  let by = filters.filter_by;
  let value = filters.filter_value;
  const remarks = String(searchformData.remarks || '').trim();
  if (remarks) {
    by = by ? `${by}|remarks` : 'remarks';
    value = value ? `${value}|${remarks}` : remarks;
  }
  return { filter_by: by, filter_value: value };
}

function getList() {
  dataLoading.value = true;
  const sortDescending = sorts.descending ? 'desc' : 'asc';
  const filterParams = composeFilterParams();
  hostlist({
    pageSize: pagination.pageSize,
    pageIndex: pagination.current,
    sort_by: sorts.sortBy,
    sort_descending: sortDescending,
    filter_by: filterParams.filter_by,
    filter_value: filterParams.filter_value,
    ...searchformData,
  })
    .then((res) => {
      if (res.code === 0) {
        data.value = res.data.list ?? [];
        pagination.total = res.data.total;
        // 首次拿到数据后按内容自适应一次列宽（之后列宽交给用户拖拽）
        if (!autoFitDone.value) {
          nextTick(() => {
            setTimeout(() => {
              if (autoFitColumns()) autoFitDone.value = true;
            }, 0);
          });
        }
      }
    })
    .catch((e: Error) => {
      console.log(e);
    })
    .finally(() => {
      dataLoading.value = false;
    });
  // 顶部态势总览不在这里刷新：翻页 / 筛选不改变汇总数字，
  // 只在增删改 / 防护开关成功后由各回调显式调用 loadStats()（否则每翻一页都全量重拉）
}

function rehandlePageChange(pageInfo: PageInfo) {
  pagination.current = pageInfo.current;
  if (pagination.pageSize !== pageInfo.pageSize) {
    pagination.current = 1;
    pagination.pageSize = pageInfo.pageSize;
  }
  getList();
}

function rehandleSelectChange(keys: (string | number)[]) {
  selectedRowKeys.value = keys;
}

function handleClickCopy(e: { row: Record<string, any> }) {
  const { code, global_host } = e.row;
  if (global_host === 1) {
    MessagePlugin.warning(t('page.host.forbid_for_global_site'));
    return;
  }
  addFormVisible.value = true;
  getHostDetail({ code: code })
    .then((res) => {
      if (res.code === 0) {
        formData.value = {
          ...res.data,
          code: uuidv4(),
          // 清空SSL证书相关信息和绑定关系
          bind_ssl_id: '',
          auto_jump_https: 0,
          certfile: '',
          keyfile: '',
        };
      }
    })
    .catch((e2: Error) => {
      console.log(e2);
    });
}

function handleClickEdit(e: { row: Record<string, any> }) {
  editInitTab.value = 1;
  const { code, global_host } = e.row;
  if (global_host === 1) {
    MessagePlugin.warning(t('page.host.forbid_for_global_site_only_change_guard_status'));
    return;
  }
  // 先清空，避免详情返回前弹窗标题上还显示上一个站点信息
  formEditData.value = { code: '' };
  editFormVisible.value = true;
  getDetail(code);
}

function handleAddHost() {
  formData.value = { ...formData.value, code: uuidv4() };
  addFormVisible.value = true;
}

// 跳转到一键修改页的“批量导入网址”标签
function handleImportNginx() {
  router.push({ name: 'OneKeyMod', query: { tab: 'import' } });
}

function onSubmit(payload: { result: Record<string, any> }) {
  addHost({ ...payload.result })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        if (payload.result.ssl_config_mode === 'auto_apply') {
          loadHostList().then(() => {
            sslAutoApplyVisible.value = true;
            currentHostCode.value = res.data;
          });
        }
        addFormVisible.value = false;
        pagination.current = 1;
        formData.value = { ...INITIAL_DATA };
        loadHostGroups();
        getList();
        loadStats();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onSubmitEdit(payload: { result: Record<string, any> }) {
  editHost({ ...payload.result })
    .then((res) => {
      if (res.code === 0) {
        MessagePlugin.success(res.msg);
        editFormVisible.value = false;
        loadHostGroups();
        getList();
        loadStats();
      } else {
        MessagePlugin.warning(res.msg);
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onClickCloseBtn() {
  addFormVisible.value = false;
  formData.value = { ...INITIAL_DATA };
}

function onClickCloseEditBtn() {
  editFormVisible.value = false;
  formEditData.value = { ...INITIAL_DATA };
}

function handleClickDelete(e: { row: Record<string, any>; rowIndex: number }) {
  const { global_host } = e.row;
  if (global_host === 1) {
    MessagePlugin.warning(t('page.host.forbid_for_global_site_only_change_guard_status'));
  }
  deleteIdx.value = e.rowIndex;
  confirmVisible.value = true;
}

// SSL申请
function handleClickSSLApply(e: { row: Record<string, any> }) {
  const { code, global_host } = e.row;
  if (global_host === 1) {
    MessagePlugin.warning(t('page.host.forbid_for_global_site'));
  }
  loadHostList().then(() => {
    sslAutoApplyVisible.value = true;
    currentHostCode.value = code;
  });
}

function onConfirmDelete() {
  confirmVisible.value = false;
  const { code } = data.value[deleteIdx.value];
  delHost({ code: code })
    .then((res) => {
      if (res.code === 0) {
        loadHostGroups();
        getList();
        loadStats();
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

function getDetail(id: string) {
  getHostDetail({ code: id })
    .then((res) => {
      if (res.code === 0) {
        formEditData.value = { ...res.data };
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

/** 导出Excel数据 */
function HandleExportExcel() {
  export_api({ table_name: 'hosts' })
    .then((res) => {
      const blob = new Blob([res as any], { type: 'application/force-download' });
      const fileReader = new FileReader();
      fileReader.readAsDataURL(blob);
      fileReader.onload = (e) => {
        const a = document.createElement('a');
        a.download = 'hosts.xlsx';
        a.href = (e.target as FileReader).result as string;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

/** 导入Excel数据 */
function HandleImportExcel() {
  ImportXlsxVisible.value = true;
  tips.value = '';
  files.value = [];
}

function changeGuardStatusHandle(row: Record<string, any>) {
  const { code } = row;
  guardStatusIdx.value = data.value.findIndex((value) => value.code === code);
  guardConfirmVisible.value = true;
}

function changeStartStatusHandle(row: Record<string, any>) {
  const { code } = row;
  startStatusIdx.value = data.value.findIndex((value) => value.code === code);
  startConfirmVisible.value = true;
}

function isStaticSiteEnabled(row: Record<string, any>) {
  if (!row || !row.static_site_json) return false;
  try {
    const cfg = typeof row.static_site_json === 'string' ? JSON.parse(row.static_site_json) : row.static_site_json;
    return cfg.is_enable_static_site === 1 || cfg.is_enable_static_site === '1';
  } catch {
    return false;
  }
}

function handleFail({ file }: { file: any }) {
  MessagePlugin.error(`文件 ${file.name} 上传失败`);
}

function beforeUpload() {
  // 防重放校验所需头信息
  fileHeader['X-Request-Time'] = Math.floor(Date.now() / 1000).toString();
  fileHeader['X-Request-Id'] = uuidv4();
  return true;
}

function onUploadSuccess(context: any) {
  const respData = JSON.parse(decryptIncoming(context.response.data));
  let lastMsg = `成功数量 :${respData.SuccessInt}`;
  if (respData.FailInt > 0) {
    lastMsg += `失败数量 :${respData.FailInt} 错误原因:${respData.Msg}`;
  }
  tips.value = lastMsg;
  getList();
  loadStats(); // 批量导入会增删站点，汇总口径要跟着变
}

// 防护状态弹窗确认
function onGuardStatusConfirm() {
  if (guardStatusIdx.value === -1) {
    return;
  }
  const { code, guard_status } = data.value[guardStatusIdx.value];
  changeGuardStatus({
    code: code,
    guard_status: guard_status === 1 ? 0 : 1,
  })
    .then((res) => {
      if (res.code === 0) {
        getList();
        loadStats(); // 防护开关影响「防护开启」等汇总
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
      guardStatusIdx.value = -1;
      guardConfirmVisible.value = false;
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onGuardStatusCancel() {
  guardConfirmVisible.value = false;
  guardStatusIdx.value = -1;
}

function onStartStatusConfirm() {
  startConfirmVisible.value = false;
  const { code, start_status } = data.value[startStatusIdx.value];
  changeStartStatus({
    code: code,
    start_status: start_status === 1 ? 0 : 1,
  })
    .then((res) => {
      if (res.code === 0) {
        getList();
        loadStats(); // 启停变更后同步刷新汇总
        MessagePlugin.success(res.msg);
      } else {
        MessagePlugin.warning(res.msg);
      }
      startStatusIdx.value = -1;
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

function onStartStatusCancel() {
  startConfirmVisible.value = false;
  startStatusIdx.value = -1;
}

/** 表头筛选 */
const onFilterChange: TableProps['onFilterChange'] = (e: Record<string, any>) => {
  const filterList: { by: string; value: string }[] = [];

  if (e.host) {
    // 站点列现在同时展示域名和监听端口：纯数字按端口查，其余按域名/昵称查
    const v = String(e.host).trim();
    filterList.push({ by: /^\d+$/.test(v) ? 'port' : 'host', value: v });
  }

  if (e.backend) {
    // 「后端」列显示的是 formatBackendAddr 拼出的完整地址，而库里 remote_ip 只存 IP：
    // 整串（如 192.168.100.14:80）直接 like remote_ip 永远查不到，剥掉端口只按 IP 查；
    // IPv6 一并去掉展示用的方括号。纯数字视为端口，走 remote_port 等值查。
    // 注：这里刻意不追加 remote_port 条件——存量后端对整型列 like 过滤匹配不到任何行，
    // 「只按 IP 查」在新旧后端都能查到人，宁可多带出同 IP 的站点也不要查空。
    const raw = String(e.backend).trim();
    if (/^\d+$/.test(raw)) {
      filterList.push({ by: 'remote_port', value: raw });
    } else {
      let ip = raw;
      if (ip.startsWith('[')) {
        const close = ip.indexOf(']');
        if (close > -1) {
          ip = ip.slice(1, close);
        }
      } else {
        const colon = ip.lastIndexOf(':');
        if (colon > -1 && ip.indexOf(':') === colon) {
          ip = ip.slice(0, colon);
        }
      }
      filterList.push({ by: 'remote_ip', value: ip });
    }
  }

  filters.filter_by = filterList.map((f) => f.by).join('|');
  filters.filter_value = filterList.map((f) => f.value).join('|');
  getList();
};

const onSortChange: TableProps['onSortChange'] = (sorter: any) => {
  if (sorter != undefined) {
    sorts.sortBy = sorter.sortBy;
    sorts.descending = sorter.descending;
  } else {
    sorts.sortBy = 'create_time';
    sorts.descending = true;
  }
  getList();
};

/** 处理目标站点选择变化 */
function handleTargetHostChange(hostCode: string, checked: boolean) {
  if (checked) {
    if (!batchCopyForm.targetHosts.includes(hostCode)) {
      batchCopyForm.targetHosts.push(hostCode);
    }
  } else {
    const index = batchCopyForm.targetHosts.indexOf(hostCode);
    if (index > -1) {
      batchCopyForm.targetHosts.splice(index, 1);
    }
  }
}

/** 处理模块选择变化 */
function handleModuleChange(moduleValue: string, checked: boolean) {
  if (checked) {
    if (!batchCopyForm.modules.includes(moduleValue)) {
      batchCopyForm.modules.push(moduleValue);
    }
  } else {
    const index = batchCopyForm.modules.indexOf(moduleValue);
    if (index > -1) {
      batchCopyForm.modules.splice(index, 1);
    }
  }
}

/** 批量复制配置 */
function handleBatchCopyConfig() {
  batchCopyVisible.value = true;
}

/** 执行批量复制配置 */
function executeBatchCopy() {
  if (!batchCopyForm.sourceHost) {
    MessagePlugin.warning(t('page.host.batch_copy.select_source_host'));
    return;
  }
  if (batchCopyForm.modules.length === 0) {
    MessagePlugin.warning(t('page.host.batch_copy.select_modules'));
    return;
  }
  if (batchCopyForm.targetHosts.length === 0) {
    MessagePlugin.warning(t('page.host.batch_copy.select_target_hosts'));
    return;
  }

  batchCopyLoading.value = true;
  batchCopyProgress.visible = true;
  batchCopyProgress.current = 0;
  batchCopyProgress.total = batchCopyForm.targetHosts.length;
  batchCopyProgress.status = 'processing';

  performBatchCopy();
}

async function performBatchCopy() {
  const copyData = {
    sourceHost: batchCopyForm.sourceHost,
    modules: batchCopyForm.modules,
    targetHosts: batchCopyForm.targetHosts,
  };

  try {
    for (let i = 0; i < copyData.targetHosts.length; i++) {
      const targetHost = copyData.targetHosts[i];
      batchCopyProgress.currentHost = getHostDisplayName(targetHost);
      await copyConfigToHost(copyData.sourceHost, targetHost, copyData.modules);
      batchCopyProgress.current = i + 1;
      // 添加短暂延迟以显示进度效果
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    batchCopyProgress.status = 'success';
    MessagePlugin.success(t('page.host.batch_copy.copy_success'));
    setTimeout(() => {
      closeBatchCopyProgress();
    }, 2000);
  } catch (error) {
    batchCopyProgress.status = 'error';
    MessagePlugin.error(t('page.host.batch_copy.copy_failed'));
    console.error('批量复制失败:', error);
  } finally {
    batchCopyLoading.value = false;
  }
}

/** 复制配置到指定主机 */
async function copyConfigToHost(sourceHost: string, targetHost: string, modules: string[]) {
  const response = await batchCopyConfig({
    source_host_code: sourceHost,
    target_host_code: targetHost,
    modules,
  });
  if (response.code !== 0) {
    throw new Error(response.msg || '复制失败');
  }
}

function getHostDisplayName(hostCode: string) {
  return host_dic.value[hostCode] || '无';
}

function closeBatchCopyProgress() {
  batchCopyProgress.visible = false;
  batchCopyVisible.value = false;
  resetBatchCopyForm();
}

function resetBatchCopyForm() {
  batchCopyForm.sourceHost = '';
  batchCopyForm.modules = ['cache'];
  batchCopyForm.targetHosts = [];
}

function cancelBatchCopy() {
  batchCopyVisible.value = false;
  resetBatchCopyForm();
}

/** 全选/取消全选目标站点 */
function toggleSelectAllTargets() {
  if (batchCopyForm.targetHosts.length === availableTargetHosts.value.length) {
    batchCopyForm.targetHosts = [];
  } else {
    batchCopyForm.targetHosts = availableTargetHosts.value.map((host) => host.code);
  }
}

onMounted(() => {
  loadHostGroups();
  loadHostList().then(() => {
    getList();
    loadStats(); // 首次进入拉一次全站汇总（之后只在增删改 / 开关变更后刷新）
  });
  // 从首页引导跳入时直接打开新增弹窗
  if (route.query && route.query.sourcePage === 'HomeFrist') {
    addFormVisible.value = true;
  }
  // 别处（访问日志「IP提取有问题?」、CC 规则「去设置」）跳过来：直接打开该站点编辑弹窗并定位到对应页签
  if (route.query && route.query.editcode) {
    // tab 用名字传，避免调用方去记面板编号
    const tabMap: Record<string, number> = { ipsource: 4, captcha: 7 };
    editInitTab.value = tabMap[String(route.query.tab || '')] || 1;
    formEditData.value = { code: '' };
    editFormVisible.value = true;
    getDetail(String(route.query.editcode));
  }
});
</script>

<style scoped>
/* ==================== 站点态势总览（KPI） ==================== */
.host-overview {
  margin-bottom: 14px;
}

.ov-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 1200px) {
  .ov-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .ov-grid {
    grid-template-columns: 1fr;
  }
}

.ov-card {
  position: relative;
  padding: 12px 14px 13px;
  overflow: hidden;
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-medium, 6px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.ov-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--td-brand-color);
  opacity: 0.9;
}

.ov-card--success::before {
  background: var(--td-success-color);
}

.ov-card--error::before {
  background: var(--td-error-color);
}

.ov-card--warning::before {
  background: var(--td-warning-color);
}

.ov-card--cyan::before {
  background: #0594fa;
}

.ov-card--purple::before {
  background: #7a4bd4;
}

.ov-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ov-label {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.ov-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  font-size: 14px;
  color: var(--td-brand-color);
  background: var(--td-brand-color-light);
}

.ov-card--success .ov-icon {
  color: var(--td-success-color);
  background: rgba(43, 164, 113, 0.12);
}

.ov-card--error .ov-icon {
  color: var(--td-error-color);
  background: rgba(213, 73, 65, 0.12);
}

.ov-card--warning .ov-icon {
  color: var(--td-warning-color);
  background: rgba(227, 115, 24, 0.12);
}

.ov-card--cyan .ov-icon {
  color: #0594fa;
  background: rgba(5, 148, 250, 0.12);
}

.ov-card--purple .ov-icon {
  color: #7a4bd4;
  background: rgba(122, 75, 212, 0.12);
}

.ov-value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--td-text-color-primary);
  font-variant-numeric: tabular-nums;
}

.ov-sub {
  margin-top: 5px;
  font-size: 11px;
  color: var(--td-text-color-placeholder);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ==================== 工具栏 ==================== */
.host-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.ht-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ht-right {
  display: flex;
  align-items: center;
  margin-left: auto;
}

/* 内联表单每个 item 自带 margin-right(xxl) 和 min-width:200px：
   最后一个 item 会把「查询」按钮右边顶出一大块空白，这里两个都要清掉 */
.ht-right :deep(.t-form-inline .t-form__item:last-of-type) {
  margin-right: 0;
  min-width: 0;
}

/* ==================== 站点单元格 ==================== */
.host-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.hc-nick {
  font-size: 11px;
  color: var(--td-text-color-placeholder);
}

/* 站点列固定三行：域名 / 昵称+绑定域名 / badge */
.hc-r1,
.hc-r2,
.hc-r3 {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.hc-host {
  font-weight: 500;
}

/* 域名可点：默认不加下划线，hover 才提示可跳转 */
.hc-host--link {
  color: var(--td-brand-color);
  text-decoration: none;
}

.hc-host--link:hover {
  text-decoration: underline;
}

.hc-domain {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
  border-radius: 3px;
  font-size: 11px;
  color: var(--td-text-color-secondary);
  background: var(--td-bg-color-secondarycontainer, #f3f3f3);
  text-decoration: none;
}

.hc-domain:hover {
  color: var(--td-brand-color);
  text-decoration: underline;
}

/* ==================== 后端服务 ==================== */
.backend-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}

.be-line1 {
  display: flex;
  align-items: center;
  /* 地址（尤其 IPv6）过长时换行显示，而不是省略号截断 */
  flex-wrap: wrap;
  gap: 5px;
  word-break: break-all;
  white-space: normal;
}

.be-addr {
  min-width: 0;
}

/* 健康行（第二行）：图标 + 文案 + 最近检测时间 */
.be-health {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.be-health .bh-ico {
  flex: none;
  font-size: 14px;
}

.be-health.is-ok .bh-ico,
.be-health.is-ok .bh-text {
  color: var(--td-success-color);
}

.be-health.is-bad .bh-ico,
.be-health.is-bad .bh-text {
  color: var(--td-error-color);
}

.be-health.is-unknown .bh-ico,
.be-health.is-unknown .bh-text,
.be-health.is-off .bh-ico,
.be-health.is-off .bh-text {
  color: var(--td-text-color-placeholder);
}

.be-health .bh-time {
  font-size: 11px;
  color: var(--td-text-color-placeholder);
  font-variant-numeric: tabular-nums;
}

.mono {
  font-family: 'SFMono-Regular', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
}

/* ==================== 今日态势：迷你指标 ==================== */
.stat-cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
  /* 关键：所有行都用整列宽度，指标列才会「跨行对齐」（像合并表头下的子列）。
     用 fit-content 会让每行按自身内容算宽，行与行之间列位置就会错开。 */
  width: 100%;
}

.stat-metrics {
  display: grid;
  /* 五列等宽：PV / UV / 拦截 / QPS / 流量 表头与数值上下对齐，且跨行严格对齐 */
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px 12px;
}

.sm {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.sm-l {
  font-size: 11px;
  color: var(--td-text-color-placeholder);
  white-space: nowrap;
}

.sm-v {
  font-size: 13px;
  font-weight: 600;
  color: var(--td-text-color-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sm-v.danger {
  color: var(--td-error-color);
}

/* ==================== 运行状态 ==================== */
.run-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 防护主开关：盾牌 + 状态文字 + 轨道合成一块可视化控件（点一下即切换）。
   这列行高已经不矮，把主开关做大反而成了视觉重心。 */
.guard-ctl {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid var(--td-component-stroke);
  border-radius: 6px;
  background: var(--td-bg-color-container);
  cursor: pointer;
  user-select: none;
  transition:
    border-color 0.2s,
    background 0.2s,
    box-shadow 0.2s;
}

.guard-ctl:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.guard-ctl .gc-shield {
  flex: none;
  font-size: 18px;
  color: var(--td-text-color-placeholder);
}

.guard-ctl .gc-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--td-text-color-placeholder);
}

.guard-ctl .gc-track {
  position: relative;
  flex: none;
  width: 34px;
  height: 18px;
  border-radius: 9px;
  background: var(--td-bg-color-component, #d9d9d9);
  transition: background 0.2s;
}

.guard-ctl .gc-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.2s;
}

.guard-ctl.is-on {
  border-color: var(--td-success-color);
  background: rgba(43, 164, 113, 0.08);
}

.guard-ctl.is-on .gc-shield,
.guard-ctl.is-on .gc-text {
  color: var(--td-success-color);
}

.guard-ctl.is-on .gc-track {
  background: var(--td-success-color);
}

.guard-ctl.is-on .gc-knob {
  left: 18px;
}

.rs-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rs-k {
  min-width: 26px;
  flex: none;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

/* ==================== 表格行首：收紧「展开 / 勾选」单元格 ====================
   t-table 的展开图标列默认 64px，且表格拉伸后会按比例放大到 90px+，
   和勾选框之间空出一大块，显得很散。这里把两列的基础宽度压小并让图标居中。
   选择器限定到列表表格（.host-list-table）上，避免误伤本组件里其它表格。 */
:deep(.host-list-table colgroup col:nth-child(1)) {
  width: 30px !important;
}

:deep(.host-list-table colgroup col:nth-child(2)) {
  width: 36px !important;
}

:deep(.host-list-table .t-table__expandable-icon-cell) {
  padding: 0 !important;
}

:deep(.host-list-table .t-table__expand-box) {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ==================== 网站分组：顶部轻量文本条 ==================== */
/* 刻意不给边框和底色：上面那排动作按钮才是主，分组只是筛选维度。
   选中态用「主色文字 + 2px 下划线」而不是实心块，避免比主按钮还抢眼。 */
.host-group-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  margin: 2px 0 6px;
}

.hg-bar-label {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  margin-right: 8px;
}

/* 组名最长 50 字，不限宽会把「＋新建分组」「移动到分组」整个顶出可视区。
   flex: none 保证它只换行不被压缩，超出部分交给 .hg-nm 省略号，全称走 title */
.hg-gl {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  max-width: 220px;
  min-width: 0;
  padding: 5px 10px 6px;
  font-size: 13px;
  color: var(--td-text-color-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
}

.hg-gl:hover {
  color: var(--td-brand-color);
}

.hg-gl.on {
  color: var(--td-brand-color);
  font-weight: 600;
  border-bottom-color: var(--td-brand-color);
}

.hg-gl .hg-nm {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.hg-gl em {
  font-style: normal;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  flex: none;
}

.hg-gl.on em {
  color: var(--td-brand-color);
}

.hg-gl.add {
  color: var(--td-brand-color);
}

.hg-gl.disabled {
  color: var(--td-text-color-disabled);
  cursor: not-allowed;
}

.hg-gl:hover .hg-more {
  opacity: 0.5;
}

.hg-gsep {
  width: 1px;
  height: 12px;
  background: var(--td-component-stroke);
  margin: 0 6px;
}

.hg-more {
  font-weight: 700;
  opacity: 0;
  padding: 0 2px;
  flex: none;
}

.hg-more:hover {
  opacity: 1 !important;
}

.hg-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
  display: inline-block;
}

.hg-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hg-tag:hover {
  border-color: currentColor;
}

.hg-tag.none {
  background: var(--td-bg-color-component);
  color: var(--td-text-color-placeholder);
  cursor: default;
}

.hg-tag.none:hover {
  border-color: transparent;
}

.hg-tag.unknown {
  background: var(--td-bg-color-component);
  color: var(--td-text-color-placeholder);
  border: 1px dashed var(--td-component-stroke);
  cursor: default;
}

.hg-color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  height: 32px;
}

.hg-color-picker i {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  display: inline-block;
}

.hg-color-picker i.on {
  border-color: var(--td-text-color-primary);
}

/* 「移动到分组」列表：分组之间是并列关系，逐条左对齐；
   TDesign 的 radio 自带横向间距，竖排时会表现成逐条往右递进的缩进，这里清零拉平 */
.assign-group-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  margin-top: 8px;
}

.assign-group-list :deep(.t-radio) {
  margin: 0 !important;
}

/* ==================== 操作列：编辑 / 证书申请 + 更多 ==================== */
.op-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

/* 全局样式给 a / .t-button-link 加了 margin-right，叠在 flex gap 上会把「更多」挤出列宽 */
.op-cell :deep(.t-button-link) {
  margin-right: 0;
}

.op-vline {
  width: 1px;
  height: 11px;
  background: var(--td-component-stroke);
  flex: none;
}

.op-more {
  color: var(--td-brand-color);
  cursor: pointer;
  white-space: nowrap;
}

.table-container {
  margin-top: 8px;
}

/* 统一所有小标签圆角：分组标签是 pill、SSL/端口/健康用的是 t-tag 默认直角，混在一起不齐 */
:deep(.t-tag) {
  border-radius: 4px;
}

/* 批量复制配置弹窗样式 */
.batch-copy-section {
  margin-bottom: 20px;
}

.batch-copy-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.module-checkboxes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.module-checkbox {
  margin: 0;
}

.dialog-header-host {
  margin-left: 8px;
  font-size: 14px;
  font-weight: normal;
  color: var(--td-text-color-secondary);
  word-break: break-all;
}

.dialog-header-code {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  font-weight: normal;
  color: var(--td-text-color-secondary);
}

.dialog-header-code span {
  user-select: text;
  overflow-wrap: anywhere;
  min-width: 0;
}

.dialog-header-code .t-button {
  color: inherit;
  flex-shrink: 0;
}

.target-hosts-container {
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 6px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.select-all-container {
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--td-border-level-1-color);
}

.target-hosts-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.target-host-checkbox {
  margin: 0;
}

.batch-copy-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--td-border-level-1-color);
}

/* 批量复制进度弹窗样式 */
.progress-container {
  text-align: center;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-text {
  font-size: 14px;
  color: var(--td-text-color-primary);
}

.success-text {
  color: var(--td-success-color);
}

.error-text {
  color: var(--td-error-color);
}

.progress-count {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.progress-actions {
  margin-top: 16px;
}
</style>

<style>
/* 网站表单全屏 + 端口占用总览行标红：t-dialog/表格挂到 body 上，
   scoped 选择器够不着，必须写在非 scoped 块里。选择器都由专属类名限定，不影响其它弹窗。 */
.host-form-dialog-fullscreen .t-dialog {
  top: 2vh !important;
  margin-bottom: 2vh;
}
.host-form-dialog-fullscreen .t-dialog__body {
  max-height: calc(96vh - 92px) !important;
}
.port-overview-conflict-row td {
  background: var(--td-error-color-1) !important;
}
</style>
