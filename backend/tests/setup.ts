import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })
dotenv.config() // also load .env as fallback

import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
})

// 跟踪每个测试创建的用户 ID，afterEach 只清理这些用户的数据
const _testUserIds = new Set<string>()

export function trackUser(userId: string) {
  _testUserIds.add(userId)
}

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

afterEach(async () => {
  const ids = [..._testUserIds]
  _testUserIds.clear()

  if (ids.length === 0) return

  // 按依赖顺序删除，只删除本次测试创建的用户数据
  await prisma.achievement.deleteMany({ where: { userId: { in: ids } } })
  await prisma.pushRecord.deleteMany({ where: { userId: { in: ids } } })
  await prisma.pushQueue.deleteMany({ where: { userId: { in: ids } } })
  await prisma.chatMessage.deleteMany({ where: { userId: { in: ids } } })
  await prisma.chatSession.deleteMany({ where: { userId: { in: ids } } })
  // plannedExercise / planDay 没有直接 userId，先查 plan IDs
  const plans = await prisma.workoutPlan.findMany({
    where: { userId: { in: ids } },
    select: { id: true },
  })
  const planIds = plans.map(p => p.id)
  if (planIds.length > 0) {
    const planDays = await prisma.planDay.findMany({
      where: { planId: { in: planIds } },
      select: { id: true },
    })
    const planDayIds = planDays.map(p => p.id)
    if (planDayIds.length > 0) {
      await prisma.plannedExercise.deleteMany({ where: { planDayId: { in: planDayIds } } })
    }
    await prisma.planDay.deleteMany({ where: { planId: { in: planIds } } })
  }
  await prisma.workoutPlan.deleteMany({ where: { userId: { in: ids } } })
  await prisma.logEntry.deleteMany({ where: { userId: { in: ids } } })
  await prisma.trainingLog.deleteMany({ where: { userId: { in: ids } } })
  // Do NOT delete exercises - they are seeded once and shared across tests
  await prisma.recoveryStatus.deleteMany({ where: { userId: { in: ids } } })
  await prisma.progressPhoto.deleteMany({ where: { userId: { in: ids } } })
  await prisma.measurementRecord.deleteMany({ where: { userId: { in: ids } } })
  await prisma.weightRecord.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
})
