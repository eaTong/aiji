import Koa from 'koa'
import cors from '@koa/cors'
import { koaBody } from 'koa-body'
import router from './routes'
import { errorMiddleware } from './middleware/error'
import { loggerMiddleware } from './middleware/logger'

const app = new Koa()

app.use(errorMiddleware)
app.use(loggerMiddleware)
app.use(cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE'] }))
app.use(koaBody())
app.use(router.routes())
app.use(router.allowedMethods())

export default app