import { PrismaClient, MealType } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateDietRecordData {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  description: string
  estimatedCalories?: number
  protein?: number
  date?: string
}

/**
 * 创建饮食记录
 */
export async function createDietRecord(
  userId: string,
  data: CreateDietRecordData
) {
  // 校验必填字段
  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    throw Object.assign(new Error('饮食描述不能为空'), { status: 400 })
  }

  const date = data.date ? new Date(data.date) : new Date()
  const mealType = MealType[data.mealType.toUpperCase() as keyof typeof MealType]

  const record = await prisma.dietRecord.create({
    data: {
      userId,
      date,
      mealType,
      description: data.description,
      estimatedCalories: data.estimatedCalories,
      protein: data.protein,
    },
  })

  return record
}

/**
 * 批量创建饮食记录（一天多餐）
 */
export async function createDietRecords(
  userId: string,
  meals: Array<{
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    description: string
    estimatedCalories?: number
    protein?: number
  }>,
  date?: string
) {
  const recordDate = date ? new Date(date) : new Date()

  const records = await Promise.all(
    meals.map(async (meal) => {
      const mealType = MealType[meal.type.toUpperCase() as keyof typeof MealType]
      return prisma.dietRecord.upsert({
        where: {
          userId_date_mealType: {
            userId,
            date: recordDate,
            mealType,
          },
        },
        update: {
          description: meal.description,
          estimatedCalories: meal.estimatedCalories,
          protein: meal.protein,
        },
        create: {
          userId,
          date: recordDate,
          mealType,
          description: meal.description,
          estimatedCalories: meal.estimatedCalories,
          protein: meal.protein,
        },
      })
    })
  )

  return records
}

/**
 * 获取用户的饮食记录
 */
export async function getDietRecords(
  userId: string,
  options: { date?: string; days?: number } = {}
) {
  const { date, days = 7 } = options

  let startDate: Date
  if (date) {
    startDate = new Date(date)
  } else {
    startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
  }

  const endDate = new Date()
  if (date) {
    endDate.setDate(endDate.getDate() + 1)
  }

  const records = await prisma.dietRecord.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'desc' },
  })

  return records
}

/**
 * 获取指定日期的饮食记录
 */
export async function getDietRecordsByDate(userId: string, date: string) {
  const startDate = new Date(date)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(date)
  endDate.setHours(23, 59, 59, 999)

  const records = await prisma.dietRecord.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { mealType: 'asc' },
  })

  return records
}

/**
 * 获取单个饮食记录
 */
export async function getDietRecordById(id: string) {
  return prisma.dietRecord.findUnique({
    where: { id },
  })
}

/**
 * 更新饮食记录
 */
export async function updateDietRecord(
  id: string,
  data: Partial<CreateDietRecordData>
) {
  const updateData: any = {}

  if (data.description !== undefined) {
    updateData.description = data.description
  }
  if (data.estimatedCalories !== undefined) {
    updateData.estimatedCalories = data.estimatedCalories
  }
  if (data.protein !== undefined) {
    updateData.protein = data.protein
  }
  if (data.mealType !== undefined) {
    updateData.mealType = MealType[data.mealType.toUpperCase() as keyof typeof MealType]
  }

  return prisma.dietRecord.update({
    where: { id },
    data: updateData,
  })
}

/**
 * 删除饮食记录
 */
export async function deleteDietRecord(id: string) {
  return prisma.dietRecord.delete({
    where: { id },
  })
}

/**
 * 获取日饮食汇总
 */
export async function getDailyDietSummary(userId: string, date: string) {
  const records = await getDietRecordsByDate(userId, date)

  const totalCalories = records.reduce((sum, r) => sum + (r.estimatedCalories || 0), 0)
  const totalProtein = records.reduce((sum, r) => sum + (r.protein || 0), 0)

  return {
    date,
    records,
    summary: {
      totalCalories,
      totalProtein,
      mealCount: records.length,
    },
  }
}