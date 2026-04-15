import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { env } from '../../config/env'
import { success, fail } from '../../types'

const prisma = new PrismaClient()

export async function adminLogin(username: string, password: string) {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  if (username !== adminUsername || password !== adminPassword) {
    return fail('用户名或密码错误', 401)
  }

  let adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN', nickname: username }
  })

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        openid: `admin_${username}_${Date.now()}`,
        nickname: username,
        role: 'ADMIN'
      }
    })
  }

  const token = jwt.sign(
    { userId: adminUser.id, role: 'ADMIN' },
    env.jwtSecret,
    { expiresIn: '7d' }
  )

  return success({ token, userId: adminUser.id, nickname: adminUser.nickname })
}

export async function getAdminProfile(adminId: string) {
  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, nickname: true, role: true, createdAt: true }
  })
  if (!user) return fail('用户不存在', 404)
  return success(user)
}
