import { Context } from 'koa'
import { getTrainingRecommendation } from '../services/trainingRecommendService'
import { saveTrainingRecord as saveRecord, SaveTrainingRecordInput } from '../services/trainingRecordService'
import { success } from '../types'
import { AuthContext } from '../types'

export async function recommendTraining(ctx: Context) {
  const userId = (ctx as AuthContext).state.user.userId
  const { forceRefresh = false } = ctx.request.body as { forceRefresh?: boolean }

  const result = await getTrainingRecommendation({ userId, forceRefresh })
  ctx.body = success(result)
}

export async function saveTrainingRecord(ctx: Context) {
  const userId = (ctx as AuthContext).state.user.userId
  const input = ctx.request.body as SaveTrainingRecordInput

  const result = await saveRecord({ ...input, userId })
  ctx.body = success(result)
}