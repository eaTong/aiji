import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
})

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

afterEach(async () => {
  await prisma.progressPhoto.deleteMany()
  await prisma.measurementRecord.deleteMany()
  await prisma.weightRecord.deleteMany()
  await prisma.user.deleteMany()
})