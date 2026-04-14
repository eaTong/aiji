import { PrismaClient, PhotoAngle } from '@prisma/client'

const prisma = new PrismaClient()

// ---- 体重 ----

export async function createWeightRecord(userId: string, weight: number, recordedAt: string, note?: string) {
  const date = new Date(recordedAt)
  const existing = await prisma.weightRecord.findUnique({
    where: { userId_recordedAt: { userId, recordedAt: date } },
  })
  if (existing) {
    throw Object.assign(new Error('该日期已有体重记录'), { status: 409 })
  }
  return prisma.weightRecord.create({ data: { userId, weight, recordedAt: date, note } })
}

// 记录今日体重（引导问卷专用，如果今日已有记录则更新）
export async function recordWeightToday(userId: string, weight: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const existing = await prisma.weightRecord.findUnique({
    where: { userId_recordedAt: { userId, recordedAt: today } },
  })
  if (existing) {
    return prisma.weightRecord.update({
      where: { id: existing.id },
      data: { weight },
    })
  }
  return prisma.weightRecord.create({
    data: { userId, weight, recordedAt: today },
  })
}

export async function getWeightRecords(userId: string, startDate: string, endDate: string) {
  const records = await prisma.weightRecord.findMany({
    where: {
      userId,
      recordedAt: { gte: new Date(startDate), lte: new Date(endDate) },
    },
    orderBy: { recordedAt: 'asc' },
  })

  // 计算 7 日滑动平均
  const withAvg = records.map((rec, idx) => {
    const window = records.slice(Math.max(0, idx - 6), idx + 1)
    const avg = window.reduce((sum, r) => sum + r.weight, 0) / window.length
    return { ...rec, sevenDayAvg: Math.round(avg * 10) / 10 }
  })

  return { records: withAvg }
}

// ---- 围度 ----

export interface MeasurementInput {
  waist?: number
  hip?: number
  chest?: number
  leftArm?: number
  rightArm?: number
  leftThigh?: number
  rightThigh?: number
  leftCalf?: number
  rightCalf?: number
  bodyFat?: number
  recordedAt: string
}

export async function createMeasurementRecord(userId: string, input: MeasurementInput) {
  const { recordedAt, ...rest } = input
  return prisma.measurementRecord.create({
    data: { userId, ...rest, recordedAt: new Date(recordedAt) },
  })
}

export async function getMeasurementRecords(userId: string, startDate: string, endDate: string) {
  return prisma.measurementRecord.findMany({
    where: {
      userId,
      recordedAt: { gte: new Date(startDate), lte: new Date(endDate) },
    },
    orderBy: { recordedAt: 'asc' },
  })
}

// ---- 进度照片 ----

export async function createProgressPhoto(userId: string, photoUrl: string, angle: PhotoAngle, recordedAt: string) {
  return prisma.progressPhoto.create({
    data: { userId, photoUrl, angle, recordedAt: new Date(recordedAt) },
  })
}

export async function getProgressPhotos(userId: string) {
  return prisma.progressPhoto.findMany({
    where: { userId },
    orderBy: { recordedAt: 'desc' },
  })
}