import { PrismaClient, Achievement } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================
// Incentive Service - 成就激励系统
// ============================================

// 成就类型定义
export type AchievementType =
  | 'first_training'      // 首次训练
  | 'first_weight'         // 首次记录体重
  | 'first_measurement'    // 首次记录围度
  | 'week_streak'          // 连续训练一周
  | 'month_streak'         // 连续训练一个月
  | 'first_pr'             // 首次打破PR
  | 'weight_goal'          // 达成体重目标
  | 'volume_master'        // 单次训练容量达人
  | 'dedication'          // 训练认真度

// 成就定义
const ACHIEVEMENT_DEFINITIONS: Record<AchievementType, {
  name: string
  description: string
  icon: string
}> = {
  first_training: {
    name: '初次训练',
    description: '完成了第一次训练记录',
    icon: '🏃'
  },
  first_weight: {
    name: '体重记录',
    description: '首次记录体重数据',
    icon: '⚖️'
  },
  first_measurement: {
    name: '围度记录',
    description: '首次记录身体围度',
    icon: '📏'
  },
  week_streak: {
    name: '坚持一周',
    description: '连续训练达到一周',
    icon: '🔥'
  },
  month_streak: {
    name: '坚持一月',
    description: '连续训练达到一个月',
    icon: '💪'
  },
  first_pr: {
    name: '突破自我',
    description: '打破了自己的个人记录',
    icon: '🏆'
  },
  weight_goal: {
    name: '目标达成',
    description: '达到了设定的体重目标',
    icon: '🎯'
  },
  volume_master: {
    name: '容量达人',
    description: '单次训练总容量超过5000kg',
    icon: '📊'
  },
  dedication: {
    name: '认真训练',
    description: '完成训练后认真记录了感受',
    icon: '✅'
  }
}

/**
 * 检查并解锁成就
 * @param userId 用户ID
 * @param recordType 刚完成的记录类型
 */
export async function checkAndUnlockAchievement(
  userId: string,
  recordType: string
): Promise<Achievement | null> {
  try {
    switch (recordType) {
      case 'weight-record':
        return await checkWeightAchievements(userId)

      case 'training-record':
        return await checkTrainingAchievements(userId)

      case 'measurement-record':
        return await checkMeasurementAchievements(userId)

      default:
        return null
    }
  } catch (error) {
    console.error('[incentiveService] checkAndUnlockAchievement error:', error)
    return null
  }
}

/**
 * 检查体重相关成就
 */
async function checkWeightAchievements(userId: string): Promise<Achievement | null> {
  // 检查是否首次记录体重
  const existingAchievement = await prisma.achievement.findUnique({
    where: { userId_type: { userId, type: 'first_weight' } }
  })

  if (existingAchievement) {
    return null
  }

  // 检查是否已有体重记录
  const weightRecords = await prisma.weightRecord.count({
    where: { userId }
  })

  if (weightRecords >= 1) {
    // 解锁首次体重记录成就
    return await unlockAchievement(userId, 'first_weight')
  }

  // 检查体重目标达成
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { targetWeight: true }
  })

  if (user?.targetWeight) {
    const latestWeight = await prisma.weightRecord.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' }
    })

    if (latestWeight && Math.abs(latestWeight.weight - user.targetWeight) < 1) {
      return await unlockAchievement(userId, 'weight_goal')
    }
  }

  return null
}

/**
 * 检查训练相关成就
 */
async function checkTrainingAchievements(userId: string): Promise<Achievement | null> {
  // 检查是否首次训练
  const firstTrainingAchievement = await prisma.achievement.findUnique({
    where: { userId_type: { userId, type: 'first_training' } }
  })

  if (!firstTrainingAchievement) {
    // 检查是否有训练记录
    const trainingLogs = await prisma.trainingLog.count({
      where: { userId, status: 'COMPLETED' }
    })

    if (trainingLogs >= 1) {
      return await unlockAchievement(userId, 'first_training')
    }
  }

  // 检查连续训练成就
  const streakAchievement = await checkTrainingStreak(userId)
  if (streakAchievement) {
    return streakAchievement
  }

  // 检查容量达人
  const volumeAchievement = await checkVolumeMaster(userId)
  if (volumeAchievement) {
    return volumeAchievement
  }

  // 检查新PR
  const prAchievement = await checkNewPR(userId)
  if (prAchievement) {
    return prAchievement
  }

  return null
}

/**
 * 检查围度相关成就
 */
async function checkMeasurementAchievements(userId: string): Promise<Achievement | null> {
  const existingAchievement = await prisma.achievement.findUnique({
    where: { userId_type: { userId, type: 'first_measurement' } }
  })

  if (existingAchievement) {
    return null
  }

  // 检查是否已有围度记录
  const measurementRecords = await prisma.measurementRecord.count({
    where: { userId }
  })

  if (measurementRecords >= 1) {
    return await unlockAchievement(userId, 'first_measurement')
  }

  return null
}

/**
 * 检查连续训练成就
 */
async function checkTrainingStreak(userId: string): Promise<Achievement | null> {
  // 获取最近30天的训练记录
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const trainingLogs = await prisma.trainingLog.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      startedAt: { gte: thirtyDaysAgo }
    },
    orderBy: { startedAt: 'desc' }
  })

  if (trainingLogs.length === 0) {
    return null
  }

  // 检查是否有连续训练（至少每周3次）
  const weeklyCount = new Map<string, number>()

  for (const log of trainingLogs) {
    const weekStart = getWeekStart(log.startedAt)
    const weekKey = weekStart.toISOString().split('T')[0]
    weeklyCount.set(weekKey, (weeklyCount.get(weekKey) || 0) + 1)
  }

  // 统计连续有训练的周数
  let consecutiveWeeks = 0
  const sortedWeeks = Array.from(weeklyCount.keys()).sort().reverse()

  for (let i = 0; i < sortedWeeks.length; i++) {
    const expectedWeek = new Date(thirtyDaysAgo)
    expectedWeek.setDate(expectedWeek.getDate() + (i * 7))

    if (Math.abs(new Date(sortedWeeks[i]).getTime() - expectedWeek.getTime()) < 7 * 24 * 60 * 60 * 1000) {
      if ((weeklyCount.get(sortedWeeks[i]) || 0) >= 3) {
        consecutiveWeeks++
      }
    } else {
      break
    }
  }

  // 解锁连续一周成就
  if (consecutiveWeeks >= 1) {
    const existingWeek = await prisma.achievement.findUnique({
      where: { userId_type: { userId, type: 'week_streak' } }
    })

    if (!existingWeek) {
      return await unlockAchievement(userId, 'week_streak')
    }
  }

  // 解锁连续一月成就
  if (consecutiveWeeks >= 4) {
    const existingMonth = await prisma.achievement.findUnique({
      where: { userId_type: { userId, type: 'month_streak' } }
    })

    if (!existingMonth) {
      return await unlockAchievement(userId, 'month_streak')
    }
  }

  return null
}

/**
 * 检查容量达人成就
 */
async function checkVolumeMaster(userId: string): Promise<Achievement | null> {
  // 获取最近一次训练
  const latestLog = await prisma.trainingLog.findFirst({
    where: { userId, status: 'COMPLETED' },
    orderBy: { startedAt: 'desc' }
  })

  if (!latestLog || !latestLog.totalVolume) {
    return null
  }

  // 检查是否超过5000kg
  if (latestLog.totalVolume >= 5000) {
    const existing = await prisma.achievement.findUnique({
      where: { userId_type: { userId, type: 'volume_master' } }
    })

    if (!existing) {
      return await unlockAchievement(userId, 'volume_master')
    }
  }

  return null
}

/**
 * 检查新PR成就
 */
async function checkNewPR(userId: string): Promise<Achievement | null> {
  // 获取最近的训练记录
  const recentLogs = await prisma.trainingLog.findMany({
    where: { userId, status: 'COMPLETED' },
    orderBy: { startedAt: 'desc' },
    take: 3,
    include: {
      logEntries: {
        orderBy: { e1rm: 'desc' }
      }
    }
  })

  if (recentLogs.length === 0) {
    return null
  }

  // 检查是否有新的PR
  for (const log of recentLogs) {
    for (const entry of log.logEntries) {
      if (entry.e1rm) {
        // 获取该动作的历史最佳
        const historicalBest = await prisma.logEntry.findFirst({
          where: {
            userId,
            exerciseId: entry.exerciseId,
            e1rm: { not: entry.e1rm as any }
          },
          orderBy: { e1rm: 'desc' }
        })

        // 如果当前entry的e1rm高于历史最佳
        if (historicalBest && entry.e1rm > historicalBest.e1rm!) {
          const existing = await prisma.achievement.findUnique({
            where: { userId_type: { userId, type: 'first_pr' } }
          })

          if (!existing) {
            return await unlockAchievement(userId, 'first_pr')
          }
        }
      }
    }
  }

  return null
}

/**
 * 解锁成就
 */
async function unlockAchievement(
  userId: string,
  type: AchievementType
): Promise<Achievement> {
  const definition = ACHIEVEMENTS[type]

  const achievement = await prisma.achievement.upsert({
    where: {
      userId_type: { userId, type }
    },
    create: {
      userId,
      type,
      name: definition.name,
      description: definition.description,
      icon: definition.icon
    },
    update: {
      unlockedAt: new Date() // 更新时间
    }
  })

  console.log(`[incentiveService] Achievement unlocked: ${type} for user ${userId}`)

  return achievement
}

/**
 * 生成成就卡片
 */
export async function generateAchievementCard(
  achievement: Achievement
): Promise<{
  type: 'card'
  cardType: 'achievement'
  cardData: Record<string, any>
  actions: Array<{ id: string; label: string; action: string; target?: string }>
}> {
  return {
    type: 'card',
    cardType: 'achievement',
    cardData: {
      achievementType: achievement.type,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      unlockedAt: achievement.unlockedAt.toISOString().split('T')[0]
    },
    actions: [
      { id: 'share', label: '分享', action: 'share' },
      { id: 'dismiss', label: '关闭', action: 'dismiss' }
    ]
  }
}

/**
 * 获取用户的所有成就
 */
export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  return await prisma.achievement.findMany({
    where: { userId },
    orderBy: { unlockedAt: 'desc' }
  })
}

/**
 * 获取本周成就统计
 */
export async function getWeeklyAchievementStats(userId: string): Promise<{
  totalAchievements: number
  newThisWeek: number
  recentAchievements: Achievement[]
}> {
  const weekStart = getWeekStart(new Date())

  const [allAchievements, recentAchievements] = await Promise.all([
    prisma.achievement.findMany({
      where: { userId }
    }),
    prisma.achievement.findMany({
      where: {
        userId,
        unlockedAt: { gte: weekStart }
      },
      orderBy: { unlockedAt: 'desc' }
    })
  ])

  return {
    totalAchievements: allAchievements.length,
    newThisWeek: recentAchievements.length,
    recentAchievements
  }
}

// Helper function to get the start of a week (Monday)
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// 修正变量名
const ACHIEVEMENTS = ACHIEVEMENT_DEFINITIONS
