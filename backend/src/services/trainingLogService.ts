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
 * Calculate muscle volumes for a given set.
 * Primary muscles get 100% of volume (weight × reps),
 * secondary muscles get 50%.
 */
function calcMuscleVolumes(
  primaryMuscles: string[],
  secondaryMuscles: string[],
  weight: number,
  reps: number,
  isWarmup: boolean
): Record<string, number> {
  if (isWarmup) return {}
  const setVolume = weight * reps
  const volumes: Record<string, number> = {}
  for (const m of primaryMuscles) {
    volumes[m.toLowerCase()] = setVolume
  }
  for (const m of secondaryMuscles) {
    const key = m.toLowerCase()
    volumes[key] = (volumes[key] || 0) + setVolume * 0.5
  }
  // Round to 1 decimal
  for (const k of Object.keys(volumes)) {
    volumes[k] = Math.round(volumes[k] * 10) / 10
  }
  return volumes
}

function parseMuscles(m: unknown): string[] {
  if (Array.isArray(m)) return m.map(String)
  if (typeof m === 'string') {
    try { return JSON.parse(m) } catch { return [] }
  }
  return []
}

/**
 * Add a single set entry to a training log.
 * Computes e1RM and muscle volumes from the associated exercise.
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

  // Fetch exercise to get primary/secondary muscles
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { primaryMuscles: true, secondaryMuscles: true },
  })

  const primary = exercise ? parseMuscles(exercise.primaryMuscles) : []
  const secondary = exercise ? parseMuscles(exercise.secondaryMuscles) : []
  const muscleVolumes = calcMuscleVolumes(primary, secondary, weight, reps, isWarmup)

  // Get userId from the training log first
  const trainingLog = await prisma.trainingLog.findUnique({
    where: { id: logId },
    select: { userId: true },
  })
  const userId = trainingLog?.userId || ''

  const entry = await prisma.logEntry.create({
    data: {
      logId,
      userId,
      exerciseId,
      exerciseName,
      setNumber,
      weight,
      reps,
      isWarmup,
      e1rm,
      muscleVolumes: muscleVolumes as unknown as Prisma.InputJsonValue,
    },
  })

  return { ...entry, userId }
}

/**
 * Complete a training session - calculates totalVolume and duration
 * totalVolume = sum of all muscleVolumes values (primary + weighted secondary)
 */
export async function completeTraining(
  logId: string
): Promise<Prisma.TrainingLogGetPayload<{}>> {
  return prisma.$transaction(async (tx) => {
    // Fetch all non-warmup entries for this log
    const entries = await tx.logEntry.findMany({
      where: { logId, isWarmup: false },
    })

    // Calculate total volume: sum of all muscleVolumes values
    // (primary × 1.0 + secondary × 0.5 already baked in)
    let totalVolume = 0
    for (const entry of entries) {
      const volumes = entry.muscleVolumes as Record<string, number> | null
      if (volumes) {
        for (const v of Object.values(volumes)) {
          totalVolume += v
        }
      }
    }

    // Get the training log to calculate duration
    const log = await tx.trainingLog.findUnique({
      where: { id: logId },
    })

    if (!log) {
      throw Object.assign(new Error('Training log not found'), { status: 404 })
    }

    const duration = log.startedAt
      ? Math.floor((Date.now() - log.startedAt.getTime()) / 1000)
      : null

    return tx.trainingLog.update({
      where: { id: logId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        duration,
        totalVolume: Math.round(totalVolume * 10) / 10,
      },
    })
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
 * Get a single training log with all entries
 */
export async function getTrainingLogById(logId: string): Promise<any> {
  const log = await prisma.trainingLog.findUnique({
    where: { id: logId },
    include: {
      logEntries: {
        orderBy: { completedAt: 'asc' },
      },
    },
  })
  return log
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

/**
 * Get personal record (PR) for an exercise
 * Returns the entry with highest e1rm
 */
export async function getExercisePR(
  userId: string,
  exerciseId: string
): Promise<{ entry: Prisma.LogEntryGetPayload<{}> | null; e1rm: number }> {
  const entries = await prisma.logEntry.findMany({
    where: { userId, exerciseId, isWarmup: false, e1rm: { not: null } },
    orderBy: { e1rm: 'desc' },
    take: 1,
  })

  if (entries.length === 0) {
    return { entry: null, e1rm: 0 }
  }

  return { entry: entries[0], e1rm: entries[0].e1rm || 0 }
}

/**
 * Get previous best PR (second best entry)
 */
export async function getPreviousPR(
  userId: string,
  exerciseId: string
): Promise<{ entry: Prisma.LogEntryGetPayload<{}> | null; e1rm: number }> {
  const entries = await prisma.logEntry.findMany({
    where: { userId, exerciseId, isWarmup: false, e1rm: { not: null } },
    orderBy: { e1rm: 'desc' },
    take: 2,
  })

  if (entries.length < 2) {
    return { entry: null, e1rm: 0 }
  }

  return { entry: entries[1], e1rm: entries[1].e1rm || 0 }
}

/**
 * Get recent PRs across all exercises
 */
export async function getRecentPRs(
  userId: string,
  limit = 10
): Promise<Array<{ exerciseId: string; exerciseName: string; e1rm: number; date: Date }>> {
  // Get all PRs grouped by exercise
  const entries = await prisma.logEntry.findMany({
    where: { userId, isWarmup: false, e1rm: { not: null } },
    orderBy: { completedAt: 'desc' },
  })

  // Group by exercise and get max e1rm
  const prByExercise = new Map<string, { exerciseId: string; exerciseName: string; e1rm: number; date: Date }>()

  for (const entry of entries) {
    if (!entry.e1rm) continue
    const existing = prByExercise.get(entry.exerciseId)
    if (!existing || entry.e1rm > existing.e1rm) {
      prByExercise.set(entry.exerciseId, {
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        e1rm: entry.e1rm,
        date: entry.completedAt || new Date()
      })
    }
  }

  return Array.from(prByExercise.values())
    .sort((a, b) => b.e1rm - a.e1rm)
    .slice(0, limit)
}