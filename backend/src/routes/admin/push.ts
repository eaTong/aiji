import Router from '@koa/router'
import { listTemplates, listTasks, createTask, send, listRecords } from '../../controllers/admin/pushController'
import { adminAuthMiddleware } from '../../middleware/adminAuth'

const router = new Router({ prefix: '/admin/api/push' })

router.use(adminAuthMiddleware)

router.get('/templates', listTemplates)
router.get('/tasks', listTasks)
router.post('/tasks', createTask)
router.post('/send', send)
router.get('/records', listRecords)

export default router
