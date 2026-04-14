import Router from '@koa/router'
import {
  createTrainingLog,
  addEntry,
  finishTraining,
  listTrainingLogs,
  getTrainingLogHandler,
  getExerciseHistoryHandler,
} from '../controllers/trainingLogController'
import { authMiddleware } from '../middleware/auth'

const trainingLogRouter = new Router({ prefix: '/api/training-logs' })

// POST /api/training-logs - start a new training log
trainingLogRouter.post('/', authMiddleware, createTrainingLog)

// POST /api/training-logs/entries - add a set entry
trainingLogRouter.post('/entries', authMiddleware, addEntry)

// POST /api/training-logs/finish - complete a training log
trainingLogRouter.post('/finish', authMiddleware, finishTraining)

// GET /api/training-logs - list recent logs (paginated)
trainingLogRouter.get('/', authMiddleware, listTrainingLogs)

// GET /api/training-logs/:id - get a single log with entries
trainingLogRouter.get('/:id', authMiddleware, getTrainingLogHandler)

// GET /api/training-logs/exercise/:exerciseId/history - get exercise history
trainingLogRouter.get(
  '/exercise/:exerciseId/history',
  authMiddleware,
  getExerciseHistoryHandler
)

export default trainingLogRouter