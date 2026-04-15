import { PrismaClient } from '@prisma/client'
import { success, fail } from '../../types'

const prisma = new PrismaClient()

export async function getUsers(params: {
  page: number
  pageSize: number
  keyword?: string
  role?: string
}) {
  const { page = 1, pageSize = 20, keyword, role } = params
  const where: any = {}
  if (keyword) {
    where.OR = [
      { nickname: { contains: keyword } },
      { openid: { contains: keyword } }
    ]
  }
  if (role) where.role = role

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        openid: true,
        nickname: true,
        avatarUrl: true,
        role: true,
        hasCompletedOnboarding: true,
        createdAt: true,
        _count: { select: { trainingLogs: true } }
      }
    }),
    prisma.user.count({ where })
  ])

  return success({ users, total, page, pageSize })
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      weightRecords: { orderBy: { recordedAt: 'desc' }, take: 10 },
      trainingLogs: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 20,
        include: { logEntries: true }
      },
      _count: { select: { trainingLogs: true, achievements: true } }
    }
  })
  if (!user) return fail('用户不存在', 404)
  return success(user)
}

export async function updateUser(id: string, data: { nickname?: string; role?: string }) {
  const user = await prisma.user.update({
    where: { id },
    data: { nickname: data.nickname, role: data.role as any }
  })
  return success(user)
}

export async function disableUser(id: string, disabled: boolean) {
  return success({ id, disabled })
}
