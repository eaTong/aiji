import { PrismaClient } from '@prisma/client'
import { success, fail } from '../../types'

const prisma = new PrismaClient()

export async function getPlans(params: { page: number; pageSize: number; keyword?: string }) {
  const { page = 1, pageSize = 20, keyword } = params
  const where: any = {}
  if (keyword) where.name = { contains: keyword }

  const [plans, total] = await Promise.all([
    prisma.workoutPlan.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nickname: true } },
        _count: { select: { planDays: true } }
      }
    }),
    prisma.workoutPlan.count({ where })
  ])

  return success({ plans, total, page, pageSize })
}

export async function getPlanById(id: string) {
  const plan = await prisma.workoutPlan.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nickname: true } },
      planDays: {
        include: {
          plannedExercises: {
            include: { exercise: true }
          }
        }
      }
    }
  })
  if (!plan) return fail('计划不存在', 404)
  return success(plan)
}

export async function createPlan(data: any) {
  const plan = await prisma.workoutPlan.create({
    data: {
      userId: data.userId,
      name: data.name,
      goal: data.goal,
      weeks: data.weeks || 4,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: 'ACTIVE'
    }
  })
  return success(plan)
}

export async function updatePlan(id: string, data: any) {
  const plan = await prisma.workoutPlan.update({ where: { id }, data })
  return success(plan)
}

export async function deletePlan(id: string) {
  await prisma.workoutPlan.delete({ where: { id } })
  return success(null)
}
