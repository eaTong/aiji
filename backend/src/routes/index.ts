import Router from '@koa/router'
import authRouter from './auth'
import userRouter from './user'
import bodyDataRouter from './bodyData'
import exerciseRouter from './exercise'
import trainingLogRouter from './trainingLog'
import recoveryRouter from './recovery'
import trainingPlanRouter from './trainingPlan'
import trainingRouter from './training'
import chatRouter from './chat'

const router = new Router()
router.use(authRouter.routes())
router.use(userRouter.routes())
router.use(bodyDataRouter.routes())
router.use(exerciseRouter.routes())
router.use(trainingLogRouter.routes())
router.use(recoveryRouter.routes())
router.use(trainingPlanRouter.routes())
router.use(trainingRouter.routes())
router.use(chatRouter.routes())

export default router