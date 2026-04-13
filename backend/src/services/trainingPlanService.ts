import {
  PrismaClient,
  Goal,
  Equipment,
  ExerciseCategory,
  PlanStatus,
  Prisma,
} from '@prisma/client'

const prisma = new PrismaClient()

export type { Goal, Equipment, ExerciseCategory, PlanStatus }

// ============== Types ==============

export interface UserProfile {
  goal: Goal
  level: string
  equipment: Equipment
  weeklyTrainingDays: number
}

export interface DayTemplate {
  dayOfWeek: number // 1-7
  type: string
  categories: ExerciseCategory[]
  secondary: ExerciseCategory[]
}

export interface SelectedExercise {
  exerciseId: string
  sets: number
  reps: string
  order: number
}

export interface GeneratedDay {
  dayOfWeek: number
  dayType: string
  exercises: SelectedExercise[]
}

export interface RepsConfig {
  repsRange: string
  sets: number
}

// ============== Goal Templates ==============

const GOAL_TEMPLATES: Record<Goal, DayTemplate[]> = {
  GAIN_MUSCLE: [
    { dayOfWeek: 1, type: '胸部+三头', categories: ['CHEST'], secondary: ['ARMS'] },
    { dayOfWeek: 2, type: '背部+二头', categories: ['BACK'], secondary: ['ARMS'] },
    { dayOfWeek: 3, type: '休息', categories: [], secondary: [] },
    { dayOfWeek: 4, type: '腿部', categories: ['LEGS'], secondary: [] },
    { dayOfWeek: 5, type: '肩部+手臂', categories: ['SHOULDERS', 'ARMS'], secondary: [] },
    { dayOfWeek: 6, type: '全身', categories: ['CHEST', 'BACK', 'LEGS'], secondary: [] },
    { dayOfWeek: 7, type: '休息', categories: [], secondary: [] },
  ],
  LOSE_FAT: [
    { dayOfWeek: 1, type: '上肢推', categories: ['CHEST', 'SHOULDERS'], secondary: ['ARMS'] },
    { dayOfWeek: 2, type: '下肢', categories: ['LEGS'], secondary: [] },
    { dayOfWeek: 3, type: '有氧', categories: ['CARDIO'], secondary: [] },
    { dayOfWeek: 4, type: '上肢拉', categories: ['BACK', 'SHOULDERS'], secondary: ['ARMS'] },
    { dayOfWeek: 5, type: '下肢', categories: ['LEGS'], secondary: [] },
    { dayOfWeek: 6, type: '全身', categories: ['CHEST', 'BACK', 'LEGS', 'SHOULDERS'], secondary: [] },
    { dayOfWeek: 7, type: '休息', categories: [], secondary: [] },
  ],
  BODY_SHAPE: [
    { dayOfWeek: 1, type: '上肢', categories: ['CHEST', 'BACK', 'SHOULDERS'], secondary: ['ARMS'] },
    { dayOfWeek: 2, type: '下肢', categories: ['LEGS'], secondary: ['CORE'] },
    { dayOfWeek: 3, type: '休息', categories: [], secondary: [] },
    { dayOfWeek: 4, type: '上肢', categories: ['CHEST', 'BACK', 'SHOULDERS'], secondary: ['ARMS'] },
    { dayOfWeek: 5, type: '下肢', categories: ['LEGS'], secondary: ['CORE'] },
    { dayOfWeek: 6, type: '核心+有氧', categories: ['CORE', 'CARDIO'], secondary: [] },
    { dayOfWeek: 7, type: '休息', categories: [], secondary: [] },
  ],
  IMPROVE_FITNESS: [
    { dayOfWeek: 1, type: '推', categories: ['CHEST', 'SHOULDERS'], secondary: ['ARMS'] },
    { dayOfWeek: 2, type: '拉', categories: ['BACK', 'ARMS'], secondary: [] },
    { dayOfWeek: 3, type: '腿', categories: ['LEGS'], secondary: ['CORE'] },
    { dayOfWeek: 4, type: '推', categories: ['CHEST', 'SHOULDERS'], secondary: ['ARMS'] },
    { dayOfWeek: 5, type: '拉', categories: ['BACK', 'ARMS'], secondary: [] },
    { dayOfWeek: 6, type: '功能训练', categories: ['CORE'], secondary: ['LEGS'] },
    { dayOfWeek: 7, type: '休息', categories: [], secondary: [] },
  ],
}

// ============== Equipment Filter ==============

const EQUIPMENT_ALLOWED: Record<Equipment, Equipment[]> = {
  GYM: ['GYM', 'DUMBBELL', 'BODYWEIGHT'],
  DUMBBELL: ['DUMBBELL', 'BODYWEIGHT'],
  BODYWEIGHT: ['BODYWEIGHT'],
}

// ============== Reps Config by Goal ==============

const REPS_CONFIG: Record<Goal, RepsConfig> = {
  GAIN_MUSCLE: { repsRange: '8-12', sets: 4 },
  LOSE_FAT: { repsRange: '12-15', sets: 4 },
  BODY_SHAPE: { repsRange: '10-15', sets: 3 },
  IMPROVE_FITNESS: { repsRange: '8-12', sets: 4 },
}

// ============== Plan Name Templates ==============

const PLAN_NAME_TEMPLATES: Record<Goal, string> = {
  GAIN_MUSCLE: '增肌计划',
  LOSE_FAT: '减脂计划',
  BODY_SHAPE: '塑形计划',
  IMPROVE_FITNESS: '体能提升计划',
}

// ============== Helper Functions ==============

/**
 * Get next Monday's date
 */
function getNextMonday(): Date {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilMonday)
  nextMonday.setHours(0, 0, 0, 0)
  return nextMonday
}

/**
 * Adjust schedule based on weeklyTrainingDays
 * Returns training days that fit within the requested frequency
 */
function adjustSchedule(template: DayTemplate[], weeklyTrainingDays: number): DayTemplate[] {
  if (weeklyTrainingDays >= 6) {
    // Use full template
    return template
  }

  if (weeklyTrainingDays >= 4) {
    // Skip some rest days, keep 4-5 training days
    return template.filter((day) => day.categories.length > 0)
  }

  if (weeklyTrainingDays >= 3) {
    // Take every other training day
    const trainingDays = template.filter((day) => day.categories.length > 0)
    const result: DayTemplate[] = []
    const interval = Math.floor(trainingDays.length / weeklyTrainingDays)
    for (let i = 0; i < weeklyTrainingDays; i++) {
      result.push(trainingDays[Math.min(i * interval, trainingDays.length - 1)])
    }
    return result
  }

  // For 1-2 days, just return first training days
  const trainingDays = template.filter((day) => day.categories.length > 0)
  return trainingDays.slice(0, weeklyTrainingDays)
}

/**
 * Select exercises for a given day based on categories and equipment
 */
async function selectExercisesForDay(
  categories: ExerciseCategory[],
  equipment: Equipment,
  isFullDay: boolean
): Promise<SelectedExercise[]> {
  const allowedEquipment = EQUIPMENT_ALLOWED[equipment]
  const exerciseCount = isFullDay ? 5 : 3

  const exercises = await prisma.exercise.findMany({
    where: {
      category: { in: categories },
      equipment: { in: allowedEquipment },
      isCustom: false,
    },
    take: exerciseCount * 2, // Fetch more to allow filtering
  })

  // Group by category and pick exercises
  const selected: SelectedExercise[] = []
  const usedIds = new Set<string>()

  for (const category of categories) {
    const categoryExercises = exercises.filter(
      (e) => e.category === category && !usedIds.has(e.id)
    )
    const toSelect = Math.ceil(exerciseCount / categories.length)
    for (const ex of categoryExercises.slice(0, toSelect)) {
      if (selected.length < exerciseCount && !usedIds.has(ex.id)) {
        usedIds.add(ex.id)
        selected.push({
          exerciseId: ex.id,
          sets: 0, // Will be set by caller
          reps: '',
          order: selected.length,
        })
      }
    }
  }

  return selected.slice(0, exerciseCount)
}

/**
 * Parse reps range string to min and max
 */
function parseRepsRange(range: string): { min: number; max: number } {
  const parts = range.split('-').map((v) => parseInt(v.trim()))
  return { min: parts[0], max: parts[1] || parts[0] }
}

/**
 * Generate a complete training plan for a user
 */
export async function generateTrainingPlan(
  userId: string,
  weeks = 4
): Promise<
  Prisma.WorkoutPlanGetPayload<{
    include: {
      planDays: {
        include: {
          plannedExercises: {
            include: { exercise: true }
          }
        }
      }
    }
  }>
> {
  // Get user profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 })
  }

  const profile: UserProfile = {
    goal: user.goal || 'BODY_SHAPE',
    level: user.level,
    equipment: user.equipment,
    weeklyTrainingDays: user.weeklyTrainingDays,
  }

  // Select template based on goal
  const template = GOAL_TEMPLATES[profile.goal]
  if (!template) {
    throw Object.assign(new Error(`Unknown goal: ${profile.goal}`), { status: 400 })
  }

  // Adjust schedule based on weeklyTrainingDays
  const schedule = adjustSchedule(template, profile.weeklyTrainingDays)

  // Calculate dates
  const startDate = getNextMonday()
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + weeks * 7 - 1)

  // Create workout plan
  const planName = `${PLAN_NAME_TEMPLATES[profile.goal]} - ${weeks}周`
  const plan = await prisma.workoutPlan.create({
    data: {
      userId,
      name: planName,
      goal: profile.goal,
      weeks,
      startDate,
      endDate,
      status: 'ACTIVE',
    },
  })

  const repsConfig = REPS_CONFIG[profile.goal]

  // Create plan days and exercises
  for (const dayTemplate of schedule) {
    const planDay = await prisma.planDay.create({
      data: {
        planId: plan.id,
        dayOfWeek: dayTemplate.dayOfWeek,
        dayType: dayTemplate.type,
      },
    })

    // Skip exercise selection for rest days
    if (dayTemplate.categories.length === 0) {
      continue
    }

    // Determine if this is a full day (more exercises)
    const isFullDay = dayTemplate.type.includes('全身') || dayTemplate.type.includes('功能训练')
    const exercises = await selectExercisesForDay(
      dayTemplate.categories,
      profile.equipment,
      isFullDay
    )

    // Assign sets and reps
    const { min: minReps, max: maxReps } = parseRepsRange(repsConfig.repsRange)
    const sets = isFullDay ? repsConfig.sets : Math.max(3, repsConfig.sets - 1)
    const repsValue = Math.floor((minReps + maxReps) / 2)

    // Create planned exercises
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i]
      await prisma.plannedExercise.create({
        data: {
          planId: plan.id,
          planDayId: planDay.id,
          exerciseId: ex.exerciseId,
          sets,
          reps: repsValue,
          restSeconds: 60,
          order: i,
        },
      })
    }
  }

  // Fetch and return the complete plan
  return getPlanDetail(plan.id)
}

/**
 * Get all plans for a user
 */
export async function getUserPlans(userId: string): Promise<Prisma.WorkoutPlanGetPayload<{}>[]> {
  return prisma.workoutPlan.findMany({
    where: { userId, isArchived: false },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get plan detail with days and exercises
 */
export async function getPlanDetail(
  planId: string
): Promise<
  Prisma.WorkoutPlanGetPayload<{
    include: {
      planDays: {
        include: {
          plannedExercises: {
            include: { exercise: true }
          }
        }
      }
    }
  }>
> {
  const plan = await prisma.workoutPlan.findUnique({
    where: { id: planId },
    include: {
      planDays: {
        include: {
          plannedExercises: {
            include: { exercise: true },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { dayOfWeek: 'asc' },
      },
    },
  })

  if (!plan) {
    throw Object.assign(new Error('Plan not found'), { status: 404 })
  }

  return plan
}

/**
 * Mark plan as completed
 */
export async function completePlan(
  planId: string
): Promise<Prisma.WorkoutPlanGetPayload<{}>> {
  const plan = await prisma.workoutPlan.findUnique({
    where: { id: planId },
  })

  if (!plan) {
    throw Object.assign(new Error('Plan not found'), { status: 404 })
  }

  return prisma.workoutPlan.update({
    where: { id: planId },
    data: { status: 'COMPLETED' },
  })
}

/**
 * Archive a plan
 */
export async function archivePlan(
  planId: string
): Promise<Prisma.WorkoutPlanGetPayload<{}>> {
  const plan = await prisma.workoutPlan.findUnique({
    where: { id: planId },
  })

  if (!plan) {
    throw Object.assign(new Error('Plan not found'), { status: 404 })
  }

  return prisma.workoutPlan.update({
    where: { id: planId },
    data: { isArchived: true, status: 'ARCHIVED' },
  })
}

/**
 * Delete a plan
 */
export async function deletePlan(planId: string): Promise<void> {
  const plan = await prisma.workoutPlan.findUnique({
    where: { id: planId },
  })

  if (!plan) {
    throw Object.assign(new Error('Plan not found'), { status: 404 })
  }

  await prisma.workoutPlan.delete({
    where: { id: planId },
  })
}