import Router from '@koa/router'
import authRouter from './auth'
import usersRouter from './users'
import knowledgeRouter from './knowledge'

const router = new Router()

router.use(authRouter.routes())
router.use(usersRouter.routes())
router.use(knowledgeRouter.routes())

export default router
