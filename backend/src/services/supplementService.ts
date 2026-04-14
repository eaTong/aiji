import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateSupplementData {
  supplement: string
  dosage?: string
  timing?: string
  note?: string
  date?: string
}

/**
 * 创建补剂记录
 */
export async function createSupplementRecord(
  userId: string,
  data: CreateSupplementData
) {
  const date = data.date ? new Date(data.date) : new Date()

  const record = await prisma.supplementRecord.create({
    data: {
      userId,
      date,
      supplement: data.supplement,
      dosage: data.dosage,
      timing: data.timing,
      note: data.note,
    },
  })

  return record
}

/**
 * 获取用户的补剂记录
 */
export async function getSupplementRecords(
  userId: string,
  options: { date?: string; days?: number } = {}
) {
  const { date, days = 7 } = options

  let startDate: Date
  if (date) {
    startDate = new Date(date)
  } else {
    startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
  }

  const endDate = new Date()
  if (date) {
    endDate.setDate(endDate.getDate() + 1)
  }

  const records = await prisma.supplementRecord.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'desc' },
  })

  return records
}

/**
 * 获取单个补剂记录
 */
export async function getSupplementRecordById(id: string) {
  return await prisma.supplementRecord.findUnique({
    where: { id },
  })
}

/**
 * 删除补剂记录
 */
export async function deleteSupplementRecord(id: string) {
  return await prisma.supplementRecord.delete({
    where: { id },
  })
}

/**
 * 获取用户最近的补剂记录（用于 AI 上下文）
 */
export async function getRecentSupplementRecords(userId: string, take = 5) {
  return await prisma.supplementRecord.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take,
  })
}
