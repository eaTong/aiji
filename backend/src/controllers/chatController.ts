import { Context } from 'koa'
import { success, fail, AuthContext } from '../types'
import * as chatService from '../services/chatService'
import * as aiChatService from '../services/aiChatService'
import * as aiGatewayService from '../services/aiGatewayService'
import * as pushService from '../services/pushService'
import * as clarificationService from '../services/clarificationService'
import * as chatGreetingService from '../services/chatGreetingService'
import * as chatConfirmationService from '../services/chatConfirmationService'

// ============================================
// Chat Controller
// ============================================

/**
 * 获取聊天初始化信息（问候语和未读推送）
 * GET /api/chat/init
 */
export async function getInit(ctx: Context) {
  const userId = (ctx.state.user as any).userId

  const { greeting, unreadPushes } = await chatGreetingService.generateGreetingAndPushes(userId)

  ctx.body = success({
    greeting,
    unreadPushes
  })
}

/**
 * 获取消息列表
 * GET /api/chat/messages?since=xxx&limit=20
 */
export async function getMessages(ctx: Context) {
  const userId = (ctx.state.user as any).userId
  const since = ctx.query.since ? new Date(ctx.query.since as string) : undefined
  const limit = parseInt(ctx.query.limit as string) || 20

  const messages = await chatService.getMessages(userId, since, limit)

  ctx.body = success({
    messages,
    hasMore: messages.length === limit
  })
}

/**
 * 发送消息
 * POST /api/chat/send
 */
export async function sendMessage(ctx: Context) {
  const userId = (ctx.state.user as any).userId
  const { content, planId, sessionId } = ctx.request.body as any

  if (!content || typeof content !== 'string') {
    ctx.body = fail('content is required', 400)
    return
  }

  // 1. 保存用户消息
  const userMessage = await chatService.sendMessage(userId, content, planId, sessionId)

  // 2. 处理追问流程（优先）
  const clarificationResult = await clarificationService.processMessage(userId, content)

  // 如果需要回复（追问）
  if (clarificationResult.shouldRespond && clarificationResult.response) {
    ctx.body = success({
      message: userMessage,
      aiMessage: clarificationResult.response.message,
      sessionId: clarificationResult.response.sessionId
    })
    return
  }

  // 如果流程完成，生成 AI 回复
  if (clarificationResult.completed && clarificationResult.cardData) {
    // 生成对应的卡片回复
    const aiMessage = await aiChatService.chat(
      userId,
      content,
      clarificationResult.cardData
    )

    ctx.body = success({
      message: userMessage,
      aiMessage,
      sessionId: clarificationResult.cardData.sessionId
    })
    return
  }

  // 3. 使用 AI 判断意图（新增流程）
  const { intent, confidence } = await aiGatewayService.determineIntent(userId, content)

  // 4. 如果是记录型意图，先解析实体并发送确认卡片
  const recordIntents = ['RECORD_WEIGHT', 'RECORD_TRAINING', 'RECORD_MEASUREMENT', 'RECORD_DIET']
  if (recordIntents.includes(intent) && confidence > 0.6) {
    const entities = await aiGatewayService.parseEntities(userId, content, intent)

    // 生成带确认的卡片（用于用户确认后保存）
    const aiMessage = await aiChatService.chat(userId, content, {
      intent,
      entities,
      intentConfidence: confidence
    })

    ctx.body = success({
      message: userMessage,
      aiMessage,
      intent, // 返回意图供前端参考
      entities
    })
    return
  }

  // 5. 其他意图，走正常 AI 回复
  const aiMessage = await aiChatService.chat(userId, content, { intent, confidence })

  ctx.body = success({
    message: userMessage,
    aiMessage,
    intent // 返回意图供前端参考
  })
}

/**
 * 确认并保存记录
 * POST /api/chat/confirm
 */
export async function confirmSave(ctx: Context) {
  const userId = (ctx.state.user as any).userId
  const { cardId, cardType, cardData, confirmed } = ctx.request.body as any

  if (!cardId || !cardType) {
    ctx.body = fail('cardId and cardType are required', 400)
    return
  }

  const result = await chatConfirmationService.confirmAndSave(
    userId,
    cardId,
    cardType,
    cardData || {},
    confirmed !== false // 默认为 true
  )

  // 如果有成就解锁，生成成就卡片
  let achievementMessage = null
  if (result.saved && result.incentiveCard) {
    achievementMessage = await chatService.createAIMessage(userId, result.incentiveCard)
  }

  ctx.body = success({
    saved: result.saved,
    error: result.error,
    achievementMessage
  })
}

/**
 * 处理卡片按钮点击
 * POST /api/chat/action
 */
export async function handleAction(ctx: Context) {
  const userId = (ctx.state.user as any).userId
  const { messageId, actionId, params } = ctx.request.body as any

  if (!messageId || !actionId) {
    ctx.body = fail('messageId and actionId are required', 400)
    return
  }

  const result = await chatService.handleCardAction(userId, messageId, actionId, params)

  ctx.body = success(result)
}

/**
 * 获取未读推送
 * GET /api/chat/push
 */
export async function getPushes(ctx: Context) {
  const userId = (ctx.state.user as any).userId

  const pushes = await pushService.getUnreadPushes(userId)

  ctx.body = success({ pushes })
}

/**
 * 标记推送已读
 * POST /api/chat/push/:id/read
 */
export async function markPushRead(ctx: Context) {
  const userId = (ctx.state.user as any).userId
  const pushId = ctx.params.id

  await pushService.markPushAsRead(pushId)

  ctx.body = success(null)
}

/**
 * 获取会话历史
 * GET /api/chat/sessions
 */
export async function getSessions(ctx: Context) {
  const userId = (ctx.state.user as any).userId

  const sessions = await chatService.getUserSessions(userId)

  ctx.body = success({ sessions })
}

/**
 * 清除当前追问状态
 * DELETE /api/chat/session
 */
export async function clearSession(ctx: Context) {
  const userId = (ctx.state.user as any).userId

  await chatService.clearSession(userId)

  ctx.body = success(null)
}

/**
 * 暂停追问（稍后再说）
 * POST /api/chat/session/pause
 */
export async function pauseSession(ctx: Context) {
  const userId = (ctx.state.user as any).userId
  const { sessionId } = ctx.request.body as any

  if (sessionId) {
    await chatService.pauseClarification(sessionId)
  } else {
    await chatService.clearSession(userId)
  }

  ctx.body = success(null)
}
