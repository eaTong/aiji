import Router from '@koa/router'
import {
  getRecoveryStatusHandler,
  updateSleepHandler,
} from '../controllers/recoveryController'
import { authMiddleware } from '../middleware/auth'

const recoveryRouter = new Router({ prefix: '/api/recovery' })

// GET /api/recovery?date=YYYY-MM-DD — get recovery status (defaults to today)
recoveryRouter.get('/', authMiddleware, getRecoveryStatusHandler)

// POST /api/recovery/sleep — update sleep (body: { date, sleepHours })
recoveryRouter.post('/sleep', authMiddleware, updateSleepHandler)

export default recoveryRouter