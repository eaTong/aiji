import Router from '@koa/router'
import { list, getById, create, update, remove } from '../../controllers/admin/exerciseController'
import { adminAuthMiddleware } from '../../middleware/adminAuth'

const router = new Router({ prefix: '/admin/api/exercises' })

router.use(adminAuthMiddleware)

router.get('/', list)
router.get('/:id', getById)
router.post('/', create)
router.put('/:id', update)
router.delete('/:id', remove)

export default router
