import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma } from './setup'
import { env } from '../src/config/env'

async function makeAuthHeaders() {
  const user = await prisma.user.create({ data: { openid: 'test_user_profile' } })
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token }
}

describe('GET /api/user/profile', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).get('/api/user/profile')
    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
  })

  it('should return user profile with valid token', async () => {
    const { user, token } = await makeAuthHeaders()
    const res = await request(app.callback())
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(user.id)
    expect(res.body.data.openid).toBe('test_user_profile')
    expect(res.body.data.goal).toBe(null) // default unset
  })
})

describe('PUT /api/user/profile', () => {
  it('should update user profile fields', async () => {
    const { token } = await makeAuthHeaders()
    const res = await request(app.callback())
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ height: 175.5, goal: 'LOSE_FAT', weeklyTrainingDays: 4 })

    expect(res.status).toBe(200)
    expect(res.body.data.height).toBe(175.5)
    expect(res.body.data.goal).toBe('LOSE_FAT')
    expect(res.body.data.weeklyTrainingDays).toBe(4)
  })

  it('should update single field without affecting others', async () => {
    const { user, token } = await makeAuthHeaders()
    // Set initial values
    await prisma.user.update({ where: { id: user.id }, data: { height: 180, goal: 'GAIN_MUSCLE' } })
    // Update only goal
    const res = await request(app.callback())
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ goal: 'LOSE_FAT' })

    expect(res.status).toBe(200)
    expect(res.body.data.goal).toBe('LOSE_FAT')
    expect(res.body.data.height).toBe(180) // unchanged
  })
})