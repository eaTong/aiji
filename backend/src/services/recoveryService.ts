import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// 肌群基准恢复时间（小时）
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

// 肌群基准周容量（用于容量因子计算）
// 基准值 = 每周该肌群累积约 5000kg 容量时，48h 后基本恢复
const MUSCLE_BASELINE_VOLUME: Record<string, number> = {
  chest: 5000,
  back: 5000,
  legs: 7000,       // 大肌群容量更大
  shoulders: 3000,
  arms: 2500,
  core: 2000,
  upper_chest: 3000,
  lats: 4000,
  quads: 6000,
  hamstrings: 4000,
  glutes: 4000,
  triceps: 2000,
  biceps: 2000,
  abs: 1500,
  side_delts: 2000,
  rear_delts: 2000,
}

export type MuscleScores = Record<string, number>

function parseMuscles(m: unknown): string[] {
  if (Array.isArray(m)) return m.map(String)
  if (typeof m === 'string') {
    try { return JSON.parse(m) } catch { return [] }
  }
  return []
}

/**
 * Compute muscle recovery scores from recent training logs (last 7 days).
 *
 * Volume-weighted recovery formula:
 *   score = min(100, elapsedHours / (recoveryHours × volumeFactor) × 100)
 *
 * volumeFactor = clamp(totalVolume / baselineVolume, 0.5, 2.0)
 * - 低容量训练 → volumeFactor < 1 → 恢复更快
 * - 高容量训练 → volumeFactor > 1 → 恢复更慢
 *
 * 从未训练 → score = 100
 */
export async function computeMuscleScores(
  userId: string,
  date: Date
): Promise<MuscleScores> {
  const sevenDaysAgo = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get all non-warmup entries in last 7 days
  const entries = await prisma.logEntry.findMany({
    where: {
      userId,
      isWarmup: false,
      completedAt: { gte: sevenDaysAgo },
      trainingLog: { status: 'COMPLETED' },
    },
  })

  // Accumulate volume per muscle: { muscle: totalVolume }
  const muscleVolumes: Record<string, number> = {}
  for (const entry of entries) {
    const volumes = entry.muscleVolumes as Record<string, number> | null
    if (!volumes) continue
    for (const [muscle, vol] of Object.entries(volumes)) {
      muscleVolumes[muscle] = (muscleVolumes[muscle] || 0) + vol
    }
  }

  // Get most recent training timestamp per muscle
  const muscleLastTrained: Record<string, Date> = {}
  for (const entry of entries) {
    if (!muscleLastTrained[entry.exerciseId] || entry.completedAt > muscleLastTrained[entry.exerciseId]) {
      muscleLastTrained[entry.exerciseId] = entry.completedAt
    }
  }

  // Calculate scores for all known muscles
  const scores: MuscleScores = {}
  for (const [muscle, recoveryHours] of Object.entries(MUSCLE_RECOVERY_HOURS)) {
    const muscleLower = muscle.toLowerCase()
    const totalVol = muscleVolumes[muscleLower] || 0
    const lastTrained = muscleVolumes[muscleLower + '_at']

    if (totalVol === 0) {
      // 从未训练 → 完全恢复
      scores[muscle] = 100
      continue
    }

    // Find most recent training timestamp for this specific muscle
    let mostRecent: Date | null = null
    for (const entry of entries) {
      const volumes = entry.muscleVolumes as Record<string, number> | null
      if (!volumes || !volumes[muscleLower]) continue
      if (!mostRecent || entry.completedAt > mostRecent) {
        mostRecent = entry.completedAt
      }
    }

    if (!mostRecent) {
      scores[muscle] = 100
      continue
    }

    const hoursElapsed = (date.getTime() - mostRecent.getTime()) / (1000 * 60 * 60)

    // Volume factor: clamp(totalVol / baseline, 0.5, 2.0)
    const baseline = MUSCLE_BASELINE_VOLUME[muscle] || 5000
    const volumeFactor = Math.max(0.5, Math.min(2.0, totalVol / baseline))

    const score = (hoursElapsed / (recoveryHours * volumeFactor)) * 100
    scores[muscle] = Math.min(100, Math.round(score * 10) / 10)
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