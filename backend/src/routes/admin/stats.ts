import Router from '@koa/router'
import { overview, userGrowth, training } from '../../controllers/admin/statsController'
import { adminAuthMiddleware } from '../../middleware/adminAuth'

const router = new Router({ prefix: '/admin/api/stats' })

router.use(adminAuthMiddleware)

router.get('/overview', overview)
router.get('/users', userGrowth)
router.get('/training', training)

export default router
