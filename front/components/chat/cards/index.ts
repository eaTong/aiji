/**
 * 聊天卡片组件统一导出
 */

// P0 卡片组件
export { default as WeightRecordCard } from './WeightRecordCard.vue'
export { default as TrainingRecommendCard } from './TrainingRecommendCard.vue'
export { default as TrainingEditableCard } from './TrainingEditableCard.vue'

// P1 卡片组件
export { default as RecoveryStatusCard } from './RecoveryStatusCard.vue'
export { default as MorningReportCard } from './MorningReportCard.vue'
export { default as WeeklyReportCard } from './WeeklyReportCard.vue'
export { default as AchievementCard } from './AchievementCard.vue'

// P2-P3 统一渲染组件
export { default as LegacyCardRenderer } from './LegacyCardRenderer.vue'

// 类型定义
export * from './types'

// 卡片类型映射
import WeightRecordCard from './WeightRecordCard.vue'
import TrainingRecommendCard from './TrainingRecommendCard.vue'
import TrainingEditableCard from './TrainingEditableCard.vue'
import RecoveryStatusCard from './RecoveryStatusCard.vue'
import MorningReportCard from './MorningReportCard.vue'
import WeeklyReportCard from './WeeklyReportCard.vue'
import AchievementCard from './AchievementCard.vue'
import LegacyCardRenderer from './LegacyCardRenderer.vue'

/**
 * 卡片类型到组件的映射
 */
export const cardTypeMap = {
  'weight-record': WeightRecordCard,
  'training-recommend': TrainingRecommendCard,
  'training-editable': TrainingEditableCard,
  'recovery-status': RecoveryStatusCard,
  'morning-report': MorningReportCard,
  'weekly-report': WeeklyReportCard,
  'achievement': AchievementCard,
} as const

/**
 * 所有已知卡片类型
 */
export const knownCardTypes = [
  'weight-record',
  'training-recommend',
  'training-editable',
  'recovery-status',
  'morning-report',
  'weekly-report',
  'achievement',
  'measurement-record',
  'weight-trend',
  'exercise-detail',
  'personal-record',
  'goal-progress',
  'overtraining-warning',
  'option-choice',
  'plan-preview',
  'diet-record',
  'daily-report',
  'daily-plan',
] as const

export type KnownCardType = typeof knownCardTypes[number]
