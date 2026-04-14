import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================
// Push Service - 推送触发、队列管理
// ============================================

/**
 * 获取用户未读的推送
 */
export async function getUnreadPushes(userId: string): Promise<any[]> {
  const now = new Date()

  const pushes = await prisma.pushQueue.findMany({
    where: {
      userId,
      sentAt: null,
      triggerAt: { lte: now },
      expiresAt: { gt: now }
    },
    orderBy: [
      { priority: 'desc' },
      { triggerAt: 'asc' }
    ]
  })

  return pushes
}

/**
 * 标记推送已读
 */
export async function markPushAsRead(pushId: string): Promise<void> {
  const push = await prisma.pushQueue.findUnique({
    where: { id: pushId }
  })

  if (!push) {
    throw new Error('Push not found')
  }

  // 更新发送时间
  await prisma.pushQueue.update({
    where: { id: pushId },
    data: { sentAt: new Date() }
  })

  // 记录去重
  await prisma.pushRecord.create({
    data: {
      userId: push.userId,
      cardType: push.cardType,
      sentAt: new Date()
    }
  })
}

/**
 * 入队新推送
 */
export async function enqueuePush(
  userId: string,
  cardType: string,
  data: Record<string, any>,
  actions?: any[],
  triggerAt?: Date,
  expiresInMinutes = 60,
  priority = 0
): Promise<string> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000)

  const push = await prisma.pushQueue.create({
    data: {
      userId,
      cardType,
      data,
      actions: actions || [],
      triggerAt: triggerAt || now,
      expiresAt,
      priority
    }
  })

  return push.id
}

/**
 * 检查是否可以发送推送（去重）
 */
export async function canSendPush(
  userId: string,
  cardType: string,
  hours = 24
): Promise<boolean> {
  const threshold = new Date(Date.now() - hours * 60 * 60 * 1000)

  const record = await prisma.pushRecord.findFirst({
    where: {
      userId,
      cardType,
      sentAt: { gt: threshold }
    }
  })

  return !record
}

/**
 * 删除已过期的推送
 */
export async function cleanupExpiredPushes(): Promise<void> {
  const now = new Date()

  await prisma.pushQueue.deleteMany({
    where: {
      expiresAt: { lt: now }
    }
  })
}

/**
 * 获取用户的推送记录
 */
export async function getPushHistory(
  userId: string,
  limit = 20
): Promise<any[]> {
  const records = await prisma.pushRecord.findMany({
    where: { userId },
    orderBy: { sentAt: 'desc' },
    take: limit
  })

  return records
}

/**
 * 检查并触发定时推送
 */
export async function checkScheduledPushes(): Promise<void> {
  const now = new Date()
  const hour = now.getHours()
  const dayOfWeek = now.getDay()

  // TODO: 批量检查所有用户
  // 目前先获取活跃用户列表
  const activeUsers = await prisma.user.findMany({
    where: {
      // 筛选最近活跃的用户
      updatedAt: {
        gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7天内活跃
      }
    },
    select: { id: true }
  })

  for (const user of activeUsers) {
    // 检查各种定时推送
    await checkMorningReport(user.id, hour)
    await checkWeeklyReport(user.id, hour, dayOfWeek)
  }
}

/**
 * 检查早安日报
 */
async function checkMorningReport(userId: string, hour: number): Promise<void> {
  // 只在早上 6-10 点检查
  if (hour < 6 || hour > 10) return

  // 检查是否今天已经发送过
  const canSend = await canSendPush(userId, 'morning-report', 24)
  if (!canSend) return

  // TODO: 调用 aiChatService.generateMorningReport
  // 目前简化为直接入队
  await enqueuePush(
    userId,
    'morning-report',
    {
      greeting: '早上好！',
      date: new Date().toISOString().split('T')[0]
    },
    [],
    new Date(),
    120, // 2小时有效
    10 // 高优先级
  )
}

/**
 * 检查周报（每周一 9 点）
 */
async function checkWeeklyReport(
  userId: string,
  hour: number,
  dayOfWeek: number
): Promise<void> {
  // 只在周一 9 点检查
  if (dayOfWeek !== 1 || hour !== 9) return

  // 检查是否本周已经发送过
  const canSend = await canSendPush(userId, 'weekly-report', 168) // 7天
  if (!canSend) return

  // TODO: 调用 aiChatService.generateWeeklyReport
  await enqueuePush(
    userId,
    'weekly-report',
    {
      weekStart: getWeekStart(new Date()),
      weekEnd: new Date().toISOString().split('T')[0]
    },
    [],
    new Date(),
    1440, // 24小时有效
    10 // 高优先级
  )
}

/**
 * 获取本周开始日期
 */
function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 调整周一为开始
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

/**
 * 入队 PR 突破推送
 */
export async function enqueuePRPush(
  userId: string,
  exerciseId: string,
  exerciseName: string,
  newE1rm: number
): Promise<void> {
  // PR 突破不进行去重检查，每次都发送
  await enqueuePush(
    userId,
    'personal-record',
    {
      exerciseId,
      exerciseName,
      newRecord: {
        e1rm: newE1rm,
        date: new Date().toISOString().split('T')[0]
      }
    },
    [
      { id: 'viewDetail', label: '查看详情', action: 'navigate', target: '/pages/pr' },
      { id: 'dismiss', label: '关闭', action: 'dismiss' }
    ],
    new Date(),
    1440,
    20 // 最高优先级
  )
}

/**
 * 入队过度训练预警
 */
export async function enqueueOvertrainingPush(
  userId: string,
  warningData: Record<string, any>
): Promise<void> {
  // 检查是否今天已经发送过
  const canSend = await canSendPush(userId, 'overtraining-warning', 24)
  if (!canSend) return

  await enqueuePush(
    userId,
    'overtraining-warning',
    warningData,
    [
      { id: 'viewRecovery', label: '查看恢复', action: 'navigate', target: '/pages/recovery' },
      { id: 'dismiss', label: '知道了', action: 'dismiss' }
    ],
    new Date(),
    480, // 8小时有效
    15 // 高优先级
  )
}

/**
 * 入队成就解锁推送
 */
export async function enqueueAchievementPush(
  userId: string,
  achievementId: string,
  achievementName: string
): Promise<void> {
  await enqueuePush(
    userId,
    'achievement',
    {
      achievement: {
        id: achievementId,
        name: achievementName,
        description: `你解锁了成就：${achievementName}`,
        icon: '🏆',
        unlockedAt: new Date().toISOString()
      }
    },
    [
      { id: 'share', label: '分享', action: 'share' },
      { id: 'dismiss', label: '关闭', action: 'dismiss' }
    ],
    new Date(),
    1440,
    10
  )
}
