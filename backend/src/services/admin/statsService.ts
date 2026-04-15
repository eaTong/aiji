import { PrismaClient } from '@prisma/client'
import { success } from '../../types'

const prisma = new PrismaClient()

export async function getOverviewStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalUsers, todayNewUsers, totalTrainingLogs, todayTrainingLogs] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.user.count({ where: { role: 'USER', createdAt: { gte: today } } }),
    prisma.trainingLog.count({ where: { status: 'COMPLETED' } }),
    prisma.trainingLog.count({ where: { status: 'COMPLETED', completedAt: { gte: today } } })
  ])

  return success({
    totalUsers,
    todayNewUsers,
    totalTrainingLogs,
    todayTrainingLogs
  })
}

export async function getUserGrowthStats(params: { startDate: string; endDate: string }) {
  const { startDate, endDate } = params
  const start = new Date(startDate)
  const end = new Date(endDate)

  const users = await prisma.user.findMany({
    where: { role: 'USER', createdAt: { gte: start, lte: end } },
    select: { createdAt: true }
  })

  const dateMap = new Map<string, number>()
  for (const user of users) {
    const date = user.createdAt.toISOString().split('T')[0]
    dateMap.set(date, (dateMap.get(date) || 0) + 1)
  }

  return success(Array.from(dateMap.entries()).map(([date, count]) => ({ date, count })))
}

export async function getTrainingStats(params: { startDate?: string; endDate?: string }) {
  const where: any = { status: 'COMPLETED' }
  if (params.startDate) where.completedAt = { ...where.completedAt, gte: new Date(params.startDate) }
  if (params.endDate) where.completedAt = { ...where.completedAt, lte: new Date(params.endDate) }

  const [logs, popularExercises] = await Promise.all([
    prisma.trainingLog.findMany({
      where,
      include: { logEntries: true }
    }),
    prisma.logEntry.groupBy({
      by: ['exerciseName'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    })
  ])

  const totalVolume = logs.reduce((sum, log) => sum + (log.totalVolume || 0), 0)

  return success({
    totalLogs: logs.length,
    totalVolume,
    popularExercises: popularExercises.map(e => ({ name: e.exerciseName, count: e._count.id }))
  })
}
