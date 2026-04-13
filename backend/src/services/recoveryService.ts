import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const MUSCLE_RECOVERY_HOURS: Record<string, number> = {
  chest: 48,
  back: 48,
  legs: 72,
  shoulders: 48,
  arms: 36,
  core: 24,
  upper_chest: 48,
  lats: 48,
  quads: 72,
  hamstrings: 72,
  glutes: 48,
  triceps: 36,
  biceps: 36,
  abs: 24,
  side_delts: 48,
  rear_delts: 48,
}

export type MuscleScores = Record<string, number>

function parsePrimaryMuscles(muscles: unknown): string[] {
  if (Array.isArray(muscles)) return muscles.map(String)
  if (typeof muscles === 'string') {
    try {
      const parsed = JSON.parse(muscles)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Compute muscle recovery scores from recent training logs (last 7 days)
 * For each muscle group: score = min(100, (hoursElapsed / recoveryHours) × 100)
 * If muscle was never trained in last 7 days → score = 100 (fully recovered)
 */
export async function computeMuscleScores(
  userId: string,
  date: Date
): Promise<MuscleScores> {
  const sevenDaysAgo = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get all completed log entries within the last 7 days
  const entries = await prisma.logEntry.findMany({
    where: {
      userId,
      completedAt: { gte: sevenDaysAgo },
      trainingLog: { status: 'COMPLETED' },
    },
    include: {
      exercise: { select: { primaryMuscles: true } },
    },
    orderBy: { completedAt: 'desc' },
  })

  // Build a map of muscle -> most recent training timestamp
  const muscleLastTrained: Record<string, Date> = {}
  for (const entry of entries) {
    const primaryMuscles = parsePrimaryMuscles(entry.exercise.primaryMuscles)
    for (const muscle of primaryMuscles) {
      const muscleLower = muscle.toLowerCase()
      if (
        !muscleLastTrained[muscleLower] ||
        entry.completedAt > muscleLastTrained[muscleLower]
      ) {
        muscleLastTrained[muscleLower] = entry.completedAt
      }
    }
  }

  // Calculate scores for all known muscles
  const scores: MuscleScores = {}
  for (const [muscle, recoveryHours] of Object.entries(MUSCLE_RECOVERY_HOURS)) {
    const lastTrained = muscleLastTrained[muscle]
    if (!lastTrained) {
      // Never trained in last 7 days → fully recovered
      scores[muscle] = 100
    } else {
      const hoursElapsed =
        (date.getTime() - lastTrained.getTime()) / (1000 * 60 * 60)
      scores[muscle] = Math.min(100, (hoursElapsed / recoveryHours) * 100)
    }
  }

  return scores
}

/**
 * Calculate overall recovery score from muscle scores and sleep hours
 * score = avg(Object.values(muscleScores)) - sleepPenalty
 * sleepPenalty = max(0, (8 - sleepHours) × 2)
 * Clamp to 0-100
 */
export function computeOverallScore(
  muscleScores: MuscleScores,
  sleepHours: number
): number {
  const values = Object.values(muscleScores)
  if (values.length === 0) return 100

  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const sleepPenalty = Math.max(0, (8 - sleepHours) * 2)
  return Math.max(0, Math.min(100, Math.round(avg - sleepPenalty)))
}

/**
 * Determine recommendation based on overall score
 */
export function computeRecommendation(score: number): string {
  if (score < 50) return 'REST'
  if (score < 75) return 'LIGHT'
  return 'TRAIN'
}

/**
 * Get or compute recovery status for a user on a given date.
 * If no record exists, computes from logs (lazy calculation, doesn't auto-create).
 */
export async function getRecoveryStatus(
  userId: string,
  date: Date
): Promise<Prisma.RecoveryStatusGetPayload<{}> | null> {
  const dateStart = new Date(date)
  dateStart.setHours(0, 0, 0, 0)

  const existing = await prisma.recoveryStatus.findUnique({
    where: { userId_date: { userId, date: dateStart } },
  })

  if (existing) return existing

  // Lazy compute without auto-creating a record
  const muscleScores = await computeMuscleScores(userId, dateStart)
  const sleepHours = 8 // default assumption if not set
  const score = computeOverallScore(muscleScores, sleepHours)
  const recommendation = computeRecommendation(score)

  return {
    id: '',
    userId,
    date: dateStart,
    score,
    sleepHours,
    muscleStatus: muscleScores,
    recommendation,
    soreness: 0,
    fatigue: 0,
    sleepQuality: 0,
    notes: null,
    createdAt: new Date(),
  }
}

/**
 * Update sleep hours for a specific date (recalculates score and recommendation)
 * Uses upsert since @@unique([userId, date]) constraint exists
 */
export async function updateSleep(
  userId: string,
  date: Date,
  sleepHours: number
): Promise<Prisma.RecoveryStatusGetPayload<{}>> {
  const dateStart = new Date(date)
  dateStart.setHours(0, 0, 0, 0)

  // Compute muscle scores (from existing logs)
  const muscleScores = await computeMuscleScores(userId, dateStart)
  const score = computeOverallScore(muscleScores, sleepHours)
  const recommendation = computeRecommendation(score)

  const result = await prisma.recoveryStatus.upsert({
    where: { userId_date: { userId, date: dateStart } },
    update: {
      sleepHours,
      score,
      muscleStatus: muscleScores as unknown as Prisma.InputJsonValue,
      recommendation,
    },
    create: {
      userId,
      date: dateStart,
      sleepHours,
      score,
      muscleStatus: muscleScores as unknown as Prisma.InputJsonValue,
      recommendation,
      soreness: 0,
      fatigue: 0,
      sleepQuality: 0,
    },
  })

  return result
}