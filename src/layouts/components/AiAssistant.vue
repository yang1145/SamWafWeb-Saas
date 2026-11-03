<template>
  <div>
    <t-drawer v-model:visible="aiChatBoxVisible" :close-btn="true" size="560px" class="ai-chat-drawer">
      <template #header>
        <div class="chat-header">
          <span class="chat-header-title">{{ t('page.gpt.assistant') }}</span>
          <span v-if="sceneLabel" class="chat-header-scene">{{ sceneLabel }}</span>
          <div class="chat-header-ops">
            <div v-if="canUseAIAssistant" class="mode-switch">
              <t-button
                variant="text"
                size="small"
                :theme="configMode ? 'default' : 'primary'"
                :disabled="isStreaming"
                @click="switchMode('chat')"
              >
                {{ t('page.gpt.mode_chat') }}
              </t-button>
              <t-tooltip :content="t('page.gpt.mode_config_tip')">
                <t-button
                  variant="text"
                  size="small"
                  :theme="configMode ? 'primary' : 'default'"
                  :disabled="isStreaming"
                  @click="switchMode('config')"
                >
                  {{ t('page.gpt.mode_config') }}
                </t-button>
              </t-tooltip>
            </div>
            <t-tooltip :content="t('page.gpt.clear_chat')">
              <t-button
                variant="text"
                shape="square"
                size="small"
                :disabled="questionList.length === 0 || isStreaming"
                @click="clearMessage"
              >
                <clear-icon />
              </t-button>
            </t-tooltip>
            <t-tooltip v-if="isPlatform" :content="t('page.gpt.config.entry')">
              <t-button variant="text" shape="square" size="small" @click="gptConfigVisible = true">
                <setting-icon />
              </t-button>
            </t-tooltip>
          </div>
        </div>
      </template>

      <div ref="chatContainer" class="chat-container">
        <!-- 检测中：先不给结论，避免闪一下"未配置" -->
        <div v-if="gptChecking && !gptChecked" class="gpt-checking">{{ t('page.gpt.checking') }}</div>

        <!-- 未配置密钥：不给空白框，直接引导去配置 -->
        <div v-else-if="gptChecked && !gptHasToken" class="gpt-unset">
          <error-circle-icon class="gpt-unset-icon" />
          <div class="gpt-unset-title">{{ t('page.gpt.unset_title') }}</div>
          <div class="gpt-unset-desc">{{ isPlatform ? t('page.gpt.unset_desc') : t('page.gpt.unset_desc_tenant') }}</div>
          <t-button v-if="isPlatform" theme="primary" @click="gptConfigVisible = true">{{ t('page.gpt.unset_action') }}</t-button>
          <div class="gpt-unset-hint">{{ isPlatform ? t('page.gpt.unset_hint') : t('page.gpt.unset_hint_tenant') }}</div>
        </div>

        <!-- 空态：告诉用户这里能问什么，点一下就能开聊 -->
        <div v-else-if="questionList.length === 0" class="chat-welcome">
          <div class="welcome-avatar"><logo-android-icon /></div>
          <div class="welcome-title">
            {{ configMode ? t('page.gpt.config_welcome_title') : t('page.gpt.welcome_title') }}
          </div>
          <div class="welcome-desc">
            {{ configMode ? t('page.gpt.config_welcome_desc') : t('page.gpt.welcome_desc') }}
          </div>
          <div class="welcome-suggest-title">{{ t('page.gpt.suggest_title') }}</div>
          <div class="suggest-list">
            <div v-for="(s, sIndex) in suggestions" :key="sIndex" class="suggest-item" @click="useSuggestion(s)">
              <div class="suggest-main">
                <div class="suggest-label">{{ s.label }}</div>
                <div class="suggest-q">{{ s.q }}</div>
              </div>
              <chevron-right-icon class="suggest-arrow" />
            </div>
          </div>
          <!-- 模型本身不能联网，留个文档入口给用户自己查（未配置文档站时隐藏） -->
          <div v-if="docUrl" class="welcome-links">
            <t-link theme="primary" hover="color" size="small" :href="docUrl" target="_blank" rel="noopener noreferrer">
              {{ t('page.gpt.link_doc') }}
            </t-link>
          </div>
          <div class="welcome-foot">{{ t('page.gpt.welcome_foot') }}</div>
        </div>

        <template v-else>
          <div v-for="(item, index) in questionList" :key="index" class="message-wrapper" :class="item.role">
            <div class="message-bubble">
              <div class="avatar">
                <user-icon v-if="item.role === 'user'" />
                <logo-android-icon v-else />
              </div>
              <div class="content">
                <!-- 等待首字时给个打字动画，别让用户对着空框猜 -->
                <div v-if="item.loading && !item.content" class="text typing">
                  <span></span><span></span><span></span>
                </div>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div v-else class="text" v-html="convertMarkdown(item.content)"></div>
                <!-- 配置助手：AI 执行的工具回执 -->
                <div
                  v-if="item.role === 'assistant' && item.toolTraces && item.toolTraces.length && !item.loading"
                  class="tool-traces"
                >
                  <div class="tool-traces-title">{{ t('page.gpt.tool_trace_title') }}（{{ item.toolTraces.length }}）</div>
                  <div v-for="(tr, trIndex) in item.toolTraces" :key="trIndex" class="tool-trace-item">
                    <span class="tool-trace-dot" :class="tr.ok ? 'ok' : 'fail'"></span>
                    <span class="tool-trace-name">{{ tr.tool }}</span>
                    <span class="tool-trace-summary">{{ tr.summary }}</span>
                  </div>
                </div>
                <!-- 配置助手：待确认变更草案卡片 -->
                <div v-if="item.drafts && item.drafts.length && !item.loading" class="draft-list">
                  <div v-for="draft in item.drafts" :key="draft.draft_id" class="draft-card" :class="'draft-' + draft.state">
                    <div class="draft-head">
                      <span class="draft-title">{{ draft.title }}</span>
                      <t-tag v-if="draft.state === 'pending'" theme="warning" size="small" variant="light">
                        {{ t('page.gpt.draft_badge_pending') }}
                      </t-tag>
                      <t-tag v-else-if="draft.state === 'applied'" theme="success" size="small" variant="light">
                        {{ t('page.gpt.draft_badge_applied') }}
                      </t-tag>
                      <t-tag v-else-if="draft.state === 'discarded'" theme="default" size="small" variant="light">
                        {{ t('page.gpt.draft_badge_discarded') }}
                      </t-tag>
                      <t-tag v-else-if="draft.state === 'failed'" theme="danger" size="small" variant="light">
                        {{ t('page.gpt.draft_badge_failed') }}
                      </t-tag>
                    </div>
                    <div v-if="draft.state === 'pending'" class="draft-ops">
                      <template v-if="aiWriteEnabled">
                        <t-button theme="primary" size="small" @click="confirmDraft(draft)">
                          {{ t('page.gpt.draft_confirm') }}
                        </t-button>
                        <t-button variant="outline" size="small" @click="discardDraft(draft)">
                          {{ t('page.gpt.draft_ignore') }}
                        </t-button>
                      </template>
                      <span v-else class="draft-write-tip">{{ t('page.gpt.write_disabled_tip') }}</span>
                    </div>
                    <div v-if="draft.failMsg" class="draft-fail-msg">{{ draft.failMsg }}</div>
                  </div>
                </div>
                <div v-if="item.role === 'assistant' && item.content && !item.loading" class="msg-ops">
                  <t-button variant="text" size="small" @click="copyMessage(item.content)">
                    <copy-icon />
                    <span>{{ t('page.gpt.copy') }}</span>
                  </t-button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <template #footer>
        <div class="input-area">
          <div class="input-box">
            <t-textarea
              v-model="inputMessage"
              :placeholder="gptChecked && !gptHasToken ? t('page.gpt.unset_send_tip') : t('page.gpt.chat.chat_placeholder')"
              name="description"
              :autosize="{ minRows: 2, maxRows: 6 }"
              :disabled="isStreaming || (gptChecked && !gptHasToken)"
              @keydown="onInputKeydown"
            >
            </t-textarea>
            <div class="input-foot">
              <span class="input-hint">{{ t('page.gpt.send_hint') }}</span>
              <t-button
                v-if="gptChecked && !gptHasToken && isPlatform"
                theme="primary"
                size="small"
                @click="gptConfigVisible = true"
              >
                {{ t('page.gpt.unset_action') }}
              </t-button>
              <t-button
                v-else-if="!isStreaming"
                theme="primary"
                size="small"
                :disabled="!inputMessage.trim()"
                @click="sendMessage"
              >
                <template #icon><send-icon /></template>
                {{ t('page.gpt.chat.chat_send') }}
              </t-button>
              <t-button v-else theme="danger" variant="outline" size="small" @click="stopStreaming">
                {{ t('page.gpt.chat.chat_stop') }}
              </t-button>
            </div>
          </div>
        </div>
      </template>
    </t-drawer>

    <!-- AI 参数设置（与规则编排页共用同一个弹窗组件） -->
    <gpt-config-dialog v-model:visible="gptConfigVisible" @saved="onGptConfigSaved" />

    <!-- z-index：t-sticky-tool 自身没有层级，会被表格的固定列（position:relative + 背景）
         压在下面，右下角点不到。给个明确层级，仍低于 drawer/dialog(2500+)。 -->
    <t-sticky-tool
      v-if="canUseAIAssistant"
      :style="{ position: 'fixed', right: '20px', overflow: 'hidden', height: '70px', zIndex: 100 }"
      @click="openChat"
    >
      <t-sticky-item :label="t('page.gpt.assistant')" :icon="renderChatIcon" />
    </t-sticky-tool>
  </div>
</template>

<script setup lang="ts">
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MessagePlugin } from 'tdesign-vue-next';
import {
  ChatIcon,
  ChevronRightIcon,
  ClearIcon,
  CopyIcon,
  ErrorCircleIcon,
  LogoAndroidIcon,
  SendIcon,
  SettingIcon,
  UserIcon,
} from 'tdesign-icons-vue-next';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

import GptConfigDialog from '@/components/gpt-config/index.vue';
import bus from '@/utils/bus';
import { fetchChatStream } from '@/utils/eventSource';
import { wafGptConfigGetApi } from '@/apis/gpt';
import {
  aiAssistantChatApi,
  aiAssistantDraftApplyApi,
  aiAssistantDraftDiscardApi,
  aiAssistantStatusApi,
} from '@/apis/aiAssistant';
import { usePermissionStore } from '@/store/modules/permission';
import { BRAND } from '@/config/brand';

interface ChatItem {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
  // 配置助手：AI 工具回执与产出的变更草案
  toolTraces?: AIToolTrace[];
  drafts?: AIDraftView[];
}

interface AIToolTrace {
  tool: string;
  ok: boolean;
  summary: string;
}

// 草案状态机：pending(待确认) → applying → applied / failed；discarded(已忽略)
type AIDraftState = 'pending' | 'applying' | 'applied' | 'discarded' | 'failed';

interface AIDraftView {
  draft_id: string;
  title: string;
  state: AIDraftState;
  failMsg?: string;
}

const { t } = useI18n();

const aiChatBoxVisible = ref(false);
const questionList = ref<ChatItem[]>([]);
const inputMessage = ref('');
const isStreaming = ref(false);
const chatContainer = ref<HTMLElement>();
let currentCtrl: AbortController | null = null;
let streamAborted = false;

// 当前对话场景，决定后端用哪套系统提示词：
// general 通用问答（默认）/ security_log 日志安全分析 / owasp_rule OWASP规则解读
const currentScene = ref('general');
const gptChecked = ref(false); // 是否已检测过 AI 配置
const gptChecking = ref(false); // 正在检测 AI 配置
const gptHasToken = ref(false); // AI 上游是否已配置
const gptConfigVisible = ref(false); // AI 参数设置弹窗（平台侧）

// ===== 配置助手模式（ai:assistant）=====
const permissionStore = usePermissionStore();
const canUseAIAssistant = computed(() => permissionStore.has('ai:assistant'));
const isPlatform = computed(() => permissionStore.isPlatform);
const configMode = ref(false); // 当前是否处于配置助手模式（非流式 + 工具编排 + 草案确认）
const aiWriteEnabled = ref(false); // 平台是否开放 AI 配置变更（写工具）
const aiAssistantEnabled = ref(true); // 平台总开关（关闭时给出明确提示）

const renderChatIcon = () => h(ChatIcon);

// 空态里的建议问题：让用户知道这儿能问什么，点一条直接开聊
const suggestions = computed(() => {
  if (configMode.value) {
    return [
      { label: t('page.gpt.config_suggest_1_label'), q: t('page.gpt.config_suggest_1_q') },
      { label: t('page.gpt.config_suggest_2_label'), q: t('page.gpt.config_suggest_2_q') },
      { label: t('page.gpt.config_suggest_3_label'), q: t('page.gpt.config_suggest_3_q') },
      { label: t('page.gpt.config_suggest_4_label'), q: t('page.gpt.config_suggest_4_q') },
    ];
  }
  return [
    { label: t('page.gpt.suggest_1_label'), q: t('page.gpt.suggest_1_q') },
    { label: t('page.gpt.suggest_2_label'), q: t('page.gpt.suggest_2_q') },
    { label: t('page.gpt.suggest_3_label'), q: t('page.gpt.suggest_3_q') },
    { label: t('page.gpt.suggest_4_label'), q: t('page.gpt.suggest_4_q') },
  ];
});

// 非通用场景时在标题旁标一下，用户知道当前这轮在聊什么
const sceneLabel = computed(() => {
  if (configMode.value) return t('page.gpt.mode_config');
  if (currentScene.value === 'security_log') return t('page.gpt.scene_security_log');
  if (currentScene.value === 'owasp_rule') return t('page.gpt.scene_owasp_rule');
  return '';
});

// 官方文档（brand.docUrl 未配置时空串，模板据此隐藏入口）
const docUrl = computed(() => BRAND.docUrl);

/** 检测 AI 可用性：租户走助手状态端点（含平台开关），平台侧兼容旧 gpt 配置端点 */
async function checkGptConfig() {
  gptChecking.value = true;
  try {
    if (canUseAIAssistant.value) {
      const res: any = await aiAssistantStatusApi();
      const data = res && res.code === 0 ? res.data : null;
      gptHasToken.value = !!data?.upstream_configured;
      aiWriteEnabled.value = !!data?.write_enabled;
      aiAssistantEnabled.value = data ? data.assistant_enabled !== false : true;
    } else {
      const res: any = await wafGptConfigGetApi();
      gptHasToken.value = !!(res && res.code === 0 && res.data && res.data.has_token);
    }
  } catch (e) {
    console.log(e);
    // 拿不到状态时按"未配置"处理，好过给个发不出去的空白对话框
    gptHasToken.value = false;
  } finally {
    gptChecked.value = true;
    gptChecking.value = false;
  }
  return gptHasToken.value && (configMode.value ? aiAssistantEnabled.value : true);
}

/** 保存完参数后复检，通过就直接可以聊了 */
async function onGptConfigSaved() {
  await checkGptConfig();
}

function clearMessage() {
  questionList.value = [];
}

/** 问答/配置助手模式切换：清空上下文并重检状态 */
function switchMode(mode: 'chat' | 'config') {
  if (isStreaming.value) return;
  const next = mode === 'config';
  if (next === configMode.value) return;
  configMode.value = next;
  currentScene.value = 'general';
  clearMessage();
  checkGptConfig();
}

// 其他页面（日志详情/OWASP规则）把内容甩过来：
// e 支持两种形式——字符串（老调用，按通用问答处理）或 { q, scene }
async function onSendAi(e: any) {
  const isObj = e !== null && typeof e === 'object';
  clearMessage();
  aiChatBoxVisible.value = true;
  configMode.value = false; // 日志分析/规则解读等外部入口固定走问答模式
  currentScene.value = isObj && e.scene ? e.scene : 'general';
  inputMessage.value = isObj ? String(e.q || '') : String(e || '');
  // 没配密钥就别发了，停在引导页；用户配置完点"发送"即可继续
  const configured = await checkGptConfig();
  if (!configured) {
    if (configMode.value && !aiAssistantEnabled.value) {
      MessagePlugin.warning(t('page.gpt.assistant_disabled'));
    }
    return;
  }
  sendMessage();
}

onMounted(() => {
  bus.on('sendAi', onSendAi);
});

onBeforeUnmount(() => {
  bus.off('sendAi', onSendAi);
});

// 将 Markdown 转换为 HTML（DOMPurify 清洗防 XSS）
function convertMarkdown(content: string) {
  return DOMPurify.sanitize(marked.parse(content || '') as string);
}

/** 点建议问题：填进输入框直接发，省一次输入 */
function useSuggestion(s: { label: string; q: string }) {
  if (isStreaming.value) return;
  inputMessage.value = s.q;
  sendMessage();
}

/** Enter 发送、Shift+Enter 换行（输入法组字期间的回车不算） */
function onInputKeydown(_val: string, ctx: { e: KeyboardEvent }) {
  const e = ctx?.e;
  if (!e || e.key !== 'Enter' || e.shiftKey || e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  if (!isStreaming.value) {
    sendMessage();
  }
}

function fallbackCopy(text: string, ok: () => void) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    ok();
  } catch (e) {
    console.log(e);
  }
  document.body.removeChild(ta);
}

function copyMessage(content: string) {
  const ok = () => MessagePlugin.success(t('page.gpt.copied'));
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(content)
      .then(ok)
      .catch(() => fallbackCopy(content, ok));
  } else {
    fallbackCopy(content, ok);
  }
}

async function sendMessage() {
  if (!inputMessage.value.trim()) return;
  // 发送前兜底：未配置密钥直接弹配置窗，不去请求后端
  if (!gptHasToken.value) {
    const configured = await checkGptConfig();
    if (!configured) {
      MessagePlugin.warning(t('page.gpt.unset_send_tip'));
      gptConfigVisible.value = true;
      return;
    }
  }

  const userMessage = inputMessage.value;
  inputMessage.value = '';

  // 添加用户消息
  questionList.value.push({ role: 'user', content: userMessage });
  // 添加机器人消息占位
  questionList.value.push({ role: 'assistant', content: '', loading: true });

  askQuestion(userMessage);
}

function askQuestion(q: string) {
  if (configMode.value) {
    askConfigAssistant(q);
    return;
  }
  const ctrl = new AbortController();
  currentCtrl = ctrl;
  isStreaming.value = true;
  streamAborted = false;
  const answerIndex = questionList.value.length - 1;

  fetchChatStream({
    history: questionList.value,
    q,
    scene: currentScene.value,
    ctrl,
    onSuccess: (assistantMessage) => {
      const answer = questionList.value[answerIndex];
      answer.content += assistantMessage.content;
      goChatBottom();
    },
    onComplete: () => {
      isStreaming.value = false;
      currentCtrl = null;
      const answer = questionList.value[answerIndex];
      if (answer) {
        answer.loading = false;
        goChatBottom();
      }
    },
    onError: (errorMsg) => {
      isStreaming.value = false;
      currentCtrl = null;
      const answer = questionList.value[answerIndex];
      if (streamAborted) {
        // 用户主动中止：保留已输出内容，标记为已停止
        if (answer) {
          answer.loading = false;
          if (!answer.content) answer.content = '_(已中止)_';
          goChatBottom();
        }
      } else {
        // 真实错误：在气泡里展示错误，不删消息，让用户看到
        MessagePlugin.error(errorMsg);
        if (answer) {
          answer.loading = false;
          answer.content = answer.content || `⚠️ ${errorMsg}`;
          goChatBottom();
        }
      }
      streamAborted = false;
    },
  });
}

// ===== 配置助手（非流式）=====

/** 组装文本历史（去掉 loading 占位与草案等附加信息，后端自建工具上下文） */
function buildHistory() {
  return questionList.value
    .filter((item) => !item.loading && item.content)
    .slice(-12)
    .map((item) => ({ role: item.role, content: item.content }));
}

async function askConfigAssistant(q: string) {
  isStreaming.value = true;
  const answerIndex = questionList.value.length - 1;
  try {
    const res: any = await aiAssistantChatApi({ history: buildHistory(), message: q });
    const answer = questionList.value[answerIndex];
    if (!answer) return;
    if (res && res.code === 0 && res.data) {
      answer.content = res.data.content || '';
      answer.toolTraces = res.data.tool_traces || [];
      answer.drafts = (res.data.drafts || []).map((d: any) => ({
        draft_id: String(d.draft_id || ''),
        title: String(d.title || ''),
        state: 'pending' as AIDraftState,
      }));
      if (res.data.write_enabled !== undefined) {
        aiWriteEnabled.value = !!res.data.write_enabled;
      }
      if (!answer.content && !(answer.drafts && answer.drafts.length)) {
        answer.content = t('page.gpt.tool_trace_empty');
      }
    } else {
      answer.content = `⚠️ ${(res && res.msg) || t('page.gpt.draft_apply_fail')}`;
    }
  } catch (e: any) {
    const answer = questionList.value[answerIndex];
    if (answer) {
      answer.loading = false;
      answer.content = answer.content || `⚠️ ${e?.message || '请求失败'}`;
    }
  } finally {
    isStreaming.value = false;
    goChatBottom();
  }
}

/** 人工确认执行草案（单次消费，后端防重放） */
async function confirmDraft(draft: AIDraftView) {
  if (draft.state !== 'pending') return;
  draft.state = 'applying';
  try {
    const res: any = await aiAssistantDraftApplyApi({ draft_id: draft.draft_id });
    if (res && res.code === 0) {
      draft.state = 'applied';
      MessagePlugin.success(res.msg || t('page.gpt.draft_apply_ok'));
    } else {
      draft.state = 'failed';
      draft.failMsg = (res && res.msg) || '';
      MessagePlugin.error(t('page.gpt.draft_apply_fail'));
    }
  } catch (e: any) {
    draft.state = 'failed';
    draft.failMsg = e?.message || '';
    MessagePlugin.error(t('page.gpt.draft_apply_fail'));
  }
}

/** 忽略草案 */
async function discardDraft(draft: AIDraftView) {
  if (draft.state !== 'pending') return;
  draft.state = 'applying';
  try {
    const res: any = await aiAssistantDraftDiscardApi({ draft_id: draft.draft_id });
    if (res && res.code === 0) {
      draft.state = 'discarded';
    } else {
      draft.state = 'pending';
      MessagePlugin.error((res && res.msg) || t('page.gpt.draft_discard_ok'));
    }
  } catch (e) {
    draft.state = 'pending';
  }
}

function stopStreaming() {
  if (currentCtrl) {
    streamAborted = true; // 先标记，让 onError 知道这是主动中止
    currentCtrl.abort();
    currentCtrl = null;
  }
  isStreaming.value = false;
}

function goChatBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

function openChat(context: { item: { label?: string } }) {
  if (context.item?.label === t('page.gpt.assistant')) {
    aiChatBoxVisible.value = true;
    // 从悬浮球进来且没有历史对话，就是自由提问，别沿用上次日志分析的场景
    if (questionList.value.length === 0) {
      currentScene.value = 'general';
    }
    // 每次打开都检测一次，配置可能在别处（规则编排页/系统配置）刚改过
    checkGptConfig();
  }
}
</script>

<style scoped>
/* ============ 抽屉标题栏 ============ */
.chat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  /* 关闭按钮是绝对定位贴在右上角的，这里留出位置，别被压住 */
  padding-right: 36px;
  box-sizing: border-box;
}

.chat-header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.chat-header-scene {
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--td-brand-color-1, #f2f3ff);
  color: var(--td-brand-color, #0052d9);
  font-size: 12px;
  font-weight: 400;
}

.chat-header-ops {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 2px;
}

/* ============ 消息区 ============ */
.chat-container {
  height: calc(100vh - 210px);
  min-height: 320px;
  overflow-y: auto;
  /* 长表格/长代码只在自己内部横向滚，别把整个抽屉撑出横向滚动条 */
  overflow-x: hidden;
  padding: 16px 20px;
  background: var(--td-bg-color-container);
}

.message-wrapper {
  display: flex;
  margin: 0 0 20px;
}

.message-wrapper.user {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 92%;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.message-wrapper.user .message-bubble {
  max-width: 85%;
  flex-direction: row-reverse;
}

.avatar {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--td-bg-color-component);
  color: var(--td-text-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.content {
  min-width: 0;
  max-width: calc(100% - 38px);
}

.text {
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--td-bg-color-component);
  color: var(--td-text-color-primary);
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.message-wrapper.assistant .text {
  border-top-left-radius: 2px;
}

.message-wrapper.user .text {
  background: var(--td-brand-color);
  color: var(--td-text-color-anti);
  border-top-right-radius: 2px;
  white-space: pre-wrap;
}

/* markdown 正文排版：紧凑一点，别让首尾段落把气泡撑高 */
.text :deep(p) {
  margin: 0 0 8px;
}
.text :deep(p:last-child),
.text :deep(ul:last-child),
.text :deep(ol:last-child),
.text :deep(pre:last-child) {
  margin-bottom: 0;
}
.text :deep(h1),
.text :deep(h2),
.text :deep(h3),
.text :deep(h4) {
  margin: 12px 0 6px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
}
.text :deep(h1:first-child),
.text :deep(h2:first-child),
.text :deep(h3:first-child) {
  margin-top: 0;
}
.text :deep(ul),
.text :deep(ol) {
  margin: 0 0 8px;
  padding-left: 20px;
}
.text :deep(li) {
  margin: 2px 0;
}
.text :deep(code) {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--td-bg-color-secondarycontainer, rgba(0, 0, 0, 0.06));
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 12.5px;
  word-break: break-all;
}
/* 代码块和表格是横向溢出的主要来源，各自内部滚动 */
.text :deep(pre) {
  margin: 8px 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--td-bg-color-secondarycontainer, rgba(0, 0, 0, 0.06));
  overflow-x: auto;
  max-width: 100%;
}
.text :deep(pre code) {
  padding: 0;
  background: none;
  white-space: pre;
  word-break: normal;
}
.text :deep(table) {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  margin: 8px 0;
  border-collapse: collapse;
  font-size: 13px;
}
.text :deep(th),
.text :deep(td) {
  padding: 5px 10px;
  border: 1px solid var(--td-component-border, #e7e7e7);
  text-align: left;
  white-space: normal;
}
.text :deep(th) {
  background: var(--td-bg-color-secondarycontainer, rgba(0, 0, 0, 0.04));
  font-weight: 600;
}
.text :deep(blockquote) {
  margin: 8px 0;
  padding: 2px 0 2px 10px;
  border-left: 3px solid var(--td-component-border, #dcdcdc);
  color: var(--td-text-color-secondary);
}
.text :deep(a) {
  color: var(--td-brand-color, #0052d9);
  word-break: break-all;
}
.text :deep(img) {
  max-width: 100%;
}

/* 等首字时的打字动画 */
.typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 14px;
}
.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--td-text-color-placeholder, #bbb);
  animation: chat-typing 1.2s infinite ease-in-out;
}
.typing span:nth-child(2) {
  animation-delay: 0.2s;
}
.typing span:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes chat-typing {
  0%,
  60%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

.msg-ops {
  margin-top: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.message-wrapper:hover .msg-ops {
  opacity: 1;
}

/* ============ 配置助手：模式切换 / 工具回执 / 变更草案 ============ */
.mode-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-right: 4px;
  padding: 0 4px;
  border-right: 1px solid var(--td-component-stroke, #e7e7e7);
}

.tool-traces {
  margin-top: 8px;
  padding: 6px 8px;
  border: 1px dashed var(--td-component-stroke, #e7e7e7);
  border-radius: 6px;
  font-size: 12px;
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.6));
}
.tool-traces-title {
  font-weight: 500;
  margin-bottom: 4px;
}
.tool-trace-item {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 20px;
}
.tool-trace-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}
.tool-trace-dot.ok {
  background: var(--td-success-color, #2ba471);
}
.tool-trace-dot.fail {
  background: var(--td-error-color, #d54941);
}
.tool-trace-name {
  font-family: monospace;
  flex: none;
}
.tool-trace-summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.draft-card {
  border: 1px solid var(--td-component-stroke, #e7e7e7);
  border-left: 3px solid var(--td-warning-color, #e37318);
  border-radius: 6px;
  padding: 8px 10px;
  background: var(--td-bg-color-container, #fff);
}
.draft-card.draft-applied {
  border-left-color: var(--td-success-color, #2ba471);
  opacity: 0.75;
}
.draft-card.draft-discarded {
  border-left-color: var(--td-component-stroke, #e7e7e7);
  opacity: 0.55;
}
.draft-card.draft-failed {
  border-left-color: var(--td-error-color, #d54941);
}
.draft-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.draft-title {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.draft-ops {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.draft-write-tip {
  font-size: 12px;
  color: var(--td-text-color-secondary, rgba(0, 0, 0, 0.6));
}
.draft-fail-msg {
  margin-top: 6px;
  font-size: 12px;
  color: var(--td-error-color, #d54941);
  word-break: break-all;
}

/* ============ 空态：欢迎 + 建议问题 ============ */
.chat-welcome {
  padding: 24px 4px;
}

.welcome-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--td-brand-color-1, #f2f3ff);
  color: var(--td-brand-color, #0052d9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.welcome-title {
  margin-top: 12px;
  font-size: 17px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.welcome-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--td-text-color-secondary);
}

.welcome-suggest-title {
  margin: 20px 0 8px;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.suggest-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggest-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--td-component-border, #e7e7e7);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.suggest-item:hover {
  border-color: var(--td-brand-color, #0052d9);
  background: var(--td-brand-color-1, #f2f3ff);
}

.suggest-main {
  min-width: 0;
  flex: 1 1 auto;
}

.suggest-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.suggest-q {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--td-text-color-secondary);
}

.suggest-arrow {
  flex-shrink: 0;
  color: var(--td-text-color-placeholder);
}

.welcome-links {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.welcome-links-split {
  color: var(--td-text-color-placeholder);
}

.welcome-foot {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--td-text-color-placeholder);
}

/* ============ 输入区 ============ */
.input-area {
  padding: 12px 20px 16px;
  background: var(--td-bg-color-container);
  border-top: 1px solid var(--td-component-border);
}

.input-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-foot {
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-hint {
  flex: 1 1 auto;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

/* ============ 未配置 AI 密钥时的引导 ============ */
.gpt-checking {
  padding: 40px 20px;
  text-align: center;
  color: var(--td-text-color-secondary);
  font-size: 13px;
}

.gpt-unset {
  padding: 48px 24px;
  text-align: center;
}

.gpt-unset-icon {
  font-size: 32px;
  color: var(--td-warning-color, #e37318);
}

.gpt-unset-title {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.gpt-unset-desc {
  margin: 8px 0 16px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--td-text-color-secondary);
  text-align: left;
}

.gpt-unset-hint {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--td-text-color-placeholder);
}
</style>

<!-- 抽屉自身的内边距要去掉，聊天区/输入区各自控制留白（drawer 可能挂到 body 上，不能用 scoped） -->
<style>
.ai-chat-drawer .t-drawer__body {
  padding: 0;
}
.ai-chat-drawer .t-drawer__footer {
  padding: 0;
  border-top: none;
}
.ai-chat-drawer .t-drawer__header {
  padding: 14px 20px;
}
</style>
