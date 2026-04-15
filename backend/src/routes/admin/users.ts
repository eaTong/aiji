import Router from '@koa/router'
import { list, getById, update, disable } from '../../controllers/admin/userController'
import { adminAuthMiddleware } from '../../middleware/adminAuth'

const router = new Router({ prefix: '/admin/api/users' })

router.use(adminAuthMiddleware)

router.get('/', list)
router.get('/:id', getById)
router.put('/:id', update)
router.put('/:id/disable', disable)

export default router
