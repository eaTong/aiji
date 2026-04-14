import Router from '@koa/router'
import { listExercises, getExercise, toggleExerciseFavorite } from '../controllers/exerciseController'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth'

const exerciseRouter = new Router({ prefix: '/api/exercises' })

// GET /api/exercises - list exercises with filters (favorites 需要认证，普通列表不需要)
exerciseRouter.get('/', optionalAuthMiddleware, listExercises)

// GET /api/exercises/:id - get single exercise
exerciseRouter.get('/:id', authMiddleware, getExercise)

// POST /api/exercises/:id/favorite - toggle favorite (requires auth)
exerciseRouter.post('/:id/favorite', authMiddleware, toggleExerciseFavorite)

export default exerciseRouter