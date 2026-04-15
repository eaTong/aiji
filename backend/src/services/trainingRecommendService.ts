import { PrismaClient, Goal, Equipment, ExerciseCategory } from '@prisma/client'

const prisma = new PrismaClient()

export interface RecommendInput {
  userId: string
  forceRefresh?: boolean
  quickMode?: boolean  // 快速训练模式
}

export interface RecommendOutput {
  type: 'new_recommendation' | 'existing_plan' | 'rest_day' | 'completed_today' | 'need_goal' | 'overtraining_warning'
  message?: string
  options?: string[]
  suggestions?: string[]
  warnings?: string[]  // 过度训练预警信息
  muscleScores?: Record<string, number>  // 肌群恢复分数（用于热力图）
  overallScore?: number  // 整体恢复分数
  training?: {
    name: string
    duration: number
    type: string
    targetMuscle: string
    exercises: {
      name: string
      sets: number
      reps: string
      lastWeight?: number
    }[]
    reason: string
  }
  completedTraining?: {
    name: string
    duration: number
  }
}

// 快速训练模式时间限制（分钟）
const QUICK_TRAINING_TIME_LIMIT = 20

// 目标到肌群的映射
const GOAL_MUSCLE_MAP: Record<Goal, ExerciseCategory[]> = {
  LOSE_FAT: [ExerciseCategory.CARDIO, ExerciseCategory.LEGS, ExerciseCategory.CHEST],
  GAIN_MUSCLE: [ExerciseCategory.CHEST, ExerciseCategory.BACK, ExerciseCategory.LEGS, ExerciseCategory.SHOULDERS, ExerciseCategory.ARMS],
  BODY_SHAPE: [ExerciseCategory.CHEST, ExerciseCategory.BACK, ExerciseCategory.SHOULDERS, ExerciseCategory.ARMS],
  IMPROVE_FITNESS: [ExerciseCategory.CARDIO, ExerciseCategory.LEGS, ExerciseCategory.CORE],
}

// 肌群英文到中文映射
const MUSCLE_NAME_MAP: Record<string, string> = {
  chest: '胸部',
  back: '背部',
  legs: '腿部',
  shoulders: '肩部',
  arms: '手臂',
  core: '核心',
  cardio: '心肺',
}

// 肌群到主肌群分类的映射
const MUSCLE_TO_CATEGORY: Record<string, ExerciseCategory> = {
  chest: ExerciseCategory.CHEST,
  upper_chest: ExerciseCategory.CHEST,
  back: ExerciseCategory.BACK,
  lats: ExerciseCategory.BACK,
  legs: ExerciseCategory.LEGS,
  quads: ExerciseCategory.LEGS,
  hamstrings: ExerciseCategory.LEGS,
  glutes: ExerciseCategory.LEGS,
  shoulders: ExerciseCategory.SHOULDERS,
  side_delts: ExerciseCategory.SHOULDERS,
  rear_delts: ExerciseCategory.SHOULDERS,
  arms: ExerciseCategory.ARMS,
  biceps: ExerciseCategory.ARMS,
  triceps: ExerciseCategory.ARMS,
  core: ExerciseCategory.CORE,
  abs: ExerciseCategory.CORE,
}

/**
 * 获取用户最近7天的训练肌群
 */
async function getRecentTrainedMuscles(userId: string): Promise<Record<string, Date>> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const entries = await prisma.logEntry.findMany({
    where: {
      userId,
      isWarmup: false,
      completedAt: { gte: sevenDaysAgo },
      trainingLog: { status: 'COMPLETED' },
    },
    include: {
      exercise: {
        select: { primaryMuscles: true },
      },
    },
  })

  const muscleLastTrained: Record<string, Date> = {}
  for (const entry of entries) {
    const primaryMuscles = typeof entry.exercise.primaryMuscles === 'string'
      ? JSON.parse(entry.exercise.primaryMuscles)
      : entry.exercise.primaryMuscles

    for (const muscle of primaryMuscles as string[]) {
      const muscleLower = muscle.toLowerCase()
      if (!muscleLastTrained[muscleLower] || entry.completedAt > muscleLastTrained[muscleLower]) {
        muscleLastTrained[muscleLower] = entry.completedAt
      }
    }
  }

  return muscleLastTrained
}

/**
 * 获取今日已完成的训练
 */
async function getTodayCompletedTraining(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  return prisma.trainingLog.findFirst({
    where: {
      userId,
      status: 'COMPLETED',
      completedAt: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      logEntries: true,
    },
  })
}

/**
 * 根据目标获取适合的肌群（优先选择恢复较好的）
 */
function selectTargetMuscles(
  goal: Goal,
  muscleScores: Record<string, number>,
  recentlyTrained: Record<string, Date>
): { category: ExerciseCategory; reason: string } {
  const goalCategories = GOAL_MUSCLE_MAP[goal] || [ExerciseCategory.CHEST]
  const now = Date.now()

  // 找出恢复最好的且最近没练的肌群
  let bestCategory = goalCategories[0]
  let bestScore = 0
  let bestReason = ''

  for (const category of goalCategories) {
    // 计算该分类的平均恢复分数
    let totalScore = 0
    let count = 0
    for (const [muscle, score] of Object.entries(muscleScores)) {
      const cat = MUSCLE_TO_CATEGORY[muscle]
      if (cat === category) {
        totalScore += score
        count++
      }
    }

    if (count === 0) {
      // 从未训练过该肌群
      const categoryName = MUSCLE_NAME_MAP[category.toLowerCase()] || category
      return { category, reason: `你已经很久没练${categoryName}了，恢复得很好` }
    }

    const avgScore = totalScore / count
    const hoursSinceTrained = recentlyTrained[category.toLowerCase()]
      ? (now - recentlyTrained[category.toLowerCase()].getTime()) / (1000 * 60 * 60)
      : Infinity

    // 评分 = 恢复分数 * 训练间隔因子（越久没练越高）
    const intervalFactor = Math.min(2, hoursSinceTrained / 48)
    const finalScore = avgScore * intervalFactor

    if (finalScore > bestScore) {
      bestScore = finalScore
      bestCategory = category
      const categoryName = MUSCLE_NAME_MAP[category.toLowerCase()] || category
      const daysSince = Math.round(hoursSinceTrained / 24)
      bestReason = daysSince > 0
        ? `你已经${daysSince}天没练${categoryName}了，${categoryName}恢复情况良好`
        : `${categoryName}恢复情况良好`
    }
  }

  return { category: bestCategory, reason: bestReason }
}

/**
 * 获取推荐的动作列表
 */
async function getRecommendedExercises(
  category: ExerciseCategory,
  equipment: Equipment,
  userId: string,
  limit = 4
) {
  // 查询动作库
  const exercises = await prisma.exercise.findMany({
    where: {
      category,
      equipment,
      isCustom: false,
    },
    take: limit,
    orderBy: {
      // 优先选择用户最喜欢的，然后是最近常用的
      isFavorite: 'desc',
    },
  })

  // 获取用户历史记录中的重量
  const exerciseIds = exercises.map(e => e.id)
  const recentEntries = await prisma.logEntry.findMany({
    where: {
      userId,
      exerciseId: { in: exerciseIds },
      isWarmup: false,
    },
    orderBy: { completedAt: 'desc' },
    take: 100,
  })

  // 计算每个动作的最后重量
  const lastWeightMap: Record<string, number> = {}
  for (const entry of recentEntries) {
    if (lastWeightMap[entry.exerciseId] === undefined) {
      lastWeightMap[entry.exerciseId] = entry.weight
    }
  }

  return exercises.map(e => {
    const sets = 4 // 默认4组
    return {
      name: e.name,
      sets,
      reps: e.category === ExerciseCategory.CARDIO ? '20-30分钟' : '8-12',
      lastWeight: lastWeightMap[e.id],
    }
  })
}

/**
 * 获取快速训练的动作列表（限制动作数量）
 */
async function getQuickExercises(
  category: ExerciseCategory,
  equipment: Equipment,
  userId: string,
  limit = 2
) {
  // 快速模式只取2个动作
  return getRecommendedExercises(category, equipment, userId, limit)
}

/**
 * 主推荐函数
 */
export async function getTrainingRecommendation(
  input: RecommendInput
): Promise<RecommendOutput> {
  const { userId, forceRefresh = false, quickMode = false } = input

  // 1. 获取用户信息
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 })
  }

  // 2. 检查目标是否设置
  if (!user.goal) {
    return {
      type: 'need_goal',
      message: '要给你推荐训练，先了解一下你的健身目标~',
      options: ['减脂', '增肌', '塑形', '提升体能'],
    }
  }

  // 3. 检查今日是否已完成训练
  const todayCompleted = await getTodayCompletedTraining(userId)
  if (todayCompleted && !forceRefresh) {
    const duration = todayCompleted.duration
      ? Math.round(todayCompleted.duration / 60)
      : 30
    return {
      type: 'completed_today',
      message: '你今天已经练过了！',
      completedTraining: {
        name: '已完成训练',
        duration,
      },
      suggestions: ['安排拉伸', '轻度有氧'],
      options: ['安排拉伸', '轻度有氧', '查看周报'],
    }
  }

  // 4. 获取肌群恢复状态
  const { computeMuscleScores, computeOverallScore } = await import('./recoveryService')
  const muscleScores = await computeMuscleScores(userId, new Date())
  const overallScore = computeOverallScore(muscleScores, 8)

  // 5. 获取最近训练的肌群
  const recentlyTrained = await getRecentTrainedMuscles(userId)

  // 6. 如果恢复分数太低，建议休息
  if (overallScore < 50) {
    return {
      type: 'rest_day',
      message: '身体恢复不够，建议今天休息~',
      suggestions: ['安排拉伸', '轻度有氧', '冥想放松'],
      options: ['安排拉伸', '轻度有氧', '查看周报'],
      muscleScores,
      overallScore,
    }
  }

  // 6.5 过度训练预警（恢复分数在50-60之间）
  const warnings: string[] = []
  if (overallScore < 60) {
    warnings.push('身体尚未完全恢复，注意控制训练强度')
  }

  // 7. 选择目标肌群
  const { category, reason } = selectTargetMuscles(user.goal, muscleScores, recentlyTrained)
  const categoryName = MUSCLE_NAME_MAP[category.toLowerCase()] || category

  // 8. 获取推荐动作（快速模式限制为2个动作）
  const exercises = quickMode
    ? await getQuickExercises(category, user.equipment, userId, 2)
    : await getRecommendedExercises(category, user.equipment, userId)

  if (exercises.length === 0) {
    return {
      type: 'need_goal',
      message: '动作库暂无该类型动作，请先添加动作~',
      options: ['去添加动作'],
    }
  }

  // 9. 确定训练时长（快速模式限制在20分钟内）
  const duration = quickMode
    ? QUICK_TRAINING_TIME_LIMIT
    : exercises.length * 10 + 10 // 每组约10分钟 + 热身

  // 10. 确定训练类型
  const typeMap: Record<Goal, string> = {
    LOSE_FAT: '减脂',
    GAIN_MUSCLE: '增肌',
    BODY_SHAPE: '塑形',
    IMPROVE_FITNESS: '提升体能',
  }

  const result: RecommendOutput = {
    type: warnings.length > 0 ? 'overtraining_warning' : 'new_recommendation',
    training: {
      name: quickMode ? `${categoryName}快速训练` : `${categoryName}力量训练`,
      duration,
      type: typeMap[user.goal],
      targetMuscle: category.toLowerCase(),
      exercises: quickMode
        ? exercises.map(ex => ({ ...ex, sets: 3 })) // 快速模式固定3组
        : exercises,
      reason: quickMode ? '快速训练模式，适合时间紧张时使用' : reason,
    },
    muscleScores,
    overallScore,
  }

  if (warnings.length > 0) {
    result.warnings = warnings
    result.suggestions = ['安排拉伸', '轻度有氧', '冥想放松']
    result.options = ['开始训练', '安排拉伸', '查看热力图']
  }

  return result
}