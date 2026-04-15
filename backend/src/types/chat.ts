// ============================================
// Chat 相关类型定义
// ============================================

export type MessageRole = 'user' | 'ai'
export type MessageType = 'text' | 'card'
export type SessionStatus = 'ACTIVE' | 'AWAITING_CLARIFICATION' | 'COMPLETED' | 'EXPIRED'

// 卡片类型枚举
export type CardType =
  | 'weight-record'
  | 'measurement-record'
  | 'measurement-trend'
  | 'weight-trend'
  | 'training-recommend'
  | 'training-editable'
  | 'recovery-status'
  | 'exercise-detail'
  | 'personal-record'
  | 'morning-report'
  | 'weekly-report'
  | 'goal-progress'
  | 'overtraining-warning'
  | 'option-choice'
  | 'plan-preview'
  | 'achievement'
  | 'diet-record'

// Action 类型
export type ActionType = 'navigate' | 'save' | 'regenerate' | 'dismiss' | 'callback'

export interface CardAction {
  id: string
  label: string
  action: ActionType
  target?: string
  params?: Record<string, any>
}

// Chat Message
export interface ChatMessage {
  id: string
  userId: string
  role: MessageRole
  type: MessageType
  cardType?: CardType
  content?: string
  cardData?: Record<string, any>
  actions?: CardAction[]
  planId?: string
  sessionId?: string
  createdAt: Date
}

// API 响应
export interface SendMessageRequest {
  content: string
  planId?: string
  sessionId?: string
}

export interface SendMessageResponse {
  message: ChatMessage
  sessionId?: string
}

export interface GetMessagesRequest {
  since?: string
  limit?: number
}

export interface GetMessagesResponse {
  messages: ChatMessage[]
  hasMore: boolean
}

// Card Data Types
export interface WeightRecordData {
  latestWeight?: number
  lastRecordDate?: string
  unit: 'kg' | 'lbs'
}

export interface MeasurementRecordData {
  parts: Array<{
    name: string
    label: string
    value?: number
  }>
  unit: 'cm' | 'inch'
}

export interface MeasurementTrendData {
  date: string
  period: number
  parts: Array<{
    name: string
    label: string
    current?: number
    change?: number
    changePercent?: number
  }>
  chartData: Array<{
    date: string
    chest?: number
    waist?: number
    hip?: number
  }>
  aiComment?: string
}

export interface WeightTrendData {
  currentWeight: number
  change: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
  chartData: Array<{ date: string; weight: number }>
  period: number
}

export interface TrainingRecommendData {
  name: string
  duration: number
  exercises: Array<{
    name: string
    sets: string
    targetWeight?: number
    muscle: string
  }>
  reason: string
  planDayId?: string
}

export interface TrainingEditableData {
  planDayId?: string
  exercises: Array<{
    id: string
    name: string
    muscle: string
    sets: Array<{
      setNumber: number
      targetReps?: string
      targetWeight?: number
      actualReps?: number
      actualWeight?: number
      completed?: boolean
    }>
  }>
  date: string
}

export interface RecoveryStatusData {
  muscles: Array<{
    name: string
    label: string
    recoveryPercent: number
    status: 'recovered' | 'recovering' | 'fatigued'
    lastTrained?: string
  }>
  overallStatus: 'ready' | 'moderate' | 'tired'
}

export interface ExerciseDetailData {
  id: string
  name: string
  muscle: string
  equipment: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  description: string
  steps: string[]
  tips: string[]
  mediaUrls?: string[]
}

export interface PersonalRecordData {
  exerciseId: string
  exerciseName: string
  newRecord: {
    e1rm: number
    weight: number
    reps: number
    date: string
  }
  previousBest: {
    e1rm: number
    date: string
  }
  improvement: number
  chartData: Array<{ date: string; e1rm: number }>
}

export interface MorningReportData {
  greeting: string
  date: string
  yesterdaySummary: {
    weightChange?: number
    trainingDone: boolean
    trainingName?: string
    totalVolume?: number
  }
  todayPlan: {
    name?: string
    type?: string
    duration?: number
    muscle?: string
  }
  recoveryTip: string
  motivation: string
}

export interface WeeklyReportData {
  weekStart: string
  weekEnd: string
  stats: {
    trainingDays: number
    totalVolume: number
    weightChange: number
    prCount: number
  }
  muscleBreakdown: Array<{
    muscle: string
    volume: number
    sessions: number
  }>
  aiComment: string
  highlight: string
}

export interface GoalProgressData {
  goal: {
    type: 'lose_weight' | 'gain_muscle' | 'body_shape'
    target: number
    current: number
    unit: string
    deadline?: string
  }
  progress: number
  predictedCompletion?: string
  encouragement: string
}

export interface OvertrainingWarningData {
  warningLevel: 'mild' | 'moderate' | 'high'
  fatiguedMuscles: Array<{
    muscle: string
    recoveryPercent: number
    consecutiveDays: number
  }>
  suggestions: string[]
  recommendation: string
}

export interface OptionChoiceData {
  question: string
  options: Array<{
    id: string
    label: string
    value: string
  }>
}

export interface PlanPreviewData {
  planName: string
  weeks: number
  weeklyOverview: Array<{
    weekNumber: number
    days: Array<{
      dayOfWeek: number
      trainingType: string
      exerciseCount: number
    }>
  }>
}

export interface AchievementData {
  achievement: {
    id: string
    name: string
    description: string
    icon: string
    unlockedAt: string
  }
  progress?: {
    current: number
    target: number
  }
}

export interface DietRecordData {
  date: string
  meals: Array<{
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    description: string
    estimatedCalories?: number
    protein?: number
  }>
  totalCalories?: number
  totalProtein?: number
}
