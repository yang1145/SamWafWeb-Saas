<template>
  <div>
    <div class="host-form">
      <t-form :data="formData" :rules="rules" :label-width="230" @submit="onSubmit">
        <div
          class="host-tabs-wrapper"
          :class="{ 'host-tabs-wrapper--left': tabPlacement === 'left', 'host-tabs-wrapper--fullscreen': isFullscreen }"
        >
          <div class="tab-placement-bar">
            <t-tooltip :content="isFullscreen ? t('page.host.exit_fullscreen') : t('page.host.enter_fullscreen')" placement="top" show-arrow>
              <t-button variant="text" shape="square" size="small" @click="toggleFullscreen">
                <fullscreen-exit-icon v-if="isFullscreen" />
                <fullscreen-icon v-else />
              </t-button>
            </t-tooltip>
            <t-tooltip
              :content="tabPlacement === 'left' ? t('page.host.tab_layout_horizontal') : t('page.host.tab_layout_vertical')"
              placement="top"
              show-arrow
            >
              <t-button variant="text" shape="square" size="small" @click="toggleTabPlacement">
                <view-list-icon v-if="tabPlacement === 'left'" />
                <view-column-icon v-else />
              </t-button>
            </t-tooltip>
          </div>
          <t-tabs ref="tabsRef" v-model="activeTab" :placement="tabPlacement">
          <t-tab-panel :value="1">
            <template #label>
              <home-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_base') }}
            </template>
            <!-- 「基础内容」按主题分 6 个小节：站点 / 监听与协议 / HTTPS证书 / 回源 / 运行方式 / 备注信息。
                 分节前这些字段是按主题交叉排列的（证书被启动状态劈成两半），端口区那句"下方的加密证书"因此对不上。 -->
            <div class="hf-sect">
              <h4 class="hf-sect-title">{{ t('page.host.sect.site') }}</h4>
              <t-form-item name="host" :label-width="baseLabelWidth">
                <template #label>
                  <span>{{ t('page.host.website') }}</span>
                  <t-tooltip :content="t('page.host.host_tips')" placement="top" :overlay-style="{ width: '240px' }" :delay="200" show-arrow>
                    <help-circle-icon class="host-form-ip-mode-help-icon" />
                  </t-tooltip>
                </template>
                <t-input v-model="formData.host" :style="{ width: '400px' }" :placeholder="t('common.placeholder')" :disabled="isEdit" />
              </t-form-item>
            </div>

            <div class="hf-sect">
              <h4 class="hf-sect-title">
                {{ t('page.host.sect.listen') }}
                <small>{{ t('page.host.sect.listen_desc') }}</small>
              </h4>
              <t-form-item :label="t('page.host.port')" name="port" :label-width="baseLabelWidth">
                <div class="port-listen-editor">
                  <div class="port-listen-head">
                    <span class="port-listen-mainflag"></span>
                    <span class="port-listen-num">{{ t('page.host.port_listen.col_port') }}</span>
                    <span class="port-listen-proto">{{ t('page.host.port_listen.col_proto') }}</span>
                    <span v-if="showPortIpv" class="port-listen-ipv">
                      {{ t('page.host.port_listen.col_ipv') }}
                      <t-tooltip :content="t('page.host.port_listen.ipv_tips')" placement="top" :overlay-style="{ width: '320px' }" :delay="200" show-arrow>
                        <help-circle-icon class="host-form-ip-mode-help-icon" />
                      </t-tooltip>
                    </span>
                  </div>
                  <div v-for="(row, idx) in portRows" :key="'plrow' + idx" class="port-listen-row">
                    <span class="port-listen-mainflag">
                      <t-tag v-if="idx === 0" theme="primary" variant="light" size="small">{{ t('page.host.port_listen.main') }}</t-tag>
                    </span>
                    <t-input-number
                      v-model="row.port"
                      class="port-listen-num"
                      theme="normal"
                      :min="1"
                      :max="65535"
                      :placeholder="t('page.host.port_listen.port_ph')"
                      @change="onPortRowsChanged"
                    />
                    <!-- 协议固定 outline 变体的分段按钮：default-filled 的高亮滑块靠 JS 量元素宽度，
                         弹窗首次渲染时元素还不可见，算出的滑块会盖住未选中项 -->
                    <t-radio-group class="port-listen-proto" variant="outline" :value="row.proto" @change="(v: any) => onProtoChange(row, v)">
                      <t-radio-button value="http">HTTP</t-radio-button>
                      <t-radio-button value="https">HTTPS</t-radio-button>
                    </t-radio-group>
                    <t-select v-if="showPortIpv" v-model="row.ipv" class="port-listen-ipv" @change="onPortRowsChanged">
                      <t-option value="both" :label="t('page.host.port_listen.ipv_both')" />
                      <t-option value="ipv4" :label="t('page.host.port_listen.ipv_v4')" />
                      <t-option value="ipv6" :label="t('page.host.port_listen.ipv_v6')" />
                    </t-select>
                    <t-button
                      v-if="idx > 0"
                      shape="square"
                      variant="outline"
                      theme="danger"
                      size="small"
                      :title="t('page.host.port_listen.remove')"
                      @click="removePortRow(idx)"
                    >
                      <delete-icon />
                    </t-button>
                  </div>
                  <div class="port-listen-actions">
                    <t-button variant="dashed" size="small" @click="addPortRow"> + {{ t('page.host.port_listen.add') }} </t-button>
                    <!-- 原先开 SSL 会静默塞一行 80:HTTP，用户不知道为什么多出来。
                         改成显式勾选项（默认勾上，行为不变），并说明它只为证书的文件验证服务 -->
                    <span v-if="showAcmePort80" class="port-listen-acme80">
                      <t-checkbox :checked="acmePort80Checked" @change="onAcmePort80Change">
                        {{ t('page.host.port_listen.acme80') }}
                      </t-checkbox>
                      <t-tooltip :content="t('page.host.port_listen.acme80_tips')" placement="top" :overlay-style="{ width: '340px' }" :delay="200" show-arrow>
                        <help-circle-icon class="host-form-ip-mode-help-icon" />
                      </t-tooltip>
                    </span>
                    <!-- IP版本绝大多数站点用默认(IPv4+IPv6)，默认收起这一列；
                         取消勾选时会把所有行重置回 both，避免留下"看不见却生效"的隐藏设置 -->
                    <t-checkbox :checked="showPortIpv" @change="onShowPortIpvChange">
                      {{ t('page.host.port_listen.show_ipv') }}
                    </t-checkbox>
                  </div>
                  <div v-if="portHttpsNeedSsl" class="port-listen-hint port-listen-hint-err">
                    {{ t('page.host.port_listen.https_need_ssl') }}
                  </div>
                  <div v-if="port80HttpsWarn" class="port-listen-hint port-listen-hint-warn">
                    {{ t('page.host.port_listen.port80_https_acme') }}
                  </div>
                  <div v-if="portCheckMsg" class="port-listen-hint port-listen-hint-err">{{ portCheckMsg }}</div>
                  <!-- 「强制80跳转HTTPS」会让引擎隐式占用 80，这一条在端口表里看不到 -->
                  <div v-if="autoJump80Note" class="port-listen-hint port-listen-hint-warn">
                    {{ t('page.host.port_listen.autojump80_note') }}
                  </div>
                  <div class="port-listen-hint">
                    {{ t('page.host.port_listen.tips_short') }}
                    <t-tooltip :content="t('page.host.port_listen.tips')" placement="top" :overlay-style="{ width: '360px' }" :delay="200" show-arrow>
                      <help-circle-icon class="host-form-ip-mode-help-icon" />
                    </t-tooltip>
                  </div>
                </div>
              </t-form-item>
              <t-form-item name="unrestricted_port" :label-width="baseLabelWidth">
                <template #label>
                  <span>{{ t('page.host.unrestricted_port.label_unrestricted_port_is_enable') }}</span>
                  <t-tooltip
                    :content="t('page.host.unrestricted_port.unrestricted_port_tip')"
                    placement="top"
                    :overlay-style="{ width: '240px' }"
                    :delay="200"
                    show-arrow
                  >
                    <help-circle-icon class="host-form-ip-mode-help-icon" />
                  </t-tooltip>
                </template>
                <t-radio-group v-model="formData.unrestricted_port">
                  <t-radio value="0">{{ t('page.host.unrestricted_port.label_unrestricted_port_is_enable_on') }}</t-radio>
                  <t-radio value="1">{{ t('page.host.unrestricted_port.label_unrestricted_port_is_enable_off') }}</t-radio>
                </t-radio-group>
              </t-form-item>
            </div>

            <div class="hf-sect">
              <h4 class="hf-sect-title">
                {{ t('page.host.sect.cert') }}
                <span class="hf-sect-extra">
                  <t-tag v-if="formData.ssl == '1'" :theme="certSummaryTheme" variant="light" size="small">{{ certSummary }}</t-tag>
                  <t-tag v-else theme="default" variant="light" size="small">{{ t('page.host.sect.cert_off') }}</t-tag>
                </span>
              </h4>
              <t-form-item name="ssl" :label-width="baseLabelWidth">
                <template #label>
                  <span>{{ t('page.host.ssl') }}</span>
                  <t-tooltip :content="t('page.host.ssl_tips')" placement="top" :overlay-style="{ width: '240px' }" :delay="200" show-arrow>
                    <help-circle-icon class="host-form-ip-mode-help-icon" />
                  </t-tooltip>
                </template>
                <t-radio-group v-model="formData.ssl">
                  <t-radio value="0">{{ t('page.host.ssl_option_no') }}</t-radio>
                  <t-radio value="1">{{ t('page.host.ssl_option_yes') }}</t-radio>
                </t-radio-group>
              </t-form-item>
              <!-- SSL配置模式选择 (仅在新增模式且选择SSL时显示) -->
              <t-form-item v-if="formData.ssl == '1' && !isEdit" :label="t('page.host.ssl_config_mode')" name="ssl_config_mode" :label-width="baseLabelWidth">
                <t-radio-group v-model="formData.ssl_config_mode">
                  <t-radio value="existing">{{ t('page.host.ssl_config_existing') }}</t-radio>
                  <t-radio value="auto_apply">{{ t('page.host.ssl_config_auto_apply') }}</t-radio>
                </t-radio-group>
              </t-form-item>

              <!-- 已有证书选择 -->
              <t-form-item
                v-if="formData.ssl == '1' && (isEdit || formData.ssl_config_mode === 'existing')"
                :label="t('page.host.ssl_folder')"
                name="bind_ssl_id"
                :label-width="baseLabelWidth"
              >
                <div style="display: flex; align-items: center; width: 100%">
                  <t-select
                    v-model="formData.bind_ssl_id"
                    :filterable="selectCanFilter"
                    :placeholder="t('common.select_placeholder') + t('page.host.ssl_folder')"
                    style="flex-grow: 1"
                    @change="handleSslChange"
                  >
                    <t-option key="" value="" :label="t('common.select_placeholder') + t('page.host.ssl_folder')" />
                    <t-option v-for="item in sslOptions" :key="item.value" :value="item.value" :label="item.label" />
                  </t-select>

                  <t-button style="margin-left: 10px" @click="handleAddNewSsl">{{ t('page.host.add_new_ssl') }}</t-button>
                  <t-button style="margin-left: 10px" @click="handleEditSsl">{{ t('page.host.edit_ssl') }}</t-button>
                </div>
              </t-form-item>

            <t-form-item v-if="formData.ssl == '1'" :label="t('page.host.auto_jump_https.label_autu_jump_https')" name="auto_jump_https" :label-width="baseLabelWidth">
              <div style="width: 100%">
                <t-radio-group v-model="formData.auto_jump_https">
                  <t-radio value="0">{{ t('page.host.auto_jump_https.label_autu_jump_https_off') }}</t-radio>
                  <t-radio value="1">{{ t('page.host.auto_jump_https.label_autu_jump_https_on') }}</t-radio>
                </t-radio-group>

                <!-- 非标准443端口的HTTPS重定向服务器提示 -->
                <div v-if="shouldShowHttpsRedirectTip" style="margin-top: 10px">
                  <t-alert theme="warning" :close="false">
                    <div>
                      <div style="margin-bottom: 8px">
                        {{ t('page.host.auto_jump_https.non_standard_port_tip') }}
                      </div>
                      <div style="display: flex; align-items: center; gap: 10px">
                        <span style="color: #555">
                          {{ t('page.host.auto_jump_https.redirect_server_status') }}:
                          <strong>{{ httpsRedirectStatusText }}</strong>
                        </span>
                        <t-button
                          size="small"
                          theme="primary"
                          :loading="httpsRedirectConfig.loading"
                          :disabled="httpsRedirectConfig.enable_https_redirect === '1'"
                          @click="enableHttpsRedirect"
                        >
                          {{ t('page.host.auto_jump_https.enable_redirect_server') }}
                        </t-button>
                      </div>
                    </div>
                  </t-alert>
                </div>
              </div>
            </t-form-item>

              <t-form-item v-if="formData.ssl == '1'" name="disable_http2" :label-width="baseLabelWidth">
                <template #label>
                  <span>{{ t('page.host.disable_http2.label') }}</span>
                  <t-tooltip :content="t('page.host.disable_http2.tips')" placement="top" :overlay-style="{ width: '300px' }" :delay="200" show-arrow>
                    <help-circle-icon class="host-form-ip-mode-help-icon" />
                  </t-tooltip>
                </template>
                <t-radio-group v-model="formData.disable_http2">
                  <t-radio value="0">{{ t('page.host.disable_http2.enable') }}</t-radio>
                  <t-radio value="1">{{ t('page.host.disable_http2.disable') }}</t-radio>
                </t-radio-group>
              </t-form-item>
              <t-form-item
                v-if="formData.ssl == '1' && (isEdit || formData.ssl_config_mode === 'existing')"
                name="certfile"
                :label-width="baseLabelWidth"
              >
                <template #label>
                  <span>{{ t('page.host.certfile') }}</span>
                  <t-tooltip :content="t('page.host.certfile_content')" placement="top" :overlay-style="{ width: '260px' }" :delay="200" show-arrow>
                    <help-circle-icon class="host-form-ip-mode-help-icon" />
                  </t-tooltip>
                </template>
                <t-textarea v-model="formData.certfile" :style="{ width: '400px' }" :placeholder="t('common.placeholder')" name="certfile" />
              </t-form-item>
              <t-form-item
                v-if="formData.ssl == '1' && (isEdit || formData.ssl_config_mode === 'existing')"
                name="keyfile"
                :label-width="baseLabelWidth"
              >
                <template #label>
                  <span>{{ t('page.host.keyfile') }}</span>
                  <t-tooltip :content="t('page.host.keyfile_content')" placement="top" :overlay-style="{ width: '260px' }" :delay="200" show-arrow>
                    <help-circle-icon class="host-form-ip-mode-help-icon" />
                  </t-tooltip>
                </template>
                <t-textarea v-model="formData.keyfile" :style="{ width: '400px' }" :placeholder="t('common.placeholder')" name="keyfile" />
              </t-form-item>
            </div>

            <div class="hf-sect">
              <h4 class="hf-sect-title">
                {{ t('page.host.sect.backend') }}
                <small>{{ t('page.host.sect.backend_desc') }}</small>
              </h4>
              <t-form-item :label="t('page.host.loadbalance.label_loadbalance_is_enable')" name="is_enable_load_balance" :label-width="baseLabelWidth">
                <t-radio-group v-model="formData.is_enable_load_balance">
                  <t-radio value="0">{{ t('page.host.loadbalance.label_is_enable_load_balance_off') }}</t-radio>
                  <t-radio value="1">{{ t('page.host.loadbalance.label_is_enable_load_balance_on') }}</t-radio>
                </t-radio-group>
              </t-form-item>

              <t-form-item
                v-if="formData.is_enable_load_balance == '1'"
                :label="t('page.host.loadbalance.label_loadbalance_type')"
                name="load_balance_stage"
                :label-width="baseLabelWidth"
              >
                <t-radio-group v-model="formData.load_balance_stage">
                  <t-radio value="1">{{ t('page.host.loadbalance.label_loadbalance_type_weight_round_robin') }}</t-radio>
                  <t-radio value="2">{{ t('page.host.loadbalance.label_loadbalance_type_ip_hash') }}</t-radio>
                </t-radio-group>
              </t-form-item>

              <t-form-item
                v-if="formData.is_enable_load_balance == '1'"
                :label="t('page.host.loadbalance.label_backend_list')"
                name="loadbalance"
                :label-width="baseLabelWidth"
              >
                <load-balance :prop-host-code="formData.code" />
              </t-form-item>

              <t-form-item name="remote_host" :label-width="baseLabelWidth">
                <template #label>
                  <span>{{ t('page.host.remote_host') }}</span>
                  <t-tooltip :content="t('page.host.remote_host_content')" placement="top" :overlay-style="{ width: '260px' }" :delay="200" show-arrow>
                    <help-circle-icon class="host-form-ip-mode-help-icon" />
                  </t-tooltip>
                </template>
                <t-input v-model="formData.remote_host" :style="{ width: '400px' }" :placeholder="t('common.placeholder') + t('page.host.remote_host')" />
              </t-form-item>

              <!-- 后端IP 与 后端端口 并成一行显示；两者各自保留 form-item 与 name，校验提示才能分别落到对应输入框 -->
              <div v-if="formData.is_enable_load_balance != '1'" class="hf-inline-pair">
                <t-form-item name="remote_ip" :label-width="baseLabelWidth">
                  <template #label>
                    <span>{{ t('page.host.remote_ip') }}</span>
                    <t-tooltip :content="t('page.host.remote_ip_content')" placement="top" :overlay-style="{ width: '260px' }" :delay="200" show-arrow>
                      <help-circle-icon class="host-form-ip-mode-help-icon" />
                    </t-tooltip>
                  </template>
                  <t-input v-model="formData.remote_ip" :style="{ width: '250px' }" :placeholder="t('common.placeholder') + t('page.host.remote_ip')" />
                </t-form-item>
                <t-form-item name="remote_port" :label-width="64">
                  <template #label>
                    <span>{{ t('page.host.port_listen.port_ph') }}</span>
                    <t-tooltip :content="t('page.host.remote_port_content')" placement="top" :overlay-style="{ width: '260px' }" :delay="200" show-arrow>
                      <help-circle-icon class="host-form-ip-mode-help-icon" />
                    </t-tooltip>
                  </template>
                  <t-input-number
                    v-model="formData.remote_port"
                    theme="normal"
                    :style="{ width: '130px' }"
                    :placeholder="t('page.host.port_listen.port_ph')"
                  />
                </t-form-item>
              </div>

              <t-form-item name="is_trans_back_domain" :label-width="baseLabelWidth">
                <template #label>
                  <span>{{ t('page.host.is_trans_back_domain') }}</span>
                  <t-tooltip trigger="click" placement="top" :overlay-style="{ maxWidth: 'min(460px, calc(100vw - 32px))' }" show-arrow>
                    <template #content>
                      <div class="backend-host-help-text">
                        <p>{{ t('page.host.is_trans_back_domain_content') }}</p>
                        <p>{{ t('page.host.is_trans_back_domain_example') }}</p>
                        <p>{{ t('page.host.is_trans_back_domain_example_off') }}</p>
                        <p>{{ t('page.host.is_trans_back_domain_example_on') }}</p>
                        <p>{{ t('page.host.is_trans_back_domain_forwarded_hint', { host: '{host}' }) }}</p>
                      </div>
                    </template>
                    <t-button variant="text" size="small" shape="square" :aria-label="t('page.host.is_trans_back_domain')">
                      <help-circle-icon />
                    </t-button>
                  </t-tooltip>
                </template>
                <t-radio-group v-model="formData.is_trans_back_domain">
                  <t-radio value="0">{{ t('common.off') }}</t-radio>
                  <t-radio value="1">{{ t('common.on') }}</t-radio>
                </t-radio-group>
              </t-form-item>
            </div>

            <div class="hf-sect">
              <h4 class="hf-sect-title">{{ t('page.host.sect.runtime') }}</h4>
              <t-form-item name="start_status" :label-width="baseLabelWidth">
                <template #label>
                  <span>{{ t('page.host.start_status') }}</span>
                  <t-tooltip :content="t('page.host.start_status_content')" placement="top" :overlay-style="{ width: '240px' }" :delay="200" show-arrow>
                    <help-circle-icon class="host-form-ip-mode-help-icon" />
                  </t-tooltip>
                </template>
                <t-radio-group v-model="formData.start_status">
                  <t-radio value="0">{{ t('page.host.auto_start_on') }}</t-radio>
                  <t-radio value="1">{{ t('page.host.auto_start_off') }}</t-radio>
                </t-radio-group>
              </t-form-item>
              <t-form-item name="log_only_mode" :label-width="baseLabelWidth">
                <template #label>
                  <span>{{ t('page.host.log_only_mode') }}</span>
                  <t-tooltip :content="t('page.host.log_only_mode_tips')" placement="top" :overlay-style="{ width: '240px' }" :delay="200" show-arrow>
                    <help-circle-icon class="host-form-ip-mode-help-icon" />
                  </t-tooltip>
                </template>
                <t-radio-group v-model="formData.log_only_mode">
                  <t-radio value="0">{{ t('page.host.log_only_mode_off') }}</t-radio>
                  <t-radio value="1">{{ t('page.host.log_only_mode_on') }}</t-radio>
                </t-radio-group>
              </t-form-item>
            </div>

            <div class="hf-sect hf-sect-last">
              <h4 class="hf-sect-title">
                {{ t('page.host.sect.meta') }}
                <small>{{ t('page.host.sect.meta_desc') }}</small>
              </h4>
              <t-form-item :label="t('page.host.nickname')" name="nickname" :label-width="baseLabelWidth">
                <t-input v-model="formData.nickname" :style="{ width: '400px' }" :placeholder="t('page.host.nickname_placeholder')" />
              </t-form-item>

              <t-form-item :label="t('page.host.group.belong_group')" name="group_code" :label-width="baseLabelWidth">
                <t-select v-model="formData.group_code" :style="{ width: '400px' }" clearable :placeholder="t('page.host.group.belong_group_placeholder')">
                  <t-option v-for="g in props.hostGroups" :key="g.group_code" :value="g.group_code" :label="g.group_name">
                    <i class="hg-form-dot" :style="{ background: g.color }"></i>{{ g.group_name }}
                  </t-option>
                </t-select>
                <a class="hg-form-new" @click="openGroupQuickAdd()">＋ {{ t('page.host.group.new_group') }}</a>
                <div class="hg-form-tip">{{ t('page.host.group.belong_group_tip') }}</div>
              </t-form-item>

              <t-form-item :label="t('common.remarks')" name="remarks" :label-width="baseLabelWidth">
                <t-textarea v-model="formData.remarks" :style="{ width: '400px' }" :placeholder="t('common.placeholder_content')" name="remarks" />
              </t-form-item>
            </div>
          </t-tab-panel>

          <t-tab-panel :value="2">
            <template #label>
              <layers-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_more_domain') }}
            </template>
            <t-form-item :label="t('page.host.more_domain')" name="bind_more_host">
              <t-tooltip :content="t('page.host.more_domain_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-textarea v-model="formData.bind_more_host" :style="{ width: '480px' }" :placeholder="t('common.placeholder')" name="bind_more_host" />
              </t-tooltip>
            </t-form-item>
          </t-tab-panel>

          <t-tab-panel :value="3">
            <template #label>
              <file-safety-icon style="margin-right: 4px; color: red" />
              {{ t('page.host.tab_engine') }}
            </template>

            <t-table :data="defenseRows" :columns="defenseColumns" row-key="key" size="small" :max-height="440" bordered hover>
              <template #detection="{ row }">
                <t-tooltip :content="row.tips" placement="top" :overlay-style="{ width: '300px' }" show-arrow>
                  <span>{{ row.label }}</span>
                </t-tooltip>
              </template>
              <template #status="{ row }">
                <t-radio-group :value="getDefenseValue(row)" style="white-space: nowrap; flex-wrap: nowrap" @change="(val: any) => setDefenseValue(row, val)">
                  <t-radio value="0">{{ t('common.off') }}</t-radio>
                  <t-radio value="1">{{ t('common.on') }}</t-radio>
                </t-radio-group>
              </template>
              <template #op="{ row }">
                <t-link v-if="row.action && row.action.type === 'route'" theme="primary" size="small" @click="router.push(row.action.path)">
                  {{ row.action.text }} <jump-icon />
                </t-link>
                <t-link v-else-if="row.action && row.action.type === 'tab'" theme="primary" size="small" @click="activeTab = row.action.tab">
                  {{ t('page.host.config_detail') }} <jump-icon />
                </t-link>
              </template>
            </t-table>
          </t-tab-panel>

          <t-tab-panel :value="4">
            <template #label>
              <setting-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_other') }}
            </template>
            <!-- IP提取模式：不要用 t-tooltip 包裹整组单选，否则会拦截点击导致无法切换 -->
            <t-form-item name="ip_mode">
              <template #label>
                <span>{{ t('page.host.ip_mode') }}</span>
                <t-tooltip :content="t('page.host.ip_mode_tips')" placement="top" :overlay-style="{ width: '300px' }" show-arrow>
                  <help-circle-icon class="host-form-ip-mode-help-icon" />
                </t-tooltip>
              </template>
              <t-radio-group v-model="formData.ip_mode">
                <t-radio value="nic">
                  <div>
                    <div>{{ t('page.host.ip_mode_nic') }}</div>
                    <div class="limit-mode-desc">{{ t('page.host.ip_mode_nic_desc') }}</div>
                  </div>
                </t-radio>
                <t-radio value="proxy">
                  <div>
                    <div>{{ t('page.host.ip_mode_proxy') }}</div>
                    <div class="limit-mode-desc">{{ t('page.host.ip_mode_proxy_desc') }}</div>
                  </div>
                </t-radio>
              </t-radio-group>
            </t-form-item>
            <!-- 真实IP来源加固：仅代理模式下有意义(网卡模式直接用网络层IP，此设置被忽略)。
                 默认(空)保持旧行为取 XFF 最左，向后兼容；选择加固模式后才改变取值。 -->
            <t-form-item v-if="formData.ip_mode === 'proxy'" name="ip_source_mode">
              <template #label>
                <span>{{ t('page.host.ip_source_mode') }}</span>
                <t-tooltip :content="t('page.host.ip_source_mode_tips')" placement="top" :overlay-style="{ width: '340px' }" show-arrow>
                  <help-circle-icon class="host-form-ip-mode-help-icon" />
                </t-tooltip>
              </template>
              <!-- t-form-item 内容区是 flex 行：多个同级子元素会被并排挤成窄列，统一包一层独占整行 -->
              <div class="ip-source-block">
                <t-select v-model="formData.ip_source_mode" :style="{ width: '320px' }" clearable>
                  <t-option value="" :label="t('page.host.ip_source_compat')" />
                  <t-option value="header" :label="t('page.host.ip_source_header')" />
                  <t-option value="xff_depth" :label="t('page.host.ip_source_xff')" />
                  <t-option value="cdn_preset" :label="t('page.host.ip_source_cdn')" />
                </t-select>
                <div class="limit-mode-desc">{{ ipSourceModeDesc }}</div>
                <!-- 全局(系统配置 gwaf_proxy_header) 与 站点设置 谁生效，必须写在用户眼前，否则改了全局发现某站点没变会懵 -->
                <div v-if="formData.ip_source_mode === ''" class="ip-source-scope">
                  <t-alert v-if="globalProxyHeader" theme="info">
                    <div>
                      {{ t('page.host.ip_scope_inherit', { header: globalProxyHeader }) }}
                      <a class="t-button-link" @click="goSystemConfig">{{ t('page.host.ip_scope_edit_global') }}</a>
                      <div class="limit-mode-desc">{{ t('page.host.ip_scope_inherit_desc') }}</div>
                    </div>
                  </t-alert>
                  <t-alert v-else theme="error">
                    <div>
                      {{ t('page.host.ip_scope_global_empty') }}
                      <a class="t-button-link" @click="goSystemConfig">{{ t('page.host.ip_scope_goto_global') }}</a>
                    </div>
                  </t-alert>
                </div>
                <div v-else-if="formData.ip_source_mode !== 'nic'" class="ip-source-scope">
                  <t-alert theme="success" :message="t('page.host.ip_scope_own')" />
                </div>
                <!-- 到底该配哪个头，只能看真实到达的请求头才知道；这里直接给个入口，免得跑去日志详情里翻(#956) -->
                <div v-if="isEdit && formData.code" class="ip-probe-entry">
                  <a class="t-button-link" @click="openIpProbe">{{ t('page.host.ip_probe_entry') }}</a>
                </div>
              </div>
            </t-form-item>
            <t-form-item
              v-if="formData.ip_mode === 'proxy' && formData.ip_source_mode === 'cdn_preset'"
              :label="t('page.host.cdn_provider')"
              name="cdn_provider"
            >
              <t-select v-model="formData.cdn_provider" :style="{ width: '320px' }" @change="onCdnProviderChange">
                <t-option value="cloudflare" label="Cloudflare (CF-Connecting-IP)" />
                <t-option value="fastly" label="Fastly (Fastly-Client-IP)" />
                <t-option value="cloudfront" label="AWS CloudFront" />
                <t-option value="edgeone" label="腾讯云 EdgeOne (EO-Connecting-IP)" />
                <t-option value="aliyun" label="阿里云 CDN (Ali-Cdn-Real-Ip)" />
                <t-option value="akamai" label="Akamai (True-Client-IP)" />
              </t-select>
            </t-form-item>
            <!-- CDN 回源段由中心库统一管理：只读展示已下载条数/上次更新，不让用户手填 -->
            <t-form-item
              v-if="formData.ip_mode === 'proxy' && formData.ip_source_mode === 'cdn_preset' && formData.cdn_provider"
              :label="t('page.host.cdn_trusted_ips')"
            >
              <div>
                <template v-if="cdnProviderInfo">
                  <span v-if="cdnProviderInfo.count > 0" style="color: var(--td-success-color)">
                    {{ t('page.host.cdn_downloaded', { count: cdnProviderInfo.count }) }}
                    <span style="color: var(--td-text-color-placeholder)"
                      >（{{ t('page.host.cdn_last_update') }}: {{ formatCdnTs(cdnProviderInfo.last_sync_at) }}）</span
                    >
                  </span>
                  <span v-else style="color: var(--td-warning-color)">{{ t('page.host.cdn_not_fetched') }}</span>
                  <t-link theme="primary" hover="color" style="margin-left: 12px" @click="goCdnPage">{{
                    t('page.host.cdn_manage_link')
                  }}</t-link>
                </template>
                <span v-else style="color: var(--td-text-color-placeholder)">-</span>
                <div class="limit-mode-desc">{{ t('page.host.cdn_trusted_ips_tips') }}</div>
              </div>
            </t-form-item>
            <!-- 真实IP头名：指定头模式必填；CDN预设模式选填(留空用厂商默认头，填了可覆盖，
                 例如在 EdgeOne 控制台开了自定义「客户端IP头部」的场景) -->
            <t-form-item v-if="showIpRealHeader" :label="t('page.host.ip_real_header')" name="ip_real_header">
              <div>
                <t-input
                  :style="{ width: '320px' }"
                  v-model="formData.ip_real_header"
                  :placeholder="cdnDefaultHeader || 'X-Real-IP / CF-Connecting-IP'"
                />
                <div v-if="formData.ip_source_mode === 'cdn_preset'" class="limit-mode-desc">
                  {{ t('page.host.ip_real_header_cdn_desc', { header: cdnDefaultHeader || '-' }) }}
                </div>
              </div>
            </t-form-item>
            <t-form-item
              v-if="formData.ip_mode === 'proxy' && formData.ip_source_mode === 'xff_depth'"
              :label="t('page.host.ip_trust_depth')"
              name="ip_trust_depth"
            >
              <t-input-number :style="{ width: '150px' }" v-model="formData.ip_trust_depth" :min="1" theme="column" />
            </t-form-item>
            <!-- 可信代理网段：三种加固模式都用得上(header 校验来源、xff_depth 跳过可信 hop、
                 cdn_preset 在厂商无法自动拉取回源段时手填兜底) -->
            <t-form-item v-if="showIpTrustProxies" :label="t('page.host.ip_trust_proxies')" name="ip_trust_proxies">
              <div>
                <t-textarea :style="{ width: '320px' }" v-model="formData.ip_trust_proxies" placeholder="172.16.0.0/12,10.0.0.0/8" />
                <!-- cdn_preset 且中心库没拉到回源段时，这里就是唯一的可信来源，必须填 -->
                <div v-if="cdnTrustProxiesRequired" style="color: var(--td-error-color)">
                  {{ t('page.host.ip_trust_proxies_required') }}
                </div>
                <div class="limit-mode-desc">{{ ipTrustProxiesDesc }}</div>
              </div>
            </t-form-item>
            <t-form-item :label="t('page.host.exclude_url_log')" name="exclude_url_log">
              <t-tooltip :content="t('page.host.exclude_url_log_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-textarea
                  v-model="formData.exclude_url_log"
                  :style="{ width: '480px' }"
                  :placeholder="t('page.host.exclude_url_log_tips')"
                  name="exclude_url_log"
                />
              </t-tooltip>
            </t-form-item>
            <t-form-item :label="t('page.host.exclude_ip_log')" name="exclude_ip_log">
              <t-tooltip :content="t('page.host.exclude_ip_log_tips')" placement="top" :overlay-style="{ width: '260px' }" show-arrow>
                <t-textarea
                  v-model="formData.exclude_ip_log"
                  :style="{ width: '480px' }"
                  :placeholder="t('page.host.exclude_ip_log_tips')"
                  name="exclude_ip_log"
                />
              </t-tooltip>
            </t-form-item>
            <t-form-item :label="t('page.host.insecure_skip_verify')" name="insecure_skip_verify">
              <t-tooltip :content="t('page.host.insecure_skip_verify_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-radio-group v-model="formData.insecure_skip_verify">
                  <t-radio value="0">{{ t('common.off') }}</t-radio>
                  <t-radio value="1">{{ t('common.on') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>
            <t-form-item :label="t('page.host.response_time_out')" name="response_time_out">
              <t-tooltip :content="t('page.host.response_time_out_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-input-number v-model="formData.response_time_out" :style="{ width: '150px' }" />
              </t-tooltip>
            </t-form-item>
            <t-form-item :label="t('page.host.response_buffering.label')" name="is_enable_response_buffering">
              <t-tooltip :content="t('page.host.response_buffering.tips')" placement="top" :overlay-style="{ width: '260px' }" show-arrow>
                <t-radio-group v-model="formData.is_enable_response_buffering">
                  <t-radio value="1">{{ t('page.host.response_buffering.enable') }}</t-radio>
                  <t-radio value="0">{{ t('page.host.response_buffering.disable') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>
            <t-form-item :label="t('page.host.default_encoding')" name="default_encoding">
              <t-select v-model="formData.default_encoding" :style="{ width: '150px' }">
                <t-option value="auto" :label="t('page.host.default_encoding_auto')" />
                <t-option value="utf-8" label="utf-8" />
                <t-option value="gbk" label="gbk" />
              </t-select>
            </t-form-item>
          </t-tab-panel>

          <t-tab-panel :value="5">
            <template #label>
              <user-password-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_password') }}
            </template>
            <t-form-item :label="t('page.host.is_enable_http_auth_base')" name="is_enable_http_auth_base">
              <t-tooltip :content="t('page.host.is_enable_http_auth_base_tips')" placement="top" :overlay-style="{ width: '200px' }" show-arrow>
                <t-radio-group v-model="formData.is_enable_http_auth_base">
                  <t-radio value="0">{{ t('common.off') }}</t-radio>
                  <t-radio value="1">{{ t('common.on') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1'" :label="t('page.host.http_auth_base_type')" name="http_auth_base_type">
              <t-tooltip :content="t('page.host.http_auth_base_type_tips')" placement="top" :overlay-style="{ width: '400px' }" show-arrow>
                <t-radio-group v-model="formData.http_auth_base_type">
                  <t-radio value="authorization">{{ t('page.host.http_auth_base_type_authorization') }}</t-radio>
                  <t-radio value="custom">{{ t('page.host.http_auth_base_type_custom') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1' && formData.http_auth_base_type === 'custom'">
              <t-alert theme="info" :close="false">
                <div>
                  <div style="margin-bottom: 8px"><strong>{{ t('page.host.http_auth_custom_page_tips_title') }}</strong></div>
                  <div>1. {{ t('page.host.http_auth_custom_page_tips_path') }}</div>
                  <div>2. {{ t('page.host.http_auth_custom_page_tips_lock') }}</div>
                  <div>3. {{ t('page.host.http_auth_custom_page_tips_global') }}</div>
                  <div>4. {{ t('page.host.http_auth_custom_page_tips_validate') }}</div>
                </div>
              </t-alert>
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1'" :label="t('page.host.http_auth_path_prefix')" name="http_auth_path_prefix">
              <t-tooltip :content="t('page.host.http_auth_path_prefix_tips')" placement="top" :overlay-style="{ width: '500px' }" show-arrow>
                <t-input v-model="formData.http_auth_path_prefix" :placeholder="t('page.host.http_auth_path_prefix_placeholder')" :style="{ width: '300px' }">
                  <template #suffix>
                    <t-button size="small" theme="primary" @click="generateHttpAuthPath">
                      {{ t('page.host.generate_random_path') }}
                    </t-button>
                  </template>
                </t-input>
              </t-tooltip>
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1'" :label="t('page.host.http_auth_path_scope')">
              <t-tooltip :content="t('page.host.http_auth_path_scope_tips')" placement="top" :overlay-style="{ width: '420px' }" show-arrow>
                <t-radio-group v-model="httpAuthConfigData.path_scope">
                  <t-radio value="all">{{ t('page.host.http_auth_path_scope_all') }}</t-radio>
                  <t-radio value="include">{{ t('page.host.http_auth_path_scope_include') }}</t-radio>
                  <t-radio value="exclude">{{ t('page.host.http_auth_path_scope_exclude') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1' && httpAuthConfigData.path_scope !== 'all'" :label="t('page.host.http_auth_paths')">
              <t-tooltip :content="t('page.host.http_auth_paths_tips')" placement="top" :overlay-style="{ width: '500px' }" show-arrow>
                <t-textarea v-model="httpAuthConfigData.paths" :placeholder="t('page.host.http_auth_paths_ph')" :autosize="{ minRows: 3, maxRows: 8 }" :style="{ width: '480px' }" />
              </t-tooltip>
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1'" :label="t('page.host.http_auth_bypass_ip_group')">
              <t-tooltip :content="t('page.host.http_auth_bypass_ip_group_tips')" placement="top" :overlay-style="{ width: '400px' }" show-arrow>
                <t-select v-model="httpAuthConfigData.bypass_ip_group" clearable filterable :style="{ width: '480px' }" :placeholder="t('common.select_placeholder')">
                  <t-option v-for="g in ipGroupOptions" :key="g.group_code" :value="g.group_code" :label="g.group_name" />
                </t-select>
              </t-tooltip>
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1'" :label="t('page.host.http_auth_session_ttl')">
              <t-tooltip :content="t('page.host.http_auth_session_ttl_tips')" placement="top" :overlay-style="{ width: '400px' }" show-arrow>
                <t-input-number v-model="httpAuthConfigData.session_ttl" theme="column" :min="1" :max="525600" :style="{ width: '180px' }" />
              </t-tooltip>
              <span style="margin-left: 8px; color: #888">{{ t('page.host.unit_minute') }}</span>
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1'" :label="t('page.host.http_auth_idle_timeout')">
              <t-tooltip
                :content="formData.http_auth_base_type === 'custom' ? t('page.host.http_auth_idle_timeout_tips') : t('page.host.http_auth_idle_timeout_unsupported')"
                placement="top"
                :overlay-style="{ width: '400px' }"
                show-arrow
              >
                <t-input-number
                  v-model="httpAuthConfigData.idle_timeout"
                  theme="column"
                  :min="0"
                  :max="525600"
                  :disabled="formData.http_auth_base_type !== 'custom'"
                  :style="{ width: '180px' }"
                />
              </t-tooltip>
              <span style="margin-left: 8px; color: #888">{{ t('page.host.http_auth_idle_timeout_hint') }}</span>
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1'" :label="t('page.host.http_auth_bind_ip')">
              <t-tooltip :content="t('page.host.http_auth_bind_ip_tips')" placement="top" :overlay-style="{ width: '450px' }" show-arrow>
                <t-radio-group v-model="httpAuthConfigData.bind_ip">
                  <t-radio value="0">{{ t('common.off') }}</t-radio>
                  <t-radio value="1">{{ t('common.on') }}</t-radio>
                </t-radio-group>
              </t-tooltip>
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1'">
              <http-auth-base :prop-host-code="formData.code" />
            </t-form-item>
            <t-form-item v-if="formData.is_enable_http_auth_base === '1' && formData.code">
              <http-auth-session :prop-host-code="formData.code" />
            </t-form-item>
          </t-tab-panel>

          <t-tab-panel :value="6">
            <template #label>
              <heart-icon style="margin-right: 4px; color: #00a870" />
              {{ t('page.host.tab_health_check') }}
            </template>
            <healthy-config :healthy-config="healthyConfigData" @update="(val: any) => (healthyConfigData = val)"
                            @test="testHealth" :test-loading="healthTestLoading" :test-results="healthTestResults"
                            :test-total="healthTestTotal" :test-stale="healthTestStale" :test-error="healthTestError"
                            :test-expected-codes="healthTestExpectedCodes"
                            :load-balance-enabled="String(formData.is_enable_load_balance) === '1'" />
          </t-tab-panel>

          <t-tab-panel :value="7">
            <template #label>
              <lock-on-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_captcha') }}
            </template>
            <t-alert v-if="captchaConfigData.is_enable_captcha == '1'" theme="warning">
              <template #message>{{ t('page.host.captcha.alert') }}</template>
            </t-alert>
            <captcha-config :captcha-config="captchaConfigData" @update="(val: any) => (captchaConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="8">
            <template #label>
              <link-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_anti_leech') }}
            </template>
            <anti-leech-config :anti-leech-config="antiLeechConfigData" @update="(val: any) => (antiLeechConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="9">
            <template #label>
              <data-base-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_cache') }}
            </template>
            <cache-config :cache-config="cacheConfigData" :prop-host-code="formData.code || ''" @update="(val: any) => (cacheConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="10">
            <template #label>
              <folder-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_static_site') }}
            </template>
            <static-site-config :static-site-config="staticSiteConfigData" @update="(val: any) => (staticSiteConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="11">
            <template #label>
              <internet-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_transport') }}
            </template>
            <transport-config :transport-config="transportConfigData" @update="(val: any) => (transportConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="12">
            <template #label>
              <arrow-up-circle-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_custom_headers') }}
            </template>
            <custom-headers-config :custom-headers-config="customHeadersConfigData" @update="(val: any) => (customHeadersConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="13">
            <template #label>
              <arrow-down-circle-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_custom_response_headers') }}
            </template>
            <custom-response-headers-config
              :custom-response-headers-config="customResponseHeadersConfigData"
              @update="(val: any) => (customResponseHeadersConfigData = val)"
            />
          </t-tab-panel>
          <t-tab-panel :value="14">
            <template #label>
              <file-paste-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_response_compress') }}
            </template>
            <response-compress-config :response-compress-config="responseCompressConfigData" @update="(val: any) => (responseCompressConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="16">
            <template #label>
              <lock-on-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_cookie_security') }}
            </template>
            <cookie-security-config :cookie-security-config="cookieSecurityConfigData" @update="(val: any) => (cookieSecurityConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="17">
            <template #label>
              <secured-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_csrf') }}
            </template>
            <csrf-config :csrf-config="csrfConfigData" @update="(val: any) => (csrfConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="18">
            <template #label>
              <verify-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_tamper') }}
            </template>
            <tamper-config :tamper-config="tamperConfigData" :prop-host-code="formData.code" :prop-host="formData.host" :prop-bind-more-host="formData.bind_more_host" @update="(val: any) => (tamperConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="19">
            <template #label>
              <file-safety-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_upload_security') }}
            </template>
            <upload-security-config :upload-security-config="uploadSecurityConfigData" @update="(val: any) => (uploadSecurityConfigData = val)" />
          </t-tab-panel>
          <t-tab-panel :value="20">
            <template #label>
              <user-safety-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_access') }}
            </template>
            <access-config
              :access-config="accessConfigData"
              :cache-enabled="cacheConfigData && String(cacheConfigData.is_enable_cache) === '1'"
              @update="(val: any) => (accessConfigData = val)"
            />
          </t-tab-panel>
          <t-tab-panel :value="15">
            <template #label>
              <swap-icon style="margin-right: 4px; color: #0052d9" />
              {{ t('page.host.tab_path_rule') }}
            </template>
            <path-rule-config :prop-host-code="formData.code || ''" />
          </t-tab-panel>
          </t-tabs>
        </div>

        <t-form-item style="float: right; margin-top: 5px">
          <t-button variant="outline" @click="emit('close')">{{ t('common.close') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.confirm') }}</t-button>
        </t-form-item>
      </t-form>
    </div>

    <t-dialog v-model:visible="addSSLFormVisible" :header="t('common.new')" :width="750" :footer="false">
      <ssl-form :value="sslformData" @close="addSSLFormVisible = !addSSLFormVisible" @submit="onSSLSubmit" />
    </t-dialog>
    <t-dialog v-model:visible="editSSLFormVisible" :header="t('common.edit')" :width="750" :footer="false">
      <ssl-form :value="sslformEditData" :is-edit="true" @close="editSSLFormVisible = !editSSLFormVisible" @submit="onSSLSubmitEdit" />
    </t-dialog>
  </div>
    <!-- 真实IP来源诊断(与访问日志页共用同一组件) -->
    <ip-source-probe-dialog
      v-model:visible="ipProbeVisible"
      :host-code="formData.code"
      :host-name="formData.host"
      :can-use-header="true"
      @use-header="useProbeHeader"
    />

    <!-- 就地新建分组：省得先跳去列表页建好再回来 -->
    <t-dialog
      v-model:visible="groupQuickAddVisible"
      :header="t('page.host.group.new_group')"
      :width="440"
      :confirm-btn="t('common.confirm')"
      :cancel-btn="t('common.cancel')"
      @confirm="saveGroupQuickAdd"
    >
      <t-form :label-width="90" colon>
        <t-form-item :label="t('page.host.group.name')">
          <t-input v-model="groupQuickAdd.group_name" :maxlength="50" :placeholder="t('page.host.group.name_placeholder')" />
        </t-form-item>
        <t-form-item :label="t('page.host.group.color')">
          <div class="hg-form-colors">
            <i
              v-for="c in groupColorOptions"
              :key="c"
              :class="{ on: groupQuickAdd.color === c }"
              :style="{ background: c }"
              @click="groupQuickAdd.color = c"
            ></i>
          </div>
        </t-form-item>
      </t-form>
    </t-dialog>

</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { MessagePlugin, type FormProps } from 'tdesign-vue-next';
import {
  FileSafetyIcon,
  HeartIcon,
  LockOnIcon,
  LinkIcon,
  DataBaseIcon,
  FolderIcon,
  InternetIcon,
  FilterIcon,
  FilePasteIcon,
  SwapIcon,
  SecuredIcon,
  VerifyIcon,
  HelpCircleIcon,
  JumpIcon,
  HomeIcon,
  LayersIcon,
  SettingIcon,
  UserPasswordIcon,
  UserSafetyIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
  ViewListIcon,
  ViewColumnIcon,
  DeleteIcon,
  FullscreenIcon,
  FullscreenExitIcon,
} from 'tdesign-icons-vue-next';
import LoadBalance from '@/pages/waf/loadbalance/index.vue';
import HttpAuthBase from '@/pages/waf/http_auth_base/index.vue';
import HttpAuthSession from '@/pages/waf/http_auth_session/index.vue';
import HealthyConfig from './HealthyConfig.vue';
import CaptchaConfig from './CaptchaConfig.vue';
import StaticSiteConfig from './StaticSiteConfig.vue';
import TransportConfig from './TransportConfig.vue';
import AntiLeechConfig from './AntiLeechConfig.vue';
import CacheConfig from './CacheConfig.vue';
import CustomHeadersConfig from './CustomHeadersConfig.vue';
import CustomResponseHeadersConfig from './CustomResponseHeadersConfig.vue';
import ResponseCompressConfig from './ResponseCompressConfig.vue';
import CookieSecurityConfig from './CookieSecurityConfig.vue';
import CsrfConfig from './CsrfConfig.vue';
import AccessConfig from './AccessConfig.vue';
import TamperConfig from './TamperConfig.vue';
import UploadSecurityConfig from './UploadSecurityConfig.vue';
import PathRuleConfig from './PathRuleConfig.vue';
import SslForm from './SslForm.vue';
import {
  INITIAL_HEALTHY,
  INITIAL_CAPTCHA,
  INITIAL_ANTILEECH,
  INITIAL_SSL_DATA,
  INITIAL_CACHE,
  INITIAL_HTTP_AUTH,
  INITIAL_STATIC_SITE,
  INITIAL_TRANSPORT,
  INITIAL_CUSTOM_HEADERS,
  INITIAL_CUSTOM_RESPONSE_HEADERS,
  INITIAL_RESPONSE_COMPRESS,
  INITIAL_COOKIE_SECURITY,
  INITIAL_CSRF,
  INITIAL_ACCESS,
  INITIAL_TAMPER,
  INITIAL_UPLOAD_SECURITY,
  DEFAULT_STATIC_SECURITY_HEADERS,
} from '../constants';
import { sslConfigListApi, sslConfigAddApi, sslConfigEditApi } from '@/apis/sslconfig';
import { wafIPGroupOptionsApi } from '@/apis/ipgroup';
import { checkHostPorts, testHostHealth } from '@/apis/host';
import { getOrDefault } from '@/utils/usuallytool';
import { usePermissionStore } from '@/store/modules/permission';
import { get_detail_by_item_api, edit_system_config_by_item_api } from '@/apis/systemconfig';
import { wafCDNProviderInfoApi } from '@/apis/cdnip';
import { addHostGroup } from '@/apis/hostgroup';
import IpSourceProbeDialog from './IpSourceProbeDialog.vue';

const props = withDefaults(
  defineProps<{
    value: Record<string, any>;
    isEdit?: boolean;
    selectCanFilter?: boolean;
    hostAddUrl?: string;
    // 所属分组下拉数据，由父页面统一维护并下发。
    // 走 prop 而不是本组件自己拉：弹窗只创建一次，自己拉的话分组条上新建的分组要刷新页面才看得到。
    hostGroups?: Record<string, any>[];
    // 打开时定位到哪个配置 Tab（1基础内容 4其他配置），供外部深链使用
    initTab?: number;
    // 所在弹窗是否可见。弹窗内容只创建一次，不下发这个开关的话，
    // 在证书申请页新签发的证书，回到列表再打开编辑时下拉里仍然没有（只剩一串ID）
    dialogVisible?: boolean;
  }>(),
  { isEdit: false, selectCanFilter: true, hostAddUrl: '', initTab: 0, hostGroups: () => [], dialogVisible: false },
);
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: { result: Record<string, any> }): void;
  (e: 'tab-placement-change', placement: string): void;
  (e: 'fullscreen-change', full: boolean): void;
  (e: 'group-changed'): void;
}>();

const { t } = useI18n();

// 「基础内容」分节后标签统一 150px：最长的"后端IP(动态域名)""是否传递后端域名"
// 加上后面的 ⓘ 图标正好一行放下(再窄图标会被右侧控件盖住)。其余 Tab 仍用 t-form 的 230。
const baseLabelWidth = 150;

// 弹窗全屏（偏好持久化，由父页面据此放宽弹窗宽高）
const isFullscreen = ref(localStorage.getItem('samwaf_host_form_fullscreen') === '1');
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  localStorage.setItem('samwaf_host_form_fullscreen', isFullscreen.value ? '1' : '0');
  emit('fullscreen-change', isFullscreen.value);
}

// 就地新建分组（颜色与后端白名单一致）
const groupColorOptions = ['#0052D9', '#2BA471', '#E37318', '#D54941', '#834EC2', '#0594FA', '#8B8B8B', '#D4A017'];
const groupQuickAddVisible = ref(false);
const groupQuickAdd = ref<Record<string, any>>({ group_name: '', color: '#0052D9' });

function openGroupQuickAdd() {
  groupQuickAdd.value = { group_name: '', color: groupColorOptions[0] };
  groupQuickAddVisible.value = true;
}

function saveGroupQuickAdd() {
  const name = (groupQuickAdd.value.group_name || '').trim();
  if (!name) {
    MessagePlugin.warning(t('page.host.group.name_required'));
    return;
  }
  addHostGroup({ group_name: name, color: groupQuickAdd.value.color, remarks: '' })
    .then((res: any) => {
      if (res.code === 0) {
        groupQuickAddVisible.value = false;
        // 让父页面重新拉一次分组（分组条与本下拉共用同一份数据），再回填到当前表单
        emit('group-changed');
        if (res.data && res.data.group_code) {
          formData.value.group_code = res.data.group_code;
        }
      } else {
        MessagePlugin.error(res.msg || t('common.failed'));
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}
const router = useRouter();

const formData = ref<Record<string, any>>({
  ...JSON.parse(JSON.stringify(props.value)),
  ssl_config_mode: 'existing',
});

/* ===== 端口监听表（issue #955） ===== */
type PortRow = { port?: number; proto: string; ipv: string };
// 第一行为主端口。编辑态未动过端口区则提交时不携带 port_listens_json，保持库里空值=按老规则派生
const portRows = ref<PortRow[]>([]);
const portRowsDirty = ref(false);
const portCheckMsg = ref('');
let portCheckTimer: ReturnType<typeof setTimeout> | null = null;
// 是否显示端口行的「IP 版本」列。默认隐藏(等同 IPv4+IPv6)，
// 载入时若已有行不是 both 则自动展开，保证既有配置不会被藏起来
const showPortIpv = ref(false);
// 用户是否手动取消了「添加 80 端口」。只影响开 SSL 时要不要自动补 80，
// 勾选状态本身由端口表推导(acmePort80Checked)
const acme80OptOut = ref(false);

// 有端口声明为 HTTPS 但 SSL 证书开关未开：保存会被后端拒绝，这里提前提示
const portHttpsNeedSsl = computed(() => portRows.value.some((r) => r.proto === 'https') && formData.value.ssl !== '1');
// 80 端口被声明为 HTTPS 时，ACME 的 http01 文件验证（申请/续期）必然失败：
// Let's Encrypt 是明文 HTTP 打 80 端口。这里只提示不拦，用 DNS 验证的用户不受影响。
const port80HttpsWarn = computed(() => portRows.value.some((r) => Number(r.port) === 80 && r.proto === 'https'));
// 只有存在 HTTPS 端口、且主端口本身不是 80 时才需要这个勾选项：
// 主端口就是 80 的话 http01 直接用主端口即可，不用再补一行
const showAcmePort80 = computed(() => portRows.value.some((r) => r.proto === 'https') && Number(portRows.value[0]?.port) !== 80);
// 勾选状态直接由端口表推导，用户手工删掉 80 行时勾也会自动落下，不会两处打架
const acmePort80Checked = computed(() => portRows.value.some((r) => Number(r.port) === 80 && r.proto === 'http'));
// 开了「强制80跳转HTTPS」但端口表里没有 80：引擎会隐式占用 80 做跳转，得说明白
const autoJump80Note = computed(
  () =>
    String(formData.value.ssl) === '1' &&
    String(formData.value.auto_jump_https) === '1' &&
    !portRows.value.some((r) => Number(r.port) === 80),
);

// 详情返回 resolved_listens 时按它铺行；否则按老规则派生，保证存量站点打开就是原来的样子
function initPortRows(src: Record<string, any>) {
  let rows: PortRow[] = [];
  const resolved = src && src.resolved_listens;
  if (Array.isArray(resolved) && resolved.length > 0) {
    rows = resolved
      .filter((l: any) => !l.implied)
      .map((l: any) => ({ port: l.port, proto: l.proto === 'https' ? 'https' : 'http', ipv: l.ipv || 'both' }));
  } else {
    const ssl = String(src && src.ssl != null ? src.ssl : '0') === '1';
    const mainPort = Number((src && src.port) || 80);
    rows.push({ port: mainPort, proto: ssl ? 'https' : 'http', ipv: 'both' });
    String((src && src.bind_more_port) || '')
      .split(',')
      .forEach((p) => {
        const port = parseInt(String(p).trim(), 10);
        if (!port || rows.some((r) => Number(r.port) === port)) return;
        rows.push({ port, proto: port === 443 || (ssl && port !== 80) ? 'https' : 'http', ipv: 'both' });
      });
  }
  portRows.value = rows;
  portRowsDirty.value = false;
  portCheckMsg.value = '';
  // 已经指定过 IP 版本的站点，打开就把这一列展开，否则用户看不到自己配过什么
  showPortIpv.value = rows.some((r) => r.ipv && r.ipv !== 'both');
  acme80OptOut.value = false;
}

function addPortRow() {
  if (portRows.value.length >= 32) {
    MessagePlugin.warning(t('page.host.port_listen.too_many'));
    return;
  }
  portRows.value.push({ port: undefined, proto: 'http', ipv: 'both' });
  onPortRowsChanged();
}

function removePortRow(idx: number) {
  portRows.value.splice(idx, 1);
  onPortRowsChanged();
}

// 端口区一动就双写回 port / bind_more_port（老路径与旧版本回滚兼容），并触发防抖冲突预检
function onPortRowsChanged() {
  portRowsDirty.value = true;
  if (portRows.value.length > 0 && portRows.value[0].port) {
    formData.value.port = Number(portRows.value[0].port);
  }
  formData.value.bind_more_port = portRows.value
    .slice(1)
    .filter((r) => r.port)
    .map((r) => String(r.port))
    .join(',');
  if (portCheckTimer) clearTimeout(portCheckTimer);
  portCheckTimer = setTimeout(runPortCheck, 500);
}

// 协议切换：t-radio-group 用 :value + @change 受控
function onProtoChange(row: PortRow, val: any) {
  row.proto = val;
  // 手工把某个端口切成 HTTPS 时也要立刻补 80，否则勾选框显示"未勾选"、
  // 但稍后打开 SSL 开关又会补上，用户看到的与最终保存的对不上
  syncAcmePort80();
  onPortRowsChanged();
}

// 出现 HTTPS 端口且用户没取消过勾选时，补一行 80:HTTP（默认勾上的实际动作）。
// 主端口本身是 80 的场景由 showAcmePort80 排除，不会在这里补出重复端口。
function syncAcmePort80() {
  if (acme80OptOut.value || !showAcmePort80.value) return;
  if (portRows.value.some((r) => Number(r.port) === 80)) return;
  portRows.value.push({ port: 80, proto: 'http', ipv: 'both' });
}

// 「添加 80 端口（证书文件验证用）」：勾上补一行 80:HTTP，取消则移除该行
function onAcmePort80Change(val: any) {
  acme80OptOut.value = !val;
  if (val) {
    if (!portRows.value.some((r) => Number(r.port) === 80)) {
      portRows.value.push({ port: 80, proto: 'http', ipv: 'both' });
      onPortRowsChanged();
    }
    return;
  }
  const idx80 = portRows.value.findIndex((r, i) => i > 0 && Number(r.port) === 80 && r.proto === 'http');
  if (idx80 > 0) {
    portRows.value.splice(idx80, 1);
    onPortRowsChanged();
  }
}

// 取消勾选时把所有行重置回 both：隐藏一个仍在生效的非默认值比多点一次更危险
function onShowPortIpvChange(val: any) {
  showPortIpv.value = !!val;
  if (!val && portRows.value.some((r) => r.ipv !== 'both')) {
    portRows.value.forEach((r) => {
      r.ipv = 'both';
    });
    onPortRowsChanged();
  }
}

function buildPortListensJson() {
  return JSON.stringify(
    portRows.value
      .filter((r) => r.port)
      .map((r) => ({ port: Number(r.port), proto: r.proto, ipv: r.ipv || 'both' })),
  );
}

// 行内冲突预检：响应拦截器返回整个报文 {code,msg,data}，
// 校验不通过时后端走 FailWithMessage(code!=0) 而不是 reject，必须在 then 里分支
function runPortCheck() {
  portCheckMsg.value = '';
  const rows = portRows.value.filter((r) => r.port);
  if (rows.length === 0) return;
  checkHostPorts({
    code: formData.value.code || '',
    port: Number(rows[0].port),
    ssl: Number(formData.value.ssl),
    auto_jump_https: Number(formData.value.auto_jump_https || 0),
    port_listens_json: buildPortListensJson(),
  })
    .then((res: any) => {
      if (!res) return;
      if (res.code === 0) {
        portCheckMsg.value = res.data && res.data.message ? res.data.message : '';
      } else {
        portCheckMsg.value = res.msg || '';
      }
    })
    .catch((e: any) => {
      portCheckMsg.value = e && e.message ? e.message : String(e);
    });
}

// cdn_preset 模式下所选厂商中心库状态(只读展示)
const cdnProviderInfo = ref<Record<string, any> | null>(null);

// 真实IP来源诊断弹窗 + 全局「获取访客IP头信息」(兼容模式下本站实际沿用的值)
const ipProbeVisible = ref(false);
const globalProxyHeader = ref('');

function openIpProbe() {
  ipProbeVisible.value = true;
}

// 直接把看到的头填进"真实IP头名"，省得手打错
function useProbeHeader(name: string) {
  formData.value.ip_real_header = name;
  if (!['header', 'cdn_preset'].includes(formData.value.ip_source_mode)) {
    formData.value.ip_source_mode = 'header';
  }
  ipProbeVisible.value = false;
  MessagePlugin.success(t('page.host.ip_probe_used_header'));
}

// 读全局「获取访客IP头信息」，用于兼容模式下回显"本站实际沿用的是什么"
function loadGlobalProxyHeader() {
  get_detail_by_item_api({ item: 'gwaf_proxy_header' })
    .then((res) => {
      if (res.code === 0 && res.data) {
        globalProxyHeader.value = (res.data.value || '').trim();
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}
loadGlobalProxyHeader();

function goSystemConfig() {
  const route = router.resolve({ name: 'SystemConfig' });
  window.open(route.href, '_blank');
}

// 真实IP来源：随所选模式返回对应解释文案(显示在下拉框下方)
const ipSourceModeDesc = computed(() => {
  const map: Record<string, string> = {
    '': 'page.host.ip_source_compat_desc',
    header: 'page.host.ip_source_header_desc',
    xff_depth: 'page.host.ip_source_xff_desc',
    cdn_preset: 'page.host.ip_source_cdn_desc',
  };
  return t(map[formData.value.ip_source_mode] || 'page.host.ip_source_compat_desc');
});

// 所选 CDN 厂商的默认真实IP头(与后端 wafenginecore/clientip/providers.go 保持一致)
const cdnDefaultHeader = computed(() => {
  const map: Record<string, string> = {
    cloudflare: 'CF-Connecting-IP',
    fastly: 'Fastly-Client-IP',
    cloudfront: 'CloudFront-Viewer-Address',
    edgeone: 'EO-Connecting-IP',
    aliyun: 'Ali-Cdn-Real-Ip',
    akamai: 'True-Client-IP',
  };
  return map[formData.value.cdn_provider] || '';
});

// 真实IP头名输入框：指定头模式必填，CDN预设模式选填(覆盖厂商默认头)
const showIpRealHeader = computed(
  () => formData.value.ip_mode === 'proxy' && ['header', 'cdn_preset'].includes(formData.value.ip_source_mode),
);

// 可信代理网段输入框：三种加固模式都需要
const showIpTrustProxies = computed(
  () => formData.value.ip_mode === 'proxy' && ['header', 'xff_depth', 'cdn_preset'].includes(formData.value.ip_source_mode),
);

// cdn_preset 且中心库没拉到该厂商回源段时，可信代理网段是唯一可用的可信来源，
// 两个都空后端会拒绝保存(否则所有请求都只能取到 CDN 回源节点IP)，提前标红提示
const cdnTrustProxiesRequired = computed(
  () =>
    formData.value.ip_source_mode === 'cdn_preset' &&
    !!cdnProviderInfo.value &&
    !cdnProviderInfo.value.count &&
    !(formData.value.ip_trust_proxies || '').trim(),
);

// 可信代理网段：不同模式下作用不同，分别给对应说明
const ipTrustProxiesDesc = computed(() => {
  const map: Record<string, string> = {
    header: 'page.host.ip_trust_proxies_header_desc',
    xff_depth: 'page.host.ip_trust_proxies_xff_desc',
    cdn_preset: 'page.host.ip_trust_proxies_cdn_desc',
  };
  return t(map[formData.value.ip_source_mode] || 'page.host.ip_trust_proxies_tips');
});

// 切换 CDN 厂商 → 拉取该厂商中心库状态
function onCdnProviderChange(v: string) {
  cdnProviderInfo.value = null;
  if (v) loadCdnProviderInfo(v);
}
function loadCdnProviderInfo(provider: string) {
  wafCDNProviderInfoApi({ provider })
    .then((res) => {
      if (res.code === 0) cdnProviderInfo.value = res.data;
    })
    .catch(() => {});
}
function formatCdnTs(ts: number) {
  if (!ts) return '-';
  return new Date(ts * 1000).toLocaleString();
}
function goCdnPage() {
  const route = router.resolve({ name: 'WafCDNIP' });
  window.open(route.href, '_blank');
}

// 主机防御细节
const hostDefenseData = ref<Record<string, string>>({
  bot: '1',
  sqli: '1',
  xss: '1',
  scan: '1',
  rce: '1',
  sensitive: '1',
  traversal: '1',
  owaspset: '0',
  ai: '0',
});

const healthyConfigData = ref<Record<string, any>>({ ...INITIAL_HEALTHY });

/* ===== 健康检测手动测试（与定时任务共用后端单次探测，不保存不改运行状态） ===== */
const healthTestLoading = ref(false);
const healthTestResults = ref<Record<string, any>[]>([]);
const healthTestTotal = ref(0);
const healthTestStale = ref(false);
const healthTestError = ref('');
const healthTestExpectedCodes = ref('');
const healthTestGeneration = ref(0);
const healthTestController = ref<AbortController | null>(null);
const healthTestSnapshot = ref('');

// 触发测试时的表单快照：健康配置 + 回源七字段任一变化即视为结果过期
const healthTestConfigKey = computed(() => {
  const { code, host, remote_host, remote_ip, remote_port, is_enable_load_balance, is_trans_back_domain } = formData.value;
  return JSON.stringify({ code, host, remote_host, remote_ip, remote_port, is_enable_load_balance, is_trans_back_domain, healthy: healthyConfigData.value });
});

watch(healthTestConfigKey, () => {
  if (healthTestSnapshot.value && healthTestSnapshot.value !== healthTestConfigKey.value) {
    cancelHealthTest();
    healthTestStale.value = true;
  }
});

// 切换编辑站点（父组件替换 value 对象）时清空旧结果，防止上一站的结果串到下一站
watch(
  () => props.value,
  () => resetHealthTest(),
);

function cancelHealthTest() {
  healthTestGeneration.value += 1;
  if (healthTestController.value) healthTestController.value.abort();
  healthTestController.value = null;
  healthTestLoading.value = false;
}

function resetHealthTest() {
  cancelHealthTest();
  healthTestResults.value = [];
  healthTestTotal.value = 0;
  healthTestStale.value = false;
  healthTestError.value = '';
  healthTestExpectedCodes.value = '';
  healthTestSnapshot.value = '';
}

async function testHealth(config: Record<string, any>) {
  if (healthTestLoading.value || !props.dialogVisible) return;
  resetHealthTest();
  const initialGeneration = healthTestGeneration.value;
  healthyConfigData.value = JSON.parse(JSON.stringify(config));
  await nextTick();
  if (initialGeneration !== healthTestGeneration.value || healthTestLoading.value || !props.dialogVisible) return;
  const healthy = {
    is_enable_healthy: parseInt(config.is_enable_healthy, 10),
    fail_count: parseInt(config.fail_count, 10),
    success_count: parseInt(config.success_count, 10),
    response_time: parseInt(config.response_time, 10),
    check_method: config.check_method,
    check_path: config.check_path,
    expected_codes: config.expected_codes,
  };
  const integerInRange = (value: any, min: number, max: number) =>
    /^\d+$/.test(String(value)) && Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max;
  if (!integerInRange(config.is_enable_healthy, 0, 1)
    || !integerInRange(config.fail_count, 1, 10) || !integerInRange(config.success_count, 1, 10)
    || !integerInRange(config.response_time, 1, 120) || !['GET', 'HEAD'].includes(healthy.check_method)) {
    healthTestError.value = t('page.host.health_check.test_invalid_config');
    return;
  }
  const origin = formData.value;
  const loadBalance = String(origin.is_enable_load_balance) === '1';
  if (loadBalance && !origin.code) {
    healthTestError.value = t('page.host.health_check.test_save_loadbalance');
    return;
  }
  if (!origin.host || !/^https?:\/\/[^\s]+$/.test(origin.remote_host || '')
    || (!loadBalance && !integerInRange(origin.remote_port, 1, 65535))) {
    healthTestError.value = t('page.host.health_check.test_invalid_origin');
    return;
  }
  const payload = {
    code: origin.code || '', host: origin.host, remote_host: origin.remote_host,
    remote_ip: origin.remote_ip || '', remote_port: parseInt(origin.remote_port, 10) || 0,
    is_enable_load_balance: parseInt(origin.is_enable_load_balance, 10),
    is_trans_back_domain: parseInt(origin.is_trans_back_domain, 10),
    healthy_json: JSON.stringify(healthy), limit: 5,
  };
  resetHealthTest();
  const generation = healthTestGeneration.value;
  const snapshot = healthTestConfigKey.value;
  healthTestSnapshot.value = snapshot;
  healthTestExpectedCodes.value = healthy.expected_codes;
  healthTestLoading.value = true;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  healthTestController.value = controller;
  // 本轮是否仍有效：世代没被取消/重置、弹窗仍开着、配置快照没变
  const isCurrent = () => generation === healthTestGeneration.value && props.dialogVisible
    && snapshot === healthTestConfigKey.value;
  try {
    let offset = 0;
    while (isCurrent()) {
      const response: any = await testHostHealth({ ...payload, offset },
        healthy.response_time * 1000 + 10000, controller ? controller.signal : undefined);
      if (!isCurrent()) return;
      if (response.code !== 0) {
        healthTestError.value = response.msg || t('page.host.health_check.test_request_failed');
        return;
      }
      const batch = response.data;
      if (!batch || !Array.isArray(batch.results) || !Number.isInteger(batch.total) || batch.total < 0
        || !Number.isInteger(batch.next_offset) || batch.results.length > 5
        || batch.results.some((row: any) => !row || !['passed', 'failed', 'skipped'].includes(row.outcome))) {
        throw new Error(t('page.host.health_check.test_invalid_response'));
      }
      healthTestResults.value = healthTestResults.value.concat(batch.results);
      healthTestTotal.value = batch.total;
      if (batch.next_offset === -1) break;
      if (!batch.results.length || batch.next_offset !== offset + batch.results.length
        || batch.next_offset >= batch.total) {
        throw new Error(t('page.host.health_check.test_invalid_response'));
      }
      offset = batch.next_offset;
    }
  } catch (error: any) {
    if (isCurrent()) {
      healthTestError.value = error.message || t('page.host.health_check.test_request_failed');
    }
  } finally {
    if (isCurrent()) {
      healthTestLoading.value = false;
      healthTestController.value = null;
    }
  }
}

onBeforeUnmount(() => {
  cancelHealthTest();
});

const captchaConfigData = ref<Record<string, any>>({ ...INITIAL_CAPTCHA });
const antiLeechConfigData = ref<Record<string, any>>({ ...INITIAL_ANTILEECH });
const cacheConfigData = ref<Record<string, any>>({ ...INITIAL_CACHE });
const httpAuthConfigData = ref<Record<string, any>>({ ...INITIAL_HTTP_AUTH });
const staticSiteConfigData = ref<Record<string, any>>({ ...INITIAL_STATIC_SITE });
const transportConfigData = ref<Record<string, any>>({ ...INITIAL_TRANSPORT });
const customHeadersConfigData = ref<Record<string, any>>({ ...INITIAL_CUSTOM_HEADERS });
const customResponseHeadersConfigData = ref<Record<string, any>>({ ...INITIAL_CUSTOM_RESPONSE_HEADERS });
const responseCompressConfigData = ref<Record<string, any>>({ ...INITIAL_RESPONSE_COMPRESS });
// 网站密码访问「免密IP组」的下拉选项，每次打开弹窗重拉
const ipGroupOptions = ref<any[]>([]);
const cookieSecurityConfigData = ref<Record<string, any>>({ ...INITIAL_COOKIE_SECURITY });
const csrfConfigData = ref<Record<string, any>>({ ...INITIAL_CSRF, protect_methods: [...INITIAL_CSRF.protect_methods] });
const accessConfigData = ref<Record<string, any>>({ ...INITIAL_ACCESS });
const tamperConfigData = ref<Record<string, any>>({ ...INITIAL_TAMPER });
const uploadSecurityConfigData = ref<Record<string, any>>({ ...INITIAL_UPLOAD_SECURITY });
const activeTab = ref<number>(1); // 当前激活的配置 Tab（受控，供防御总览开关「配置详情」跳转/外部深链）
// 外部深链(如访问日志"IP提取有问题?"跳过来)指定要定位的 Tab
watch(
  () => props.initTab,
  (val) => {
    if (val > 0) activeTab.value = val;
  },
  { immediate: true },
);

// Tab 布局：left=竖向（默认），top=横向；用户偏好持久化到 localStorage
const tabPlacement = ref<'left' | 'top'>(localStorage.getItem('samwaf_host_tab_placement') === 'top' ? 'top' : 'left');
const tabsRef = ref();

// 切换 Tab 横向/竖向布局，偏好持久化并通知父级调整弹窗宽度
const toggleTabPlacement = () => {
  tabPlacement.value = tabPlacement.value === 'left' ? 'top' : 'left';
  localStorage.setItem('samwaf_host_tab_placement', tabPlacement.value);
  emit('tab-placement-change', tabPlacement.value);
};

// 切换 Tab 后把内容区和弹窗滚动位置复位到顶部，避免左侧导航过长时右侧内容"看起来是空的"
watch(activeTab, () => {
  nextTick(() => {
    const tabsEl = tabsRef.value?.$el as HTMLElement | undefined;
    if (!tabsEl) return;
    const content = tabsEl.querySelector('.t-tabs__content');
    if (content) content.scrollTop = 0;
    const dialogBody = tabsEl.closest('.t-dialog__body');
    if (dialogBody) dialogBody.scrollTop = 0;
  });
});

// 引擎自带防护表格列
const defenseColumns = computed(() => [
  { colKey: 'detection', title: t('page.host.defense_col_item'), width: 220 },
  { colKey: 'status', title: t('page.host.defense_col_status'), width: 220 },
  { colKey: 'op', title: t('page.host.defense_col_op'), width: 120, align: 'left' as const },
]);

// 引擎自带防护行（src 决定开关绑定到 defense_json 各项 或 各子配置的 is_enable）
// 跳转系统设置域的入口（OWASP/AI 模型管理）仅平台侧可见，租户只留开关
const isPlatform = usePermissionStore().isPlatform;
const defenseRows = computed(() => [
  { key: 'bot', src: 'defense', label: t('page.host.bot_detection'), tips: t('page.host.bot_detection_tips') },
  { key: 'sqli', src: 'defense', label: t('page.host.sql_injection_detection'), tips: t('page.host.sql_injection_detection_tips') },
  { key: 'xss', src: 'defense', label: t('page.host.xss_detection'), tips: t('page.host.xss_detection_tips') },
  { key: 'scan', src: 'defense', label: t('page.host.scan_detection'), tips: t('page.host.scan_detection_tips') },
  { key: 'rce', src: 'defense', label: t('page.host.rce_detection'), tips: t('page.host.rce_detection_tips') },
  { key: 'sensitive', src: 'defense', label: t('page.host.sensitive_detection'), tips: t('page.host.sensitive_detection_tips') },
  { key: 'traversal', src: 'defense', label: t('page.host.dir_traversal_detection'), tips: t('page.host.dir_traversal_detection_tips') },
  { key: 'owaspset', src: 'defense', label: t('page.host.owaspset_detection'), tips: t('page.host.owaspset_detection_tips'), ...(isPlatform ? { action: { type: 'route', path: '/sys/OwaspManage', text: t('page.host.owasp_manage_link') } } : {}) },
  { key: 'ai', src: 'defense', label: t('page.host.ai_detection'), tips: t('page.host.ai_detection_tips'), ...(isPlatform ? { action: { type: 'route', path: '/sys/AIModelManage', text: t('page.host.ai_manage_link') } } : {}) },
  { key: 'cookie', src: 'cookie', label: t('page.host.tab_cookie_security'), tips: t('page.host.cookie_security.intro'), action: { type: 'tab', tab: 16 } },
  { key: 'csrf', src: 'csrf', label: t('page.host.tab_csrf'), tips: t('page.host.csrf.intro'), action: { type: 'tab', tab: 17 } },
  { key: 'tamper', src: 'tamper', label: t('page.host.tab_tamper'), tips: t('page.host.tamper.intro'), action: { type: 'tab', tab: 18 } },
  { key: 'upload', src: 'upload', label: t('page.host.tab_upload_security'), tips: t('page.host.upload_security.intro'), action: { type: 'tab', tab: 19 } },
]);

// 引擎自带防护表格：按 row.src 读开关值
const getDefenseValue = (row: any) => {
  switch (row.src) {
    case 'cookie':
      return cookieSecurityConfigData.value.is_enable;
    case 'csrf':
      return csrfConfigData.value.is_enable;
    case 'tamper':
      return tamperConfigData.value.is_enable;
    case 'upload':
      return uploadSecurityConfigData.value.is_enable;
    default:
      return hostDefenseData.value[row.key];
  }
};

// 引擎自带防护表格：按 row.src 写开关值
const setDefenseValue = (row: any, val: any) => {
  switch (row.src) {
    case 'cookie':
      cookieSecurityConfigData.value.is_enable = val;
      break;
    case 'csrf':
      csrfConfigData.value.is_enable = val;
      break;
    case 'tamper':
      tamperConfigData.value.is_enable = val;
      break;
    case 'upload':
      uploadSecurityConfigData.value.is_enable = val;
      // 一键开启时若四个检测维度全关，自动套用推荐策略（否则总开关开了也不检测）
      if (val === '1') {
        const u = uploadSecurityConfigData.value;
        const allOff = ['check_ext', 'check_content', 'check_magic', 'check_size'].every((k) => String(u[k]) !== '1');
        if (allOff) {
          u.check_ext = '1';
          u.check_content = '1';
          u.check_magic = '1';
          u.check_size = '1';
          u.over_limit_action = u.over_limit_action || 'block';
          u.max_size_kb = u.max_size_kb || 10240;
        }
      }
      break;
    default:
      hostDefenseData.value[row.key] = val;
      break;
  }
};

const rules: FormProps['rules'] = {
  host: [
    { required: true, message: t('common.placeholder') + t('page.host.host'), type: 'error' },
    {
      validator: (val: any) => {
        const hostRegex = /^(?!https?:\/\/)[^\s]+$/;
        return !!val && hostRegex.test(val);
      },
      message: t('page.host.host_validation'),
      type: 'error',
    },
  ],
  port: [{ required: true, message: t('common.placeholder') + t('page.host.port'), type: 'error' }],
  remote_host: [
    { required: true, message: t('common.placeholder') + t('page.host.remote_host'), type: 'error' },
    {
      validator: (val: any) => {
        const regex = /^(http:\/\/|https:\/\/)[^\s]+$/;
        return regex.test(val);
      },
      message: t('page.host.remote_host_validation'),
      type: 'error',
    },
  ],
  remote_ip: [{ required: true, message: t('common.placeholder') + t('page.host.remote_ip'), type: 'error' }],
  remote_port: [{ required: true, message: t('common.placeholder') + t('page.host.remote_port'), type: 'error' }],
};

// SSL 证书夹
const addSSLFormVisible = ref(false);
const editSSLFormVisible = ref(false);
const sslConfigList = ref<Record<string, any>[]>([]);
// 证书夹下拉项。绑定ID在证书夹里找不到时（条目已被删除等）补一条同值选项，
// 否则 t-select 直接把原始ID显示出来，看着像是没加载
const sslOptions = computed(() => {
  const list = sslConfigList.value.map((item) => ({
    value: item.id,
    label: `${item.domains} (${item.valid_to})`,
  }));
  const bindId = formData.value.bind_ssl_id;
  if (bindId && !list.some((item) => item.value === bindId)) {
    list.unshift({ value: bindId, label: t('page.host.ssl_folder_missing') });
  }
  return list;
});
// 证书小节标题右侧的一句话摘要：不展开也能看出绑的是哪张证书、什么时候到期
const certSummary = computed(() => {
  const hit = sslConfigList.value.find((item) => item.id === formData.value.bind_ssl_id);
  if (hit) {
    return `${hit.domains} (${hit.valid_to})`;
  }
  if (formData.value.bind_ssl_id) {
    return t('page.host.sect.cert_missing');
  }
  return t('page.host.sect.cert_unbound');
});
// 绑定的证书夹条目已不存在时用告警色，别拿绿色标签把这事盖过去
const certSummaryTheme = computed(() => {
  const bindId = formData.value.bind_ssl_id;
  if (bindId && !sslConfigList.value.some((item) => item.id === bindId)) {
    return 'warning';
  }
  return 'success';
});
const sslformData = ref<Record<string, any>>({ ...INITIAL_SSL_DATA });
const sslformEditData = ref<Record<string, any>>({ ...INITIAL_SSL_DATA });

// HTTPS重定向服务器配置
const httpsRedirectConfig = ref({
  enable_https_redirect: '0', // 启用状态: 0-关闭 1-开启
  loading: false,
});

// 判断是否需要显示HTTPS重定向提示：开启SSL + 端口非443 + 重定向服务器未启用
const shouldShowHttpsRedirectTip = computed(
  () => formData.value.ssl === '1' && formData.value.port !== 443 && httpsRedirectConfig.value.enable_https_redirect === '0',
);

const httpsRedirectStatusText = computed(() =>
  httpsRedirectConfig.value.enable_https_redirect === '1'
    ? t('page.host.auto_jump_https.https_redirect_server_on')
    : t('page.host.auto_jump_https.https_redirect_server_off'),
);

watch(
  () => props.value,
  (newVal) => {
    const fd: Record<string, any> = {
      ...JSON.parse(JSON.stringify(newVal)),
      ssl_config_mode: newVal.ssl_config_mode || 'existing',
    };
    // 将数字类型转换为字符串类型，确保不为空时才转换
    fd.ssl = fd.ssl != null ? fd.ssl.toString() : '0';
    fd.start_status = fd.start_status != null ? fd.start_status.toString() : '0';
    fd.unrestricted_port = fd.unrestricted_port != null ? fd.unrestricted_port.toString() : '0';
    fd.is_enable_load_balance = fd.is_enable_load_balance != null ? fd.is_enable_load_balance.toString() : '0';
    fd.load_balance_stage = fd.load_balance_stage != null ? fd.load_balance_stage.toString() : '1';
    fd.auto_jump_https = fd.auto_jump_https != null ? fd.auto_jump_https.toString() : '0';
    fd.disable_http2 = fd.disable_http2 != null ? fd.disable_http2.toString() : '0';
    fd.is_trans_back_domain = fd.is_trans_back_domain != null ? fd.is_trans_back_domain.toString() : '0';
    fd.is_enable_http_auth_base = fd.is_enable_http_auth_base != null ? fd.is_enable_http_auth_base.toString() : '0';
    fd.http_auth_base_type = fd.http_auth_base_type != null ? fd.http_auth_base_type : 'authorization';
    fd.response_time_out = fd.response_time_out != null ? Number(fd.response_time_out) : 60;
    fd.is_enable_response_buffering = fd.is_enable_response_buffering != null ? fd.is_enable_response_buffering.toString() : '1';
    fd.insecure_skip_verify = fd.insecure_skip_verify != null ? fd.insecure_skip_verify.toString() : '0';
    fd.log_only_mode = fd.log_only_mode != null ? fd.log_only_mode.toString() : '0';
    fd.ip_mode = fd.ip_mode === 'proxy' ? 'proxy' : 'nic';
    // 真实IP来源加固字段（向后兼容：空=旧行为取XFF最左）
    fd.ip_source_mode = fd.ip_source_mode || '';
    fd.ip_real_header = fd.ip_real_header || '';
    fd.ip_trust_depth = fd.ip_trust_depth != null ? Number(fd.ip_trust_depth) : 1;
    fd.ip_trust_proxies = fd.ip_trust_proxies || '';
    fd.cdn_provider = fd.cdn_provider || '';
    formData.value = fd;
    // 端口监听表：详情有 resolved_listens 就按它铺行，否则按老规则派生
    initPortRows(newVal);
    // 编辑已有站点且为 cdn_preset 时，加载所选厂商中心库状态
    if (fd.ip_source_mode === 'cdn_preset' && fd.cdn_provider) {
      loadCdnProviderInfo(fd.cdn_provider);
    }

    // 解析防御配置
    if (fd.defense_json) {
      try {
        const defenseData = JSON.parse(fd.defense_json);
        hostDefenseData.value.bot = getOrDefault(defenseData, 'bot', '1');
        hostDefenseData.value.sqli = getOrDefault(defenseData, 'sqli', '1');
        hostDefenseData.value.xss = getOrDefault(defenseData, 'xss', '1');
        hostDefenseData.value.scan = getOrDefault(defenseData, 'scan', '1');
        hostDefenseData.value.rce = getOrDefault(defenseData, 'rce', '1');
        hostDefenseData.value.sensitive = getOrDefault(defenseData, 'sensitive', '1');
        hostDefenseData.value.traversal = getOrDefault(defenseData, 'traversal', '1');
        hostDefenseData.value.owaspset = getOrDefault(defenseData, 'owaspset', '0');
        hostDefenseData.value.ai = getOrDefault(defenseData, 'ai', '0');
      } catch (e) {
        console.error('解析defense_json失败', e);
      }
    }

    // 解析健康检测配置
    if (fd.healthy_json && fd.healthy_json !== '') {
      try {
        const hc = JSON.parse(fd.healthy_json);
        hc.is_enable_healthy = getOrDefault(hc, 'is_enable_healthy', '1');
        hc.fail_count = getOrDefault(hc, 'fail_count', '3');
        hc.success_count = getOrDefault(hc, 'success_count', '3');
        hc.response_time = getOrDefault(hc, 'response_time', '5');
        hc.check_method = getOrDefault(hc, 'check_method', 'GET');
        hc.check_path = getOrDefault(hc, 'check_path', '/');
        hc.expected_codes = getOrDefault(hc, 'expected_codes', '200,');
        healthyConfigData.value = hc;
      } catch (e) {
        console.error('解析healthy_json失败', e);
        healthyConfigData.value = { ...INITIAL_HEALTHY };
      }
    } else {
      healthyConfigData.value = { ...INITIAL_HEALTHY };
    }

    // 解析验证码配置
    if (fd.captcha_json && fd.captcha_json !== '') {
      try {
        const cc = JSON.parse(fd.captcha_json);
        cc.is_enable_captcha = getOrDefault(cc, 'is_enable_captcha', '0');
        cc.path_prefix = getOrDefault(cc, 'path_prefix', '');
        cc.expire_time = getOrDefault(cc, 'expire_time', 24);
        cc.ip_mode = getOrDefault(cc, 'ip_mode', 'nic');
        // 兜底值必须是引擎认得的取值。写 'default' 会存进 captcha_json，
        // 而引擎按验证方式分发挑战页时只认 traditional / capJs，取到别的值就发不出挑战。
        cc.engine_type = getOrDefault(cc, 'engine_type', 'traditional');
        if (cc.cap_js_config == null) {
          cc.cap_js_config = {
            challengeCount: 50,
            challengeSize: 32,
            challengeDifficulty: 4,
            expiresMs: 600000,
            infoTitle: { zh: '验证码验证', en: 'Captcha Verification' },
            infoText: { zh: '请完成以下验证以继续访问', en: 'Please complete the following verification to continue' },
          };
        } else {
          cc.cap_js_config.challengeCount = getOrDefault(cc.cap_js_config, 'challengeCount', 50);
          cc.cap_js_config.challengeSize = getOrDefault(cc.cap_js_config, 'challengeSize', 32);
          cc.cap_js_config.challengeDifficulty = getOrDefault(cc.cap_js_config, 'challengeDifficulty', 4);
          cc.cap_js_config.expiresMs = getOrDefault(cc.cap_js_config, 'expiresMs', 600000);
          if (!cc.cap_js_config.infoTitle) {
            cc.cap_js_config.infoTitle = { zh: '验证码验证', en: 'Captcha Verification' };
          }
          if (!cc.cap_js_config.infoText) {
            cc.cap_js_config.infoText = { zh: '请完成以下验证以继续访问', en: 'Please complete the following verification to continue' };
          }
        }
        captchaConfigData.value = cc;
      } catch (e) {
        console.error('解析captcha_json失败', e);
        captchaConfigData.value = { ...INITIAL_CAPTCHA };
      }
    } else {
      captchaConfigData.value = { ...INITIAL_CAPTCHA };
    }

    // 解析transport配置
    if (fd.transport_json && fd.transport_json !== '') {
      try {
        const tc = JSON.parse(fd.transport_json);
        tc.max_idle_conns = getOrDefault(tc, 'max_idle_conns', INITIAL_TRANSPORT.max_idle_conns);
        tc.max_idle_conns_per_host = getOrDefault(tc, 'max_idle_conns_per_host', INITIAL_TRANSPORT.max_idle_conns_per_host);
        tc.max_conns_per_host = getOrDefault(tc, 'max_conns_per_host', INITIAL_TRANSPORT.max_conns_per_host);
        tc.idle_conn_timeout = getOrDefault(tc, 'idle_conn_timeout', INITIAL_TRANSPORT.idle_conn_timeout);
        tc.tls_handshake_timeout = getOrDefault(tc, 'tls_handshake_timeout', INITIAL_TRANSPORT.tls_handshake_timeout);
        tc.expect_continue_timeout = getOrDefault(tc, 'expect_continue_timeout', INITIAL_TRANSPORT.expect_continue_timeout);
        transportConfigData.value = tc;
      } catch (e) {
        console.error('解析transport_json失败', e);
        transportConfigData.value = { ...INITIAL_TRANSPORT };
      }
    } else {
      transportConfigData.value = { ...INITIAL_TRANSPORT };
    }

    // 解析自定义头信息配置
    if (fd.custom_headers_json && fd.custom_headers_json !== '') {
      try {
        const parsedConfig = JSON.parse(fd.custom_headers_json);
        customHeadersConfigData.value = {
          is_enable_custom_headers: String(parsedConfig.is_enable_custom_headers !== undefined ? parsedConfig.is_enable_custom_headers : 0),
          headers: Array.isArray(parsedConfig.headers) ? parsedConfig.headers : [],
        };
      } catch (e) {
        console.error('解析custom_headers_json失败', e);
        customHeadersConfigData.value = { ...INITIAL_CUSTOM_HEADERS };
      }
    } else {
      customHeadersConfigData.value = { ...INITIAL_CUSTOM_HEADERS };
    }

    // 解析自定义响应头信息配置（兼容旧版扁平 headers 和新版 rules 格式）
    if (fd.custom_response_headers_json && fd.custom_response_headers_json !== '') {
      try {
        const parsedConfig = JSON.parse(fd.custom_response_headers_json);
        const isEnable = String(parsedConfig.is_enable_custom_headers !== undefined ? parsedConfig.is_enable_custom_headers : 0);
        const hasRules = Array.isArray(parsedConfig.rules) && parsedConfig.rules.length > 0;
        const hasHeaders = Array.isArray(parsedConfig.headers) && parsedConfig.headers.length > 0;
        if (hasRules) {
          customResponseHeadersConfigData.value = { is_enable_custom_headers: isEnable, rules: parsedConfig.rules };
        } else if (hasHeaders) {
          customResponseHeadersConfigData.value = {
            is_enable_custom_headers: isEnable,
            rules: [{ rule_name: '全局默认', match_type: 'global', match_value: '', merge_mode: 'merge', headers: parsedConfig.headers }],
          };
        } else {
          customResponseHeadersConfigData.value = { is_enable_custom_headers: isEnable, rules: [] };
        }
      } catch (e) {
        console.error('解析custom_response_headers_json失败', e);
        customResponseHeadersConfigData.value = { ...INITIAL_CUSTOM_RESPONSE_HEADERS };
      }
    } else {
      customResponseHeadersConfigData.value = { ...INITIAL_CUSTOM_RESPONSE_HEADERS };
    }

    // 解析防盗链配置
    if (fd.anti_leech_json && fd.anti_leech_json !== '') {
      try {
        const al = JSON.parse(fd.anti_leech_json);
        al.is_enable_anti_leech = (al.is_enable_anti_leech || 0).toString();
        antiLeechConfigData.value = al;
      } catch {
        antiLeechConfigData.value = { ...INITIAL_ANTILEECH };
      }
    } else {
      antiLeechConfigData.value = { ...INITIAL_ANTILEECH };
    }

    // 解析网站密码访问的时效配置。
    // 空串是存量站点的常态，此时必须落到 INITIAL_HTTP_AUTH（等价现状），不能是空对象——
    // 空对象会让输入框显示空白，用户一保存就把 0 提交上去，等于所有人一登录就掉线。
    if (fd.http_auth_json && fd.http_auth_json !== '') {
      try {
        const ha = JSON.parse(fd.http_auth_json);
        httpAuthConfigData.value = {
          session_ttl: (ha.session_ttl || INITIAL_HTTP_AUTH.session_ttl).toString(),
          idle_timeout: (ha.idle_timeout || 0).toString(),
          // bind_ip 是显式三态：给了 0 就是用户主动关掉，不能当缺省再拉回 1；
          // 但整份 JSON 没这个键时（老配置）必须保持 1
          bind_ip: (ha.bind_ip === undefined || ha.bind_ip === null ? 1 : ha.bind_ip).toString(),
          // 保护范围同理：老配置没有这些键 → 整站(等价现状)；非法值也回落整站，与后端 Decode 口径一致
          path_scope: ha.path_scope === 'include' || ha.path_scope === 'exclude' ? ha.path_scope : 'all',
          paths: typeof ha.paths === 'string' ? ha.paths : '',
          bypass_ip_group: typeof ha.bypass_ip_group === 'string' ? ha.bypass_ip_group : '',
        };
      } catch {
        httpAuthConfigData.value = { ...INITIAL_HTTP_AUTH };
      }
    } else {
      httpAuthConfigData.value = { ...INITIAL_HTTP_AUTH };
    }

    // 解析缓存配置
    if (fd.cache_json && fd.cache_json !== '') {
      try {
        const cd = JSON.parse(fd.cache_json);
        cd.is_enable_cache = (cd.is_enable_cache || 0).toString();
        cd.max_file_size_mb = (cd.max_file_size_mb || 0).toString();
        cd.max_memory_size_mb = (cd.max_memory_size_mb || 0).toString();
        cacheConfigData.value = cd;
      } catch {
        cacheConfigData.value = { ...INITIAL_CACHE };
      }
    } else {
      cacheConfigData.value = { ...INITIAL_CACHE };
    }

    // 解析响应压缩配置
    if (fd.response_compress_json && fd.response_compress_json !== '') {
      try {
        const rc = JSON.parse(fd.response_compress_json);
        responseCompressConfigData.value = {
          is_enable: String(rc.is_enable !== undefined ? rc.is_enable : 0),
          prefer: rc.prefer || INITIAL_RESPONSE_COMPRESS.prefer,
          min_length: String(rc.min_length !== undefined && rc.min_length !== '' ? rc.min_length : INITIAL_RESPONSE_COMPRESS.min_length),
          include_types: rc.include_types != null ? rc.include_types : '',
          include_extensions: rc.include_extensions != null ? rc.include_extensions : '',
          exclude_extensions: rc.exclude_extensions != null ? rc.exclude_extensions : '',
          exclude_paths: rc.exclude_paths != null ? rc.exclude_paths : '',
          compress_when_static_assist: String(rc.compress_when_static_assist !== undefined ? rc.compress_when_static_assist : 0),
        };
      } catch (e) {
        console.error('解析response_compress_json失败', e);
        responseCompressConfigData.value = { ...INITIAL_RESPONSE_COMPRESS };
      }
    } else {
      responseCompressConfigData.value = { ...INITIAL_RESPONSE_COMPRESS };
    }

    // 解析 Cookie 安全保护配置
    if (fd.cookie_security_json && fd.cookie_security_json !== '') {
      try {
        const cs = JSON.parse(fd.cookie_security_json);
        cookieSecurityConfigData.value = {
          is_enable: String(cs.is_enable !== undefined ? cs.is_enable : 0),
          http_only: String(cs.http_only !== undefined ? cs.http_only : 1),
          secure: String(cs.secure !== undefined ? cs.secure : 2),
          same_site: cs.same_site != null ? cs.same_site : 'Lax',
          exclude_cookies: cs.exclude_cookies != null ? cs.exclude_cookies : '',
        };
      } catch (e) {
        console.error('解析cookie_security_json失败', e);
        cookieSecurityConfigData.value = { ...INITIAL_COOKIE_SECURITY };
      }
    } else {
      cookieSecurityConfigData.value = { ...INITIAL_COOKIE_SECURITY };
    }

    // 解析 CSRF 防护配置
    if (fd.csrf_json && fd.csrf_json !== '') {
      try {
        const cf = JSON.parse(fd.csrf_json);
        csrfConfigData.value = {
          is_enable: String(cf.is_enable !== undefined ? cf.is_enable : 0),
          protect_methods:
            cf.protect_methods != null && cf.protect_methods !== ''
              ? String(cf.protect_methods)
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter((s: string) => s)
              : ['POST', 'PUT', 'DELETE', 'PATCH'],
          allowed_origins: cf.allowed_origins != null ? cf.allowed_origins : '',
          allow_empty_ref: String(cf.allow_empty_ref !== undefined ? cf.allow_empty_ref : 1),
          exclude_paths: cf.exclude_paths != null ? cf.exclude_paths : '',
        };
      } catch (e) {
        console.error('解析csrf_json失败', e);
        csrfConfigData.value = { ...INITIAL_CSRF, protect_methods: [...INITIAL_CSRF.protect_methods] };
      }
    } else {
      csrfConfigData.value = { ...INITIAL_CSRF, protect_methods: [...INITIAL_CSRF.protect_methods] };
    }

    // 解析统一访问认证(Access 模式)配置
    // 空值必须落在 mode="0"(继承全局)：存量站点的 access_json 是空的，
    // 若误落成强制开启，用户升级后整站会立刻要求登录。
    if (fd.access_json && fd.access_json !== '') {
      try {
        const ac = JSON.parse(fd.access_json);
        accessConfigData.value = {
          mode: String(ac.mode !== undefined ? ac.mode : 0),
          exclude_paths: ac.exclude_paths != null ? ac.exclude_paths : '',
          require_otp: String(ac.require_otp !== undefined ? ac.require_otp : 0),
          unauth_action: ac.unauth_action != null ? ac.unauth_action : '',
          allow_ip_group_code: ac.allow_ip_group_code != null ? ac.allow_ip_group_code : '',
          cors_allow_origins: ac.cors_allow_origins != null ? ac.cors_allow_origins : '',
          cors_allow_methods: ac.cors_allow_methods != null ? ac.cors_allow_methods : '',
          cors_allow_headers: ac.cors_allow_headers != null ? ac.cors_allow_headers : '',
          cors_max_age: ac.cors_max_age != null ? ac.cors_max_age : 0,
        };
      } catch (e) {
        console.error('解析access_json失败', e);
        accessConfigData.value = { ...INITIAL_ACCESS };
      }
    } else {
      accessConfigData.value = { ...INITIAL_ACCESS };
    }

    // 解析网页防篡改配置
    if (fd.tamper_json && fd.tamper_json !== '') {
      try {
        const tp = JSON.parse(fd.tamper_json);
        tamperConfigData.value = {
          is_enable: String(tp.is_enable !== undefined ? tp.is_enable : 0),
          action: tp.action || 'replace',
          max_size_kb: tp.max_size_kb !== undefined ? tp.max_size_kb : 1024,
        };
      } catch (e) {
        console.error('解析tamper_json失败', e);
        tamperConfigData.value = { ...INITIAL_TAMPER };
      }
    } else {
      tamperConfigData.value = { ...INITIAL_TAMPER };
    }

    // 解析文件上传内容检测配置
    if (fd.upload_security_json && fd.upload_security_json !== '') {
      try {
        const up = JSON.parse(fd.upload_security_json);
        uploadSecurityConfigData.value = {
          is_enable: String(up.is_enable !== undefined ? up.is_enable : 0),
          check_ext: String(up.check_ext !== undefined ? up.check_ext : 0),
          ext_blacklist: up.ext_blacklist || '',
          check_content: String(up.check_content !== undefined ? up.check_content : 0),
          check_magic: String(up.check_magic !== undefined ? up.check_magic : 0),
          check_size: String(up.check_size !== undefined ? up.check_size : 0),
          max_size_kb: up.max_size_kb !== undefined ? up.max_size_kb : 10240,
          over_limit_action: up.over_limit_action || 'block',
          include_paths: up.include_paths || '',
          exclude_paths: up.exclude_paths || '',
        };
      } catch (e) {
        console.error('解析upload_security_json失败', e);
        uploadSecurityConfigData.value = { ...INITIAL_UPLOAD_SECURITY };
      }
    } else {
      uploadSecurityConfigData.value = { ...INITIAL_UPLOAD_SECURITY };
    }

    // 解析静态网站配置
    if (fd.static_site_json && fd.static_site_json !== '') {
      try {
        const ss = JSON.parse(fd.static_site_json);
        ss.is_enable_static_site = (ss.is_enable_static_site || 0).toString();
        ss.sensitive_paths = ss.sensitive_paths || '';
        ss.sensitive_extensions = ss.sensitive_extensions || '';
        ss.allowed_extensions = ss.allowed_extensions || '';
        ss.sensitive_patterns = ss.sensitive_patterns || '';
        ss.security_headers =
          ss.security_headers && ss.security_headers.length > 0 ? ss.security_headers : JSON.parse(JSON.stringify(DEFAULT_STATIC_SECURITY_HEADERS));
        staticSiteConfigData.value = ss;
      } catch {
        staticSiteConfigData.value = { ...INITIAL_STATIC_SITE };
      }
    } else {
      staticSiteConfigData.value = { ...INITIAL_STATIC_SITE };
    }
  },
  { immediate: true, deep: true },
);

// 主机名变化时自动同步 remote_host（仅新增模式）
watch(
  () => formData.value.host,
  (val) => {
    const hostRegex = /^(?!https?:\/\/)[^\s]+$/;
    const isValid = !!val && hostRegex.test(val);
    if (isValid && !props.isEdit) {
      const currentProtocol = formData.value.remote_host && formData.value.remote_host.startsWith('https://') ? 'https://' : 'http://';
      if (val.includes(':') && !val.startsWith('[')) {
        formData.value.remote_host = `${currentProtocol}[${val}]`;
      } else {
        formData.value.remote_host = `${currentProtocol}${val}`;
      }
    }
  },
);

// 监听SSL状态变化，自动设置端口和重置SSL配置模式
watch(
  () => formData.value.ssl,
  (newVal, oldVal) => {
    // 新增模式下切换 SSL 时按老 UX 联动端口行：开SSL默认 443:https + 80:http，关SSL退回 80:http
    if (!props.isEdit && oldVal !== undefined && newVal !== oldVal) {
      formData.value.ssl_config_mode = 'existing';
      const main = portRows.value[0];
      if (newVal === '1') {
        if (main && (!main.port || main.port === 80)) {
          main.port = 443;
        }
        // 主端口协议随 SSL 开关联动（复刻老版本"开 SSL 即整站 https"，非 80/443 主端口也生效）
        if (main) {
          main.proto = 'https';
        }
        // 默认补一行 80:HTTP 供证书文件验证(http01)用；用户取消过勾选就不再自动补
        syncAcmePort80();
      } else if (newVal === '0') {
        if (main && main.port === 443) {
          main.port = 80;
        }
        if (main) {
          main.proto = 'http';
        }
        const idx80 = portRows.value.findIndex((r, i) => i > 0 && Number(r.port) === 80 && r.proto === 'http');
        if (idx80 > 0) {
          portRows.value.splice(idx80, 1);
        }
      }
      onPortRowsChanged();
    }
  },
);

// 监听HTTP认证开关状态，自动生成路径
watch(
  () => formData.value.is_enable_http_auth_base,
  (newVal, oldVal) => {
    if (newVal === '1' && oldVal === '0' && !formData.value.http_auth_path_prefix) {
      generateHttpAuthPath();
    }
  },
);

// 获取HTTPS重定向服务器配置
async function getHttpsRedirectConfig() {
  try {
    const res = await get_detail_by_item_api({ item: 'enable_https_redirect' });
    if (res.code === 0 && res.data) {
      httpsRedirectConfig.value.enable_https_redirect = res.data.value || '0';
    }
  } catch (e) {
    console.log('获取HTTPS重定向配置失败:', e);
  }
}

// 启用HTTPS重定向服务器
async function enableHttpsRedirect() {
  httpsRedirectConfig.value.loading = true;
  try {
    const res = await edit_system_config_by_item_api({ item: 'enable_https_redirect', value: '1' });
    if (res.code === 0) {
      httpsRedirectConfig.value.enable_https_redirect = '1';
      MessagePlugin.success(t('page.host.auto_jump_https.enable_success'));
    } else {
      MessagePlugin.error(res.msg || t('page.host.auto_jump_https.enable_failed'));
    }
  } catch (e) {
    console.log('启用HTTPS重定向服务器失败:', e);
    MessagePlugin.error(t('page.host.auto_jump_https.enable_failed'));
  } finally {
    httpsRedirectConfig.value.loading = false;
  }
}

function getSslFolderList() {
  sslConfigListApi({ pageSize: 10000, remarks: '', code: '' })
    .then((res) => {
      if (res.code === 0) {
        // 证书夹为空时后端返回 list:null，直接赋值会让 certSummary/sslOptions 在渲染中抛错，
        // 整个弹窗从此不再更新（表现为点哪都没反应）
        sslConfigList.value = res.data.list || [];
      }
    })
    .catch((e: Error) => {
      console.log(e);
    });
}

// 处理SSL选择变更：本地直接填充证书内容
function handleSslChange(value: any) {
  const selectedSsl = sslConfigList.value.find((item) => item.id === value);
  if (selectedSsl) {
    formData.value.certfile = selectedSsl.cert_content;
    formData.value.keyfile = selectedSsl.key_content;
  }
}

function handleAddNewSsl() {
  addSSLFormVisible.value = true;
  sslformData.value = { ...INITIAL_SSL_DATA };
}

function handleEditSsl() {
  if (formData.value.bind_ssl_id === '') {
    MessagePlugin.warning(t('page.host.bind_empty_ssl_tips'));
    return;
  }
  const sslConfigItem = sslConfigList.value.find((item) => item.id === formData.value.bind_ssl_id);
  if (!sslConfigItem) {
    MessagePlugin.warning(t('page.host.ssl_not_found_tips'));
    return;
  }
  sslformEditData.value = { ...sslConfigItem };
  editSSLFormVisible.value = true;
}

function onSSLSubmit(data: { result: Record<string, any> }) {
  sslConfigAddApi({ ...data.result }).then((res) => {
    if (res.code === 0) {
      getSslFolderList();
      MessagePlugin.success(t('common.save') + ' OK');
      addSSLFormVisible.value = false;
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

function onSSLSubmitEdit(data: { result: Record<string, any> }) {
  sslConfigEditApi({ ...data.result }).then((res) => {
    if (res.code === 0) {
      getSslFolderList();
      MessagePlugin.success(t('common.save') + ' OK');
      editSSLFormVisible.value = false;
    } else {
      MessagePlugin.warning(res.msg);
    }
  });
}

// 生成随机HTTP认证路径前缀，格式: /_waf_{8位随机字符}
function generateHttpAuthPath() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomStr = '';
  for (let i = 0; i < 8; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  formData.value.http_auth_path_prefix = `/_waf_${randomStr}`;
  MessagePlugin.success(t('page.host.generate_path_success'));
}

// 表单提交
const onSubmit: FormProps['onSubmit'] = ({ validateResult, firstError }) => {
  if (validateResult === true) {
    const postdata: Record<string, any> = { ...formData.value };

    // 处理主机名
    postdata.host = postdata.host.toLowerCase();
    if (postdata.host.indexOf('http://') >= 0 || postdata.host.indexOf('https://') >= 0) {
      MessagePlugin.warning(t('page.host.host_rule_msg'));
      return;
    }
    // 只有当remote_host为空时才自动设置
    if (!postdata.remote_host || postdata.remote_host === '') {
      postdata.remote_host = `http://${postdata.host}`;
    }

    // 转换字符串为数字
    postdata.ssl = Number(postdata.ssl);
    postdata.start_status = Number(postdata.start_status);
    postdata.unrestricted_port = Number(postdata.unrestricted_port);
    postdata.is_enable_load_balance = Number(postdata.is_enable_load_balance);
    postdata.load_balance_stage = Number(postdata.load_balance_stage);
    postdata.auto_jump_https = Number(postdata.auto_jump_https);
    postdata.disable_http2 = Number(postdata.disable_http2);
    postdata.is_trans_back_domain = Number(postdata.is_trans_back_domain);
    postdata.is_enable_http_auth_base = Number(postdata.is_enable_http_auth_base);
    postdata.response_time_out = Number(postdata.response_time_out);
    postdata.is_enable_response_buffering = Number(postdata.is_enable_response_buffering);
    postdata.insecure_skip_verify = Number(postdata.insecure_skip_verify);
    postdata.log_only_mode = Number(postdata.log_only_mode);

    if (!postdata.ip_mode) {
      postdata.ip_mode = 'nic';
    }

    if (postdata.ssl === 0) {
      postdata.bind_ssl_id = '';
      postdata.certfile = '';
      postdata.keyfile = '';
    }

    // 端口监听表：编辑态没动过端口区就不携带该字段，库里保持空值=按老规则派生（升级零影响）
    if (!props.isEdit || portRowsDirty.value) {
      // 主端口(第一行)不允许为空：清空后提交会把第一个副端口静默提升为主端口
      if (!portRows.value.length || !portRows.value[0].port) {
        MessagePlugin.warning(t('page.host.port_listen.main_required'));
        return;
      }
      const rows = portRows.value.filter((r) => r.port);
      if (rows.length > 32) {
        MessagePlugin.warning(t('page.host.port_listen.too_many'));
        return;
      }
      const seenPorts: Record<number, boolean> = {};
      for (const r of rows) {
        const p = Number(r.port);
        if (seenPorts[p]) {
          MessagePlugin.warning(`${t('page.host.port_listen.dup_port')}: ${p}`);
          return;
        }
        seenPorts[p] = true;
      }
      if (rows.some((r) => r.proto === 'https') && postdata.ssl !== 1) {
        MessagePlugin.warning(t('page.host.port_listen.https_need_ssl'));
        return;
      }
      // 主端口=第一行；副端口双写回 bind_more_port（老路径与老版本回滚兼容）
      postdata.port = Number(rows[0].port);
      postdata.bind_more_port = rows
        .slice(1)
        .map((r) => String(r.port))
        .join(',');
      postdata.port_listens_json = buildPortListensJson();
    } else {
      delete postdata.port_listens_json;
    }
    delete postdata.resolved_listens;

    // 处理防御配置
    postdata.defense_json = JSON.stringify({
      bot: parseInt(hostDefenseData.value.bot),
      sqli: parseInt(hostDefenseData.value.sqli),
      xss: parseInt(hostDefenseData.value.xss),
      scan: parseInt(hostDefenseData.value.scan),
      rce: parseInt(hostDefenseData.value.rce),
      sensitive: parseInt(hostDefenseData.value.sensitive),
      traversal: parseInt(hostDefenseData.value.traversal),
      owaspset: parseInt(hostDefenseData.value.owaspset),
      ai: parseInt(hostDefenseData.value.ai),
    });

    // 处理健康检测配置
    postdata.healthy_json = JSON.stringify({
      is_enable_healthy: parseInt(healthyConfigData.value.is_enable_healthy),
      fail_count: parseInt(healthyConfigData.value.fail_count),
      success_count: parseInt(healthyConfigData.value.success_count),
      response_time: parseInt(healthyConfigData.value.response_time),
      check_method: healthyConfigData.value.check_method,
      check_path: healthyConfigData.value.check_path,
      expected_codes: healthyConfigData.value.expected_codes,
    });

    // 处理验证码配置
    // ⚠️ 这是一张白名单：验证码配置新增字段必须同时加进来，
    // 漏了的话界面上填得进去、保存也不报错，但值根本没进后端——静默丢弃。
    postdata.captcha_json = JSON.stringify({
      is_enable_captcha: parseInt(captchaConfigData.value.is_enable_captcha),
      path_prefix: captchaConfigData.value.path_prefix || '',
      exclude_urls: captchaConfigData.value.exclude_urls,
      expire_time: captchaConfigData.value.expire_time,
      ip_mode: captchaConfigData.value.ip_mode,
      engine_type: captchaConfigData.value.engine_type,
      contact_info: captchaConfigData.value.contact_info || '',
      cap_js_config: captchaConfigData.value.cap_js_config,
    });

    // 处理防盗链配置
    postdata.anti_leech_json = JSON.stringify({
      is_enable_anti_leech: parseInt(antiLeechConfigData.value.is_enable_anti_leech),
      file_types: antiLeechConfigData.value.file_types,
      valid_referers: antiLeechConfigData.value.valid_referers,
      action: antiLeechConfigData.value.action,
      redirect_url: antiLeechConfigData.value.redirect_url,
    });

    // 处理缓存配置
    postdata.cache_json = JSON.stringify({
      is_enable_cache: parseInt(cacheConfigData.value.is_enable_cache),
      cache_location: cacheConfigData.value.cache_location,
      cache_dir: cacheConfigData.value.cache_dir,
      max_file_size_mb: parseFloat(cacheConfigData.value.max_file_size_mb),
      max_memory_size_mb: parseFloat(cacheConfigData.value.max_memory_size_mb),
    });

    // 处理网站密码访问的时效配置
    // ⚠️ 同样是一张白名单：新增字段必须同时加进来，漏了就是静默丢弃。
    // session_ttl 兜底 1440 而不是 0：0 会让后端按「非法值」回落，虽然结果一样，
    // 但页面上留个 0 让人以为设成了「永不过期」，实际是 24 小时。
    // 范围类字段同理兜底：非法值回落 all，交给后端按整站处理
    let httpAuthPathScope = httpAuthConfigData.value.path_scope;
    if (httpAuthPathScope !== 'include' && httpAuthPathScope !== 'exclude') {
      httpAuthPathScope = 'all';
    }
    // 选了按路径开启却没填路径：拦在保存前。后端虽然会按整站 fail-closed，
    // 但那和用户在页面上看到的意图不一致，静默改语义不如明说
    if (httpAuthPathScope !== 'all' && !(httpAuthConfigData.value.paths || '').trim()) {
      MessagePlugin.warning(t('page.host.http_auth_paths_required'));
      return;
    }
    // 上限与后端 BuildPathPatterns 的截断一致（50 条、每条 256 字符），
    // 超限提示而不是静默截断，避免用户以为配了实际没生效
    const httpAuthPathLines = (httpAuthConfigData.value.paths || '')
      .split(/[\n,]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s !== '');
    if (httpAuthPathLines.length > 50) {
      MessagePlugin.warning(t('page.host.http_auth_paths_too_many'));
      return;
    }
    if (httpAuthPathLines.some((s: string) => s.length > 256)) {
      MessagePlugin.warning(t('page.host.http_auth_paths_too_long'));
      return;
    }
    postdata.http_auth_json = JSON.stringify({
      session_ttl: parseInt(httpAuthConfigData.value.session_ttl, 10) || 1440,
      idle_timeout: parseInt(httpAuthConfigData.value.idle_timeout, 10) || 0,
      bind_ip: parseInt(httpAuthConfigData.value.bind_ip, 10) || 0,
      path_scope: httpAuthPathScope,
      paths: httpAuthConfigData.value.paths || '',
      bypass_ip_group: httpAuthConfigData.value.bypass_ip_group || '',
    });

    // 处理响应压缩配置
    postdata.response_compress_json = JSON.stringify({
      is_enable: parseInt(responseCompressConfigData.value.is_enable, 10) || 0,
      prefer: responseCompressConfigData.value.prefer || 'br_first',
      min_length: parseInt(responseCompressConfigData.value.min_length, 10) || 256,
      include_types: responseCompressConfigData.value.include_types || '',
      include_extensions: responseCompressConfigData.value.include_extensions || '',
      exclude_extensions: responseCompressConfigData.value.exclude_extensions || '',
      exclude_paths: responseCompressConfigData.value.exclude_paths || '',
      compress_when_static_assist: parseInt(responseCompressConfigData.value.compress_when_static_assist, 10) || 0,
    });

    // 处理 Cookie 安全保护配置
    postdata.cookie_security_json = JSON.stringify({
      is_enable: parseInt(cookieSecurityConfigData.value.is_enable, 10) || 0,
      http_only: parseInt(cookieSecurityConfigData.value.http_only, 10) || 0,
      secure: parseInt(cookieSecurityConfigData.value.secure, 10) || 0,
      same_site: cookieSecurityConfigData.value.same_site || '',
      exclude_cookies: cookieSecurityConfigData.value.exclude_cookies || '',
    });

    // 处理 CSRF 防护配置
    postdata.csrf_json = JSON.stringify({
      is_enable: parseInt(csrfConfigData.value.is_enable, 10) || 0,
      protect_methods: Array.isArray(csrfConfigData.value.protect_methods)
        ? csrfConfigData.value.protect_methods.join(',')
        : csrfConfigData.value.protect_methods || 'POST,PUT,DELETE,PATCH',
      allowed_origins: csrfConfigData.value.allowed_origins || '',
      allow_empty_ref: parseInt(csrfConfigData.value.allow_empty_ref, 10) || 0,
      exclude_paths: csrfConfigData.value.exclude_paths || '',
    });

    // 处理统一访问认证(Access 模式)配置
    postdata.access_json = JSON.stringify({
      mode: parseInt(accessConfigData.value.mode, 10) || 0,
      exclude_paths: accessConfigData.value.exclude_paths || '',
      require_otp: parseInt(accessConfigData.value.require_otp, 10) || 0,
      unauth_action: accessConfigData.value.unauth_action || '',
      allow_ip_group_code: accessConfigData.value.allow_ip_group_code || '',
      // 新增字段务必同步加在这里：本对象是白名单式序列化，
      // 漏一个就等于每次保存站点都把它悄悄清掉
      cors_allow_origins: accessConfigData.value.cors_allow_origins || '',
      cors_allow_methods: accessConfigData.value.cors_allow_methods || '',
      cors_allow_headers: accessConfigData.value.cors_allow_headers || '',
      cors_max_age: parseInt(accessConfigData.value.cors_max_age, 10) || 0,
    });

    // 处理网页防篡改配置
    postdata.tamper_json = JSON.stringify({
      is_enable: parseInt(tamperConfigData.value.is_enable, 10) || 0,
      action: tamperConfigData.value.action || 'replace',
      max_size_kb: parseInt(tamperConfigData.value.max_size_kb, 10) || 1024,
    });

    // 处理文件上传内容检测配置
    postdata.upload_security_json = JSON.stringify({
      is_enable: parseInt(uploadSecurityConfigData.value.is_enable, 10) || 0,
      check_ext: parseInt(uploadSecurityConfigData.value.check_ext, 10) || 0,
      ext_blacklist: uploadSecurityConfigData.value.ext_blacklist || '',
      check_content: parseInt(uploadSecurityConfigData.value.check_content, 10) || 0,
      check_magic: parseInt(uploadSecurityConfigData.value.check_magic, 10) || 0,
      check_size: parseInt(uploadSecurityConfigData.value.check_size, 10) || 0,
      max_size_kb: parseInt(uploadSecurityConfigData.value.max_size_kb, 10) || 10240,
      over_limit_action: uploadSecurityConfigData.value.over_limit_action || 'block',
      include_paths: uploadSecurityConfigData.value.include_paths || '',
      exclude_paths: uploadSecurityConfigData.value.exclude_paths || '',
    });

    // 处理静态网站配置
    postdata.static_site_json = JSON.stringify({
      is_enable_static_site: parseInt(staticSiteConfigData.value.is_enable_static_site),
      static_site_path: staticSiteConfigData.value.static_site_path,
      static_site_prefix: staticSiteConfigData.value.static_site_prefix,
      sensitive_paths: staticSiteConfigData.value.sensitive_paths,
      sensitive_extensions: staticSiteConfigData.value.sensitive_extensions,
      allowed_extensions: staticSiteConfigData.value.allowed_extensions,
      sensitive_patterns: staticSiteConfigData.value.sensitive_patterns,
      security_headers: staticSiteConfigData.value.security_headers,
    });

    // 处理transport配置
    postdata.transport_json = JSON.stringify({
      max_idle_conns: parseInt(transportConfigData.value.max_idle_conns || INITIAL_TRANSPORT.max_idle_conns),
      max_idle_conns_per_host: parseInt(transportConfigData.value.max_idle_conns_per_host || INITIAL_TRANSPORT.max_idle_conns_per_host),
      idle_conn_timeout: parseInt(transportConfigData.value.idle_conn_timeout || INITIAL_TRANSPORT.idle_conn_timeout),
      tls_handshake_timeout: parseInt(transportConfigData.value.tls_handshake_timeout || INITIAL_TRANSPORT.tls_handshake_timeout),
      expect_continue_timeout: parseInt(transportConfigData.value.expect_continue_timeout || INITIAL_TRANSPORT.expect_continue_timeout),
      max_conns_per_host: parseInt(transportConfigData.value.max_conns_per_host || INITIAL_TRANSPORT.max_conns_per_host),
    });

    // 自定义头信息配置
    postdata.custom_headers_json = JSON.stringify({
      is_enable_custom_headers: parseInt(customHeadersConfigData.value.is_enable_custom_headers || INITIAL_CUSTOM_HEADERS.is_enable_custom_headers),
      headers: customHeadersConfigData.value.headers || [],
    });

    // 自定义响应头信息配置（V2 rules 格式，兼容旧版 headers 字段）
    const crConfig = customResponseHeadersConfigData.value || {};
    let crRules = crConfig.rules || [];
    if (crRules.length === 0 && Array.isArray(crConfig.headers) && crConfig.headers.length > 0) {
      crRules = [{ rule_name: '全局默认', match_type: 'global', match_value: '', merge_mode: 'merge', headers: crConfig.headers }];
    }
    postdata.custom_response_headers_json = JSON.stringify({
      is_enable_custom_headers: parseInt(crConfig.is_enable_custom_headers || INITIAL_CUSTOM_RESPONSE_HEADERS.is_enable_custom_headers),
      rules: crRules,
    });

    emit('submit', { result: postdata });
  } else if (firstError) {
    MessagePlugin.warning(firstError);
  }
};

getSslFolderList();
getHttpsRedirectConfig();

// 每次打开弹窗都重新拉一次证书夹：组件只创建一次，
// 期间在证书申请/证书夹页面新增的证书，不刷新的话这里永远看不到
watch(
  () => props.dialogVisible,
  (val) => {
    // 打开/关闭都清空健康检测手动测试结果并取消在途请求
    resetHealthTest();
    if (val) {
      getSslFolderList();
      // 免密IP组同理：IP组页面新建的组，这里也要能看到；失败静默不影响其它配置
      wafIPGroupOptionsApi()
        .then((res: any) => {
          if (res.code === 0) ipGroupOptions.value = res.data ?? [];
        })
        .catch(() => {});
    }
  },
);
</script>

<style scoped>
.hg-form-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
}

.hg-form-new {
  margin-left: 10px;
  font-size: 12px;
  color: var(--td-brand-color);
  cursor: pointer;
}

.hg-form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.hg-form-colors {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  height: 32px;
}

.hg-form-colors i {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  display: inline-block;
}

.hg-form-colors i.on {
  border-color: var(--td-text-color-primary);
}

/* 切换 Tab 布局按钮独占一行、右对齐，避免遮挡标签或内容 */
.tab-placement-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 2px;
}
/* 竖向布局：限制整体高度，左侧导航与右侧内容各自独立滚动；
   否则导航过长会把弹窗撑高，切换靠下的 Tab 时内容在顶部，看起来像空的 */
.host-tabs-wrapper--left :deep(.t-tabs__header),
.host-tabs-wrapper--left :deep(.t-tabs__content) {
  max-height: 65vh;
  overflow-y: auto;
  /* 滚动条平时隐藏、悬停才显示，避免左右两根粗滚动条并排刺眼 */
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
/* 全屏时弹窗 body 与 Tab 内容是两个高度不同的滚动容器，滚到内层尽头会接力滚外层，
   视觉上就是画面上下抖。全屏下把 Tab 撑到与 body 同高，只留一个滚动容器。 */
.host-tabs-wrapper--left.host-tabs-wrapper--fullscreen :deep(.t-tabs__header),
.host-tabs-wrapper--left.host-tabs-wrapper--fullscreen :deep(.t-tabs__content) {
  max-height: calc(96vh - 200px);
}
.host-tabs-wrapper--left :deep(.t-tabs__header:hover),
.host-tabs-wrapper--left :deep(.t-tabs__content:hover) {
  scrollbar-color: rgba(0, 0, 0, 0.25) transparent;
}
.host-tabs-wrapper--left :deep(.t-tabs__header)::-webkit-scrollbar,
.host-tabs-wrapper--left :deep(.t-tabs__content)::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.host-tabs-wrapper--left :deep(.t-tabs__header)::-webkit-scrollbar-thumb,
.host-tabs-wrapper--left :deep(.t-tabs__content)::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
}
.host-tabs-wrapper--left :deep(.t-tabs__header:hover)::-webkit-scrollbar-thumb,
.host-tabs-wrapper--left :deep(.t-tabs__content:hover)::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.25);
}
.host-tabs-wrapper--left :deep(.t-tabs__header)::-webkit-scrollbar-track,
.host-tabs-wrapper--left :deep(.t-tabs__content)::-webkit-scrollbar-track,
.host-tabs-wrapper--left :deep(.t-tabs__header)::-webkit-scrollbar-button,
.host-tabs-wrapper--left :deep(.t-tabs__content)::-webkit-scrollbar-button {
  display: none;
}

.ip-source-block {
  /* t-form-item 内容区是 flex 行，这里独占一整行并让内部元素纵向排布 */
  flex: 1 1 100%;
  min-width: 0;
  width: 100%;
}
.ip-source-scope {
  margin-top: 8px;
  max-width: 620px;
}
.ip-probe-entry {
  margin-top: 4px;
}

.backend-host-help-text {
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.backend-host-help-text p {
  margin: 0 0 4px;
}
.host-form-ip-mode-help-icon {
  margin-left: 6px;
  vertical-align: middle;
  cursor: help;
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.55));
}

.limit-mode-desc {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 4px;
}

/* ===== 端口监听表（issue #955） ===== */
.port-listen-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 100%;
}
.port-listen-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  max-width: 100%;
}
/* 行内每个控件都必须 flex:none：否则 radio-group 被压缩到放不下两个选项，
   看上去就成了"只有一个按钮、切换没反应" */
.port-listen-row > * {
  flex: none;
}
/* 表头：列名替代原先压在下方的长段说明，宽度必须与下面数据行逐列对齐 */
.port-listen-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--td-text-color-placeholder);
  margin-bottom: 2px;
}
.port-listen-head > * {
  flex: none;
}
.port-listen-mainflag {
  width: 28px;
  display: inline-flex;
}
/* 标签收到 150px 后内容区约 570px，整行(端口+协议+IP版本+删除)合计约 470px 仍留有余量；
   若以后再加列，仍要以"内容区宽度"为上限校核，否则最右的删除按钮会被挤出可视区 */
.port-listen-num {
  width: 116px;
}
.port-listen-ipv {
  width: 130px;
}
/* 协议列定宽并让两个分段按钮均分，表头列名才能和它对齐 */
.port-listen-proto {
  width: 136px;
  display: flex;
}
.port-listen-proto :deep(.t-radio-button) {
  flex: 1;
  justify-content: center;
  padding: 0;
}
/* 「添加端口」与两个勾选项同一行 */
.port-listen-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 2px;
}
.port-listen-acme80 {
  display: inline-flex;
  align-items: center;
}
.port-listen-hint {
  font-size: 12px;
  line-height: 1.7;
  color: var(--td-text-color-placeholder);
}
.port-listen-hint-err {
  color: var(--td-error-color);
}
.port-listen-hint-warn {
  color: var(--td-warning-color);
}

/* ===== 「基础内容」分节 ===== */
.hf-sect {
  margin-bottom: 18px;
}
.hf-sect-last {
  margin-bottom: 0;
}
.hf-sect-title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 14px;
  padding-bottom: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--td-text-color-secondary);
  border-bottom: 1px solid var(--td-component-stroke);
}
.hf-sect-title::before {
  content: "";
  flex: none;
  width: 3px;
  height: 12px;
  border-radius: 2px;
  background: var(--td-brand-color);
}
.hf-sect-title small {
  font-weight: 400;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
.hf-sect-title .hf-sect-extra {
  margin-left: auto;
  font-weight: 400;
}
/* 后端IP + 后端端口 并排：两者仍是各自独立的 form-item，校验红字才能各归各位 */
.hf-inline-pair {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
}
</style>
