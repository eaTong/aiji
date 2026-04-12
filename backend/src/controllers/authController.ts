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