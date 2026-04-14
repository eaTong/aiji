import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma } from './setup'
import { env } from '../src/config/env'
import { seedExercises } from '../src/models/exerciseSeed'
import { calcE1RM } from '../src/services/trainingLogService'

async function makeAuthHeaders(extraOpenid = 'test_training_log') {
  const user = await prisma.user.create({ data: { openid: extraOpenid } })
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token }
}

beforeAll(async () => {
  await seedExercises()
})

describe('calcE1RM', () => {
  it('should calculate e1rm using Epley formula', () => {
    // 100kg * (1 + 10/30) = 100 * 1.333... = 133.3
    expect(calcE1RM(100, 10)).toBeCloseTo(133.3, 1)
  })

  it('should return 0 for 0 reps', () => {
    expect(calcE1RM(100, 0)).toBe(0)
  })

  it('should round to 1 decimal place', () => {
    // 80kg * (1 + 8/30) = 80 * 1.2666... = 101.333...
    expect(calcE1RM(80, 8)).toBe(101.3)
  })
})

describe('POST /api/training-logs', () => {
  it('should start a new training log', async () => {
    const { user, token } = await makeAuthHeaders('test_start_log')

    const res = await request(app.callback())
      .post('/api/training-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.userId).toBe(user.id)
    expect(res.body.data.status).toBe('IN_PROGRESS')
    expect(res.body.data.startedAt).toBeDefined()
  })

  it('should start a training log with planId and planDayId', async () => {
    const { user, token } = await makeAuthHeaders('test_start_with_plan')

    const res = await request(app.callback())
      .post('/api/training-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ planId: 'plan-123', planDayId: 'day-456' })

    expect(res.status).toBe(200)
    expect(res.body.data.planId).toBe('plan-123')
    expect(res.body.data.planDayId).toBe('day-456')
  })

  it('should return 401 without auth', async () => {
    const res = await request(app.callback())
      .post('/api/training-logs')
      .send({})

    expect(res.status).toBe(401)
  })
})

describe('POST /api/training-logs/entries', () => {
  it('should add a log entry', async () => {
    const { token } = await makeAuthHeaders('test_add_entry')

    // First create a training log
    const logRes = await request(app.callback())
      .post('/api/training-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    const logId = logRes.body.data.id

    // Find an exercise
    const exercise = await prisma.exercise.findFirst({
      where: { isCustom: false, userId: null },
    })

    const res = await request(app.callback())
      .post('/api/training-logs/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        logId,
        exerciseId: exercise!.id,
        exerciseName: exercise!.name,
        setNumber: 1,
        weight: 80,
        reps: 10,
      })

    expect(res.status).toBe(200)
    expect(res.body.data.weight).toBe(80)
    expect(res.body.data.reps).toBe(10)
    expect(res.body.data.e1rm).toBeCloseTo(106.7, 1)
  })

  it('should set e1rm to null for warmup sets', async () => {
    const { token } = await makeAuthHeaders('test_warmup_entry')

    const logRes = await request(app.callback())
      .post('/api/training-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    const logId = logRes.body.data.id

    const exercise = await prisma.exercise.findFirst({
      where: { isCustom: false, userId: null },
    })

    const res = await request(app.callback())
      .post('/api/training-logs/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        logId,
        exerciseId: exercise!.id,
        exerciseName: exercise!.name,
        setNumber: 1,
        weight: 40,
        reps: 10,
        isWarmup: true,
      })

    expect(res.status).toBe(200)
    expect(res.body.data.isWarmup).toBe(true)
    expect(res.body.data.e1rm).toBeNull()
  })

  it('should return 401 without auth', async () => {
    const res = await request(app.callback())
      .post('/api/training-logs/entries')
      .send({ logId: 'test', exerciseId: 'test', exerciseName: 'test', setNumber: 1, weight: 60, reps: 10 })

    expect(res.status).toBe(401)
  })
})

describe('POST /api/training-logs/finish', () => {
  it('should complete a training log with correct totalVolume and duration', async () => {
    const { token } = await makeAuthHeaders('test_finish_log')

    // Start a training log
    const logRes = await request(app.callback())
      .post('/api/training-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    const logId = logRes.body.data.id
    const startedAt = new Date(logRes.body.data.startedAt)

    const exercise = await prisma.exercise.findFirst({
      where: { isCustom: false, userId: null },
    })

    // Add multiple entries: 2 warmup + 3 working sets
    // Warmup: 40kg x 10 (should NOT contribute to volume)
    await request(app.callback())
      .post('/api/training-logs/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        logId,
        exerciseId: exercise!.id,
        exerciseName: exercise!.name,
        setNumber: 1,
        weight: 40,
        reps: 10,
        isWarmup: true,
      })

    // Working: 80kg x 10 (volume = 800)
    await request(app.callback())
      .post('/api/training-logs/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        logId,
        exerciseId: exercise!.id,
        exerciseName: exercise!.name,
        setNumber: 2,
        weight: 80,
        reps: 10,
        isWarmup: false,
      })

    // Working: 80kg x 8 (volume = 640)
    await request(app.callback())
      .post('/api/training-logs/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        logId,
        exerciseId: exercise!.id,
        exerciseName: exercise!.name,
        setNumber: 3,
        weight: 80,
        reps: 8,
        isWarmup: false,
      })

    // Working: 80kg x 6 (volume = 480)
    await request(app.callback())
      .post('/api/training-logs/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        logId,
        exerciseId: exercise!.id,
        exerciseName: exercise!.name,
        setNumber: 4,
        weight: 80,
        reps: 6,
        isWarmup: false,
      })

    // Finish
    const finishRes = await request(app.callback())
      .post('/api/training-logs/finish')
      .set('Authorization', `Bearer ${token}`)
      .send({ logId })

    expect(finishRes.status).toBe(200)
    expect(finishRes.body.data.status).toBe('COMPLETED')
    expect(finishRes.body.data.completedAt).toBeDefined()
    expect(finishRes.body.data.totalVolume).toBeGreaterThanOrEqual(1920)
    expect(finishRes.body.data.duration).toBeGreaterThanOrEqual(0)
  })

  it('should return 401 without auth', async () => {
    const res = await request(app.callback())
      .post('/api/training-logs/finish')
      .send({ logId: 'test' })

    expect(res.status).toBe(401)
  })
})

describe('GET /api/training-logs', () => {
  it('should list training logs with pagination', async () => {
    const { user, token } = await makeAuthHeaders('test_list_logs')

    // Create 3 training logs
    for (let i = 0; i < 3; i++) {
      await request(app.callback())
        .post('/api/training-logs')
        .set('Authorization', `Bearer ${token}`)
        .send({})
    }

    // List with limit
    const res = await request(app.callback())
      .get('/api/training-logs?limit=2&offset=0')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(2)
  })

  it('should return 401 without auth', async () => {
    const res = await request(app.callback()).get('/api/training-logs')

    expect(res.status).toBe(401)
  })
})

describe('GET /api/training-logs/exercise/:exerciseId/history', () => {
  it('should return exercise history', async () => {
    const { token } = await makeAuthHeaders('test_exercise_history')

    const exercise = await prisma.exercise.findFirst({
      where: { isCustom: false, userId: null },
    })

    // Start a log and add entries for this exercise
    const logRes = await request(app.callback())
      .post('/api/training-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    const logId = logRes.body.data.id

    await request(app.callback())
      .post('/api/training-logs/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        logId,
        exerciseId: exercise!.id,
        exerciseName: exercise!.name,
        setNumber: 1,
        weight: 80,
        reps: 10,
      })

    // Finish the log
    await request(app.callback())
      .post('/api/training-logs/finish')
      .set('Authorization', `Bearer ${token}`)
      .send({ logId })

    // Get history
    const res = await request(app.callback())
      .get(`/api/training-logs/exercise/${exercise!.id}/history?limit=10`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body.data[0].exerciseId).toBe(exercise!.id)
  })

  it('should return 401 without auth', async () => {
    const res = await request(app.callback()).get('/api/training-logs/exercise/test-id/history')

    expect(res.status).toBe(401)
  })
})