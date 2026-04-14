import { PrismaClient, Goal, Level, Equipment, Phase, FitnessDuration } from '@prisma/client'

const prisma = new PrismaClient()

export async function getUserById(userId: string) {
  return prisma.user.findUniqueOrThrow({ where: { id: userId } })
}

export interface UpdateProfileInput {
  nickname?: string
  height?: number
  targetWeight?: number
  goal?: Goal
  level?: Level
  equipment?: Equipment
  weeklyTrainingDays?: number
  currentPhase?: Phase
  fitnessDuration?: FitnessDuration
}

export async function updateUser(userId: string, input: UpdateProfileInput) {
  return prisma.user.update({ where: { id: userId }, data: input })
}

// 批量更新引导相关的用户档案
export interface UpdateOnboardingProfileInput {
  goal: Goal
  level: Level
  equipment: Equipment
  weeklyTrainingDays: number
  height?: number
  targetWeight?: number
  fitnessDuration: FitnessDuration
}

export async function updateOnboardingProfile(
  userId: string,
  input: UpdateOnboardingProfileInput
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      goal: input.goal,
      level: input.level,
      equipment: input.equipment,
      weeklyTrainingDays: input.weeklyTrainingDays,
      height: input.height,
      targetWeight: input.targetWeight,
      fitnessDuration: input.fitnessDuration,
      hasCompletedOnboarding: true,
    },
  })
}

// 标记用户已完成引导
export async function markOnboardingComplete(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { hasCompletedOnboarding: true },
  })
}