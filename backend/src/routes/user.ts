import Router from '@koa/router'
import { authMiddleware } from '../middleware/auth'
import { getProfile, updateProfile } from '../controllers/userController'

const router = new Router({ prefix: '/api/user' })
router.use(authMiddleware)
router.get('/profile', getProfile)
router.put('/profile', updateProfile)

export default router