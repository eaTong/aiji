import {
  IntentType,
  ClarificationContext,
  ClarificationRecord,
  ExitStrategy,
  Field
} from '../types/clarification'
import * as intentParser from './intentParser'
import * as intentChecker from './intentChecker'
import * as sessionManager from './sessionManager'
import * as templates from './clarificationTemplates'
import { createAIMessage } from './chatService'

// ============================================
// 追问澄清主服务
// ============================================

/**
 * 处理用户消息的追问流程
 */
export async function processMessage(
  userId: string,
  message: string
): Promise<{
  shouldRespond: boolean
  response?: any
  completed?: boolean
  cardData?: any
}> {
  // 1. 获取当前会话
  const session = await sessionManager.getActiveSession(userId)

  // 2. 检查是否在追问状态
  if (session && session.status === 'AWAITING_CLARIFICATION') {
    const continuation = sessionManager.detectContinuation(message, session)

    if (continuation) {
      // 延续上下文：处理用户回复
      return await handleClarificationResponse(userId, session, message)
    } else {
      // 话题切换：清除上下文，重新解析
      await sessionManager.clearSession(userId)
    }
  }

  // 3. 新对话：正常解析意图
  const intentResult = intentParser.parseIntent(message)

  // 4. 检查信息完整性
  const checkResult = intentChecker.checkIntentCompleteness(
    intentResult.type,
    intentResult.entities
  )

  if (checkResult.shouldClarify) {
    // 5. 需要追问
    return await initiateClarification(
      userId,
      message,
      intentResult.type,
      intentResult.entities,
      checkResult.missingFields,
      checkResult.reason
    )
  }

  // 6. 信息完整，返回执行结果
  return {
    shouldRespond: false,
    completed: true,
    cardData: {
      intent: intentResult.type,
      entities: intentResult.entities
    }
  }
}

/**
 * 发起追问
 */
async function initiateClarification(
  userId: string,
  originalMessage: string,
  intent: IntentType,
  entities: Record<string, any>,
  missingFields: Field[],
  clarifyReason: any
): Promise<{
  shouldRespond: boolean
  response?: any
}> {
  // 获取或创建会话
  const session = await sessionManager.getOrCreateSession(userId)

  // 构建上下文
  const context: ClarificationContext = {
    sessionId: session.id,
    originalMessage,
    pendingIntent: intent,
    extractedEntities: entities,
    missingFields,
    clarificationHistory: [],
    retryCount: 0
  }

  // 生成追问话术
  const reason = clarifyReason || 'AMBIGUOUS_INTENT'
  const question = templates.generateQuestion(reason, context)

  // 更新会话状态
  await sessionManager.updateContext(session.id, {
    pendingIntent: intent,
    missingFields,
    clarificationHistory: [],
    retryCount: 0
  })

  // 创建追问消息
  const aiMessage = await createAIMessage(userId, {
    type: 'text',
    content: question,
    sessionId: session.id
  })

  return {
    shouldRespond: true,
    response: {
      message: aiMessage,
      sessionId: session.id
    }
  }
}

/**
 * 处理追问回复
 */
async function handleClarificationResponse(
  userId: string,
  session: any,
  message: string
): Promise<{
  shouldRespond: boolean
  response?: any
  completed?: boolean
  cardData?: any
}> {
  const context = sessionManager.parseContext(session)

  if (!context) {
    // 上下文丢失，重新解析
    await sessionManager.clearSession(userId)
    return { shouldRespond: false, completed: true }
  }

  // 检查是否是取消意图
  if (intentParser.isNegativeIntent(message) || intentParser.isDeferIntent(message)) {
    await sessionManager.clearSession(userId)

    const responseText = intentParser.isDeferIntent(message)
      ? templates.generateDeferLaterMessage()
      : templates.generateCancelMessage()

    const aiMessage = await createAIMessage(userId, {
      type: 'text',
      content: responseText,
      sessionId: session.id
    })

    return {
      shouldRespond: true,
      response: { message: aiMessage, sessionId: session.id }
    }
  }

  // 检查是否是纠正
  if (intentParser.isCorrectionIntent(message)) {
    const correctedValue = intentParser.extractCorrectedValue(message)
    if (correctedValue !== null) {
      // 更新上下文中的值
      context.extractedEntities = {
        ...context.extractedEntities,
        ...extractFieldUpdate(context.missingFields, correctedValue)
      }

      // 重新检查完整性
      const checkResult = intentChecker.checkIntentCompleteness(
        context.pendingIntent,
        context.extractedEntities
      )

      if (checkResult.shouldClarify) {
        // 还有其他字段缺失，继续追问
        return await continueClarification(
          userId,
          session,
          context,
          checkResult.missingFields,
          correctedValue
        )
      } else {
        // 信息完整，完成
        await sessionManager.completeSession(session.id)

        return {
          shouldRespond: false,
          completed: true,
          cardData: {
            intent: context.pendingIntent,
            entities: context.extractedEntities
          }
        }
      }
    }
  }

  // 提取本轮信息
  const extracted = intentParser.extractEntities(message, context.pendingIntent)

  // 合并到上下文
  const updatedEntities = {
    ...context.extractedEntities,
    ...extracted
  }

  // 添加追问记录
  const record: ClarificationRecord = {
    question: context.missingFields[0]?.question || '',
    answer: message,
    extractedValue: Object.values(extracted)[0],
    timestamp: new Date()
  }

  await sessionManager.addClarificationRecord(session.id, record)

  // 检查是否超过限制
  const exceeded = await sessionManager.checkExceededLimit(session.id)

  if (exceeded) {
    // 超过限制，执行退出策略
    return await handleExceededLimit(userId, session, context)
  }

  // 重新检查完整性
  const checkResult = intentChecker.checkIntentCompleteness(
    context.pendingIntent,
    updatedEntities
  )

  if (checkResult.shouldClarify) {
    // 还有字段缺失，继续追问
    return await continueClarification(
      userId,
      session,
      { ...context, extractedEntities: updatedEntities },
      checkResult.missingFields
    )
  }

  // 信息完整，完成
  await sessionManager.completeSession(session.id)

  return {
    shouldRespond: false,
    completed: true,
    cardData: {
      intent: context.pendingIntent,
      entities: updatedEntities
    }
  }
}

/**
 * 继续追问
 */
async function continueClarification(
  userId: string,
  session: any,
  context: ClarificationContext,
  missingFields: Field[],
  confirmedValue?: any
): Promise<{
  shouldRespond: boolean
  response?: any
}> {
// 更新上下文
  await sessionManager.updateContext(session.id, {
    pendingIntent: context.pendingIntent,
    missingFields,
    clarificationHistory: context.clarificationHistory,
    retryCount: context.retryCount + 1
  })

  // 生成追问话术
  const question = templates.generateQuestion(
    intentChecker.determineClarifyReason(missingFields, context.extractedEntities),
    context,
    confirmedValue
  )

  // 创建追问消息
  const aiMessage = await createAIMessage(userId, {
    type: 'text',
    content: question,
    sessionId: session.id
  })

  return {
    shouldRespond: true,
    response: {
      message: aiMessage,
      sessionId: session.id
    }
  }
}

/**
 * 处理超过追问限制
 */
async function handleExceededLimit(
  userId: string,
  session: any,
  context: ClarificationContext
): Promise<{
  shouldRespond: boolean
  response?: any
  completed?: boolean
  cardData?: any
}> {
  const strategy = determineExitStrategy(context.pendingIntent, context.missingFields[0])

  switch (strategy) {
    case 'USE_DEFAULTS': {
      // 使用默认值
      const entitiesWithDefaults = applyDefaults(context)
      await sessionManager.completeSession(session.id)

      return {
        shouldRespond: false,
        completed: true,
        cardData: {
          intent: context.pendingIntent,
          entities: entitiesWithDefaults
        }
      }
    }

    case 'OFFER_OPTIONS': {
      // 提供选项
      const question = `请选择一个：${context.missingFields[0].options?.join('、')}？`

      const aiMessage = await createAIMessage(userId, {
        type: 'text',
        content: question,
        sessionId: session.id
      })

      return {
        shouldRespond: true,
        response: {
          message: aiMessage,
          sessionId: session.id
        }
      }
    }

    case 'CANCEL_INTENT':
    default: {
      // 取消意图
      await sessionManager.clearSession(userId)

      const aiMessage = await createAIMessage(userId, {
        type: 'text',
        content: '好的，有需要随时叫我。',
        sessionId: session.id
      })

      return {
        shouldRespond: true,
        completed: true,
        response: {
          message: aiMessage,
          sessionId: session.id
        }
      }
    }
  }
}

/**
 * 确定退出策略
 */
function determineExitStrategy(
  intent: IntentType,
  field?: Field
): ExitStrategy {
  if (!field) {
    return 'CANCEL_INTENT'
  }

  // 权重相关优先使用默认值
  if (field.name === 'weight' || field.name === 'reps') {
    return 'USE_DEFAULTS'
  }

  // 选择类型优先提供选项
  if (field.type === 'select') {
    return 'OFFER_OPTIONS'
  }

  return 'CANCEL_INTENT'
}

/**
 * 应用默认值
 */
function applyDefaults(context: ClarificationContext): Record<string, any> {
  const defaults: Record<string, any> = {
    unit: 'kg',
    date: new Date().toISOString().split('T')[0]
  }

  return {
    ...context.extractedEntities,
    ...defaults
  }
}

/**
 * 从纠正值中提取字段更新
 */
function extractFieldUpdate(
  missingFields: Field[],
  value: any
): Record<string, any> {
  if (missingFields.length === 0) {
    return {}
  }

  const field = missingFields[0]

  switch (field.type) {
    case 'number':
      return { [field.name]: Number(value) }
    case 'select':
      return { [field.name]: value }
    case 'text':
      return { [field.name]: value }
    default:
      return {}
  }
}
