import { PrismaClient, Prisma, LogStatus } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Calculate estimated 1RM using Epley formula
 * weight * (1 + reps / 30)
 * Only calculated when isWarmup === false and reps > 0
 */
export function calcE1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0
  const e1rm = weight * (1 + reps / 30)
  return Math.round(e1rm * 10) / 10
}

/**
 * Start a new training session
 */
export async function startTraining(
  userId: string,
  planId?: string,
  planDayId?: string
): Promise<Prisma.TrainingLogGetPayload<{}>> {
  const log = await prisma.trainingLog.create({
    data: {
      userId,
      planId: planId || null,
      planDayId: planDayId || null,
      status: 'IN_PROGRESS',
    },
  })
  return log
}

/**
 * Add a single set entry to a training log
 */
export async function addLogEntry(
  logId: string,
  exerciseId: string,
  exerciseName: string,
  setNumber: number,
  weight: number,
  reps: number,
  isWarmup = false
): Promise<Prisma.LogEntryGetPayload<{}>> {
  const e1rm = !isWarmup && reps > 0 ? calcE1RM(weight, reps) : null

  const entry = await prisma.logEntry.create({
    data: {
      logId,
      userId: '', // will be set from trainingLog
      exerciseId,
      exerciseName,
      setNumber,
      weight,
      reps,
      isWarmup,
      e1rm,
    },
  })

  // Update userId from the training log
  const trainingLog = await prisma.trainingLog.findUnique({
    where: { id: logId },
    select: { userId: true },
  })

  if (trainingLog) {
    await prisma.logEntry.update({
      where: { id: entry.id },
      data: { userId: trainingLog.userId },
    })
  }

  return { ...entry, userId: trainingLog?.userId || '' }
}

/**
 * Complete a training session - calculates totalVolume and duration
 */
export async function completeTraining(
  logId: string
): Promise<Prisma.TrainingLogGetPayload<{}>> {
  // Fetch all non-warmup entries for this log
  const entries = await prisma.logEntry.findMany({
    where: { logId, isWarmup: false },
  })

  // Calculate total volume (sum of weight * reps for non-warmup sets)
  const totalVolume = entries.reduce((sum, entry) => {
    return sum + entry.weight * entry.reps
  }, 0)

  // Get the training log to calculate duration
  const log = await prisma.trainingLog.findUnique({
    where: { id: logId },
  })

  if (!log) {
    throw Object.assign(new Error('Training log not found'), { status: 404 })
  }

  const duration = log.startedAt
    ? Math.floor((Date.now() - log.startedAt.getTime()) / 1000)
    : null

  return prisma.trainingLog.update({
    where: { id: logId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      duration,
      totalVolume: Math.round(totalVolume * 10) / 10,
    },
  })
}

/**
 * Get training logs for a user (paginated)
 */
export async function getTrainingLogs(
  userId: string,
  limit = 20,
  offset = 0
): Promise<Prisma.TrainingLogGetPayload<{}>[]> {
  return prisma.trainingLog.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

/**
 * Get exercise personal history (last N records)
 */
export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
  limit = 10
): Promise<Prisma.LogEntryGetPayload<{}>[]> {
  return prisma.logEntry.findMany({
    where: { userId, exerciseId },
    orderBy: { completedAt: 'desc' },
    take: limit,
  })
}