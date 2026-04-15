import { PrismaClient } from '@prisma/client'
import * as chatService from './chatService'
import * as chatTrainingService from './chatTrainingService'
import * as bodyDataService from './bodyDataService'
import * as dietService from './dietService'
import * as incentiveService from './incentiveService'

const prisma = new PrismaClient()

// ============================================
// Chat Confirmation Service - 确认保存流程
// ============================================

export interface ConfirmationResult {
  saved: boolean
  cardId?: string
  incentiveCard?: {
    type: 'card'
    cardType: 'achievement'
    cardData: Record<string, any>
    actions: Array<{ id: string; label: string; action: string; target?: string }>
  }
  error?: string
}

/**
 * 确认并保存记录
 * @param userId 用户ID
 * @param cardId 卡片ID（用于追踪）
 * @param cardType 卡片类型
 * @param cardData 卡片数据
 * @param confirmed 是否确认
 */
export async function confirmAndSave(
  userId: string,
  cardId: string,
  cardType: string,
  cardData: Record<string, any>,
  confirmed: boolean
): Promise<ConfirmationResult> {
  // 用户取消
  if (!confirmed) {
    return { saved: false }
  }

  try {
    switch (cardType) {
      case 'weight-record':
        return await handleWeightRecordConfirmation(userId, cardData)

      case 'training-editable':
        return await handleTrainingConfirmation(userId, cardData)

      case 'measurement-record':
        return await handleMeasurementConfirmation(userId, cardData)

      case 'diet-record':
        return await handleDietConfirmation(userId, cardData)

      default:
        return { saved: false, error: `未知的卡片类型: ${cardType}` }
    }
  } catch (error: any) {
    console.error('[chatConfirmation] confirmAndSave error:', error)
    return { saved: false, error: `保存失败: ${error.message}` }
  }
}

/**
 * 处理体重记录确认
 */
async function handleWeightRecordConfirmation(
  userId: string,
  cardData: Record<string, any>
): Promise<ConfirmationResult> {
  const { weight, unit, date } = cardData

  if (!weight) {
    return { saved: false, error: '缺少体重数据' }
  }

  // 转换为 kg
  let weightInKg = weight
  if (unit === '斤') {
    weightInKg = weight / 2
  } else if (unit === '磅') {
    weightInKg = weight / 2.205
  }

  // 保存体重记录
  await bodyDataService.createWeightRecord(userId, weightInKg, date || new Date().toISOString().split('T')[0])

  // 检查成就触发
  const incentiveCard = await checkAndGenerateIncentive(userId, 'weight-record')

  return {
    saved: true,
    incentiveCard: incentiveCard || undefined
  }
}

/**
 * 处理训练记录确认
 */
async function handleTrainingConfirmation(
  userId: string,
  cardData: Record<string, any>
): Promise<ConfirmationResult> {
  const { exercises, date, rawText } = cardData

  if (!exercises || exercises.length === 0) {
    return { saved: false, error: '缺少训练数据' }
  }

  // 调用 chatTrainingService 保存训练
  const result = await chatTrainingService.saveTrainingFromChat(
    userId,
    rawText || '',
    { exercises, date }
  )

  if (!result.saved) {
    return { saved: false, error: result.error }
  }

  // 检查成就触发
  const incentiveCard = await checkAndGenerateIncentive(userId, 'training-record')

  return {
    saved: true,
    incentiveCard: incentiveCard || undefined
  }
}

/**
 * 处理围度记录确认
 */
async function handleMeasurementConfirmation(
  userId: string,
  cardData: Record<string, any>
): Promise<ConfirmationResult> {
  const { measurements, date } = cardData

  if (!measurements || Object.keys(measurements).length === 0) {
    return { saved: false, error: '缺少围度数据' }
  }

  // 保存围度记录
  await bodyDataService.createMeasurementRecord(userId, {
    ...measurements,
    recordedAt: date || new Date().toISOString().split('T')[0]
  })

  // 检查成就触发
  const incentiveCard = await checkAndGenerateIncentive(userId, 'measurement-record')

  return {
    saved: true,
    incentiveCard: incentiveCard || undefined
  }
}

/**
 * 处理饮食记录确认
 */
async function handleDietConfirmation(
  userId: string,
  cardData: Record<string, any>
): Promise<ConfirmationResult> {
  const { meals, date } = cardData

  // 保存饮食记录
  if (meals && Array.isArray(meals) && meals.length > 0) {
    await dietService.createDietRecords(userId, meals, date)
  }

  // 检查成就触发
  const incentiveCard = await checkAndGenerateIncentive(userId, 'diet-record')

  return {
    saved: true,
    incentiveCard: incentiveCard || undefined
  }
}

/**
 * 检查并生成激励卡片
 */
async function checkAndGenerateIncentive(
  userId: string,
  recordType: string
): Promise<ConfirmationResult['incentiveCard'] | null> {
  try {
    const achievement = await incentiveService.checkAndUnlockAchievement(userId, recordType)

    if (achievement) {
      return await incentiveService.generateAchievementCard(achievement)
    }
  } catch (error) {
    console.error('[chatConfirmation] checkAndGenerateIncentive error:', error)
  }

  return null
}

/**
 * 构建确认卡片
 * 用于生成待确认的记录卡片
 */
export async function buildConfirmationCard(
  userId: string,
  intent: string,
  entities: Record<string, any>
): Promise<{
  type: 'card'
  cardType: string
  cardData: Record<string, any>
  actions: Array<{ id: string; label: string; action: string }>
}> {
  switch (intent) {
    case 'RECORD_WEIGHT':
      return buildWeightConfirmationCard(entities)

    case 'RECORD_TRAINING':
      return buildTrainingConfirmationCard(entities)

    case 'RECORD_MEASUREMENT':
      return buildMeasurementConfirmationCard(entities)

    case 'RECORD_DIET':
      return buildDietConfirmationCard(entities)

    default:
      throw new Error(`未知的意图类型: ${intent}`)
  }
}

/**
 * 构建体重确认卡片
 */
function buildWeightConfirmationCard(entities: Record<string, any>): {
  type: 'card'
  cardType: string
  cardData: Record<string, any>
  actions: Array<{ id: string; label: string; action: string }>
} {
  const weight = entities.weight
  const unit = entities.unit || 'kg'
  const date = entities.date || new Date().toISOString().split('T')[0]

  return {
    type: 'card',
    cardType: 'weight-record',
    cardData: {
      weight,
      unit,
      date,
      saved: false
    },
    actions: [
      { id: 'confirm', label: '确认保存', action: 'confirm' },
      { id: 'cancel', label: '取消', action: 'cancel' }
    ]
  }
}

/**
 * 构建训练确认卡片
 */
function buildTrainingConfirmationCard(entities: Record<string, any>): {
  type: 'card'
  cardType: string
  cardData: Record<string, any>
  actions: Array<{ id: string; label: string; action: string }>
} {
  const { exercises, date } = entities

  const exerciseSummary = (exercises || [])
    .map((e: any) => `${e.name || e.exerciseName}: ${e.sets?.map((s: any) => `${s.weight}kg×${s.reps}`).join(', ')}`)
    .join('、')

  return {
    type: 'card',
    cardType: 'training-editable',
    cardData: {
      date: date || new Date().toISOString().split('T')[0],
      exercises: exercises || [],
      rawText: entities.rawText || '',
      saved: false,
      summary: exerciseSummary
    },
    actions: [
      { id: 'confirm', label: '确认保存', action: 'confirm' },
      { id: 'edit', label: '编辑', action: 'edit' },
      { id: 'cancel', label: '取消', action: 'cancel' }
    ]
  }
}

/**
 * 构建围度确认卡片
 */
function buildMeasurementConfirmationCard(entities: Record<string, any>): {
  type: 'card'
  cardType: string
  cardData: Record<string, any>
  actions: Array<{ id: string; label: string; action: string }>
} {
  const { measurements, date } = entities

  return {
    type: 'card',
    cardType: 'measurement-record',
    cardData: {
      date: date || new Date().toISOString().split('T')[0],
      measurements: measurements || {},
      saved: false
    },
    actions: [
      { id: 'confirm', label: '确认保存', action: 'confirm' },
      { id: 'cancel', label: '取消', action: 'cancel' }
    ]
  }
}

/**
 * 构建饮食确认卡片
 */
function buildDietConfirmationCard(entities: Record<string, any>): {
  type: 'card'
  cardType: string
  cardData: Record<string, any>
  actions: Array<{ id: string; label: string; action: string }>
} {
  const { calories, meals, date } = entities

  return {
    type: 'card',
    cardType: 'diet-record',
    cardData: {
      date: date || new Date().toISOString().split('T')[0],
      calories: calories || 0,
      meals: meals || [],
      saved: false
    },
    actions: [
      { id: 'confirm', label: '确认保存', action: 'confirm' },
      { id: 'cancel', label: '取消', action: 'cancel' }
    ]
  }
}
