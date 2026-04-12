import Router from '@koa/router'
import { wxLogin } from '../controllers/authController'

const router = new Router({ prefix: '/api/auth' })
router.post('/wx-login', wxLogin)

export default router