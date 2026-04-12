import Router from '@koa/router'
import authRouter from './auth'
import userRouter from './user'
import bodyDataRouter from './bodyData'

const router = new Router()
router.use(authRouter.routes())
router.use(userRouter.routes())
router.use(bodyDataRouter.routes())

export default router