import Router from '@koa/router'
import { wxLogin, devLogin } from '../controllers/authController'

const router = new Router({ prefix: '/api/auth' })
router.post('/wx-login', wxLogin)
router.post('/dev-login', devLogin)

export default router