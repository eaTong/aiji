import Router from '@koa/router'
import {
  listPlans,
  generatePlan,
  getPlan,
  markComplete,
  markArchive,
  removePlan,
  getReplacableExercises,
  replaceExercise,
} from '../controllers/trainingPlanController'
import { authMiddleware } from '../middleware/auth'

const trainingPlanRouter = new Router({ prefix: '/api/training-plans' })

// GET /api/training-plans - list user plans
trainingPlanRouter.get('/', authMiddleware, listPlans)

// POST /api/training-plans/generate - AI generate new plan
trainingPlanRouter.post('/generate', authMiddleware, generatePlan)

// GET /api/training-plans/:id - get plan detail with days and exercises
trainingPlanRouter.get('/:id', authMiddleware, getPlan)

// PUT /api/training-plans/:id/complete - mark plan as completed
trainingPlanRouter.put('/:id/complete', authMiddleware, markComplete)

// PUT /api/training-plans/:id/archive - archive plan
trainingPlanRouter.put('/:id/archive', authMiddleware, markArchive)

// DELETE /api/training-plans/:id - delete plan
trainingPlanRouter.delete('/:id', authMiddleware, removePlan)

// GET /api/training-plans/:planId/exercises/:exerciseId/replacable - 获取可替换的动作列表
trainingPlanRouter.get('/:planId/exercises/:exerciseId/replacable', authMiddleware, getReplacableExercises)

// PUT /api/training-plans/:planId/exercises/:exerciseId/replace - 替换动作
trainingPlanRouter.put('/:planId/exercises/:exerciseId/replace', authMiddleware, replaceExercise)

export default trainingPlanRouter