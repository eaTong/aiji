import { PrismaClient, ExerciseCategory, Equipment } from '@prisma/client'

const prisma = new PrismaClient()

export interface ExerciseFilter {
  category?: ExerciseCategory
  equipment?: Equipment
  keyword?: string
  favorites?: boolean
  userId?: string
}

export async function getExercises(filter: ExerciseFilter): Promise<any[]> {
  const where: any = {}

  if (filter.category) {
    where.category = filter.category
  }

  if (filter.equipment) {
    where.equipment = filter.equipment
  }

  if (filter.keyword) {
    where.OR = [
      { name: { contains: filter.keyword } },
      { nameEn: { contains: filter.keyword } },
    ]
  }

  // Favorites filter: show user's favorited custom exercises OR favorited copies of system exercises
  if (filter.favorites && filter.userId) {
    where.isFavorite = true
    where.userId = filter.userId
  }

  const exercises = await prisma.exercise.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  // If favorites not specified, also include system exercises (isCustom=false, userId=null)
  if (!filter.favorites) {
    const systemExercises = await prisma.exercise.findMany({
      where: {
        ...where,
        isCustom: false,
        userId: null,
      },
      orderBy: { name: 'asc' },
    })

    // Merge and deduplicate by name+category (custom user copies take precedence)
    const exerciseMap = new Map<string, any>()
    for (const ex of systemExercises) {
      const key = `${ex.name}-${ex.category}`
      if (!exerciseMap.has(key)) {
        exerciseMap.set(key, ex)
      }
    }
    for (const ex of exercises) {
      const key = `${ex.name}-${ex.category}`
      exerciseMap.set(key, ex)
    }

    return Array.from(exerciseMap.values())
  }

  return exercises
}

export async function getExerciseById(id: string): Promise<any> {
  return prisma.exercise.findUnique({
    where: { id },
  })
}

export async function toggleFavorite(userId: string, exerciseId: string): Promise<any> {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
  })

  if (!exercise) {
    throw Object.assign(new Error('Exercise not found'), { status: 404 })
  }

  // If this is a system exercise (isCustom=false, userId=null), create a user-specific copy
  if (!exercise.isCustom && !exercise.userId) {
    // Check if user already has a custom copy
    const existingCopy = await prisma.exercise.findFirst({
      where: {
        userId,
        name: exercise.name,
        category: exercise.category,
        isCustom: true,
      },
    })

    if (existingCopy) {
      // Toggle favorite on existing copy
      return prisma.exercise.update({
        where: { id: existingCopy.id },
        data: { isFavorite: !existingCopy.isFavorite },
      })
    }

    // Create a new favorite copy
    return prisma.exercise.create({
      data: {
        name: exercise.name,
        nameEn: exercise.nameEn,
        category: exercise.category,
        equipment: exercise.equipment,
        primaryMuscles: exercise.primaryMuscles as any,
        secondaryMuscles: exercise.secondaryMuscles as any,
        instructions: exercise.instructions,
        commonMistakes: exercise.commonMistakes,
        videoUrl: exercise.videoUrl,
        isCustom: true,
        isFavorite: true,
        userId,
      },
    })
  }

  // For custom exercises, just toggle the favorite flag
  return prisma.exercise.update({
    where: { id: exerciseId },
    data: { isFavorite: !exercise.isFavorite },
  })
}