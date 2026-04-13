import Router from '@koa/router'
import { listExercises, getExercise, toggleExerciseFavorite } from '../controllers/exerciseController'
import { authMiddleware } from '../middleware/auth'

const exerciseRouter = new Router({ prefix: '/api/exercises' })

// GET /api/exercises - list exercises with filters
exerciseRouter.get('/', listExercises)

// GET /api/exercises/:id - get single exercise
exerciseRouter.get('/:id', getExercise)

// POST /api/exercises/:id/favorite - toggle favorite (requires auth)
exerciseRouter.post('/:id/favorite', authMiddleware, toggleExerciseFavorite)

export default exerciseRouter