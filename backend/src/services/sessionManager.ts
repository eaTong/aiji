import { PrismaClient } from '@prisma/client'
import {
  ClarificationContext,
  ClarificationRecord,
  CLARIFICATION_LIMITS,
  SESSION_EXPIRY
} from '../types/clarification'

const prisma = new PrismaClient()

// ============================================
// Session 管理器 - 上下文记忆
// ============================================

/**
 * 获取或创建会话
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

/**
 * 更新会话上下文
 */
export async function updateContext(
  sessionId: string,
  updates: Partial<ClarificationContext>
): Promise<void> {
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      pendingIntent: updates.pendingIntent || undefined,
      missingFields: updates.missingFields as any || undefined,
      clarificationHistory: updates.clarificationHistory as any || undefined,
      retryCount: updates.retryCount || undefined,
      updatedAt: new Date()
    }
  })
}

/**
 * 添加追问记录
 */
export async function addClarificationRecord(
  sessionId: string,
  record: ClarificationRecord
): Promise<void> {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId }
  })

  if (!session) {
    throw new Error('Session not found')
  }

  const history = (session.clarificationHistory as any as ClarificationRecord[]) || []
  history.push(record)

  const retryCount = (session.retryCount || 0) + 1

  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      clarificationHistory: history as any,
      retryCount,
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
 * 清除会话（标记为过期）
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
    data: {
      status: 'ACTIVE',
      updatedAt: new Date()
    }
  })
}

/**
 * 恢复追问状态
 */
export async function resumeClarification(sessionId: string): Promise<void> {
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      status: 'AWAITING_CLARIFICATION',
      updatedAt: new Date()
    }
  })
}

/**
 * 检查是否超过追问限制
 */
export async function checkExceededLimit(sessionId: string): Promise<boolean> {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId }
  })

  if (!session) {
    return false
  }

  // 检查总追问次数
  if ((session.retryCount || 0) >= CLARIFICATION_LIMITS.MAX_TOTAL_RETRIES) {
    return true
  }

  // 检查最后追问的时间
  const lastUpdate = new Date(session.updatedAt).getTime()
  const now = Date.now()
  const elapsed = (now - lastUpdate) / 1000  // 秒

  if (elapsed > CLARIFICATION_LIMITS.TIMEOUT_SECONDS) {
    return true
  }

  return false
}

/**
 * 清理过期会话
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const now = new Date()

  // 清除追问超时 Session
  const clarificationThreshold = new Date(now.getTime() - SESSION_EXPIRY.CLARIFICATION_TIMEOUT * 1000)
  await prisma.chatSession.updateMany({
    where: {
      status: 'AWAITING_CLARIFICATION',
      updatedAt: { lt: clarificationThreshold }
    },
    data: { status: 'EXPIRED' }
  })

  // 清除长时间未活跃的 Session
  const activeThreshold = new Date(now.getTime() - SESSION_EXPIRY.ACTIVE_TIMEOUT * 1000)
  await prisma.chatSession.updateMany({
    where: {
      status: 'ACTIVE',
      updatedAt: { lt: activeThreshold }
    },
    data: { status: 'EXPIRED' }
  })

  // 删除过期的已完成 Session
  const completedThreshold = new Date(now.getTime() - SESSION_EXPIRY.COMPLETED_CLEANUP * 1000)
  await prisma.chatSession.deleteMany({
    where: {
      status: 'COMPLETED',
      updatedAt: { lt: completedThreshold }
    }
  })
}

/**
 * 获取用户会话历史
 */
export async function getSessionHistory(
  userId: string,
  limit = 20
): Promise<any[]> {
  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: limit
  })

  return sessions
}

/**
 * 解析会话上下文
 */
export function parseContext(session: any): ClarificationContext | null {
  if (!session || !session.context) {
    return null
  }

  return {
    sessionId: session.id,
    originalMessage: session.context.originalMessage || '',
    pendingIntent: session.pendingIntent || 'UNKNOWN',
    extractedEntities: session.context.extractedEntities || {},
    missingFields: session.missingFields || [],
    clarificationHistory: (session.clarificationHistory as ClarificationRecord[]) || [],
    retryCount: session.retryCount || 0
  }
}

/**
 * 检测是否是上下文延续
 */
export function detectContinuation(
  message: string,
  session: any
): boolean {
  if (!session || session.status !== 'AWAITING_CLARIFICATION') {
    return false
  }

  const continuationIndicators = [
    /^\d+\.?\d*$/,            // 纯数字
    /^(kg|公斤|斤|磅|cm|英寸)$/i,  // 单位
    /^(今天|昨天|前天|上周)$/,   // 时间词
    /^(胸|背|腿|肩|臂|腹)$/,     // 肌群简称
    /^(是|对|嗯|ok|好的)$/i,     // 肯定回复
    /^(不|没|别)$/i,            // 否定回复
    /^\d+\s*(kg|公斤|斤)?$/,    // 数字+单位
    /^(是|对)/
  ]

  // 如果消息匹配延续指示符，认为是延续
  for (const pattern of continuationIndicators) {
    if (pattern.test(message.trim())) {
      return true
    }
  }

  // 检查是否是纠正
  if (/不对|错了|打错了/i.test(message)) {
    return true
  }

  // 检查是否距离上次交互超时
  const timeSinceLastUpdate = Date.now() - new Date(session.updatedAt).getTime()
  if (timeSinceLastUpdate > CLARIFICATION_LIMITS.TIMEOUT_SECONDS * 1000) {
    return false
  }

  return true
}
