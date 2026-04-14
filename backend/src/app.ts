import Koa from 'koa'
import cors from '@koa/cors'
import { koaBody } from 'koa-body'
import router from './routes'
import { errorMiddleware } from './middleware/error'
import { loggerMiddleware } from './middleware/logger'
import { startPushChecker, stopPushChecker } from './jobs/pushChecker'

const app = new Koa()

app.use(errorMiddleware)
app.use(loggerMiddleware)
app.use(cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE'] }))
app.use(koaBody())
app.use(router.routes())
app.use(router.allowedMethods())

// 启动定时任务
let pushCheckerInterval: ReturnType<typeof setInterval> | null = null

if (process.env.NODE_ENV !== 'test') {
  pushCheckerInterval = startPushChecker()
}

// 优雅关闭
process.on('SIGTERM', () => {
  if (pushCheckerInterval) {
    stopPushChecker(pushCheckerInterval)
  }
})

export default app