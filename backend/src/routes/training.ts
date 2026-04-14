import Router from '@koa/router'
import { recommendTraining } from '../controllers/trainingController'
import { saveTrainingRecord } from '../controllers/trainingController'
import { authMiddleware } from '../middleware/auth'

const trainingRouter = new Router({ prefix: '/api/training' })

// POST /api/training/recommend - get training recommendation
trainingRouter.post('/recommend', authMiddleware, recommendTraining)

// POST /api/training/record - save training record
trainingRouter.post('/record', authMiddleware, saveTrainingRecord)

export default trainingRouter