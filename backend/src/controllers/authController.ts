import { Context } from 'koa'
export async function wxLogin(ctx: Context) {
  ctx.body = { code: 0, message: 'ok', data: null }
}