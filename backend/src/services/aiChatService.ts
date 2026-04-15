import { PrismaClient } from '@prisma/client'
import { createAIMessage } from './chatService'
import * as bodyDataService from './bodyDataService'
import * as trainingLogService from './trainingLogService'
import * as trainingRecommendService from './trainingRecommendService'
import * as recoveryService from './recoveryService'
import * as chatTrainingService from './chatTrainingService'
import * as aiGatewayService from './aiGatewayService'
import { getExercises } from './exerciseService'

const { callAI, isAIServiceAvailable } = aiGatewayService

const prisma = new PrismaClient()

// ============================================
// AI Chat Service - AI 对话、结构化输出
// ============================================

/**
 * 处理用户消息，生成 AI 回复
 */
export async function chat(
  userId: string,
  message: string,
  context?: Record<string, any>
): Promise<any> {
  // 根据意图类型生成对应的卡片
  const intent = context?.intent || 'UNKNOWN'

  switch (intent) {
    case 'RECORD_WEIGHT':
      return await generateWeightRecordResponse(userId, context?.entities)

    case 'RECORD_TRAINING':
      return await generateTrainingEditableResponse(userId, context?.entities)

    case 'RECORD_MEASUREMENT':
      return await generateMeasurementRecordResponse(userId, context?.entities)

    case 'RECORD_DIET':
      return await generateDietRecordResponse(userId, context?.entities)

    case 'TRAINING_RECOMMEND':
      return await generateTrainingRecommendResponse(userId)

    case 'QUERY_RECOVERY':
      return await generateRecoveryStatusResponse(userId)

    case 'GREETING':
      return await generateGreetingResponse(userId)

    case 'QUERY_PR':
      return await generatePRResponse(userId, context?.entities)

    case 'QUERY_WEIGHT':
    case 'QUERY_TREND':
      return await generateWeightTrendResponse(userId)

    case 'QUERY_MEASUREMENT_TREND':
      return await generateMeasurementTrend(userId, 90)

    default:
      return await generateDefaultResponse(userId, message, intent)
  }
}

/**
 * 生成体重记录回复
 */
async function generateWeightRecordResponse(
  userId: string,
  entities?: Record<string, any>
): Promise<any> {
  const weight = entities?.weight
  const unit = entities?.unit || 'kg'

  // 如果有完整的体重数据，保存并返回确认
  if (weight) {
    try {
      const today = new Date().toISOString().split('T')[0]
      await bodyDataService.createWeightRecord(userId, weight, today)
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'weight-record',
        cardData: {
          latestWeight: weight,
          unit,
          lastRecordDate: today
        },
        actions: [
          { id: 'dismiss', label: '知道了', action: 'dismiss' }
        ]
      })
    } catch (error: any) {
      // 如果记录已存在，返回已有记录信息
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'weight-record',
        cardData: {
          latestWeight: weight,
          unit,
          lastRecordDate: new Date().toISOString().split('T')[0],
          error: error.message
        },
        actions: [
          { id: 'dismiss', label: '知道了', action: 'dismiss' }
        ]
      })
    }
  }

  // 缺少数据，返回记录卡片
  return await createAIMessage(userId, {
    type: 'card',
    cardType: 'weight-record',
    cardData: {
      latestWeight: undefined,
      lastRecordDate: undefined,
      unit: 'kg'
    },
    actions: [
      { id: 'save', label: '保存', action: 'save' }
    ]
  })
}

/**
 * 生成围度记录卡片
 */
async function generateMeasurementRecordResponse(
  userId: string,
  entities?: Record<string, any>
): Promise<any> {
  const parts = entities?.parts
  const values = entities?.values

  // 围度部位映射
  const partLabels: Record<string, string> = {
    chest: '胸围',
    waist: '腰围',
    hip: '臀围',
    bicep: '臂围',
    thigh: '大腿围',
    calf: '小腿围'
  }

  // 如果有数据，保存并返回确认
  if (parts && values && parts.length === values.length) {
    try {
      const measurementData: Record<string, number> = {}
      parts.forEach((part: string, idx: number) => {
        measurementData[part] = values[idx]
      })

      await bodyDataService.createMeasurementRecord(userId, {
        ...measurementData,
        recordedAt: new Date().toISOString().split('T')[0]
      })

      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'measurement-record',
        cardData: {
          parts: parts.map((p: string) => ({
            name: p,
            label: partLabels[p] || p,
            value: values[parts.indexOf(p)]
          })),
          unit: 'cm',
          saved: true
        },
        actions: [
          { id: 'dismiss', label: '知道了', action: 'dismiss' }
        ]
      })
    } catch (error) {
      return await createAIMessage(userId, {
        type: 'text',
        content: '围度记录保存失败，请稍后重试'
      })
    }
  }

  // 返回空白的围度记录卡片
  return await createAIMessage(userId, {
    type: 'card',
    cardType: 'measurement-record',
    cardData: {
      parts: Object.keys(partLabels).map(key => ({
        name: key,
        label: partLabels[key],
        value: undefined
      })),
      unit: 'cm'
    },
    actions: [
      { id: 'save', label: '保存', action: 'save' }
    ]
  })
}

/**
 * 生成围度趋势卡片
 */
export async function generateMeasurementTrend(userId: string, days = 90): Promise<any> {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const records = await bodyDataService.getMeasurementRecords(
      userId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    )

    if (!records || records.length === 0) {
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'measurement-trend',
        cardData: {
          message: '暂无围度记录，开始记录第一条吧！'
        },
        actions: [
          { id: 'record', label: '记录围度', action: 'navigate', target: '/pages/data/measurements' },
          { id: 'dismiss', label: '关闭', action: 'dismiss' }
        ]
      })
    }

    // 计算各部位的变化
    const partLabels: Record<string, string> = {
      chest: '胸围',
      waist: '腰围',
      hip: '臀围',
      leftArm: '左臂',
      rightArm: '右臂',
      leftThigh: '左大腿',
      rightThigh: '右大腿',
      leftCalf: '左小腿',
      rightCalf: '右小腿'
    }

    const latestRecord = records[records.length - 1]
    const earliestRecord = records[0]

    // 计算各部位的变化
    const changes: Record<string, { current: number; change: number; changePercent: number }> = {}
    for (const part of Object.keys(partLabels)) {
      const current = (latestRecord as any)[part]
      const previous = (earliestRecord as any)[part]
      if (current !== undefined && previous !== undefined) {
        const change = current - previous
        const changePercent = previous !== 0 ? Math.round((change / previous) * 100) : 0
        changes[part] = { current, change, changePercent }
      }
    }

    // 获取最近几次记录用于趋势展示
    const recentRecords = records.slice(-10).map(r => ({
      date: r.recordedAt.toISOString().split('T')[0],
      chest: r.chest,
      waist: r.waist,
      hip: r.hip
    }))

    // 生成 AI 点评
    let aiComment = ''
    if (Object.keys(changes).length > 0) {
      const changeEntries = Object.entries(changes).filter(([, v]) => v.change !== 0)
      if (changeEntries.length > 0) {
        const [part, data] = changeEntries[0]
        const label = partLabels[part]
        if (data.change > 0) {
          aiComment = `${label}相比首次记录增加了${data.change.toFixed(1)}cm，继续保持！`
        } else {
          aiComment = `${label}相比首次记录减少了${Math.abs(data.change).toFixed(1)}cm，效果不错！`
        }
      }
    }

    return await createAIMessage(userId, {
      type: 'card',
      cardType: 'measurement-trend',
      cardData: {
        date: latestRecord.recordedAt.toISOString().split('T')[0],
        period: days,
        parts: Object.keys(partLabels).map(part => ({
          name: part,
          label: partLabels[part],
          current: changes[part]?.current,
          change: changes[part]?.change,
          changePercent: changes[part]?.changePercent
        })),
        chartData: recentRecords,
        aiComment
      },
      actions: [
        { id: 'viewDetail', label: '查看详情', action: 'navigate', target: '/pages/data/measurements' },
        { id: 'dismiss', label: '关闭', action: 'dismiss' }
      ]
    })
  } catch (error) {
    return await createAIMessage(userId, {
      type: 'card',
      cardType: 'measurement-trend',
      cardData: {
        message: '获取围度趋势失败'
      },
      actions: [
        { id: 'dismiss', label: '关闭', action: 'dismiss' }
      ]
    })
  }
}

/**
 * 生成饮食记录卡片
 */
async function generateDietRecordResponse(
  userId: string,
  entities?: Record<string, any>
): Promise<any> {
  const meals = entities?.meals

  // 如果有数据，返回确认
  if (meals && Array.isArray(meals) && meals.length > 0) {
    // TODO: 调用 dietService 保存饮食记录
    return await createAIMessage(userId, {
      type: 'card',
      cardType: 'diet-record',
      cardData: {
        date: new Date().toISOString().split('T')[0],
        meals: meals.map((m: any) => ({
          type: m.type || 'snack',
          description: m.description || m,
          estimatedCalories: m.calories
        })),
        saved: true
      },
      actions: [
        { id: 'dismiss', label: '知道了', action: 'dismiss' }
      ]
    })
  }

  // 返回空白的饮食记录卡片
  return await createAIMessage(userId, {
    type: 'card',
    cardType: 'diet-record',
    cardData: {
      date: new Date().toISOString().split('T')[0],
      meals: [
        { type: 'breakfast', description: '', estimatedCalories: undefined },
        { type: 'lunch', description: '', estimatedCalories: undefined },
        { type: 'dinner', description: '', estimatedCalories: undefined },
        { type: 'snack', description: '', estimatedCalories: undefined }
      ]
    },
    actions: [
      { id: 'save', label: '保存', action: 'save' }
    ]
  })
}

/**
 * 生成训练记录可编辑卡片
 */
async function generateTrainingEditableResponse(
  userId: string,
  entities?: Record<string, any>
): Promise<any> {
  const exercises = entities?.exercises
  const rawText = entities?.rawText || ''

  // 如果有训练数据，保存并返回确认
  if (exercises && Array.isArray(exercises) && exercises.length > 0) {
    // 调用 chatTrainingService 保存训练记录
    const result = await chatTrainingService.saveTrainingFromChat(userId, rawText, entities)

    if (result.saved) {
      const cardData = chatTrainingService.buildTrainingConfirmationCard(result)
      return await createAIMessage(userId, {
        type: cardData.type,
        cardType: cardData.cardType,
        cardData: cardData.cardData,
        actions: cardData.actions
      })
    } else {
      // 保存失败，返回错误信息
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'training-editable',
        cardData: {
          date: new Date().toISOString().split('T')[0],
          exercises: [],
          error: result.error
        },
        actions: [
          { id: 'retry', label: '重试', action: 'retry' },
          { id: 'editManually', label: '手动编辑', action: 'navigate', target: '/pages/training/add' },
          { id: 'dismiss', label: '关闭', action: 'dismiss' }
        ]
      })
    }
  }

  // 返回可编辑卡片
  return await createAIMessage(userId, {
    type: 'card',
    cardType: 'training-editable',
    cardData: {
      date: new Date().toISOString().split('T')[0],
      exercises: []
    },
    actions: [
      { id: 'save', label: '保存', action: 'save' }
    ]
  })
}

/**
 * 生成训练推荐卡片
 */
async function generateTrainingRecommendResponse(userId: string): Promise<any> {
  try {
    const result = await trainingRecommendService.getTrainingRecommendation({ userId })

    // 处理不同类型的返回
    if (result.type === 'need_goal') {
      return await createAIMessage(userId, {
        type: 'text',
        content: result.message || '请先设置你的健身目标',
        actions: result.options?.map((opt, idx) => ({
          id: `option_${idx}`,
          label: opt,
          action: 'select'
        })) || []
      })
    }

    if (result.type === 'rest_day') {
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'training-recommend',
        cardData: {
          name: '休息日',
          reason: result.message || '今天适合休息',
          recommendations: result.suggestions || []
        },
        actions: [
          { id: 'viewPlan', label: '查看计划', action: 'navigate', target: '/pages/training/plan' },
          { id: 'dismiss', label: '关闭', action: 'dismiss' }
        ]
      })
    }

    if (result.type === 'completed_today') {
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'training-recommend',
        cardData: {
          name: result.completedTraining?.name || '今日已完成',
          completed: true,
          reason: '今天训练已完成，明天继续加油！'
        },
        actions: [
          { id: 'viewHistory', label: '查看记录', action: 'navigate', target: '/pages/training/history' },
          { id: 'dismiss', label: '关闭', action: 'dismiss' }
        ]
      })
    }

    if (result.type === 'overtraining_warning') {
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'overtraining-warning',
        cardData: {
          warningLevel: 'mild',
          warnings: result.warnings || [],
          suggestions: result.suggestions || []
        },
        actions: [
          { id: 'viewRecovery', label: '查看恢复', action: 'navigate', target: '/pages/recovery' },
          { id: 'dismiss', label: '知道了', action: 'dismiss' }
        ]
      })
    }

    // 正常推荐
    if (result.training) {
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'training-recommend',
        cardData: {
          name: result.training.name,
          duration: result.training.duration,
          type: result.training.type,
          exercises: result.training.exercises,
          reason: result.training.reason,
          muscleScores: result.muscleScores,
          planDayId: undefined
        },
        actions: [
          { id: 'start', label: '开始训练', action: 'navigate', target: '/pages/training/today' },
          { id: 'save', label: '加入今日计划', action: 'save', target: 'todayPlan' },
          { id: 'regenerate', label: '换一个', action: 'regenerate' },
          { id: 'viewPlan', label: '查看计划', action: 'navigate', target: '/pages/training/plan-detail' }
        ]
      })
    }

    // 默认返回
    return await createAIMessage(userId, {
      type: 'text',
      content: result.message || '暂无推荐，请先设置健身目标'
    })
  } catch (error) {
    // 服务异常时返回默认推荐
    return await createAIMessage(userId, {
      type: 'card',
      cardType: 'training-recommend',
      cardData: {
        name: '胸部力量训练',
        duration: 45,
        exercises: [
          { name: '杠铃卧推', sets: '4×8-10', targetWeight: 60, muscle: 'chest' },
          { name: '哑铃上斜卧推', sets: '3×10-12', targetWeight: 28, muscle: 'chest' }
        ],
        reason: '胸肌已恢复3天，状态良好',
        planDayId: undefined
      },
      actions: [
        { id: 'start', label: '开始训练', action: 'navigate', target: '/pages/training/today' },
        { id: 'save', label: '加入今日计划', action: 'save', target: 'todayPlan' },
        { id: 'regenerate', label: '换一个', action: 'regenerate' },
        { id: 'viewPlan', label: '查看计划', action: 'navigate', target: '/pages/training/plan-detail' }
      ]
    })
  }
}

/**
 * 生成恢复状态卡片
 */
async function generateRecoveryStatusResponse(userId: string): Promise<any> {
  try {
    const status = await recoveryService.getRecoveryStatus(userId, new Date())

    if (!status) {
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'recovery-status',
        cardData: {
          muscles: [],
          overallStatus: 'no_data',
          message: '暂无恢复数据'
        },
        actions: [
          { id: 'dismiss', label: '关闭', action: 'dismiss' }
        ]
      })
    }

    const muscleLabels: Record<string, string> = {
      chest: '胸肌',
      back: '背部',
      legs: '腿部',
      shoulders: '肩部',
      arms: '手臂',
      core: '核心'
    }

    const muscles = Object.entries(status.muscleStatus as Record<string, number>)
      .slice(0, 6)
      .map(([name, score]) => ({
        name,
        label: muscleLabels[name] || name,
        recoveryPercent: Math.round(score),
        status: score >= 80 ? 'recovered' : score >= 50 ? 'recovering' : 'fatigued'
      }))

    return await createAIMessage(userId, {
      type: 'card',
      cardType: 'recovery-status',
      cardData: {
        muscles,
        overallStatus: (status.score ?? 0) >= 70 ? 'ready' : (status.score ?? 0) >= 40 ? 'moderate' : 'rest',
        overallScore: status.score ?? 0,
        recommendation: status.recommendation ?? ''
      },
      actions: [
        { id: 'viewDetail', label: '查看详情', action: 'navigate', target: '/pages/recovery' },
        { id: 'dismiss', label: '关闭', action: 'dismiss' }
      ]
    })
  } catch (error) {
    return await createAIMessage(userId, {
      type: 'card',
      cardType: 'recovery-status',
      cardData: {
        muscles: [
          { name: 'chest', label: '胸肌', recoveryPercent: 85, status: 'recovered' },
          { name: 'back', label: '背部', recoveryPercent: 70, status: 'recovering' },
          { name: 'legs', label: '腿部', recoveryPercent: 60, status: 'recovering' }
        ],
        overallStatus: 'ready'
      },
      actions: [
        { id: 'dismiss', label: '知道了', action: 'dismiss' }
      ]
    })
  }
}

/**
 * 生成 PR 卡片
 */
async function generatePRResponse(
  userId: string,
  entities?: Record<string, any>
): Promise<any> {
  const exerciseName = entities?.exercise || ''

  try {
    // 如果没有指定动作，返回最近 PR 列表
    if (!exerciseName) {
      const recentPRs = await trainingLogService.getRecentPRs(userId, 5)

      if (recentPRs.length === 0) {
        return await createAIMessage(userId, {
          type: 'card',
          cardType: 'personal-record',
          cardData: {
            message: '暂无 PR 记录，开始训练来创造你的第一个 PR 吧！'
          },
          actions: [
            { id: 'startTraining', label: '开始训练', action: 'navigate', target: '/pages/training/today' },
            { id: 'dismiss', label: '关闭', action: 'dismiss' }
          ]
        })
      }

      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'personal-record',
        cardData: {
          exerciseName: '最近 PR',
          recentPRs: recentPRs.map(pr => ({
            exerciseName: pr.exerciseName,
            e1rm: pr.e1rm,
            date: pr.date.toISOString().split('T')[0]
          }))
        },
        actions: [
          { id: 'viewAll', label: '查看全部', action: 'navigate', target: '/pages/pr' },
          { id: 'dismiss', label: '关闭', action: 'dismiss' }
        ]
      })
    }

    // 查找指定动作
    const exercises = await getExercises({ keyword: exerciseName })
    if (exercises.length === 0) {
      return await createAIMessage(userId, {
        type: 'text',
        content: `没有找到动作"${exerciseName}"，请确认动作名称是否正确`
      })
    }

    const exercise = exercises[0]
    const prData = await trainingLogService.getExercisePR(userId, exercise.id)

    if (!prData.entry) {
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'personal-record',
        cardData: {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          message: `还没有${exercise.name}的记录，开始训练来创造 PR 吧！`
        },
        actions: [
          { id: 'startTraining', label: '开始训练', action: 'navigate', target: '/pages/training/today' },
          { id: 'dismiss', label: '关闭', action: 'dismiss' }
        ]
      })
    }

    // 计算改进（与上一次最佳相比）
    const previousPR = await trainingLogService.getPreviousPR(userId, exercise.id)
    const improvement = (previousPR.entry?.e1rm && prData.entry.e1rm)
      ? Math.round((prData.entry.e1rm - previousPR.entry.e1rm) * 10) / 10
      : null

    return await createAIMessage(userId, {
      type: 'card',
      cardType: 'personal-record',
      cardData: {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        newRecord: {
          e1rm: prData.entry.e1rm,
          weight: prData.entry.weight,
          reps: prData.entry.reps,
          date: prData.entry.completedAt?.toISOString().split('T')[0]
        },
        improvement,
        chartData: []
      },
      actions: [
        { id: 'viewHistory', label: '查看历史', action: 'navigate', target: `/pages/pr/${exercise.id}` },
        { id: 'dismiss', label: '关闭', action: 'dismiss' }
      ]
    })
  } catch (error) {
    return await createAIMessage(userId, {
      type: 'card',
      cardType: 'personal-record',
      cardData: {
        exerciseName,
        message: '获取 PR 信息失败'
      },
      actions: [
        { id: 'dismiss', label: '关闭', action: 'dismiss' }
      ]
    })
  }
}

/**
 * 生成体重趋势卡片
 */
async function generateWeightTrendResponse(userId: string): Promise<any> {
  try {
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { records } = await bodyDataService.getWeightRecords(userId, startDate, endDate)

    if (records.length === 0) {
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'weight-trend',
        cardData: {
          currentWeight: undefined,
          change: 0,
          changePercent: 0,
          trend: 'no_data',
          chartData: [],
          period: 30,
          message: '暂无体重记录'
        },
        actions: [
          { id: 'record', label: '记录体重', action: 'navigate', target: '/pages/body/weight' },
          { id: 'dismiss', label: '关闭', action: 'dismiss' }
        ]
      })
    }

    const latestWeight = records[records.length - 1].weight
    const firstWeight = records[0].weight
    const change = Math.round((latestWeight - firstWeight) * 10) / 10
    const changePercent = Math.round((change / firstWeight) * 100 * 10) / 10

    return await createAIMessage(userId, {
      type: 'card',
      cardType: 'weight-trend',
      cardData: {
        currentWeight: latestWeight,
        change,
        changePercent,
        trend: change < 0 ? 'down' : change > 0 ? 'up' : 'stable',
        chartData: records.map(r => ({ date: r.recordedAt, weight: r.weight })),
        period: 30
      },
      actions: [
        { id: 'dismiss', label: '关闭', action: 'dismiss' }
      ]
    })
  } catch (error) {
    return await createAIMessage(userId, {
      type: 'card',
      cardType: 'weight-trend',
      cardData: {
        currentWeight: 70,
        change: 0,
        changePercent: 0,
        trend: 'unknown',
        chartData: [],
        period: 30
      },
      actions: [
        { id: 'dismiss', label: '关闭', action: 'dismiss' }
      ]
    })
  }
}

/**
 * 生成问候回复
 */
async function generateGreetingResponse(userId: string): Promise<any> {
  const hour = new Date().getHours()
  let greeting = '你好'

  if (hour < 12) {
    greeting = '早上好！'
  } else if (hour < 18) {
    greeting = '下午好！'
  } else {
    greeting = '晚上好！'
  }

  // TODO: 检查今日训练计划
  const hasPlan = false

  let additionalText = ''
  if (hasPlan) {
    additionalText = '今天有计划，要开始吗？'
  } else {
    additionalText = '今天要训练吗？'
  }

  return await createAIMessage(userId, {
    type: 'text',
    content: `${greeting} ${additionalText}`
  })
}

/**
 * 生成默认回复
 */
async function generateDefaultResponse(
  userId: string,
  message: string,
  intent: string = 'UNKNOWN'
): Promise<any> {
  // 尝试调用 AI 接口
  if (isAIServiceAvailable()) {
    try {
      const response = await callAI({ userId, message, intent })

      if (response.content) {
        // 构建回复动作
        const actions = buildResponseActions(response.intent)

        return await createAIMessage(userId, {
          type: 'text',
          content: response.content,
          actions
        })
      }
    } catch (error) {
      console.error('[aiChat] AI service error:', error)
      // AI 服务失败，使用预设回复
    }
  }

  // 使用预设回复
  return await createFallbackResponse(userId)
}

/**
 * 构建回复动作按钮
 */
function buildResponseActions(intent?: string): Array<{ id: string; label: string; action: string; target?: string }> {
  const actions: Array<{ id: string; label: string; action: string; target?: string }> = []

  switch (intent) {
    case 'RECORD_WEIGHT':
      actions.push({ id: 'recordWeight', label: '记录体重', action: 'navigate', target: '/pages/body/weight' })
      break
    case 'RECORD_TRAINING':
      actions.push({ id: 'recordTraining', label: '记录训练', action: 'navigate', target: '/pages/training/add' })
      break
    case 'TRAINING_RECOMMEND':
      actions.push({ id: 'getRecommend', label: '获取推荐', action: 'navigate', target: '/pages/training/recommend' })
      break
    case 'QUERY_RECOVERY':
      actions.push({ id: 'viewRecovery', label: '查看恢复', action: 'navigate', target: '/pages/recovery' })
      break
  }

  // 添加帮助按钮
  actions.push({ id: 'help', label: '帮助', action: 'navigate', target: '/pages/help' })

  return actions
}

/**
 * 使用预设回复（AI 不可用或失败时）
 */
async function createFallbackResponse(userId: string): Promise<any> {
  const responses = [
    '我明白了，有什么可以帮你的？',
    '好的，想记录训练还是查询状态？',
    '了解了，要我帮你推荐今天的训练吗？',
    '有什么健身相关的问题都可以问我哦～'
  ]

  const randomResponse = responses[Math.floor(Math.random() * responses.length)]

  return await createAIMessage(userId, {
    type: 'text',
    content: randomResponse,
    actions: [
      { id: 'recordWeight', label: '记录体重', action: 'navigate', target: '/pages/body/weight' },
      { id: 'recordTraining', label: '记录训练', action: 'navigate', target: '/pages/training/add' },
      { id: 'getRecommend', label: '获取推荐', action: 'navigate', target: '/pages/training/recommend' }
    ]
  })
}

/**
 * 生成早安日报
 */
export async function generateMorningReport(userId: string): Promise<any> {
  // TODO: 获取昨日体重变化、训练记录，今日计划等
  return await createAIMessage(userId, {
    type: 'card',
    cardType: 'morning-report',
    cardData: {
      greeting: '早上好！',
      date: new Date().toISOString().split('T')[0],
      yesterdaySummary: {
        weightChange: -0.3,
        trainingDone: true,
        trainingName: '背部训练',
        totalVolume: 4500
      },
      todayPlan: {
        name: '胸部+三头',
        type: '推',
        duration: 45,
        muscle: 'chest'
      },
      recoveryTip: '胸肌恢复 85%，状态良好',
      motivation: '今天也要加油！'
    },
    actions: [
      { id: 'viewDetail', label: '查看详情', action: 'navigate', target: '/pages/report/daily' },
      { id: 'dismiss', label: '知道了', action: 'dismiss' }
    ]
  })
}

/**
 * 生成周报
 */
export async function generateWeeklyReport(userId: string): Promise<any> {
  return await createAIMessage(userId, {
    type: 'card',
    cardType: 'weekly-report',
    cardData: {
      weekStart: getWeekStart(new Date()),
      weekEnd: new Date().toISOString().split('T')[0],
      stats: {
        trainingDays: 4,
        totalVolume: 18000,
        weightChange: -0.8,
        prCount: 2
      },
      muscleBreakdown: [
        { muscle: 'chest', volume: 5000, sessions: 2 },
        { muscle: 'back', volume: 4500, sessions: 1 },
        { muscle: 'legs', volume: 5500, sessions: 1 }
      ],
      aiComment: '本周训练状态不错，背部容量提升明显',
      highlight: '本周背部训练容量提升 15%'
    },
    actions: [
      { id: 'viewDetail', label: '查看详情', action: 'navigate', target: '/pages/report/weekly' },
      { id: 'dismiss', label: '关闭', action: 'dismiss' }
    ]
  })
}

/**
 * 生成过度训练预警
 */
export async function generateOvertrainingWarning(userId: string): Promise<any> {
  return await createAIMessage(userId, {
    type: 'card',
    cardType: 'overtraining-warning',
    cardData: {
      warningLevel: 'mild',
      fatiguedMuscles: [
        { muscle: 'chest', recoveryPercent: 35, consecutiveDays: 4 }
      ],
      suggestions: [
        '胸肌连续训练 4 天，建议休息 1-2 天',
        '可以换其他部位训练，如背部或腿部'
      ],
      recommendation: '建议今天休息或进行低强度的有氧运动'
    },
    actions: [
      { id: 'viewRecovery', label: '查看恢复状态', action: 'navigate', target: '/pages/recovery' },
      { id: 'dismiss', label: '知道了', action: 'dismiss' }
    ]
  })
}

/**
 * 生成目标进度卡片
 */
export async function generateGoalProgress(userId: string): Promise<any> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user || !user.goal) {
      return await createAIMessage(userId, {
        type: 'card',
        cardType: 'goal-progress',
        cardData: {
          message: '还没有设置健身目标，请在个人资料中设置'
        },
        actions: [
          { id: 'setGoal', label: '设置目标', action: 'navigate', target: '/pages/profile/goal' },
          { id: 'dismiss', label: '关闭', action: 'dismiss' }
        ]
      })
    }

    // 获取最新的体重记录
    const latestWeight = await prisma.weightRecord.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' }
    })

    const currentWeight = latestWeight?.weight || 0
    const targetWeight = user.targetWeight || currentWeight

    // 计算进度
    let progress = 0
    let goalType = 'gain_muscle'

    if (user.goal === 'LOSE_FAT') {
      goalType = 'lose_weight'
      if (currentWeight > targetWeight) {
        progress = Math.round(((currentWeight - targetWeight) / (currentWeight - targetWeight || 1)) * 100)
      }
    } else if (user.goal === 'GAIN_MUSCLE') {
      goalType = 'gain_muscle'
      if (currentWeight < targetWeight) {
        progress = Math.round(((targetWeight - currentWeight) / (targetWeight - currentWeight || 1)) * 100)
      }
    } else {
      goalType = 'body_shape'
      progress = 50 // 默认
    }

    // 目标类型映射
    const goalLabels: Record<string, string> = {
      LOSE_FAT: '减脂',
      GAIN_MUSCLE: '增肌',
      BODY_SHAPE: '塑形',
      IMPROVE_FITNESS: '提升体能'
    }

    // 生成鼓励语
    const encouragements = [
      '坚持就是胜利！',
      '每天进步一点点！',
      '加油，你一定可以！',
      '向目标迈进！'
    ]
    const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)]

    return await createAIMessage(userId, {
      type: 'card',
      cardType: 'goal-progress',
      cardData: {
        goal: {
          type: goalType,
          target: targetWeight,
          current: currentWeight,
          unit: 'kg',
          label: goalLabels[user.goal] || '健身目标'
        },
        progress: Math.min(progress, 100),
        encouragement
      },
      actions: [
        { id: 'viewDetail', label: '查看详情', action: 'navigate', target: '/pages/profile/progress' },
        { id: 'dismiss', label: '关闭', action: 'dismiss' }
      ]
    })
  } catch (error) {
    return await createAIMessage(userId, {
      type: 'card',
      cardType: 'goal-progress',
      cardData: {
        message: '获取目标进度失败'
      },
      actions: [
        { id: 'dismiss', label: '关闭', action: 'dismiss' }
      ]
    })
  }
}

/**
 * 生成成就卡片
 */
export async function generateAchievement(
  userId: string,
  achievementId: string,
  achievementName: string,
  description?: string
): Promise<any> {
  // 成就图标映射
  const achievementIcons: Record<string, string> = {
    first_training: '🎯',
    week_streak: '🔥',
    month_streak: '💪',
    first_pr: '🏆',
    volume_master: '📊',
    consistency_king: '👑'
  }

  const icon = achievementIcons[achievementId] || '🏆'

  return await createAIMessage(userId, {
    type: 'card',
    cardType: 'achievement',
    cardData: {
      achievement: {
        id: achievementId,
        name: achievementName,
        description: description || `你解锁了成就：${achievementName}`,
        icon,
        unlockedAt: new Date().toISOString()
      }
    },
    actions: [
      { id: 'share', label: '分享', action: 'share' },
      { id: 'viewAll', label: '查看全部成就', action: 'navigate', target: '/pages/achievement' },
      { id: 'dismiss', label: '关闭', action: 'dismiss' }
    ]
  })
}

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}
