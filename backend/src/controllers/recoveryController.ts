import { Context } from 'koa'
import { getRecoveryStatus, updateSleep } from '../services/recoveryService'
import { success } from '../types'
import { AuthContext } from '../types'

export async function getRecoveryStatusHandler(ctx: Context) {
  const userId = (ctx as AuthContext).state.user.userId
  const dateStr = ctx.query.date as string | undefined

  let date: Date
  if (dateStr) {
    date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      ctx.status = 400
      ctx.body = { code: 1, message: 'Invalid date format', data: null }
      return
    }
  } else {
    date = new Date()
  }

  // Normalize to start of day
  date.setUTCHours(0, 0, 0, 0)

  const status = await getRecoveryStatus(userId, date)
  ctx.body = success(status)
}

export async function updateSleepHandler(ctx: Context) {
  const userId = (ctx as AuthContext).state.user.userId
  const { date, sleepHours } = ctx.request.body as {
    date?: string
    sleepHours?: number
  }

  if (!date || sleepHours === undefined) {
    ctx.status = 400
    ctx.body = { code: 1, message: 'date and sleepHours are required', data: null }
    return
  }

  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    ctx.status = 400
    ctx.body = { code: 1, message: 'Invalid date format', data: null }
    return
  }

  if (sleepHours < 0 || sleepHours > 24) {
    ctx.status = 400
    ctx.body = { code: 1, message: 'sleepHours must be between 0 and 24', data: null }
    return
  }

  const status = await updateSleep(userId, dateObj, sleepHours)
  ctx.body = success(status)
}