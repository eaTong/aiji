import { Context } from 'koa'
import { success } from '../types'
import { AuthContext } from '../types'
import { processOnboarding, hasCompletedOnboarding } from '../services/onboardingService'
import { Goal, Level, Equipment, FitnessDuration } from '@prisma/client'

export interface OnboardingCompleteBody {
  goal: Goal
  level: Level
  equipment: Equipment
  weeklyTrainingDays: number
  height?: number
  currentWeight?: number
  targetWeight?: number
  fitnessDuration: FitnessDuration
}

/**
 * 提交引导问卷答案，完成初始化并生成计划
 * POST /api/onboarding/complete
 */
export async function completeOnboarding(ctx: Context) {
  const userId = (ctx as AuthContext).state.user.userId
  const body = ctx.request.body as OnboardingCompleteBody

  // 验证必填字段
  if (!body.goal || !body.level || !body.equipment || !body.fitnessDuration) {
    ctx.status = 400
    ctx.body = { code: 400, message: '缺少必填字段', data: null }
    return
  }

  if (!body.weeklyTrainingDays || body.weeklyTrainingDays < 1 || body.weeklyTrainingDays > 7) {
    ctx.status = 400
    ctx.body = { code: 400, message: '每周训练天数必须在1-7之间', data: null }
    return
  }

  const result = await processOnboarding(userId, {
    goal: body.goal,
    level: body.level,
    equipment: body.equipment,
    weeklyTrainingDays: body.weeklyTrainingDays,
    height: body.height,
    currentWeight: body.currentWeight,
    targetWeight: body.targetWeight,
    fitnessDuration: body.fitnessDuration,
  })

  ctx.body = success(result)
}

/**
 * 获取引导状态
 * GET /api/onboarding/status
 */
export async function getOnboardingStatus(ctx: Context) {
  const userId = (ctx as AuthContext).state.user.userId
  const completed = await hasCompletedOnboarding(userId)
  ctx.body = success({ hasCompletedOnboarding: completed })
}
