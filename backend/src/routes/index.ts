import Router from '@koa/router'
import authRouter from './auth'
import userRouter from './user'
import bodyDataRouter from './bodyData'
import exerciseRouter from './exercise'
import trainingLogRouter from './trainingLog'
import recoveryRouter from './recovery'

const router = new Router()
router.use(authRouter.routes())
router.use(userRouter.routes())
router.use(bodyDataRouter.routes())
router.use(exerciseRouter.routes())
router.use(trainingLogRouter.routes())
router.use(recoveryRouter.routes())

export default router