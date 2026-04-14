import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'

const prisma = new PrismaClient()

// ============================================
// AI 网关服务 - 调用外部 AI 接口
// ============================================

export interface AIRequest {
  userId: string
  message: string
  conversationHistory?: Array<{ role: string; content: string }>
}

export interface AIResponse {
  content: string
  intent?: string
  error?: string
}

// 意图关键词映射
const INTENT_KEYWORDS: Record<string, string[]> = {
  RECORD_WEIGHT: ['体重', 'kg', '公斤', '斤', '磅'],
  RECORD_TRAINING: ['练', '训练', '卧推', '深蹲', '硬拉', '记录'],
  RECORD_DIET: ['吃', '饮食', '早餐', '午餐', '晚餐', '热量'],
  TRAINING_RECOMMEND: ['推荐', '建议', '练什么', '动.*好'],
  QUERY_RECOVERY: ['恢复', '状态', '疲劳', '酸'],
  QUERY_PR: ['pr', '记录', '最好', '突破', '个人'],
  QUERY_WEIGHT: ['体重', '多重', '多少斤'],
  QUERY_TREND: ['趋势', '变化', '走势'],
  GREETING: ['你好', '早上好', '下午好', '晚上好', '嗨', 'hi', 'hello'],
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(): string {
  return `你是一个健身AI助手，名叫"AI己"。你的特点是：
1. 专业、简洁、有耐心
2. 善于理解用户的健身目标和训练记录
3. 可以识别用户的训练意图（如记录训练、查询状态、推荐训练等）
4. 回复简洁有力，不啰嗦
5. 可以生成结构化的卡片回复

用户正在健身记录场景中与您对话。请根据用户的消息给出合适的回复。`
}

/**
 * 构建用户上下文
 */
async function buildUserContext(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        nickname: true,
        goal: true,
        level: true,
        targetWeight: true,
        height: true
      }
    })

    if (!user) {
      return '用户信息: 未找到用户'
    }

    // 目标映射
    const goalLabels: Record<string, string> = {
      LOSE_FAT: '减脂',
      GAIN_MUSCLE: '增肌',
      BODY_SHAPE: '塑形',
      IMPROVE_FITNESS: '提升体能'
    }

    // 获取最近的训练记录
    const recentLogs = await prisma.trainingLog.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 3,
      include: {
        logEntries: {
          take: 3,
          orderBy: { setNumber: 'asc' }
        }
      }
    })

    let recentTrainingText = '暂无训练记录'
    if (recentLogs.length > 0) {
      recentTrainingText = recentLogs.slice(0, 2).map(log => {
        const exercises = log.logEntries.slice(0, 2).map(
          e => `${e.exerciseName}: ${e.weight}kg×${e.reps}`
        ).join(', ')
        const date = log.startedAt.toISOString().split('T')[0]
        return `${date} - ${exercises}${log.logEntries.length > 2 ? '...' : ''}`
      }).join('\n')
    }

    // 获取最新体重
    const latestWeight = await prisma.weightRecord.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' }
    })

    return `
当前用户信息：
- 昵称: ${user.nickname || '用户'}
- 健身目标: ${user.goal ? goalLabels[user.goal] || user.goal : '未设置'}
- 当前体重: ${latestWeight ? `${latestWeight.weight}kg` : '未知'}
- 目标体重: ${user.targetWeight ? `${user.targetWeight}kg` : '未设置'}

最近训练记录：
${recentTrainingText}
`.trim()
  } catch (error) {
    console.error('[aiGateway] buildUserContext error:', error)
    return '用户信息: 获取失败'
  }
}

/**
 * 调用外部 AI 接口
 */
export async function callAI(request: AIRequest): Promise<AIResponse> {
  const { userId, message, conversationHistory } = request

  // 检查是否配置了 API Key
  if (!env.aiApiKey) {
    return {
      content: '',
      error: 'AI_API_KEY 未配置'
    }
  }

  try {
    // 构建上下文
    const userContext = await buildUserContext(userId)
    const systemPrompt = buildSystemPrompt()

    // 构建消息列表
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: `${systemPrompt}\n\n${userContext}` }
    ]

    // 添加对话历史
    if (conversationHistory && conversationHistory.length > 0) {
      // 只保留最近 6 条历史
      const recentHistory = conversationHistory.slice(-6)
      messages.push(...recentHistory)
    }

    // 添加当前用户消息
    messages.push({ role: 'user', content: message })

    // 调用 AI API
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30秒超时

    const response = await fetch(env.aiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.aiApiKey}`
      },
      body: JSON.stringify({
        model: env.aiModel,
        messages,
        temperature: env.aiTemperature,
        max_tokens: env.aiMaxTokens
      }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[aiGateway] API error:', response.status, errorText)
      return {
        content: '',
        error: `AI服务调用失败: ${response.status}`
      }
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = data.choices?.[0]?.message?.content?.trim() || ''

    if (!content) {
      return {
        content: '',
        error: 'AI返回内容为空'
      }
    }

    // 检测意图
    const intent = detectIntent(message + ' ' + content)

    return {
      content,
      intent
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[aiGateway] Request timeout')
      return {
        content: '',
        error: 'AI服务请求超时'
      }
    }
    console.error('[aiGateway] Exception:', error)
    return {
      content: '',
      error: `AI服务异常: ${error.message}`
    }
  }
}

/**
 * 从消息中检测意图
 */
function detectIntent(text: string): string | undefined {
  const lowerText = text.toLowerCase()

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (keyword.includes('.*')) {
        // 正则表达式
        const regex = new RegExp(keyword, 'i')
        if (regex.test(text)) {
          return intent
        }
      } else if (lowerText.includes(keyword.toLowerCase())) {
        return intent
      }
    }
  }

  return undefined
}

/**
 * 检查 AI 服务是否可用
 */
export function isAIServiceAvailable(): boolean {
  return Boolean(env.aiApiKey && env.aiApiUrl)
}

// ============================================
// AI 意图判断和实体解析
// ============================================

export type IntentType =
  | 'RECORD_WEIGHT'
  | 'RECORD_TRAINING'
  | 'RECORD_MEASUREMENT'
  | 'RECORD_DIET'
  | 'TRAINING_RECOMMEND'
  | 'QUERY_RECOVERY'
  | 'QUERY_PR'
  | 'QUERY_WEIGHT'
  | 'QUERY_TREND'
  | 'GREETING'
  | 'CHITCHAT'
  | 'UNKNOWN'

const INTENT_LIST = [
  'RECORD_WEIGHT',
  'RECORD_TRAINING',
  'RECORD_MEASUREMENT',
  'RECORD_DIET',
  'TRAINING_RECOMMEND',
  'QUERY_RECOVERY',
  'QUERY_PR',
  'QUERY_WEIGHT',
  'QUERY_TREND',
  'GREETING',
  'CHITCHAT'
]

/**
 * AI 意图判断
 * @param userId 用户ID
 * @param message 用户消息
 * @returns 意图类型和置信度
 */
export async function determineIntent(
  userId: string,
  message: string
): Promise<{ intent: IntentType; confidence: number }> {
  // 如果 AI 服务不可用，使用 regex 降级
  if (!isAIServiceAvailable()) {
    const fallbackIntent = detectIntentFallback(message)
    return { intent: fallbackIntent, confidence: 0.5 }
  }

  try {
    const userContext = await buildUserContext(userId)

    const response = await callAIInternal({
      systemPrompt: `你是一个意图分类器。用户消息可能属于以下意图之一：
- RECORD_WEIGHT: 记录体重（如"今天体重65kg"、"称重130斤"）
- RECORD_TRAINING: 记录训练（如"今天练了卧推60kg 8个"、"深蹲100kg 5下"）
- RECORD_MEASUREMENT: 记录围度（如"今天腰围70cm"、"测了下臂围35"）
- RECORD_DIET: 记录饮食（如"吃了2000大卡"、"午餐吃了米饭和鸡胸"）
- TRAINING_RECOMMEND: 请求训练推荐（如"今天练什么好"、"推荐个训练"）
- QUERY_RECOVERY: 查询恢复状态（如"肌肉恢复得怎么样"、"今天状态好吗"）
- QUERY_PR: 查询个人记录（如"我的pr是多少"、"卧推最好成绩"）
- QUERY_WEIGHT: 查询体重（如"最近体重多少"、"体重有变化吗"）
- QUERY_TREND: 查询趋势（如"体重趋势怎么样"、"训练效果如何"）
- GREETING: 问候（如"你好"、"早上好"、"嗨"）
- CHITCHAT: 闲聊或其他

请判断用户消息的意图，返回 JSON 格式：
{"intent": "意图名", "confidence": 0.0-1.0}

只返回 JSON，不要有其他内容。`,
      userMessage: message,
      userContext
    })

    // 解析 JSON 响应
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { intent: string; confidence: number }
      const validIntent = INTENT_LIST.includes(parsed.intent) ? parsed.intent : 'UNKNOWN'
      return {
        intent: validIntent as IntentType,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0))
      }
    }

    return { intent: 'UNKNOWN', confidence: 0 }
  } catch (error) {
    console.error('[aiGateway] determineIntent error:', error)
    const fallbackIntent = detectIntentFallback(message)
    return { intent: fallbackIntent, confidence: 0.3 }
  }
}

/**
 * AI 实体解析
 * @param userId 用户ID
 * @param message 用户消息
 * @param intent 意图类型
 * @returns 解析出的实体数据
 */
export async function parseEntities(
  userId: string,
  message: string,
  intent: IntentType
): Promise<Record<string, any>> {
  // 如果 AI 服务不可用，使用本地解析
  if (!isAIServiceAvailable()) {
    return parseEntitiesLocally(message, intent)
  }

  const promptByIntent: Record<string, string> = {
    RECORD_WEIGHT: `从消息中提取体重数据。返回 JSON 格式：
{"weight": 数字, "unit": "kg或斤", "date": "日期或今天"}
如果无法提取，返回空对象 {}`,

    RECORD_TRAINING: `从消息中提取训练动作数据。返回 JSON 格式：
{"exercises": [{"name": "动作名", "sets": [{"weight": 数字, "reps": 数字}]}], "date": "日期或今天"}
只提取有明确重量和次数的动作，忽略不完整的。如果无法提取，返回空对象 {}。`,

    RECORD_MEASUREMENT: `从消息中提取围度数据。返回 JSON 格式：
{"measurements": {"waist": 数字, "hip": 数字, "chest": 数字, ...}, "date": "日期或今天"}
只提取有明确数值的围度。如果无法提取，返回空对象 {}。`,

    RECORD_DIET: `从消息中提取饮食数据。返回 JSON 格式：
{"calories": 数字, "meals": [{"type": "早餐/午餐/晚餐/加餐", "foods": ["食物1", "食物2"]}], "date": "日期或今天"}
如果无法提取，返回空对象 {}。`,

    QUERY_PR: `从消息中提取要查询的动作。返回 JSON 格式：
{"exerciseName": "动作名"}
如果消息中没有指定动作，返回空对象 {}。`,

    QUERY_WEIGHT: `返回空对象 {}，体重查询不需要额外参数。`,

    QUERY_TREND: `返回空对象 {}，趋势查询不需要额外参数。`
  }

  const prompt = promptByIntent[intent] || '返回空对象 {}'

  try {
    const userContext = await buildUserContext(userId)

    const response = await callAIInternal({
      systemPrompt: prompt,
      userMessage: message,
      userContext
    })

    // 解析 JSON 响应
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return {}
  } catch (error) {
    console.error('[aiGateway] parseEntities error:', error)
    // 降级到本地解析
    return parseEntitiesLocally(message, intent)
  }
}

/**
 * 内部调用 AI 接口（不经过完整流程）
 */
async function callAIInternal(request: {
  systemPrompt: string
  userMessage: string
  userContext: string
}): Promise<string> {
  if (!env.aiApiKey) {
    throw new Error('AI_API_KEY 未配置')
  }

  const messages = [
    { role: 'system' as const, content: `${request.systemPrompt}\n\n用户信息：\n${request.userContext}` },
    { role: 'user' as const, content: request.userMessage }
  ]

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000) // 20秒超时

  try {
    const response = await fetch(env.aiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.aiApiKey}`
      },
      body: JSON.stringify({
        model: env.aiModel,
        messages,
        temperature: 0.3, // 低温度以获得更确定的输出
        max_tokens: 300
      }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`AI服务调用失败: ${response.status}`)
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    return data.choices?.[0]?.message?.content?.trim() || ''
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * 检测意图（降级方案 - regex）
 */
function detectIntentFallback(text: string): IntentType {
  const lowerText = text.toLowerCase()

  // 优先检测问候
  if (['你好', '早上好', '下午好', '晚上好', '嗨', 'hi', 'hello'].some(k => lowerText.includes(k))) {
    return 'GREETING'
  }

  // 检测体重相关
  if (['体重', 'kg', '公斤', '斤', '磅'].some(k => lowerText.includes(k)) && !['训练', '练'].some(k => lowerText.includes(k))) {
    return 'RECORD_WEIGHT'
  }

  // 检测训练相关
  if (['练', '训练', '卧推', '深蹲', '硬拉'].some(k => lowerText.includes(k))) {
    return 'RECORD_TRAINING'
  }

  // 检测饮食相关
  if (['吃', '饮食', '早餐', '午餐', '晚餐', '热量'].some(k => lowerText.includes(k))) {
    return 'RECORD_DIET'
  }

  // 检测推荐相关
  if (['推荐', '建议', '练什么', '动.*好'].some(k => lowerText.includes(k))) {
    return 'TRAINING_RECOMMEND'
  }

  // 检测恢复查询
  if (['恢复', '状态', '疲劳', '酸'].some(k => lowerText.includes(k))) {
    return 'QUERY_RECOVERY'
  }

  // 检测PR查询
  if (['pr', '记录', '最好', '突破', '个人'].some(k => lowerText.includes(k))) {
    return 'QUERY_PR'
  }

  // 检测体重查询
  if (['体重', '多重', '多少斤'].some(k => lowerText.includes(k))) {
    return 'QUERY_WEIGHT'
  }

  // 检测趋势查询
  if (['趋势', '变化', '走势'].some(k => lowerText.includes(k))) {
    return 'QUERY_TREND'
  }

  return 'CHITCHAT'
}

/**
 * 本地解析实体数据
 */
function parseEntitiesLocally(message: string, intent: IntentType): Record<string, any> {
  switch (intent) {
    case 'RECORD_WEIGHT': {
      // 匹配体重数字
      const weightMatch = message.match(/(\d+\.?\d*)\s*(kg|公斤|斤|磅)/i)
      if (weightMatch) {
        let weight = parseFloat(weightMatch[1])
        const unit = weightMatch[2].toLowerCase()

        // 统一转换为 kg
        if (unit === '斤') {
          weight = weight / 2
        } else if (unit === '磅') {
          weight = weight / 2.205
        }

        return { weight, unit: 'kg' }
      }
      return {}
    }

    case 'RECORD_TRAINING': {
      // 简单的训练解析，可以后续调用 trainingRecordParser
      return {}
    }

    default:
      return {}
  }
}
