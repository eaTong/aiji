import { PrismaClient } from '@prisma/client'
import { success } from '../../types'

const prisma = new PrismaClient()

// Push Templates - stored in cache/config, here we just track usage
export async function getPushTemplates() {
  return success([
    { id: '1', name: '训练提醒', type: 'training_reminder' },
    { id: '2', name: '恢复建议', type: 'recovery_suggestion' },
    { id: '3', name: '新内容推送', type: 'new_content' }
  ])
}

export async function createPushTask(data: any) {
  // Create push task in queue
  const task = await prisma.pushQueue.create({
    data: {
      userId: data.userId || '', // empty for broadcast
      cardType: data.cardType,
      data: data.data || {},
      actions: data.actions,
      triggerAt: new Date(data.triggerAt),
      expiresAt: new Date(data.expiresAt),
      priority: data.priority || 0
    }
  })
  return success(task)
}

export async function getPushTasks(params: { page: number; pageSize: number }) {
  const { page = 1, pageSize = 20 } = params

  const [tasks, total] = await Promise.all([
    prisma.pushQueue.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.pushQueue.count()
  ])

  return success({ tasks, total, page, pageSize })
}

export async function sendPushNow(data: { userId?: string; cardType: string; data: any }) {
  // Immediate push - set triggerAt to now
  const task = await prisma.pushQueue.create({
    data: {
      userId: data.userId || '',
      cardType: data.cardType,
      data: data.data || {},
      triggerAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      priority: 100 // High priority
    }
  })
  return success(task)
}

export async function getPushRecords(params: { page: number; pageSize: number }) {
  const { page = 1, pageSize = 20 } = params

  const [records, total] = await Promise.all([
    prisma.pushRecord.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { sentAt: 'desc' },
      include: { user: { select: { nickname: true } } }
    }),
    prisma.pushRecord.count()
  ])

  return success({ records, total, page, pageSize })
}
