import { request } from './request'

export interface WorkoutPlan {
  id: string
  name: string
  goal: 'GAIN_MUSCLE' | 'LOSE_FAT' | 'BODY_SHAPE' | 'IMPROVE_FITNESS'
  weeks: number
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  createdAt: string
}

export interface PlanDay {
  id: string
  planId: string
  weekNumber: number
  dayOfWeek: number // 1=Mon, 7=Sun
  dayType: string
  plannedExercises: PlannedExercise[]
}

export interface PlannedExercise {
  id: string
  exerciseId: string
  exerciseName: string
  targetSets: number
  targetReps: string // "8-12"
  targetWeight?: number
  orderIndex: number
  exercise?: Exercise // 包含完整动作信息
}

export interface PlanDetail extends WorkoutPlan {
  planDays: PlanDay[]
}

export interface GeneratePlanResponse extends WorkoutPlan {
  planDays: PlanDay[]
}

export function getTrainingPlans(): Promise<WorkoutPlan[]> {
  return request<WorkoutPlan[]>('GET', '/api/training-plans')
}

export function getTrainingPlan(id: string): Promise<PlanDetail> {
  return request<PlanDetail>('GET', `/api/training-plans/${id}`)
}

export function generateTrainingPlan(): Promise<GeneratePlanResponse> {
  return request<GeneratePlanResponse>('POST', '/api/training-plans/generate')
}

export function completeTrainingPlan(id: string): Promise<WorkoutPlan> {
  return request<WorkoutPlan>('PUT', `/api/training-plans/${id}/complete`)
}

export function archiveTrainingPlan(id: string): Promise<WorkoutPlan> {
  return request<WorkoutPlan>('PUT', `/api/training-plans/${id}/archive`)
}

export function deleteTrainingPlan(id: string): Promise<void> {
  return request<void>('DELETE', `/api/training-plans/${id}`)
}

// 替换动作相关类型
export type ReplacementReason = 'not_interested' | 'no_equipment' | 'dont_know_how' | 'other'

export interface ReplaceExerciseParams {
  newExerciseId: string
  reason: ReplacementReason
}

export interface ReplaceableExercisesResult {
  currentExercise: Exercise
  replacableExercises: Exercise[]
}

/**
 * 获取可替换的动作列表
 */
export function getReplacableExercises(
  planId: string,
  plannedExerciseId: string
): Promise<ReplaceableExercisesResult> {
  return request<ReplaceableExercisesResult>(
    'GET',
    `/api/training-plans/${planId}/exercises/${plannedExerciseId}/replacable`
  )
}

/**
 * 替换计划中的动作
 */
export function replaceExercise(
  planId: string,
  plannedExerciseId: string,
  params: ReplaceExerciseParams
): Promise<any> {
  return request<any>(
    'PUT',
    `/api/training-plans/${planId}/exercises/${plannedExerciseId}/replace`,
    params as unknown as Record<string, unknown>
  )
}