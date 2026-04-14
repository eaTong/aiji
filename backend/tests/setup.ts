import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })
dotenv.config() // also load .env as fallback

import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
})

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

afterEach(async () => {
  // Clean up test data but NOT exercises (they are shared reference data)
  await prisma.plannedExercise.deleteMany()
  await prisma.planDay.deleteMany()
  await prisma.workoutPlan.deleteMany()
  await prisma.logEntry.deleteMany()
  await prisma.trainingLog.deleteMany()
  // Do NOT delete exercises - they are seeded once and shared across tests
  await prisma.recoveryStatus.deleteMany()
  await prisma.progressPhoto.deleteMany()
  await prisma.measurementRecord.deleteMany()
  await prisma.weightRecord.deleteMany()
  await prisma.user.deleteMany()
})