import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma, trackUser } from './setup'
import { env } from '../src/config/env'

async function makeAuthHeaders(extraOpenid = 'test_onboarding_user') {
  const user = await prisma.user.create({
    data: {
      openid: extraOpenid,
      goal: 'GAIN_MUSCLE',
      level: 'INTERMEDIATE',
      equipment: 'GYM',
      weeklyTrainingDays: 4,
      hasCompletedOnboarding: false,
    },
  })
  trackUser(user.id)
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token }
}

describe('POST /api/onboarding/complete', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).post('/api/onboarding/complete')
    expect(res.status).toBe(401)
  })

  it('should complete onboarding and generate plan', async () => {
    const { user, token } = await makeAuthHeaders('test_onboarding_complete')

    const res = await request(app.callback())
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal: 'GAIN_MUSCLE',
        level: 'BEGINNER',
        equipment: 'GYM',
        weeklyTrainingDays: 3,
        height: 175,
        currentWeight: 70,
        targetWeight: 75,
        fitnessDuration: 'LESS_THAN_3M',
      })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.profileUpdated).toBe(true)
    expect(res.body.data.onboardingCompleted).toBe(true)
    expect(res.body.data.planId).toBeDefined()
    expect(res.body.data.planName).toBeDefined()

    // Verify user profile was updated
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updatedUser?.goal).toBe('GAIN_MUSCLE')
    expect(updatedUser?.level).toBe('BEGINNER')
    expect(updatedUser?.equipment).toBe('GYM')
    expect(updatedUser?.weeklyTrainingDays).toBe(3)
    expect(updatedUser?.height).toBe(175)
    expect(updatedUser?.targetWeight).toBe(75)
    expect(updatedUser?.hasCompletedOnboarding).toBe(true)
  })

  it('should record weight when provided', async () => {
    const { user, token } = await makeAuthHeaders('test_onboarding_weight')

    const res = await request(app.callback())
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal: 'LOSE_FAT',
        level: 'BEGINNER',
        equipment: 'DUMBBELL',
        weeklyTrainingDays: 4,
        currentWeight: 80,
        fitnessDuration: 'THREE_TO_6M',
      })

    expect(res.status).toBe(200)
    expect(res.body.data.weightRecorded).toBe(true)

    // Verify weight was recorded
    const weightRecord = await prisma.weightRecord.findFirst({
      where: { userId: user.id },
      orderBy: { recordedAt: 'desc' },
    })
    expect(weightRecord).toBeDefined()
    expect(weightRecord?.weight).toBe(80)
  })

  it('should skip weight recording when not provided', async () => {
    const { token } = await makeAuthHeaders('test_onboarding_no_weight')

    const res = await request(app.callback())
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal: 'BODY_SHAPE',
        level: 'INTERMEDIATE',
        equipment: 'BODYWEIGHT',
        weeklyTrainingDays: 2,
        fitnessDuration: 'SIX_TO_12M',
      })

    expect(res.status).toBe(200)
    expect(res.body.data.weightRecorded).toBe(false)
  })

  it('should return 400 when missing required fields', async () => {
    const { token } = await makeAuthHeaders('test_onboarding_missing')

    const res = await request(app.callback())
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal: 'GAIN_MUSCLE',
        // missing level, equipment, fitnessDuration
      })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })

  it('should return 400 when weeklyTrainingDays is out of range', async () => {
    const { token } = await makeAuthHeaders('test_onboarding_invalid_days')

    const res = await request(app.callback())
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal: 'GAIN_MUSCLE',
        level: 'BEGINNER',
        equipment: 'GYM',
        weeklyTrainingDays: 8, // invalid, should be 1-7
        fitnessDuration: 'LESS_THAN_3M',
      })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })
})

describe('GET /api/onboarding/status', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).get('/api/onboarding/status')
    expect(res.status).toBe(401)
  })

  it('should return false for user who has not completed onboarding', async () => {
    const { token } = await makeAuthHeaders('test_onboarding_not_complete')

    const res = await request(app.callback())
      .get('/api/onboarding/status')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.hasCompletedOnboarding).toBe(false)
  })

  it('should return true for user who has completed onboarding', async () => {
    const user = await prisma.user.create({
      data: {
        openid: 'test_onboarding_already_complete',
        goal: 'GAIN_MUSCLE',
        level: 'INTERMEDIATE',
        equipment: 'GYM',
        weeklyTrainingDays: 4,
        hasCompletedOnboarding: true,
      },
    })
    trackUser(user.id)
    const token = jwt.sign({ userId: user.id }, env.jwtSecret)

    const res = await request(app.callback())
      .get('/api/onboarding/status')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.hasCompletedOnboarding).toBe(true)
  })
})
