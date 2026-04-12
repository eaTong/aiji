import { PrismaClient, Goal, Level, Equipment, Phase } from '@prisma/client'

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
}

export async function updateUser(userId: string, input: UpdateProfileInput) {
  return prisma.user.update({ where: { id: userId }, data: input })
}