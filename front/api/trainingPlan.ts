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
}

export interface Exercise {
  id: string
  name: string
  category: string
  primaryMuscles: string[]
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