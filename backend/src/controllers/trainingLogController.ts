import { Context } from 'koa'
import {
  startTraining,
  addLogEntry,
  completeTraining,
  getTrainingLogs,
  getExerciseHistory,
} from '../services/trainingLogService'
import { success } from '../types'
import { AuthContext } from '../types'

export async function createTrainingLog(ctx: Context) {
  const { planId, planDayId } = ctx.request.body as {
    planId?: string
    planDayId?: string
  }
  const userId = (ctx as AuthContext).state.user.userId

  const log = await startTraining(userId, planId, planDayId)
  ctx.body = success(log)
}

export async function addEntry(ctx: Context) {
  const { logId, exerciseId, exerciseName, setNumber, weight, reps, isWarmup } =
    ctx.request.body as {
      logId: string
      exerciseId: string
      exerciseName: string
      setNumber: number
      weight: number
      reps: number
      isWarmup?: boolean
    }

  const entry = await addLogEntry(
    logId,
    exerciseId,
    exerciseName,
    setNumber,
    weight,
    reps,
    isWarmup
  )
  ctx.body = success(entry)
}

export async function finishTraining(ctx: Context) {
  const { logId } = ctx.request.body as { logId: string }

  const log = await completeTraining(logId)
  ctx.body = success(log)
}

export async function listTrainingLogs(ctx: Context) {
  const userId = (ctx as AuthContext).state.user.userId
  const limit = parseInt(ctx.query.limit as string) || 20
  const offset = parseInt(ctx.query.offset as string) || 0

  const logs = await getTrainingLogs(userId, limit, offset)
  ctx.body = success(logs)
}

export async function getExerciseHistoryHandler(ctx: Context) {
  const userId = (ctx as AuthContext).state.user.userId
  const { exerciseId } = ctx.params
  const limit = parseInt(ctx.query.limit as string) || 10

  const history = await getExerciseHistory(userId, exerciseId, limit)
  ctx.body = success(history)
}