import { PrismaClient } from '@prisma/client'
import { ChatMessage, CardType } from '../types/chat'

const prisma = new PrismaClient()

// ============================================
// Chat Service - 消息存取、Action 分发
// ============================================

/**
 * 获取用户的消息列表
 */
export async function getMessages(
  userId: string,
  since?: Date,
  limit = 20
): Promise<ChatMessage[]> {
  const where: any = { userId }

  if (since) {
    where.createdAt = { gt: since }
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  return messages.reverse() as unknown as ChatMessage[]
}

/**
 * 发送消息（用户发送）
 */
export async function sendMessage(
  userId: string,
  content: string,
  planId?: string,
  sessionId?: string
): Promise<ChatMessage> {
  const message = await prisma.chatMessage.create({
    data: {
      userId,
      role: 'user',
      type: 'text',
      content,
      planId,
      sessionId
    }
  })

  return message as unknown as ChatMessage
}

/**
 * 创建 AI 回复消息
 */
export async function createAIMessage(
  userId: string,
  response: {
    type: 'text' | 'card'
    content?: string
    cardType?: CardType
    cardData?: Record<string, any>
    actions?: any[]
    planId?: string
    sessionId?: string
  }
): Promise<ChatMessage> {
  const message = await prisma.chatMessage.create({
    data: {
      userId,
      role: 'ai',
      type: response.type,
      content: response.content,
      cardType: response.cardType,
      cardData: response.cardData,
      actions: response.actions,
      planId: response.planId,
      sessionId: response.sessionId
    }
  })

  return message as unknown as ChatMessage
}

/**
 * 处理卡片按钮点击
 */
export async function handleCardAction(
  userId: string,
  messageId: string,
  actionId: string,
  params?: Record<string, any>
): Promise<{ type: string; result: any }> {
  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId, userId }
  })

  if (!message) {
    throw new Error('Message not found')
  }

  const action = (message.actions as any[])?.find((a: any) => a.id === actionId)

  if (!action) {
    throw new Error('Action not found')
  }

  // 根据 action 类型处理
  switch (action.action) {
    case 'navigate':
      return { type: 'navigate', result: { target: action.target } }

    case 'save':
      return { type: 'saved', result: { actionId, params, cardData: message.cardData } }

    case 'regenerate':
      return { type: 'regenerate', result: { cardType: message.cardType } }

    case 'dismiss':
      // 删除该消息
      await prisma.chatMessage.delete({ where: { id: messageId } })
      return { type: 'dismissed', result: null }

    case 'callback':
      return { type: 'callback', result: { actionId, params } }

    default:
      throw new Error(`Unknown action type: ${action.action}`)
  }
}

/**
 * 获取用户的会话列表
 */
export async function getUserSessions(userId: string): Promise<any[]> {
  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 20
  })

  return sessions
}

/**
 * 获取或创建活跃会话
 */
export async function getOrCreateSession(userId: string): Promise<any> {
  let session = await prisma.chatSession.findFirst({
    where: { userId, status: { in: ['ACTIVE', 'AWAITING_CLARIFICATION'] } }
  })

  if (!session) {
    session = await prisma.chatSession.create({
      data: {
        userId,
        status: 'ACTIVE',
        context: {}
      }
    })
  }

  return session
}

/**
 * 清除用户当前追问状态
 */
export async function clearSession(userId: string): Promise<void> {
  await prisma.chatSession.updateMany({
    where: { userId, status: { in: ['ACTIVE', 'AWAITING_CLARIFICATION'] } },
    data: { status: 'EXPIRED' }
  })
}

/**
 * 暂停追问状态
 */
export async function pauseClarification(sessionId: string): Promise<void> {
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { status: 'ACTIVE' }
  })
}

/**
 * 更新会话上下文
 */
export async function updateSessionContext(
  sessionId: string,
  updates: {
    status?: 'ACTIVE' | 'AWAITING_CLARIFICATION' | 'COMPLETED' | 'EXPIRED'
    context?: any
    pendingIntent?: string
    missingFields?: any
    clarificationHistory?: any
    retryCount?: number
  }
): Promise<void> {
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      ...updates,
      updatedAt: new Date()
    }
  })
}

/**
 * 完成会话
 */
export async function completeSession(sessionId: string): Promise<void> {
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      updatedAt: new Date()
    }
  })
}

/**
 * 获取会话
 */
export async function getSession(sessionId: string): Promise<any | null> {
  return await prisma.chatSession.findUnique({
    where: { id: sessionId }
  })
}

/**
 * 获取用户当前活跃会话
 */
export async function getActiveSession(userId: string): Promise<any | null> {
  return await prisma.chatSession.findFirst({
    where: { userId, status: { in: ['ACTIVE', 'AWAITING_CLARIFICATION'] } }
  })
}
