import { Context } from 'koa'
import { getWxOpenid, loginOrRegister } from '../services/authService'
import { success, fail } from '../types'

export async function wxLogin(ctx: Context) {
  const { code } = ctx.request.body as { code?: string }
  if (!code) {
    ctx.status = 400
    ctx.body = fail('code 不能为空', 400)
    return
  }
  const openid = await getWxOpenid(code)
  const result = await loginOrRegister(openid)
  ctx.body = success(result)
}

export async function devLogin(ctx: Context) {
  if (process.env.NODE_ENV === 'production') {
    ctx.status = 404
    ctx.body = fail('Not Found', 404)
    return
  }
  const { openid } = ctx.request.body as { openid?: string }
  if (!openid) {
    ctx.status = 400
    ctx.body = fail('openid 不能为空', 400)
    return
  }
  const result = await loginOrRegister(openid)
  ctx.body = success(result)
}