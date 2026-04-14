import { PrismaClient, Goal, Level, Equipment, FitnessDuration } from '@prisma/client'
import { updateOnboardingProfile } from './userService'
import { recordWeightToday } from './bodyDataService'
import { generateTrainingPlan } from './trainingPlanService'

const prisma = new PrismaClient()

export interface OnboardingData {
  goal: Goal
  level: Level
  equipment: Equipment
  weeklyTrainingDays: number
  height?: number
  currentWeight?: number
  targetWeight?: number
  fitnessDuration: FitnessDuration
}

export interface OnboardingResult {
  profileUpdated: boolean
  weightRecorded: boolean
  onboardingCompleted: boolean
  planId?: string
  planName?: string
}

/**
 * 处理引导问卷提交：
 * 1. 更新用户档案
 * 2. 记录体重（如果提供了）
 * 3. 标记引导完成
 * 4. 生成训练计划
 */
export async function processOnboarding(
  userId: string,
  data: OnboardingData
): Promise<OnboardingResult> {
  // 1. 更新用户档案
  await updateOnboardingProfile(userId, {
    goal: data.goal,
    level: data.level,
    equipment: data.equipment,
    weeklyTrainingDays: data.weeklyTrainingDays,
    height: data.height,
    targetWeight: data.targetWeight,
    fitnessDuration: data.fitnessDuration,
  })

  // 2. 记录体重（如果提供了）
  let weightRecorded = false
  if (data.currentWeight && data.currentWeight > 0) {
    await recordWeightToday(userId, data.currentWeight)
    weightRecorded = true
  }

  // 3. 生成训练计划（默认4周）
  const plan = await generateTrainingPlan(userId, 4)

  return {
    profileUpdated: true,
    weightRecorded,
    onboardingCompleted: true,
    planId: plan.id,
    planName: plan.name,
  }
}

/**
 * 检查用户是否已完成引导
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasCompletedOnboarding: true },
  })
  return user?.hasCompletedOnboarding ?? false
}
