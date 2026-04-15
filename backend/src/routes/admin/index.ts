import Router from '@koa/router'
import authRouter from './auth'
import usersRouter from './users'
import knowledgeRouter from './knowledge'
import exercisesRouter from './exercises'
import plansRouter from './plans'
import statsRouter from './stats'
import pushRouter from './push'

const router = new Router()

router.use(authRouter.routes())
router.use(usersRouter.routes())
router.use(knowledgeRouter.routes())
router.use(exercisesRouter.routes())
router.use(plansRouter.routes())
router.use(statsRouter.routes())
router.use(pushRouter.routes())

export default router
