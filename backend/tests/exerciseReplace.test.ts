import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma, trackUser } from './setup'
import { env } from '../src/config/env'
import { seedExercises } from '../src/models/exerciseSeed'

async function makeAuthHeaders(extraOpenid = 'test_replace_user') {
  const user = await prisma.user.create({
    data: {
      openid: extraOpenid,
      goal: 'GAIN_MUSCLE',
      level: 'INTERMEDIATE',
      equipment: 'GYM',
      weeklyTrainingDays: 4,
    },
  })
  trackUser(user.id)
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token }
}

beforeAll(async () => {
  await seedExercises()
})

describe('GET /api/training-plans/:planId/exercises/:exerciseId/replacable', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).get('/api/training-plans/plan-1/exercises/ex-1/replacable')
    expect(res.status).toBe(401)
  })

  it('should return replacable exercises for a planned exercise', async () => {
    const { token } = await makeAuthHeaders('test_replacable')

    // First generate a plan
    const genRes = await request(app.callback())
      .post('/api/training-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ weeks: 4 })

    expect(genRes.status).toBe(200)
    const plan = genRes.body.data
    const planId = plan.id

    // Find a planned exercise
    const planWithExercises = await request(app.callback())
      .get(`/api/training-plans/${planId}`)
      .set('Authorization', `Bearer ${token}`)

    const planDays = planWithExercises.body.data.planDays
    const trainingDay = planDays.find((d: any) => d.dayType !== '休息')
    expect(trainingDay).toBeDefined()

    const plannedExercise = trainingDay.plannedExercises[0]
    expect(plannedExercise).toBeDefined()
    const exerciseId = plannedExercise.id

    // Get replacable exercises
    const res = await request(app.callback())
      .get(`/api/training-plans/${planId}/exercises/${exerciseId}/replacable`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.currentExercise).toBeDefined()
    expect(res.body.data.replacableExercises).toBeDefined()
    expect(Array.isArray(res.body.data.replacableExercises)).toBe(true)

    // Current exercise should not be in replacable list
    const currentExId = res.body.data.currentExercise.id
    const replacableIds = res.body.data.replacableExercises.map((e: any) => e.id)
    expect(replacableIds).not.toContain(currentExId)
  })

  it('should return 404 for non-existent planned exercise', async () => {
    const { token } = await makeAuthHeaders('test_replacable_nonexistent')

    // First generate a plan
    const genRes = await request(app.callback())
      .post('/api/training-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send()

    const planId = genRes.body.data.id

    const res = await request(app.callback())
      .get(`/api/training-plans/${planId}/exercises/non-existent-id/replacable`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})

describe('PUT /api/training-plans/:planId/exercises/:exerciseId/replace', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).put('/api/training-plans/plan-1/exercises/ex-1/replace')
      .send({ newExerciseId: 'ex-2', reason: 'not_interested' })
    expect(res.status).toBe(401)
  })

  it('should replace an exercise successfully', async () => {
    const { token } = await makeAuthHeaders('test_replace_success')

    // First generate a plan
    const genRes = await request(app.callback())
      .post('/api/training-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ weeks: 4 })

    expect(genRes.status).toBe(200)
    const planId = genRes.body.data.id

    // Get plan with exercises
    const planRes = await request(app.callback())
      .get(`/api/training-plans/${planId}`)
      .set('Authorization', `Bearer ${token}`)

    const planDays = planRes.body.data.planDays
    const trainingDay = planDays.find((d: any) => d.dayType !== '休息')
    const plannedExercise = trainingDay.plannedExercises[0]
    const exerciseId = plannedExercise.id
    const originalExerciseId = plannedExercise.exerciseId

    // Get replacable exercises
    const replacableRes = await request(app.callback())
      .get(`/api/training-plans/${planId}/exercises/${exerciseId}/replacable`)
      .set('Authorization', `Bearer ${token}`)

    const replacableExercises = replacableRes.body.data.replacableExercises
    expect(replacableExercises.length).toBeGreaterThan(0)
    const newExercise = replacableExercises[0]

    // Perform replacement
    const res = await request(app.callback())
      .put(`/api/training-plans/${planId}/exercises/${exerciseId}/replace`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        newExerciseId: newExercise.id,
        reason: 'not_interested',
      })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.replacement).toBeDefined()
    expect(res.body.data.replacement.reason).toBe('not_interested')
    expect(res.body.data.replacement.originalExerciseId).toBe(originalExerciseId)
    expect(res.body.data.replacement.newExerciseId).toBe(newExercise.id)
    expect(res.body.data.updatedExercise.exerciseId).toBe(newExercise.id)

    // Verify replacement record was created
    const replacementRecord = await prisma.planExerciseReplacement.findFirst({
      where: { plannedExerciseId: exerciseId },
    })
    expect(replacementRecord).toBeDefined()
    expect(replacementRecord?.reason).toBe('not_interested')
  })

  it('should return 400 when missing required fields', async () => {
    const { token } = await makeAuthHeaders('test_replace_missing_fields')

    // First generate a plan
    const genRes = await request(app.callback())
      .post('/api/training-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send()

    const planId = genRes.body.data.id

    // Get plan with exercises
    const planRes = await request(app.callback())
      .get(`/api/training-plans/${planId}`)
      .set('Authorization', `Bearer ${token}`)

    const planDays = planRes.body.data.planDays
    const trainingDay = planDays.find((d: any) => d.dayType !== '休息')
    const plannedExercise = trainingDay.plannedExercises[0]
    const exerciseId = plannedExercise.id

    // Missing newExerciseId and reason
    const res = await request(app.callback())
      .put(`/api/training-plans/${planId}/exercises/${exerciseId}/replace`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })

  it('should accept all valid replacement reasons', async () => {
    const reasons = ['not_interested', 'no_equipment', 'dont_know_how', 'other']

    for (const reason of reasons) {
      const openid = `test_replace_reason_${reason}`
      const { token } = await makeAuthHeaders(openid)

      // Generate plan
      const genRes = await request(app.callback())
        .post('/api/training-plans/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ weeks: 1 })

      const planId = genRes.body.data.id

      // Get plan with exercises
      const planRes = await request(app.callback())
        .get(`/api/training-plans/${planId}`)
        .set('Authorization', `Bearer ${token}`)

      const planDays = planRes.body.data.planDays
      const trainingDay = planDays.find((d: any) => d.dayType !== '休息')
      if (!trainingDay || !trainingDay.plannedExercises[0]) continue

      const plannedExercise = trainingDay.plannedExercises[0]
      const exerciseId = plannedExercise.id

      // Get replacable exercises
      const replacableRes = await request(app.callback())
        .get(`/api/training-plans/${planId}/exercises/${exerciseId}/replacable`)
        .set('Authorization', `Bearer ${token}`)

      const replacableExercises = replacableRes.body.data.replacableExercises
      if (replacableExercises.length === 0) continue

      // Replace with each reason
      const res = await request(app.callback())
        .put(`/api/training-plans/${planId}/exercises/${exerciseId}/replace`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          newExerciseId: replacableExercises[0].id,
          reason,
        })

      expect(res.status).toBe(200)
      expect(res.body.data.replacement.reason).toBe(reason)
    }
  })
})
