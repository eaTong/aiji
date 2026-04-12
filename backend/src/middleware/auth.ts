import { Context, Next } from 'koa'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export async function authMiddleware(ctx: Context, next: Next) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    ctx.status = 401
    ctx.body = { code: 401, message: '未授权', data: null }
    return
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string }
    ctx.state.user = { userId: payload.userId }
    await next()
  } catch {
    ctx.status = 401
    ctx.body = { code: 401, message: 'Token 无效或已过期', data: null }
  }
}