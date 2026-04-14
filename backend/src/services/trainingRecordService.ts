import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

export interface ExerciseSetInput {
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number
  weight: number
  weightUnit?: 'kg' | 'lb'
  isWarmup?: boolean
}

export interface SaveTrainingRecordInput {
  userId: string
  date: string // YYYY-MM-DD
  trainingType: string
  exercises: ExerciseSetInput[]
  notes?: string
}

export interface SaveTrainingRecordOutput {
  id: string
  totalVolume: number
  e1rm: Record<string, number>
  message: string
}

/**
 * 计算单组容量
 */
function calcSetVolume(weight: number, reps: number): number {
  return weight * reps
}

/**
 * 计算 E1RM (Epley公式)
 */
function calcE1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

/**
 * 保存训练记录
 */
export async function saveTrainingRecord(
  input: SaveTrainingRecordInput
): Promise<SaveTrainingRecordOutput> {
  const { userId, date, trainingType, exercises, notes } = input

  // 创建训练日志
  const trainingLog = await prisma.trainingLog.create({
    data: {
      userId,
      status: 'COMPLETED',
      startedAt: new Date(date),
      completedAt: new Date(),
    },
  })

  let totalVolume = 0
  const e1rmMap: Record<string, number> = {}

  // 逐个保存动作组
  for (const exercise of exercises) {
    // 查找动作以获取肌肉信息
    const exerciseRecord = await prisma.exercise.findUnique({
      where: { id: exercise.exerciseId },
      select: { primaryMuscles: true, secondaryMuscles: true },
    })

    const primaryMuscles = exerciseRecord?.primaryMuscles
      ? (typeof exerciseRecord.primaryMuscles === 'string'
          ? JSON.parse(exerciseRecord.primaryMuscles)
          : exerciseRecord.primaryMuscles)
      : []

    const secondaryMuscles = exerciseRecord?.secondaryMuscles
      ? (typeof exerciseRecord.secondaryMuscles === 'string'
          ? JSON.parse(exerciseRecord.secondaryMuscles)
          : exerciseRecord.secondaryMuscles)
      : []

    // 为每一组创建记录
    for (let setNumber = 1; setNumber <= exercise.sets; setNumber++) {
      const weight = exercise.weight
      const reps = exercise.reps
      const isWarmup = exercise.isWarmup || false

      // 计算肌肉容量
      const muscleVolumes: Record<string, number> = {}
      if (!isWarmup) {
        const setVolume = calcSetVolume(weight, reps)
        totalVolume += setVolume

        for (const muscle of primaryMuscles as string[]) {
          muscleVolumes[muscle.toLowerCase()] = setVolume
        }
        for (const muscle of secondaryMuscles as string[]) {
          const key = muscle.toLowerCase()
          muscleVolumes[key] = (muscleVolumes[key] || 0) + setVolume * 0.5
        }
      }

      // 计算 E1RM
      const e1rm = !isWarmup && reps > 0 ? calcE1RM(weight, reps) : null

      // 更新 E1RM 记录（取最高值）
      if (e1rm !== null) {
        const key = exercise.exerciseName
        if (!e1rmMap[key] || e1rm > e1rmMap[key]) {
          e1rmMap[key] = e1rm
        }
      }

      await prisma.logEntry.create({
        data: {
          userId,
          logId: trainingLog.id,
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          setNumber,
          weight,
          reps,
          isWarmup,
          e1rm,
          muscleVolumes: muscleVolumes as unknown as Prisma.InputJsonValue,
        },
      })
    }
  }

  // 更新训练日志的总容量
  await prisma.trainingLog.update({
    where: { id: trainingLog.id },
    data: { totalVolume: Math.round(totalVolume * 10) / 10 },
  })

  const volumeStr = totalVolume >= 1000
    ? `${(totalVolume / 1000).toFixed(1)}t`
    : `${Math.round(totalVolume)}kg`

  return {
    id: trainingLog.id,
    totalVolume: Math.round(totalVolume * 10) / 10,
    e1rm: e1rmMap,
    message: `已记录！${trainingType}，容量${volumeStr}`,
  }
}