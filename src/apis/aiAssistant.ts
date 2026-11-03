import request from '@/utils/request';

/**
 * AI 配置助手（ai:assistant 权限域）。
 *
 * 形态：平台管理员统一配置上游与开关，租户在授权内对话；
 * 大模型通过白名单工具扫描本租户站点配置（只读）并产出变更草案，
 * 用户人工确认后执行（草案单次消费，15 分钟过期）。
 */

/** 状态探针：上游是否就绪、平台开关状态 */
export function aiAssistantStatusApi() {
  return request({
    url: 'ai/assistant/status',
    method: 'get',
  });
}

/** 配置助手对话（非流式）：返回回答文本 + 工具回执 + 待确认草案 */
export function aiAssistantChatApi(data: { history: { role: string; content: string }[]; message: string }) {
  return request({
    url: 'ai/assistant/chat',
    method: 'post',
    data,
  });
}

/** 人工确认执行草案（单次消费，防重放） */
export function aiAssistantDraftApplyApi(data: { draft_id: string }) {
  return request({
    url: 'ai/assistant/draft/apply',
    method: 'post',
    data,
  });
}

/** 忽略草案 */
export function aiAssistantDraftDiscardApi(data: { draft_id: string }) {
  return request({
    url: 'ai/assistant/draft/discard',
    method: 'post',
    data,
  });
}
