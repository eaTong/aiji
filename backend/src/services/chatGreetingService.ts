import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================
// Chat Greeting Service - 聊天初始化问候
// ============================================

export interface GreetingResponse {
  type: 'card' | 'text'
  content?: string
  cardType?: string
  cardData?: Record<string, any>
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
}

/**
 * 生成问候语和未读推送
 * @param userId 用户ID
 */
export async function generateGreetingAndPushes(
  userId: string
): Promise<{
  greeting: GreetingResponse
  unreadPushes: Array<{
    id: string
    cardType: string
    data: Record<string, any>
    actions: any[]
    triggerAt: Date
  }>
}> {
  // 1. 生成问候语
  const greeting = await generateGreeting(userId)

  // 2. 检查并入队周报（每周一 9 点首次打开）
  await checkAndEnqueueWeeklyReport(userId)

  // 3. 获取未读推送
  const unreadPushes = await getUnreadPushes(userId)

  return {
    greeting,
    unreadPushes
  }
}

/**
 * 生成问候语
 * @param userId 用户ID
 */
export async function generateGreeting(userId: string): Promise<GreetingResponse> {
  const now = new Date()
  const hour = now.getHours()

  // 获取用户信息
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { nickname: true }
  })

  const nickname = user?.nickname || '健身达人'

  // 根据时间段生成问候
  let greetingText: string
  let recoveryHint = ''

  if (hour >= 6 && hour < 10) {
    // 早上 6-10 点：早安问候 + 恢复状态提示
    greetingText = `早上好，${nickname}！☀️`
    recoveryHint = await getMorningRecoveryHint(userId)
  } else if (hour >= 10 && hour < 14) {
    // 上午：简短问候 + 训练提醒
    greetingText = `午安，${nickname}！`
    recoveryHint = await getMiddayHint(userId)
  } else if (hour >= 14 && hour < 18) {
    // 下午：简短问候
    greetingText = `下午好，${nickname}！`
    recoveryHint = await getAfternoonHint(userId)
  } else if (hour >= 18 && hour < 22) {
    // 傍晚：训练黄金时间提醒
    greetingText = `晚上好，${nickname}！🌙`
    recoveryHint = await getEveningHint(userId)
  } else {
    // 深夜：简短问候
    greetingText = `夜深了，${nickname}，早点休息！`
    recoveryHint = ''
  }

  const fullGreeting = recoveryHint
    ? `${greetingText} ${recoveryHint}`
    : greetingText

  // 检查今日是否有计划
  const todayPlan = await getTodayPlan(userId)

  if (todayPlan) {
    return {
      type: 'card',
      cardType: 'daily-plan',
      cardData: {
        date: now.toISOString().split('T')[0],
        planName: todayPlan.name,
        dayType: todayPlan.dayType,
        exerciseCount: todayPlan.exerciseCount,
        estimatedDuration: todayPlan.estimatedDuration
      },
      actions: [
        { id: 'start', label: '开始训练', action: 'navigate', target: '/pages/training/start' },
        { id: 'skip', label: '跳过', action: 'dismiss' }
      ]
    }
  }

  return {
    type: 'text',
    content: fullGreeting
  }
}

/**
 * 检查并入队周报（每周一 9 点首次打开）
 */
export async function checkAndEnqueueWeeklyReport(userId: string): Promise<void> {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = 周日, 1 = 周一
  const hour = now.getHours()

  // 只在周一 9 点检查
  if (dayOfWeek !== 1 || hour !== 9) {
    return
  }

  // 检查今天是否已经发送过周报
  const alreadySent = await prisma.pushRecord.findFirst({
    where: {
      userId,
      cardType: 'weekly-report',
      sentAt: {
        gte: new Date(now.toISOString().split('T')[0]) // 今天之内
      }
    }
  })

  if (alreadySent) {
    return
  }

  // 检查是否首次打开（通过查询当天是否有任何聊天消息）
  const firstOpenToday = await prisma.chatMessage.findFirst({
    where: {
      userId,
      createdAt: {
        gte: new Date(now.toISOString().split('T')[0])
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  // 只在首次打开时推送周报
  if (!firstOpenToday) {
    await enqueueWeeklyReport(userId)
  }
}

/**
 * 入队周报推送
 */
async function enqueueWeeklyReport(userId: string): Promise<void> {
  const now = new Date()

  // 获取上周数据
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // 本周一
  weekStart.setHours(0, 0, 0, 0)

  // 获取上周训练统计
  const trainingLogs = await prisma.trainingLog.findMany({
    where: {
      userId,
      startedAt: { gte: weekStart },
      status: 'COMPLETED'
    },
    include: {
      logEntries: true
    }
  })

  const totalTrainingDays = trainingLogs.length
  const totalVolume = trainingLogs.reduce(
    (sum, log) => sum + (log.totalVolume || 0),
    0
  )
  const totalDuration = trainingLogs.reduce(
    (sum, log) => sum + (log.duration || 0),
    0
  )

  // 获取体重变化
  const weekAgoWeight = await prisma.weightRecord.findFirst({
    where: { userId, recordedAt: { lte: weekAgo } },
    orderBy: { recordedAt: 'desc' }
  })

  const latestWeight = await prisma.weightRecord.findFirst({
    where: { userId },
    orderBy: { recordedAt: 'desc' }
  })

  const weightChange = weekAgoWeight && latestWeight
    ? (latestWeight.weight - weekAgoWeight.weight).toFixed(1)
    : null

  // 获取新达成的成就
  const newAchievements = await prisma.achievement.findMany({
    where: {
      userId,
      unlockedAt: { gte: weekStart }
    },
    orderBy: { unlockedAt: 'desc' }
  })

  // 入队周报卡片
  const { enqueuePush } = await import('./pushService')
  await enqueuePush(
    userId,
    'weekly-report',
    {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: now.toISOString().split('T')[0],
      totalTrainingDays,
      totalVolume: Math.round(totalVolume),
      totalDuration: Math.round(totalDuration / 60), // 转换为分钟
      weightChange,
      latestWeight: latestWeight?.weight || null,
      newAchievements: newAchievements.map(a => ({
        type: a.type,
        name: a.name,
        description: a.description
      }))
    },
    [
      { id: 'viewDetail', label: '查看详情', action: 'navigate', target: '/pages/report/weekly' },
      { id: 'dismiss', label: '关闭', action: 'dismiss' }
    ],
    now,
    120, // 2小时有效
    10 // 高优先级
  )
}

/**
 * 获取未读推送
 */
async function getUnreadPushes(userId: string): Promise<Array<{
  id: string
  cardType: string
  data: Record<string, any>
  actions: any[]
  triggerAt: Date
}>> {
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

  return pushes.map(p => ({
    id: p.id,
    cardType: p.cardType,
    data: p.data as Record<string, any>,
    actions: (p.actions || []) as any[],
    triggerAt: p.triggerAt
  }))
}

/**
 * 获取早上恢复状态提示
 */
async function getMorningRecoveryHint(userId: string): Promise<string> {
  try {
    const today = new Date().toISOString().split('T')[0]

    const recovery = await prisma.recoveryStatus.findUnique({
      where: {
        userId_date: { userId, date: new Date(today) }
      }
    })

    if (!recovery) {
      return '来记录一下今天的恢复状态吧！'
    }

    if (recovery.recommendation === 'REST') {
      return '身体恢复得不错，今天适合轻度活动或休息。'
    } else if (recovery.recommendation === 'LIGHT') {
      return '状态还行，可以做些轻松的训练。'
    } else if (recovery.recommendation === 'TRAIN') {
      return '状态满满，今天适合高强度训练！💪'
    }

    return '来记录一下今天的恢复状态吧！'
  } catch {
    return '来记录一下今天的恢复状态吧！'
  }
}

/**
 * 获取午间提示
 */
async function getMiddayHint(userId: string): Promise<string> {
  // 检查上午是否有训练记录
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const hasTrainedMorning = await prisma.trainingLog.findFirst({
    where: {
      userId,
      startedAt: { gte: today },
      status: 'COMPLETED'
    }
  })

  if (hasTrainedMorning) {
    return '上午训练辛苦了，记得补充营养！'
  }

  return '今天还没训练，要动起来吗？'
}

/**
 * 获取下午提示
 */
async function getAfternoonHint(userId: string): Promise<string> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayLogs = await prisma.trainingLog.findMany({
    where: {
      userId,
      startedAt: { gte: today }
    }
  })

  if (todayLogs.length > 0) {
    const completed = todayLogs.filter(l => l.status === 'COMPLETED').length
    return `今天已完成 ${completed} 次训练，继续加油！`
  }

  return '下午训练效果也不错，要来一发吗？'
}

/**
 * 获取傍晚提示
 */
async function getEveningHint(userId: string): Promise<string> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayLogs = await prisma.trainingLog.findFirst({
    where: {
      userId,
      startedAt: { gte: today }
    }
  })

  if (todayLogs) {
    if (todayLogs.status === 'COMPLETED') {
      return '今天的训练已完成，真棒！🏆'
    } else {
      return '还有训练没完成，加油！'
    }
  }

  // 检查用户最近的训练频率
  const recentLogs = await prisma.trainingLog.findMany({
    where: {
      userId,
      startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      status: 'COMPLETED'
    },
    orderBy: { startedAt: 'desc' }
  })

  if (recentLogs.length === 0) {
    return '今天还没训练，趁着状态好来一发？'
  }

  return '晚上是训练的黄金时间，不要错过！'
}

/**
 * 获取今日计划
 */
export async function getTodayPlan(userId: string): Promise<{
  name: string
  dayType: string
  exerciseCount: number
  estimatedDuration: number
} | null> {
  const now = new Date()
  const dayOfWeek = now.getDay() || 7 // 转换为 1-7

  // 查找今天的活跃计划
  const todayPlan = await prisma.workoutPlan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      startDate: { lte: now },
      endDate: { gte: now }
    },
    include: {
      planDays: {
        where: { dayOfWeek },
        include: {
          plannedExercises: true
        }
      }
    }
  })

  if (!todayPlan || todayPlan.planDays.length === 0) {
    return null
  }

  const day = todayPlan.planDays[0]

  // 计算预计时长（每个动作约3分钟，包括休息）
  const estimatedDuration = day.plannedExercises.reduce(
    (sum, ex) => sum + ex.sets * 3 + (ex.restSeconds || 60) / 60,
    0
  )

  return {
    name: todayPlan.name,
    dayType: day.dayType,
    exerciseCount: day.plannedExercises.length,
    estimatedDuration: Math.round(estimatedDuration)
  }
}
