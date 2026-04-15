import Router from '@koa/router'
import { login, getProfile, logout } from '../../controllers/admin/authController'
import { adminAuthMiddleware } from '../../middleware/adminAuth'

const router = new Router({ prefix: '/admin/api/auth' })

router.post('/login', login)
router.post('/logout', adminAuthMiddleware, logout)
router.get('/profile', adminAuthMiddleware, getProfile)

export default router
