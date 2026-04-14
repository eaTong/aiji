import { Context } from 'koa'
import { success, fail, AuthContext } from '../types'
import * as chatService from '../services/chatService'
import { createAIMessage } from '../services/chatService'
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

  // 2. 使用 AI 判断意图
  const { intent, confidence } = await aiGatewayService.determineIntent(userId, content)

  // 3. 检查是否是 RECORD 类型意图（优先处理，跳过 clarificationService）
  const recordIntents = ['RECORD_WEIGHT', 'RECORD_TRAINING', 'RECORD_MEASUREMENT', 'RECORD_DIET']

  // 4. 如果是 RECORD 型意图且置信度足够，解析实体并检查是否可以直接保存
  if (recordIntents.includes(intent) && confidence > 0.6) {
    const entities = await aiGatewayService.parseEntities(userId, content, intent)

    // 检查实体数据是否完整，可以直接保存
    const canDirectSave = await checkCanDirectSave(intent, entities)
    if (canDirectSave) {
      // 直接保存
      await chatConfirmationService.confirmAndSave(
        userId,
        'direct-save',
        getCardType(intent),
        entities,
        true
      )

      // 生成简洁的确认消息，不再次保存
      const aiMessage = await generateDirectSaveConfirmation(userId, intent, entities)

      ctx.body = success({
        message: userMessage,
        aiMessage,
        intent,
        entities,
        directSave: true
      })
      return
    }

    // 数据不完整，生成带确认的卡片
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

// ============================================
// 辅助函数
// ============================================

/**
 * 检查是否可以直接保存（数据完整）
 */
async function checkCanDirectSave(intent: string, entities: Record<string, any>): Promise<boolean> {
  switch (intent) {
    case 'RECORD_WEIGHT':
      // 体重记录：需要有效的体重值
      return entities.weight !== undefined && entities.weight !== null && entities.weight > 0

    case 'RECORD_TRAINING':
      // 训练记录：需要至少一个动作
      return entities.exercises !== undefined && entities.exercises.length > 0

    case 'RECORD_MEASUREMENT':
      // 围度记录：需要至少一个围度数据
      return entities.measurements !== undefined && Object.keys(entities.measurements).length > 0

    case 'RECORD_DIET':
      // 饮食记录：需要热量或餐食数据
      return (entities.calories !== undefined && entities.calories > 0) ||
             (entities.meals !== undefined && entities.meals.length > 0)

    default:
      return false
  }
}

/**
 * 获取卡片类型
 */
function getCardType(intent: string): string {
  switch (intent) {
    case 'RECORD_WEIGHT':
      return 'weight-record'
    case 'RECORD_TRAINING':
      return 'training-editable'
    case 'RECORD_MEASUREMENT':
      return 'measurement-record'
    case 'RECORD_DIET':
      return 'diet-record'
    default:
      return ''
  }
}

// ============================================
// 直接保存确认消息生成
// ============================================

/**
 * 生成直接保存后的确认消息（简洁的"已记录"提示）
 */
async function generateDirectSaveConfirmation(
  userId: string,
  intent: string,
  entities: Record<string, any>
): Promise<any> {
  switch (intent) {
    case 'RECORD_WEIGHT': {
      const { weight, unit } = entities
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'weight-record',
        cardData: {
          weight: weight,
          unit: unit || 'kg',
          date: new Date().toISOString().split('T')[0],
          saved: true,
          directSave: true
        },
        actions: [
          { id: 'undo', label: '撤销', action: 'cancel' },
          { id: 'dismiss', label: '知道了', action: 'dismiss' }
        ]
      })
    }

    case 'RECORD_TRAINING': {
      const { exercises } = entities
      const count = exercises?.length || 0
      const totalSets = exercises?.reduce((sum: number, e: any) => sum + (e.sets?.length || 0), 0) || 0
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'training-editable',
        cardData: {
          date: new Date().toISOString().split('T')[0],
          exercises: exercises || [],
          saved: true,
          directSave: true,
          summary: `已记录 ${count} 个动作，共 ${totalSets} 组`
        },
        actions: [
          { id: 'undo', label: '撤销', action: 'cancel' },
          { id: 'dismiss', label: '知道了', action: 'dismiss' }
        ]
      })
    }

    case 'RECORD_MEASUREMENT': {
      const { measurements } = entities
      const count = measurements ? Object.keys(measurements).length : 0
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'measurement-record',
        cardData: {
          date: new Date().toISOString().split('T')[0],
          measurements: measurements || {},
          saved: true,
          directSave: true,
          summary: `已记录 ${count} 项围度`
        },
        actions: [
          { id: 'undo', label: '撤销', action: 'cancel' },
          { id: 'dismiss', label: '知道了', action: 'dismiss' }
        ]
      })
    }

    case 'RECORD_DIET': {
      const { calories, meals } = entities
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'diet-record',
        cardData: {
          date: new Date().toISOString().split('T')[0],
          calories: calories || 0,
          meals: meals || [],
          saved: true,
          directSave: true,
          summary: '饮食记录已保存'
        },
        actions: [
          { id: 'undo', label: '撤销', action: 'cancel' },
          { id: 'dismiss', label: '知道了', action: 'dismiss' }
        ]
      })
    }

    default:
      return await createAIMessage(userId, {
        type: 'text',
        content: '已记录',
        actions: [
          { id: 'dismiss', label: '知道了', action: 'dismiss' }
        ]
      })
  }
}
