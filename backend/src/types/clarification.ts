// ============================================
// 追问澄清模块类型定义
// ============================================

export type ClarifyReason =
  | 'MISSING_NUMBER'        // 缺少数字
  | 'MISSING_UNIT'          // 缺少单位
  | 'MISSING_DATE'          // 缺少日期
  | 'MISSING_MUSCLE'        // 缺少肌群
  | 'MISSING_EXERCISE'      // 缺少动作
  | 'MISSING_PLAN'          // 缺少计划引用
  | 'AMBIGUOUS_INTENT'      // 意图模糊
  | 'MULTIPLE_INTENTS'      // 多意图
  | 'INCOMPLETE_SENTENCE'   // 句子不完整
  | 'CONTRADICTORY_INFO'    // 信息矛盾
  | 'INVALID_INPUT'         // 无效输入（格式错误）
  | 'PARTIAL_CONFIRMATION'  // 部分信息待确认
  | 'DEFER_LATER'          // 稍后再说

// 意图类型
export type IntentType =
  | 'RECORD_WEIGHT'
  | 'RECORD_MEASUREMENT'
  | 'RECORD_TRAINING'
  | 'RECORD_DIET'
  | 'TRAINING_RECOMMEND'
  | 'QUERY_RECOVERY'
  | 'QUERY_PR'
  | 'QUERY_WEIGHT'
  | 'QUERY_TREND'
  | 'GREETING'
  | 'CHITCHAT'
  | 'UNKNOWN'

// 字段定义
export interface Field {
  name: string
  type: 'number' | 'text' | 'select' | 'date'
  question: string
  options?: string[]
  examples?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

// 追问记录
export interface ClarificationRecord {
  question: string
  answer: string
  extractedValue: any
  timestamp: Date
}

// 澄清上下文
export interface ClarificationContext {
  sessionId: string
  originalMessage: string
  pendingIntent: IntentType
  extractedEntities: Record<string, any>
  missingFields: Field[]
  clarificationHistory: ClarificationRecord[]
  retryCount: number
}

// 意图检查结果
export interface IntentCheckResult {
  shouldClarify: boolean
  reason: ClarifyReason | null
  missingFields: Field[]
  suggestedQuestion?: string
}

// 意图解析结果
export interface IntentResult {
  type: IntentType
  confidence: number
  entities: Record<string, any>
  rawText: string
}

// 模糊匹配结果
export interface FuzzyMatch {
  intent: IntentType
  confidence: number
  matchedPattern: string
}

// 意图消歧结果
export interface DisambiguationResult {
  primaryIntent: IntentType
  secondaryIntents: IntentType[]
  clarificationNeeded: boolean
  suggestion?: string
}

// 追问话术模板
export interface ClarificationTemplate {
  reason: ClarifyReason
  templates: string[]
  followUp?: string
}

// 退出策略
export type ExitStrategy =
  | 'SKIP_FIELD'    // 跳过该字段，使用默认值或忽略
  | 'USE_DEFAULTS'  // 使用系统默认值
  | 'CANCEL_INTENT' // 取消整个意图
  | 'OFFER_OPTIONS' // 提供预设选项让用户选择

// 追问限制配置
export const CLARIFICATION_LIMITS = {
  MAX_RETRIES: 3,           // 单字段最大追问次数
  MAX_TOTAL_RETRIES: 5,    // 单次对话最大追问总次数
  TIMEOUT_SECONDS: 120      // 追问超时时间（2分钟）
} as const

// Session 过期配置
export const SESSION_EXPIRY = {
  ACTIVE_TIMEOUT: 300,      // 5分钟无交互清除
  CLARIFICATION_TIMEOUT: 120, // 追问状态 2 分钟无响应清除
  COMPLETED_CLEANUP: 3600   // 已完成 Session 1 小时后清除
} as const

// 意图优先级（数字越小优先级越高）
export const INTENT_PRIORITY: Record<IntentType, number> = {
  RECORD_WEIGHT: 1,
  RECORD_MEASUREMENT: 1,
  RECORD_TRAINING: 1,
  RECORD_DIET: 1,
  TRAINING_RECOMMEND: 2,
  QUERY_RECOVERY: 3,
  QUERY_PR: 3,
  QUERY_WEIGHT: 3,
  QUERY_TREND: 3,
  GREETING: 10,
  CHITCHAT: 10,
  UNKNOWN: 99
}

// 意图-字段需求映射
export const INTENT_REQUIREMENTS: Record<IntentType, Field[]> = {
  RECORD_WEIGHT: [
    { name: 'weight', type: 'number', question: '请告诉我你的体重是多少？', examples: ['70kg', '65.5'] },
    { name: 'unit', type: 'select', question: '单位是公斤(kg)还是斤？', options: ['kg', '斤'] }
  ],

  RECORD_MEASUREMENT: [
    { name: 'parts', type: 'select', question: '你想记录哪个部位的围度？', options: ['chest', 'waist', 'hip', 'bicep', 'thigh', 'calf'] },
    { name: 'value', type: 'number', question: '围度是多少厘米？', examples: ['95cm', '78'] }
  ],

  RECORD_TRAINING: [
    { name: 'exercises', type: 'text', question: '你练了哪些动作？', examples: ['卧推、深蹲、硬拉'] },
    { name: 'date', type: 'date', question: '是哪天练的？', examples: ['今天', '昨天'] }
  ],

  RECORD_DIET: [
    { name: 'meals', type: 'text', question: '吃了什么？', examples: ['鸡胸肉、米饭、西兰花'] }
  ],

  TRAINING_RECOMMEND: [
    { name: 'muscle', type: 'select', question: '你想练哪个部位？', options: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'] }
  ],

  QUERY_RECOVERY: [
    { name: 'muscle', type: 'select', question: '你想查看哪个肌群的恢复状态？', options: ['chest', 'back', 'legs', 'shoulders', 'arms'] }
  ],

  QUERY_PR: [
    { name: 'exercise', type: 'select', question: '你想查看哪个动作的记录？', options: [] }
  ],

  QUERY_WEIGHT: [
    { name: 'dateRange', type: 'text', question: '想看哪段时间的体重？', examples: ['最近一周', '这个月'] }
  ],

  QUERY_TREND: [
    { name: 'metric', type: 'select', question: '想看什么趋势？', options: ['weight', 'volume', 'recovery'] }
  ],

  GREETING: [],
  CHITCHAT: [],
  UNKNOWN: []
}
