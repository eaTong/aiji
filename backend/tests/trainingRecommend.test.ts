import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma } from './setup'
import { env } from '../src/config/env'
import { seedExercises } from '../src/models/exerciseSeed'
import { Goal, Equipment } from '@prisma/client'

async function makeAuthHeaders(extraOpenid = 'test_training_recommend') {
  const user = await prisma.user.create({ data: { openid: extraOpenid } })
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token }
}

beforeAll(async () => {
  await seedExercises()
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

    // Set user goal
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

  it('should return 401 without auth', async () => {
    const res = await request(app.callback())
      .post('/api/training/recommend')
      .send({})

    expect(res.status).toBe(401)
  })
})

describe('POST /api/training/record', () => {
  it('should save training record', async () => {
    const { token } = await makeAuthHeaders('test_save_record')

    // Find an exercise
    const exercise = await prisma.exercise.findFirst({
      where: { isCustom: false, userId: null },
    })

    const res = await request(app.callback())
      .post('/api/training/record')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-04-13',
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
    expect(res.body.data.totalVolume).toBeGreaterThan(0)
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
        date: '2026-04-13',
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

  it('should return 401 without auth', async () => {
    const res = await request(app.callback())
      .post('/api/training/record')
      .send({
        date: '2026-04-13',
        trainingType: '测试',
        exercises: [],
      })

    expect(res.status).toBe(401)
  })
})