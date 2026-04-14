import { request } from './request'

// ============================================
// Chat Types
// ============================================

export interface AIMessage {
  id: string
  role: 'user' | 'ai'
  type: 'text' | 'card'
  cardType?: string
  content?: string
  cardData?: Record<string, any>
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
  createdAt: string
}

export interface GreetingResponse {
  type: 'card' | 'text'
  content?: string
  cardType?: string
  cardData?: Record<string, any>
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
}

export interface UnreadPush {
  id: string
  cardType: string
  data: Record<string, any>
  actions: any[]
  triggerAt: string
}

export interface SendMessageResponse {
  message: AIMessage
  aiMessage: AIMessage
  intent?: string
  entities?: Record<string, any>
}

export interface ConfirmSaveRequest {
  cardId: string
  cardType: string
  cardData: Record<string, any>
  confirmed: boolean
}

export interface ConfirmSaveResponse {
  saved: boolean
  error?: string
  achievementMessage?: AIMessage
}

// ============================================
// Chat API Functions
// ============================================

/**
 * 获取聊天初始化信息（问候语和未读推送）
 */
export async function getChatInit(): Promise<{
  greeting: GreetingResponse
  unreadPushes: UnreadPush[]
}> {
  return request('GET', '/api/chat/init')
}

/**
 * 获取消息列表
 * @param since 可选，获取此时间之后的消息
 * @param limit 限制数量
 */
export async function getMessages(
  since?: string,
  limit = 20
): Promise<{
  messages: AIMessage[]
  hasMore: boolean
}> {
  const params = new URLSearchParams()
  if (since) params.append('since', since)
  params.append('limit', String(limit))

  return request('GET', `/api/chat/messages?${params.toString()}`)
}

/**
 * 发送消息
 * @param content 消息内容
 * @param planId 可选，关联的计划ID
 * @param sessionId 可选，会话ID
 */
export async function sendMessage(
  content: string,
  planId?: string,
  sessionId?: string
): Promise<SendMessageResponse> {
  return request('POST', '/api/chat/send', { content, planId, sessionId })
}

/**
 * 确认并保存记录
 */
export async function confirmSave(data: ConfirmSaveRequest): Promise<ConfirmSaveResponse> {
  return request('POST', '/api/chat/confirm', data)
}

/**
 * 处理卡片按钮点击
 */
export async function handleCardAction(
  messageId: string,
  actionId: string,
  params?: Record<string, any>
): Promise<any> {
  return request('POST', '/api/chat/action', { messageId, actionId, params })
}

/**
 * 获取未读推送
 */
export async function getUnreadPushes(): Promise<{ pushes: UnreadPush[] }> {
  return request('GET', '/api/chat/push')
}

/**
 * 标记推送已读
 */
export async function markPushRead(pushId: string): Promise<void> {
  return request('POST', `/api/chat/push/${pushId}/read`)
}

/**
 * 获取会话历史
 */
export async function getSessions(): Promise<{ sessions: any[] }> {
  return request('GET', '/api/chat/sessions')
}

/**
 * 清除当前追问状态
 */
export async function clearSession(): Promise<void> {
  return request('DELETE', '/api/chat/session')
}

/**
 * 暂停追问
 */
export async function pauseSession(sessionId?: string): Promise<void> {
  return request('POST', '/api/chat/session/pause', { sessionId })
}
