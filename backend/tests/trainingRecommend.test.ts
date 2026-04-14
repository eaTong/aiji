import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma } from './setup'
import { env } from '../src/config/env'
import { seedExercises } from '../src/models/exerciseSeed'
import { Goal, Equipment } from '@prisma/client'
import { calcE1RM } from '../src/services/trainingRecordService'

async function makeAuthHeaders(extraOpenid = 'test_training_recommend') {
  const user = await prisma.user.create({ data: { openid: extraOpenid } })
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token }
}

beforeAll(async () => {
  await seedExercises()
})

// ============ 单元测试 ============

describe('calcE1RM (Epley formula)', () => {
  it('should calculate correctly: 100kg × 10 reps', () => {
    // 100 * (1 + 10/30) = 133.3
    expect(calcE1RM(100, 10)).toBeCloseTo(133.3, 1)
  })

  it('should return 0 for 0 reps', () => {
    expect(calcE1RM(100, 0)).toBe(0)
  })

  it('should round to 1 decimal place', () => {
    // 80 * (1 + 8/30) = 101.3
    expect(calcE1RM(80, 8)).toBe(101.3)
  })

  it('should handle small weights', () => {
    expect(calcE1RM(20, 12)).toBeCloseTo(28, 0)
  })
})

describe('POST /api/training/recommend', () => {
  it('should return need_goal when user has no goal set', async () => {
    const { token } = await makeAuthHeaders('test_no_goal')

    const res = await request(app.callback())
      .post('/api/training/recommend')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.type).toBe('need_goal')
    expect(res.body.data.options).toContain('减脂')
    expect(res.body.data.options).toContain('增肌')
  })

  it('should return new_recommendation when user has goal set', async () => {
    const { token } = await makeAuthHeaders('test_with_goal')

    await prisma.user.update({
      where: { openid: 'test_with_goal' },
      data: { goal: Goal.GAIN_MUSCLE, equipment: Equipment.GYM },
    })

    const res = await request(app.callback())
      .post('/api/training/recommend')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(['new_recommendation', 'completed_today', 'rest_day']).toContain(res.body.data.type)
  })

  it('should include muscleScores and overallScore in response', async () => {
    const { token } = await makeAuthHeaders('test_with_scores')

    await prisma.user.update({
      where: { openid: 'test_with_scores' },
      data: { goal: Goal.GAIN_MUSCLE, equipment: Equipment.GYM },
    })

    const res = await request(app.callback())
      .post('/api/training/recommend')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(200)
    if (res.body.data.type === 'new_recommendation' || res.body.data.type === 'rest_day') {
      expect(res.body.data.muscleScores).toBeDefined()
      expect(res.body.data.overallScore).toBeDefined()
    }
  })

  it('should support quickMode parameter', async () => {
    const { token } = await makeAuthHeaders('test_quick_mode')

    await prisma.user.update({
      where: { openid: 'test_quick_mode' },
      data: { goal: Goal.GAIN_MUSCLE, equipment: Equipment.GYM },
    })

    const res = await request(app.callback())
      .post('/api/training/recommend')
      .set('Authorization', `Bearer ${token}`)
      .send({ quickMode: true })

    expect(res.status).toBe(200)
    if (res.body.data.type === 'new_recommendation' || res.body.data.type === 'overtraining_warning') {
      expect(res.body.data.training.duration).toBe(20) // quickMode = 20 minutes
      expect(res.body.data.training.exercises.length).toBeLessThanOrEqual(2)
    }
  })

  it('should return 401 without auth', async () => {
    const res = await request(app.callback())
      .post('/api/training/recommend')
      .send({})

    expect(res.status).toBe(401)
  })
})

describe('POST /api/training/record', () => {
  it('should save training record with correct totalVolume', async () => {
    const { token } = await makeAuthHeaders('test_save_record')

    const exercise = await prisma.exercise.findFirst({
      where: { isCustom: false, userId: null },
    })

    const res = await request(app.callback())
      .post('/api/training/record')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-04-14',
        trainingType: '胸部训练',
        exercises: [
          {
            exerciseId: exercise!.id,
            exerciseName: exercise!.name,
            sets: 3,
            reps: 10,
            weight: 60,
            weightUnit: 'kg',
            isWarmup: false,
          },
        ],
        notes: '状态不错',
      })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.id).toBeDefined()
    // totalVolume = 60 * 10 * 3 = 1800
    expect(res.body.data.totalVolume).toBe(1800)
    expect(res.body.data.message).toContain('已记录')
  })

  it('should calculate e1rm for each exercise', async () => {
    const { token } = await makeAuthHeaders('test_e1rm_calc')

    const exercise = await prisma.exercise.findFirst({
      where: { isCustom: false, userId: null },
    })

    const res = await request(app.callback())
      .post('/api/training/record')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-04-14',
        trainingType: '测试训练',
        exercises: [
          {
            exerciseId: exercise!.id,
            exerciseName: '测试动作',
            sets: 3,
            reps: 10,
            weight: 100,
            weightUnit: 'kg',
            isWarmup: false,
          },
        ],
      })

    expect(res.status).toBe(200)
    // 100 * (1 + 10/30) = 133.3
    expect(res.body.data.e1rm['测试动作']).toBeCloseTo(133.3, 1)
  })

  it('should skip warmup sets from totalVolume', async () => {
    const { token } = await makeAuthHeaders('test_warmup_skip')

    const exercise = await prisma.exercise.findFirst({
      where: { isCustom: false, userId: null },
    })

    const res = await request(app.callback())
      .post('/api/training/record')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-04-14',
        trainingType: '测试热身',
        exercises: [
          {
            exerciseId: exercise!.id,
            exerciseName: '测试动作',
            sets: 1,
            reps: 10,
            weight: 40,
            weightUnit: 'kg',
            isWarmup: true, // 热身组，不计入容量
          },
          {
            exerciseId: exercise!.id,
            exerciseName: '测试动作',
            sets: 3,
            reps: 10,
            weight: 80,
            weightUnit: 'kg',
            isWarmup: false,
          },
        ],
      })

    expect(res.status).toBe(200)
    // 只有80kg×10×3=2400计入，热身组40kg忽略
    expect(res.body.data.totalVolume).toBe(2400)
  })

  it('should return 401 without auth', async () => {
    const res = await request(app.callback())
      .post('/api/training/record')
      .send({
        date: '2026-04-14',
        trainingType: '测试',
        exercises: [],
      })

    expect(res.status).toBe(401)
  })
})