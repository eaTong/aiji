import { Context, Next } from 'koa'

export async function errorMiddleware(ctx: Context, next: Next) {
  try {
    await next()
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string }
    const status = error.status ?? 500
    const message = error.message ?? 'Internal Server Error'

    ctx.status = status
    ctx.body = { code: status, message, data: null }

    if (status === 500) {
      console.error('[Server Error]', err)
    }
  }
}