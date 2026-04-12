import Router from '@koa/router'
import { Context } from 'koa'
import { authMiddleware } from '../middleware/auth'

const router = new Router({ prefix: '/api/body-data' })
router.use(authMiddleware)

// Placeholder routes - full implementation in Task 7
router.post('/weight', async (ctx: Context) => { ctx.body = { code: 0, message: 'ok', data: null } })
router.get('/weight', async (ctx: Context) => { ctx.body = { code: 0, message: 'ok', data: { records: [] } } })
router.post('/measurements', async (ctx: Context) => { ctx.body = { code: 0, message: 'ok', data: null } })
router.get('/measurements', async (ctx: Context) => { ctx.body = { code: 0, message: 'ok', data: [] } })
router.post('/photos', async (ctx: Context) => { ctx.body = { code: 0, message: 'ok', data: null } })
router.get('/photos', async (ctx: Context) => { ctx.body = { code: 0, message: 'ok', data: [] } })

export default router