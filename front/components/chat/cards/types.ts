/**
 * 卡片类型定义
 * 基于后台实际返回的数据结构
 */

// ============================================
// 通用类型
// ============================================

export interface CardAction {
  id: string
  label: string
  action: 'navigate' | 'dismiss' | 'confirm' | 'cancel' | 'regenerate' | 'edit' | 'share' | 'callback' | 'select' | 'retry' | 'save' | 'record'
  target?: string
}

// ============================================
// P0 卡片类型 - 类型化
// ============================================

/**
 * 体重记录卡片
 * cardType: weight-record
 */
export interface WeightRecordCardData {
  latestWeight?: number
  lastRecordDate?: string
  weight?: number
  date?: string
  unit?: 'kg' | 'lbs'
  saved?: boolean
  directSave?: boolean
  error?: string
}

/**
 * 训练推荐卡片
 * cardType: training-recommend
 */
export interface TrainingRecommendCardData {
  name: string
  type?: 'rest_day' | 'completed_today' | 'new_recommendation' | 'overtraining_warning'
  reason?: string
  duration?: number
  completed?: boolean
  exercises?: TrainingRecommendExercise[]
  muscleScores?: Record<string, number>
  warningLevel?: 'mild' | 'moderate' | 'high'
  warnings?: string[]
  suggestions?: string[]
  recommendations?: string[]
  completedTraining?: { name: string; duration?: number }
  planDayId?: string
}

export interface TrainingRecommendExercise {
  name: string
  sets: number
  reps?: string
  lastWeight?: number
  targetWeight?: number
  muscle?: string
}

/**
 * 训练记录可编辑卡片
 * cardType: training-editable
 */
export interface TrainingEditableCardData {
  date: string
  exercises: TrainingEditableExercise[]
  summary?: string
  saved?: boolean
  directSave?: boolean
  error?: string
  totalVolume?: number
  trainingId?: string
  duration?: number
}

export interface TrainingEditableExercise {
  name: string
  sets: number
  totalVolume?: number
}

// ============================================
// P1 卡片类型 - 类型化
// ============================================

/**
 * 恢复状态卡片
 * cardType: recovery-status
 */
export interface RecoveryStatusCardData {
  muscles?: MuscleStatus[]
  overallStatus?: 'ready' | 'moderate' | 'rest' | 'no_data'
  overallScore?: number
  recommendation?: string
  message?: string
}

export interface MuscleStatus {
  name: string
  label: string
  recoveryPercent: number
  status: 'recovered' | 'recovering' | 'fatigued'
  lastTrained?: string
}

/**
 * 早安日报卡片
 * cardType: morning-report
 */
export interface MorningReportCardData {
  greeting?: string
  date: string
  yesterdaySummary?: {
    weightChange?: number
    trainingDone?: boolean
    trainingName?: string
    totalVolume?: number
  }
  todayPlan?: {
    name?: string
    type?: string
    duration?: number
    muscle?: string
  }
  recoveryTip?: string
  motivation?: string
}

/**
 * 周报卡片
 * cardType: weekly-report
 */
export interface WeeklyReportCardData {
  weekStart: string
  weekEnd: string
  stats?: {
    trainingDays?: number
    totalVolume?: number
    weightChange?: number
    prCount?: number
  }
  muscleBreakdown?: Array<{
    muscle: string
    volume: number
    sessions: number
  }>
  aiComment?: string
  highlight?: string
  trainingCount?: number
  totalTrainingDays?: number
  totalDuration?: number
  weightChange?: number
  newAchievements?: Array<{ icon?: string; name: string }>
}

/**
 * 成就卡片
 * cardType: achievement
 */
export interface AchievementCardData {
  achievement?: {
    id: string
    name: string
    description?: string
    icon?: string
    unlockedAt?: string
  }
  progress?: {
    current: number
    target: number
  }
  icon?: string
  name?: string
  description?: string
  unlockedAt?: string
}

// ============================================
// P2 卡片类型 - 统一 Record<string, any>
// ============================================

/**
 * 围度记录卡片
 * cardType: measurement-record
 */
export interface MeasurementRecordCardData {
  date?: string
  measurements?: Record<string, number>
  parts?: Array<{
    name: string
    label: string
    value?: number
  }>
  unit?: 'cm' | 'inch'
  saved?: boolean
  directSave?: boolean
  summary?: string
  error?: string
}

/**
 * 体重趋势卡片
 * cardType: weight-trend
 */
export interface WeightTrendCardData {
  currentWeight?: number
  change?: number
  changePercent?: number
  trend?: 'up' | 'down' | 'stable' | 'no_data' | 'unknown'
  chartData?: Array<{ date: string; weight: number }>
  period?: number
  message?: string
  targetWeight?: number
}

/**
 * 动作详情卡片
 * cardType: exercise-detail
 */
export interface ExerciseDetailCardData {
  id?: string
  name: string
  category?: string
  equipment?: string
  instructions?: string
  muscles?: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
}

/**
 * 个人记录卡片
 * cardType: personal-record
 */
export interface PersonalRecordCardData {
  exerciseId?: string
  exerciseName: string
  newRecord?: {
    e1rm: number
    weight: number
    reps: number
    date?: string
  }
  previousBest?: {
    e1rm: number
    date?: string
  }
  improvement?: number
  chartData?: Array<{ date: string; e1rm: number }>
  message?: string
  recentPRs?: Array<{
    exerciseName: string
    e1rm: number
    date: string
  }>
}

/**
 * 目标进度卡片
 * cardType: goal-progress
 */
export interface GoalProgressCardData {
  goal?: {
    type: 'lose_weight' | 'gain_muscle' | 'body_shape'
    target: number
    current: number
    unit: string
    label?: string
    deadline?: string
  }
  progress?: number
  predictedCompletion?: string
  encouragement?: string
  goalType?: string
  current?: number
  target?: number
  message?: string
  estimatedDate?: string
}

/**
 * 过度训练预警卡片
 * cardType: overtraining-warning
 */
export interface OvertrainingWarningCardData {
  warningLevel?: 'mild' | 'moderate' | 'high'
  fatiguedMuscles?: Array<{
    muscle: string
    recoveryPercent: number
    consecutiveDays: number
  }>
  suggestions?: string[]
  recommendation?: string
  message?: string
  consecutiveDays?: number
  warning?: string
  warnings?: string[]
}

/**
 * 选项选择卡片
 * cardType: option-choice
 */
export interface OptionChoiceCardData {
  question: string
  options: string[]
}

/**
 * 计划预览卡片
 * cardType: plan-preview
 */
export interface PlanPreviewCardData {
  planName: string
  days?: Array<{
    dayOfWeek: string
    dayType?: string
    hasTraining?: boolean
  }>
  dayOfWeek?: string
  dayType?: string
  hasTraining?: boolean
}

/**
 * 饮食记录卡片
 * cardType: diet-record
 */
export interface DietRecordCardData {
  date?: string
  calories?: number
  meals?: Array<{
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    description?: string
    estimatedCalories?: number
    protein?: number
    foods?: string[]
  }>
  totalCalories?: number
  totalProtein?: number
  summary?: string
  saved?: boolean
}

/**
 * 日报卡片
 * cardType: daily-report
 */
export interface DailyReportCardData {
  trainingCount?: number
  totalVolume?: number
  duration?: number
  date?: string
}

/**
 * 每日计划卡片
 * cardType: daily-plan
 */
export interface DailyPlanCardData {
  date: string
  planName?: string
  dayType?: string
  exerciseCount?: number
  estimatedDuration?: number
}

// ============================================
// 类型映射
// ============================================

export type CardType =
  | 'weight-record'
  | 'training-recommend'
  | 'training-editable'
  | 'recovery-status'
  | 'morning-report'
  | 'weekly-report'
  | 'achievement'
  | 'measurement-record'
  | 'weight-trend'
  | 'exercise-detail'
  | 'personal-record'
  | 'goal-progress'
  | 'overtraining-warning'
  | 'option-choice'
  | 'plan-preview'
  | 'diet-record'
  | 'daily-report'
  | 'daily-plan'

export interface CardDataByType {
  'weight-record': WeightRecordCardData
  'training-recommend': TrainingRecommendCardData
  'training-editable': TrainingEditableCardData
  'recovery-status': RecoveryStatusCardData
  'morning-report': MorningReportCardData
  'weekly-report': WeeklyReportCardData
  'achievement': AchievementCardData
  'measurement-record': MeasurementRecordCardData
  'weight-trend': WeightTrendCardData
  'exercise-detail': ExerciseDetailCardData
  'personal-record': PersonalRecordCardData
  'goal-progress': GoalProgressCardData
  'overtraining-warning': OvertrainingWarningCardData
  'option-choice': OptionChoiceCardData
  'plan-preview': PlanPreviewCardData
  'diet-record': DietRecordCardData
  'daily-report': DailyReportCardData
  'daily-plan': DailyPlanCardData
}
