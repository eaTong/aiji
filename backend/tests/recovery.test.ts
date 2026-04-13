import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma } from './setup'
import { env } from '../src/config/env'
import {
  computeMuscleScores,
  computeOverallScore,
  computeRecommendation,
} from '../src/services/recoveryService'
import { seedExercises } from '../src/models/exerciseSeed'

async function makeAuthHeaders(extraOpenid = 'test_recovery') {
  const user = await prisma.user.create({ data: { openid: extraOpenid } })
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token }
}

beforeAll(async () => {
  await seedExercises()
})

describe('computeRecommendation', () => {
  it('should return REST for score < 50', () => {
    expect(computeRecommendation(0)).toBe('REST')
    expect(computeRecommendation(49)).toBe('REST')
  })

  it('should return LIGHT for score >= 50 and < 75', () => {
    expect(computeRecommendation(50)).toBe('LIGHT')
    expect(computeRecommendation(74)).toBe('LIGHT')
  })

  it('should return TRAIN for score >= 75', () => {
    expect(computeRecommendation(75)).toBe('TRAIN')
    expect(computeRecommendation(100)).toBe('TRAIN')
  })
})

describe('computeOverallScore', () => {
  it('should return 100 for empty muscle scores with 8h sleep', () => {
    expect(computeOverallScore({}, 8)).toBe(100)
  })

  it('should apply sleep penalty for less than 8h sleep', () => {
    // avg=100, penalty=(8-6)*2=4, score=96
    expect(computeOverallScore({ chest: 100, back: 100 }, 6)).toBe(96)
  })

  it('should not apply negative penalty', () => {
    // avg=80, penalty=0 (max caps it), score=80
    expect(computeOverallScore({ chest: 80 }, 10)).toBe(80)
  })

  it('should clamp to 0', () => {
    // avg=10, penalty=(8-4)*2=8, raw=2
    expect(computeOverallScore({ chest: 10 }, 4)).toBeGreaterThanOrEqual(0)
  })
})

describe('computeMuscleScores', () => {
  it('should return 100 for all muscles when no training logs exist', async () => {
    const { user } = await makeAuthHeaders('test_no_logs')
    const scores = await computeMuscleScores(user.id, new Date())
    const values = Object.values(scores)
    expect(values.length).toBeGreaterThan(0)
    expect(values.every((v) => v === 100)).toBe(true)
  })
})

describe('GET /api/recovery', () => {
  it('should get recovery status with default today date', async () => {
    const { user, token } = await makeAuthHeaders('test_get_recovery')
    const res = await request(app.callback())
      .get('/api/recovery')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.userId).toBe(user.id)
  })

  it('should get recovery status for specific date', async () => {
    const { user, token } = await makeAuthHeaders('test_get_recovery_date')
    const res = await request(app.callback())
      .get('/api/recovery?date=2026-04-01')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.userId).toBe(user.id)
  })

  it('should return 400 for invalid date format', async () => {
    const { token } = await makeAuthHeaders('test_invalid_date')
    const res = await request(app.callback())
      .get('/api/recovery?date=not-a-date')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
  })

  it('should return 401 without auth', async () => {
    const res = await request(app.callback()).get('/api/recovery')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/recovery/sleep', () => {
  it('should update sleep hours and compute score/recommendation', async () => {
    const { user, token } = await makeAuthHeaders('test_update_sleep')

    const res = await request(app.callback())
      .post('/api/recovery/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-12', sleepHours: 7 })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.sleepHours).toBe(7)
    expect(res.body.data.score).toBeDefined()
    expect(res.body.data.recommendation).toBeDefined()
    expect(['REST', 'LIGHT', 'TRAIN']).toContain(res.body.data.recommendation)
  })

  it('should update existing record on second call (upsert)', async () => {
    const { token } = await makeAuthHeaders('test_upsert_sleep')

    // First call
    await request(app.callback())
      .post('/api/recovery/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-12', sleepHours: 6 })

    // Second call - should update
    const res = await request(app.callback())
      .post('/api/recovery/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-12', sleepHours: 9 })

    expect(res.status).toBe(200)
    expect(res.body.data.sleepHours).toBe(9)
  })

  it('should return 400 if date is missing', async () => {
    const { token } = await makeAuthHeaders('test_missing_date')
    const res = await request(app.callback())
      .post('/api/recovery/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({ sleepHours: 7 })

    expect(res.status).toBe(400)
  })

  it('should return 400 if sleepHours is missing', async () => {
    const { token } = await makeAuthHeaders('test_missing_sleep_hours')
    const res = await request(app.callback())
      .post('/api/recovery/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-12' })

    expect(res.status).toBe(400)
  })

  it('should return 400 if sleepHours is out of range', async () => {
    const { token } = await makeAuthHeaders('test_oob_sleep')
    const res = await request(app.callback())
      .post('/api/recovery/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-12', sleepHours: 30 })

    expect(res.status).toBe(400)
  })

  it('should return 401 without auth', async () => {
    const res = await request(app.callback())
      .post('/api/recovery/sleep')
      .send({ date: '2026-04-12', sleepHours: 7 })

    expect(res.status).toBe(401)
  })
})

describe('recovery with training logs', () => {
  it('should compute lower score for recently trained muscles', async () => {
    const { user, token } = await makeAuthHeaders('test_recent_training')

    // Find a chest exercise
    const exercise = await prisma.exercise.findFirst({
      where: { category: 'CHEST', isCustom: false, userId: null },
    })
    expect(exercise).toBeDefined()

    // Create a completed training log
    const log = await prisma.trainingLog.create({
      data: { userId: user.id, status: 'COMPLETED' },
    })

    // Add entry for chest (recently trained)
    await prisma.logEntry.create({
      data: {
        userId: user.id,
        logId: log.id,
        exerciseId: exercise!.id,
        exerciseName: exercise!.name,
        setNumber: 1,
        weight: 80,
        reps: 10,
        isWarmup: false,
        completedAt: new Date(), // just now
      },
    })

    const res = await request(app.callback())
      .post('/api/recovery/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-12', sleepHours: 8 })

    expect(res.status).toBe(200)
    // Chest was just trained (0 hours ago), so chest score should be 0
    const muscleStatus = res.body.data.muscleStatus
    expect(muscleStatus.chest).toBeLessThan(50)
  })
})