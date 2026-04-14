import {
  IntentType,
  IntentResult,
  FuzzyMatch,
  DisambiguationResult,
  INTENT_PRIORITY
} from '../types/clarification'

// ============================================
// 意图识别器 - 解析用户输入的意图
// ============================================

// 意图关键词映射
const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  RECORD_WEIGHT: [
    /体重/i,
    /kg/i,
    /公斤/i,
    /斤/i,
    /磅/i
  ],

  RECORD_MEASUREMENT: [
    /围度/i,
    /胸围/i,
    /腰围/i,
    /臀围/i,
    /臂围/i,
    /腿围/i,
    /三围/i,
    /测量/i
  ],

  RECORD_TRAINING: [
    /记录.*训练/i,
    /练.*记/i,
    /做完/i,
    /练完/i,
    /训练.*录/i,
    /录入.*训练/i,
    /今天.*练/i,
    /刚.*练/i
  ],

  RECORD_DIET: [
    /饮食/i,
    /吃饭/i,
    /吃了/i,
    /早餐/i,
    /午餐/i,
    /晚餐/i,
    /热量/i,
    /蛋白质/i
  ],

  TRAINING_RECOMMEND: [
    /练什么/i,
    /训练/i,
    /动.*好/i,
    /练.*肌/i,
    /健身/i,
    /运动/i,
    /建议.*练/i,
    /推荐.*动/i
  ],

  QUERY_RECOVERY: [
    /恢复/i,
    /肌肉.*状态/i,
    /酸/i,
    /休息/i,
    /疲劳/i,
    /状态.*怎/i
  ],

  QUERY_PR: [
    /pr/i,
    /记录/i,
    /最好.*成绩/i,
    /个人.*记录/i,
    /最高.*重/i,
    /突破/i,
    /进步/i
  ],

  QUERY_WEIGHT: [
    /体重.*多少/i,
    /有多重/i,
    /现在.*体重/i,
    /今日.*体重/i
  ],

  QUERY_TREND: [
    /趋势/i,
    /变化/i,
    /曲线/i,
    /走势/i,
    /最近.*怎/i
  ],

  GREETING: [
    /^(你好|您好|嗨|hi|hello|早上好|晚安|早上|下午|晚上)$/i,
    /^hi$/i,
    /^hello$/i
  ],

  CHITCHAT: [
    /^(谢谢|感谢|ok|好的|嗯|哦|好吧|行)$/i,
    /^(你是谁|能干|会什么)/i,
    /无聊/i,
    /聊聊/i
  ],

  UNKNOWN: []
}

/**
 * 解析用户输入，确定意图
 */
export function parseIntent(message: string): IntentResult {
  const trimmed = message.trim()

  // 空消息
  if (!trimmed) {
    return {
      type: 'UNKNOWN',
      confidence: 0,
      entities: {},
      rawText: trimmed
    }
  }

  // 模糊匹配意图
  const matches = fuzzyMatchIntent(trimmed)

  if (matches.length === 0) {
    return {
      type: 'UNKNOWN',
      confidence: 0,
      entities: extractEntities(trimmed, 'UNKNOWN'),
      rawText: trimmed
    }
  }

  // 返回置信度最高的意图
  const bestMatch = matches[0]

  // 如果最高置信度低于阈值，返回 UNKNOWN
  if (bestMatch.confidence < 0.3) {
    return {
      type: 'UNKNOWN',
      confidence: 0,
      entities: extractEntities(trimmed, 'UNKNOWN'),
      rawText: trimmed
    }
  }

  return {
    type: bestMatch.intent,
    confidence: bestMatch.confidence,
    entities: extractEntities(trimmed, bestMatch.intent),
    rawText: trimmed
  }
}

/**
 * 模糊匹配意图
 */
export function fuzzyMatchIntent(message: string): FuzzyMatch[] {
  const results: FuzzyMatch[] = []

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        const existing = results.find(r => r.intent === intent)
        if (existing) {
          existing.confidence += 0.2
        } else {
          results.push({
            intent: intent as IntentType,
            confidence: 0.3,
            matchedPattern: pattern.source
          })
        }
      }
    }
  }

  // 按置信度排序
  return results.sort((a, b) => b.confidence - a.confidence)
}

/**
 * 提取实体
 */
export function extractEntities(
  message: string,
  intent: IntentType
): Record<string, any> {
  const entities: Record<string, any> = {}

  // 提取数字
  const numberMatch = message.match(/(\d+\.?\d*)/)
  if (numberMatch) {
    entities.number = parseFloat(numberMatch[1])
  }

  // 提取单位
  const unitMatch = message.match(/(kg|公斤|斤|lbs|磅|cm|厘米|英寸)/i)
  if (unitMatch) {
    entities.unit = unitMatch[1].toLowerCase()
  }

  // 提取肌群
  const musclePatterns: Record<string, RegExp> = {
    chest: /胸|胸部|胸肌/i,
    back: /背|背部|背阔肌/i,
    legs: /腿|腿部|大腿|小腿/i,
    shoulders: /肩|肩部|三角肌/i,
    arms: /臂|手臂|二头|三头|肱二头|肱三头/i,
    core: /腹|腹部|核心|腹肌/i
  }

  for (const [muscle, pattern] of Object.entries(musclePatterns)) {
    if (pattern.test(message)) {
      entities.muscle = muscle
      break
    }
  }

  // 提取时间
  if (/今天/i.test(message)) {
    entities.date = 'today'
  } else if (/昨天/i.test(message)) {
    entities.date = 'yesterday'
  } else if (/前天/i.test(message)) {
    entities.date = 'dayBeforeYesterday'
  }

  // 提取动作
  const exerciseKeywords = [
    '卧推', '深蹲', '硬拉', '引体向上', '双杠臂屈伸',
    '哑铃卧推', '哑铃深蹲', '杠铃划船', '臀冲', '腹肌轮'
  ]

  for (const exercise of exerciseKeywords) {
    if (message.includes(exercise)) {
      entities.exercise = exercise
      break
    }
  }

  return entities
}

/**
 * 解析多个意图（用于多意图检测）
 */
export function parseIntents(message: string): IntentType[] {
  const matches = fuzzyMatchIntent(message)

  // 置信度高于 0.3 的意图
  return matches
    .filter(m => m.confidence >= 0.3)
    .map(m => m.intent)
}

/**
 * 意图消歧
 */
export function disambiguateIntents(
  intents: IntentType[],
  context?: Record<string, any>
): DisambiguationResult {
  if (intents.length === 0) {
    return {
      primaryIntent: 'UNKNOWN',
      secondaryIntents: [],
      clarificationNeeded: false
    }
  }

  if (intents.length === 1) {
    return {
      primaryIntent: intents[0],
      secondaryIntents: [],
      clarificationNeeded: false
    }
  }

  // 按优先级排序
  const sorted = [...intents].sort((a, b) => {
    const priorityA = INTENT_PRIORITY[a]
    const priorityB = INTENT_PRIORITY[b]
    return priorityA - priorityB
  })

  const [primary, ...secondary] = sorted

  // 如果多个意图优先级相同，需要澄清
  const hasConflict = sorted.slice(1).some(
    i => INTENT_PRIORITY[i] === INTENT_PRIORITY[primary]
  )

  if (hasConflict) {
    return {
      primaryIntent: primary,
      secondaryIntents: secondary,
      clarificationNeeded: true,
      suggestion: `我理解你想做 ${primary} 和 ${secondary[0]}，想先做哪个？`
    }
  }

  return {
    primaryIntent: primary,
    secondaryIntents: secondary,
    clarificationNeeded: false
  }
}

/**
 * 检查是否是取消/否定意图
 */
export function isNegativeIntent(message: string): boolean {
  const negativePatterns = [
    /^(不|没|别|算了|取消|不要|不用|算了)/i,
    /算了/i,
    /不录入了/i,
    /不记录了/i,
    /改天再说/i
  ]

  return negativePatterns.some(p => p.test(message.trim()))
}

/**
 * 检查是否是确认意图
 */
export function isAffirmativeIntent(message: string): boolean {
  const affirmativePatterns = [
    /^(是|对|嗯|ok|好|好的|对)/i,
    /^ok$/i,
    /^yes$/i,
    /^yeah$/i
  ]

  return affirmativePatterns.some(p => p.test(message.trim()))
}

/**
 * 检查是否是"稍后再说"
 */
export function isDeferIntent(message: string): boolean {
  const deferPatterns = [
    /等会儿再说/i,
    /等一下/i,
    /先不/i,
    /回头再说/i,
    /之后再说/i
  ]

  return deferPatterns.some(p => p.test(message.trim()))
}

/**
 * 检查是否是纠正意图
 */
export function isCorrectionIntent(message: string): boolean {
  const correctionPatterns = [
    /不对/i,
    /错了/i,
    /打错了/i,
    /说错了/i,
    /不对，是/i,
    /应该是/i,
    /更正/i
  ]

  return correctionPatterns.some(p => p.test(message))
}

/**
 * 从纠正语句中提取新值
 */
export function extractCorrectedValue(message: string): any {
  // 匹配"应该是XX"或"是XX"
  const match = message.match(/是(\d+\.?\d*)|不对[，,]?(\d+\.?\d*)/i)
  if (match) {
    return parseFloat(match[1] || match[2])
  }

  // 匹配"是XX"（动作名等）
  const actionMatch = message.match(/是([^，,，]+)/i)
  if (actionMatch) {
    return actionMatch[1].trim()
  }

  return null
}
