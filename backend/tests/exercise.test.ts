import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma } from './setup'
import { env } from '../src/config/env'
import { seedExercises } from '../src/models/exerciseSeed'

async function makeAuthHeaders(extraOpenid = 'test_exercise') {
  const user = await prisma.user.create({ data: { openid: extraOpenid } })
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token }
}

beforeAll(async () => {
  await seedExercises()
})

describe('GET /api/exercises', () => {
  it('should return array of exercises', async () => {
    const res = await request(app.callback()).get('/api/exercises')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('should filter exercises by category', async () => {
    const res = await request(app.callback()).get('/api/exercises?category=CHEST')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    for (const ex of res.body.data) {
      expect(ex.category).toBe('CHEST')
    }
  })

  it('should filter exercises by keyword', async () => {
    const res = await request(app.callback()).get('/api/exercises?keyword=卧推')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('should filter exercises by equipment', async () => {
    const res = await request(app.callback()).get('/api/exercises?equipment=DUMBBELL')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    for (const ex of res.body.data) {
      expect(ex.equipment).toBe('DUMBBELL')
    }
  })

  it('should return 401 without auth for favorites', async () => {
    const res = await request(app.callback()).get('/api/exercises?favorites=true')
    expect(res.status).toBe(401)
  })

  it('should return favorites with auth token', async () => {
    const { token } = await makeAuthHeaders('test_favorites')
    const res = await request(app.callback())
      .get('/api/exercises?favorites=true')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

describe('GET /api/exercises/:id', () => {
  it('should return 401 without authorization header', async () => {
    // First get a valid exercise id
    const exercises = await prisma.exercise.findMany({
      where: { isCustom: false, userId: null },
      take: 1,
    })
    const exerciseId = exercises[0]?.id
    if (!exerciseId) return

    const res = await request(app.callback()).get(`/api/exercises/${exerciseId}`)
    expect(res.status).toBe(401)
  })

  it('should return exercise by id', async () => {
    const exercises = await prisma.exercise.findMany({
      where: { isCustom: false, userId: null },
      take: 1,
    })
    const exerciseId = exercises[0]?.id
    if (!exerciseId) return

    const res = await request(app.callback()).get(`/api/exercises/${exerciseId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(exerciseId)
  })

  it('should return 404 for non-existent exercise', async () => {
    const res = await request(app.callback()).get('/api/exercises/non-existent-id')
    expect(res.status).toBe(404)
  })
})

describe('POST /api/exercises/:id/favorite', () => {
  it('should return 401 without authorization header', async () => {
    const exercises = await prisma.exercise.findMany({
      where: { isCustom: false, userId: null },
      take: 1,
    })
    const exerciseId = exercises[0]?.id
    if (!exerciseId) return

    const res = await request(app.callback()).post(`/api/exercises/${exerciseId}/favorite`)
    expect(res.status).toBe(401)
  })

  it('should toggle favorite for system exercise', async () => {
    const { user, token } = await makeAuthHeaders('test_toggle_fav')

    // Find a system exercise
    const systemExercise = await prisma.exercise.findFirst({
      where: { isCustom: false, userId: null },
    })
    if (!systemExercise) return

    const res = await request(app.callback())
      .post(`/api/exercises/${systemExercise.id}/favorite`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.isFavorite).toBe(true)
    expect(res.body.data.isCustom).toBe(true)
    expect(res.body.data.userId).toBe(user.id)

    // Toggle off
    const res2 = await request(app.callback())
      .post(`/api/exercises/${systemExercise.id}/favorite`)
      .set('Authorization', `Bearer ${token}`)
    expect(res2.status).toBe(200)
    expect(res2.body.data.isFavorite).toBe(false)
  })

  it('should toggle favorite for custom exercise', async () => {
    const { token } = await makeAuthHeaders('test_toggle_custom_fav')

    // Create a custom exercise
    const custom = await prisma.exercise.create({
      data: {
        name: 'Custom Test Exercise',
        nameEn: 'Custom Test',
        category: 'CHEST',
        equipment: 'DUMBBELL',
        primaryMuscles: ['胸大肌'],
        secondaryMuscles: [],
        isCustom: true,
        isFavorite: false,
        userId: (await prisma.user.findFirst({ where: { openid: 'test_toggle_custom_fav' } }))?.id,
      },
    })

    const res = await request(app.callback())
      .post(`/api/exercises/${custom.id}/favorite`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.isFavorite).toBe(true)
  })
})