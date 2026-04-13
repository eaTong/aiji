import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma } from './setup'
import { env } from '../src/config/env'
import { seedExercises } from '../src/models/exerciseSeed'

async function makeAuthHeaders(extraOpenid = 'test_plan_user') {
  const user = await prisma.user.create({
    data: {
      openid: extraOpenid,
      goal: 'GAIN_MUSCLE',
      level: 'INTERMEDIATE',
      equipment: 'GYM',
      weeklyTrainingDays: 4,
    },
  })
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token }
}

beforeAll(async () => {
  await seedExercises()
})

describe('POST /api/training-plans/generate', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).post('/api/training-plans/generate')
    expect(res.status).toBe(401)
  })

  it('should generate a training plan for user', async () => {
    const { user, token } = await makeAuthHeaders('test_generate_plan')

    const res = await request(app.callback())
      .post('/api/training-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ weeks: 4 })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data).toHaveProperty('id')
    expect(res.body.data).toHaveProperty('name')
    expect(res.body.data).toHaveProperty('planDays')
    expect(Array.isArray(res.body.data.planDays)).toBe(true)
    expect(res.body.data.planDays.length).toBeGreaterThan(0)

    // Verify plan structure
    const plan = res.body.data
    expect(plan.userId).toBe(user.id)
    expect(plan.goal).toBe('GAIN_MUSCLE')
    expect(plan.weeks).toBe(4)
    expect(plan.status).toBe('ACTIVE')
    expect(plan.isArchived).toBe(false)
  })

  it('should create plan days with planned exercises', async () => {
    const { token } = await makeAuthHeaders('test_plan_with_exercises')

    const res = await request(app.callback())
      .post('/api/training-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send()

    expect(res.status).toBe(200)

    // Check that plan days have exercises (non-rest days)
    const trainingDays = res.body.data.planDays.filter(
      (day: any) => day.dayType !== '休息'
    )
    expect(trainingDays.length).toBeGreaterThan(0)

    for (const day of trainingDays) {
      if (day.dayType !== '休息') {
        expect(day.plannedExercises).toBeDefined()
        expect(Array.isArray(day.plannedExercises)).toBe(true)
      }
    }
  })

  it('should respect custom weeks parameter', async () => {
    const { token } = await makeAuthHeaders('test_custom_weeks')

    const res = await request(app.callback())
      .post('/api/training-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ weeks: 8 })

    expect(res.status).toBe(200)
    expect(res.body.data.weeks).toBe(8)
  })
})

describe('GET /api/training-plans', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).get('/api/training-plans')
    expect(res.status).toBe(401)
  })

  it('should return user plans', async () => {
    const { token } = await makeAuthHeaders('test_list_plans')

    // First generate a plan
    await request(app.callback())
      .post('/api/training-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send()

    const res = await request(app.callback())
      .get('/api/training-plans')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })
})

describe('GET /api/training-plans/:id', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).get('/api/training-plans/some-id')
    expect(res.status).toBe(401)
  })

  it('should return plan detail with exercises', async () => {
    const { token } = await makeAuthHeaders('test_get_plan_detail')

    // Generate a plan first
    const genRes = await request(app.callback())
      .post('/api/training-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send()

    const planId = genRes.body.data.id

    const res = await request(app.callback())
      .get(`/api/training-plans/${planId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(planId)
    expect(res.body.data.planDays).toBeDefined()
    expect(Array.isArray(res.body.data.planDays)).toBe(true)
  })

  it('should return 404 for non-existent plan', async () => {
    const { token } = await makeAuthHeaders('test_nonexistent_plan')

    const res = await request(app.callback())
      .get('/api/training-plans/non-existent-id')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})

describe('PUT /api/training-plans/:id/complete', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).put('/api/training-plans/some-id/complete')
    expect(res.status).toBe(401)
  })

  it('should mark plan as completed', async () => {
    const { token } = await makeAuthHeaders('test_complete_plan')

    // Generate a plan first
    const genRes = await request(app.callback())
      .post('/api/training-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send()

    const planId = genRes.body.data.id

    const res = await request(app.callback())
      .put(`/api/training-plans/${planId}/complete`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('COMPLETED')
  })
})

describe('PUT /api/training-plans/:id/archive', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).put('/api/training-plans/some-id/archive')
    expect(res.status).toBe(401)
  })

  it('should archive plan', async () => {
    const { token } = await makeAuthHeaders('test_archive_plan')

    // Generate a plan first
    const genRes = await request(app.callback())
      .post('/api/training-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send()

    const planId = genRes.body.data.id

    const res = await request(app.callback())
      .put(`/api/training-plans/${planId}/archive`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.isArchived).toBe(true)
    expect(res.body.data.status).toBe('ARCHIVED')
  })
})

describe('DELETE /api/training-plans/:id', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).delete('/api/training-plans/some-id')
    expect(res.status).toBe(401)
  })

  it('should delete plan', async () => {
    const { token } = await makeAuthHeaders('test_delete_plan')

    // Generate a plan first
    const genRes = await request(app.callback())
      .post('/api/training-plans/generate')
      .set('Authorization', `Bearer ${token}`)
      .send()

    const planId = genRes.body.data.id

    const res = await request(app.callback())
      .delete(`/api/training-plans/${planId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)

    // Verify plan is deleted
    const getRes = await request(app.callback())
      .get(`/api/training-plans/${planId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(getRes.status).toBe(404)
  })
})