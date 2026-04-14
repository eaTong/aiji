import Router from '@koa/router'
import { completeOnboarding, getOnboardingStatus } from '../controllers/onboardingController'
import { authMiddleware } from '../middleware/auth'

const onboardingRouter = new Router({ prefix: '/api/onboarding' })

// POST /api/onboarding/complete - 提交问卷，完成初始化并生成计划
onboardingRouter.post('/complete', authMiddleware, completeOnboarding)

// GET /api/onboarding/status - 获取引导状态
onboardingRouter.get('/status', authMiddleware, getOnboardingStatus)

export default onboardingRouter
