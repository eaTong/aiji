import { Context } from 'koa'
import { getOverviewStats, getUserGrowthStats, getTrainingStats } from '../../services/admin/statsService'

export async function overview(ctx: Context) {
  const result = await getOverviewStats()
  ctx.body = result
}

export async function userGrowth(ctx: Context) {
  const { startDate, endDate } = ctx.query as { startDate?: string; endDate?: string }
  const result = await getUserGrowthStats({ startDate: startDate || '', endDate: endDate || '' })
  ctx.body = result
}

export async function training(ctx: Context) {
  const { startDate, endDate } = ctx.query as { startDate?: string; endDate?: string }
  const result = await getTrainingStats({ startDate, endDate })
  ctx.body = result
}
