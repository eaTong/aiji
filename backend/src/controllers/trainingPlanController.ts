import { Context } from 'koa'
import {
  generateTrainingPlan,
  getUserPlans,
  getPlanDetail,
  completePlan,
  archivePlan,
  deletePlan,
} from '../services/trainingPlanService'
import { success } from '../types'
import { AuthContext } from '../types'

/**
 * List all plans for the authenticated user
 * GET /api/training-plans
 */
export async function listPlans(ctx: Context) {
  const userId = (ctx as AuthContext).state.user.userId
  const plans = await getUserPlans(userId)
  ctx.body = success(plans)
}

/**
 * Generate a new AI training plan for the authenticated user
 * POST /api/training-plans/generate
 */
export async function generatePlan(ctx: Context) {
  const userId = (ctx as AuthContext).state.user.userId
  const { weeks } = (ctx.request.body as { weeks?: number }) || {}
  const planWeeks = weeks && weeks > 0 && weeks <= 52 ? weeks : 4

  const plan = await generateTrainingPlan(userId, planWeeks)
  ctx.body = success(plan)
}

/**
 * Get plan detail with days and exercises
 * GET /api/training-plans/:id
 */
export async function getPlan(ctx: Context) {
  const { id } = ctx.params
  const plan = await getPlanDetail(id)
  ctx.body = success(plan)
}

/**
 * Mark a plan as completed
 * PUT /api/training-plans/:id/complete
 */
export async function markComplete(ctx: Context) {
  const { id } = ctx.params
  const plan = await completePlan(id)
  ctx.body = success(plan)
}

/**
 * Archive a plan
 * PUT /api/training-plans/:id/archive
 */
export async function markArchive(ctx: Context) {
  const { id } = ctx.params
  const plan = await archivePlan(id)
  ctx.body = success(plan)
}

/**
 * Delete a plan
 * DELETE /api/training-plans/:id
 */
export async function removePlan(ctx: Context) {
  const { id } = ctx.params
  await deletePlan(id)
  ctx.body = success(null, 'Plan deleted')
}