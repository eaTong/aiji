import { Context, Next } from 'koa'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

// 可选认证：有 token 则解析 userId，无 token 也放行
export async function optionalAuthMiddleware(ctx: Context, next: Next) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (token) {
    try {
      const payload = jwt.verify(token, env.jwtSecret) as { userId: string }
      ctx.state.user = { userId: payload.userId }
    } catch {
      // token 无效时忽略，ctx.state.user 保持 undefined
    }
  }
  await next()
}

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
  } catch (err) {
    console.error('[JWT Verify Error]', (err as Error).message)
    ctx.status = 401
    ctx.body = { code: 401, message: 'Token 无效或已过期', data: null }
    return
  }
  await next()
}