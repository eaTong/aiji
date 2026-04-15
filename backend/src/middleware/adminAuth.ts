import { Context, Next } from 'koa'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'

const prisma = new PrismaClient()

export async function adminAuthMiddleware(ctx: Context, next: Next) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    ctx.status = 401
    ctx.body = { code: 401, message: '未授权', data: null }
    return
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string }
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true }
    })
    if (!user || user.role !== 'ADMIN') {
      ctx.status = 403
      ctx.body = { code: 403, message: '无权限', data: null }
      return
    }
    ctx.state.admin = { adminId: user.id }
  } catch (err) {
    ctx.status = 401
    ctx.body = { code: 401, message: 'Token 无效或已过期', data: null }
    return
  }
  await next()
}
