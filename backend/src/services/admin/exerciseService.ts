import { PrismaClient, ExerciseCategory, Equipment } from '@prisma/client'
import { success, fail } from '../../types'

const prisma = new PrismaClient()

export async function getExercises(params: { page: number; pageSize: number; keyword?: string; category?: string }) {
  const { page = 1, pageSize = 20, keyword, category } = params
  const where: any = {}
  if (keyword) where.OR = [{ name: { contains: keyword } }, { nameEn: { contains: keyword } }]
  if (category) where.category = category as ExerciseCategory

  const [exercises, total] = await Promise.all([
    prisma.exercise.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, nameEn: true, category: true, equipment: true, isCustom: true, createdAt: true }
    }),
    prisma.exercise.count({ where })
  ])

  return success({ exercises, total, page, pageSize })
}

export async function getExerciseById(id: string) {
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: { exerciseMuscles: { include: { muscle: true } } }
  })
  if (!exercise) return fail('动作不存在', 404)
  return success(exercise)
}

export async function createExercise(data: any) {
  const exercise = await prisma.exercise.create({
    data: {
      name: data.name,
      nameEn: data.nameEn,
      category: data.category as ExerciseCategory,
      equipment: data.equipment as Equipment,
      primaryMuscles: data.primaryMuscles || [],
      secondaryMuscles: data.secondaryMuscles || [],
      instructions: data.instructions,
      instructionsZh: data.instructionsZh,
      imageUrls: data.imageUrls,
      videoUrl: data.videoUrl
    }
  })
  return success(exercise)
}

export async function updateExercise(id: string, data: any) {
  const exercise = await prisma.exercise.update({ where: { id }, data })
  return success(exercise)
}

export async function deleteExercise(id: string) {
  await prisma.exercise.delete({ where: { id } })
  return success(null)
}
