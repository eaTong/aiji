import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma, trackUser } from './setup'
import { env } from '../src/config/env'

async function makeAuthHeaders() {
  const uniqueOpenid = `test_supplement_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const user = await prisma.user.create({
    data: {
      openid: uniqueOpenid,
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

describe('POST /api/supplements', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).post('/api/supplements')
    expect(res.status).toBe(401)
  })

  it('should create a supplement record', async () => {
    const { user, token } = await makeAuthHeaders()

    const res = await request(app.callback())
      .post('/api/supplements')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplement: '蛋白粉',
        dosage: '30g',
        timing: '早餐后',
      })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.supplement).toBe('蛋白粉')
    expect(res.body.data.dosage).toBe('30g')
    expect(res.body.data.timing).toBe('早餐后')
  })

  it('should return 400 when supplement name is missing', async () => {
    const { token } = await makeAuthHeaders()

    const res = await request(app.callback())
      .post('/api/supplements')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dosage: '30g',
      })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })
})

describe('GET /api/supplements', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).get('/api/supplements')
    expect(res.status).toBe(401)
  })

  it('should return supplement records', async () => {
    const { user, token } = await makeAuthHeaders()

    // Create some records first
    await request(app.callback())
      .post('/api/supplements')
      .set('Authorization', `Bearer ${token}`)
      .send({ supplement: '蛋白粉', dosage: '30g' })

    await request(app.callback())
      .post('/api/supplements')
      .set('Authorization', `Bearer ${token}`)
      .send({ supplement: '肌酸', dosage: '5g' })

    const res = await request(app.callback())
      .get('/api/supplements')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(2)
  })
})

describe('DELETE /api/supplements/:id', () => {
  it('should return 401 without authorization header', async () => {
    const res = await request(app.callback()).delete('/api/supplements/some-id')
    expect(res.status).toBe(401)
  })

  it('should delete a supplement record', async () => {
    const { user, token } = await makeAuthHeaders()

    // Create a record first
    const createRes = await request(app.callback())
      .post('/api/supplements')
      .set('Authorization', `Bearer ${token}`)
      .send({ supplement: '蛋白粉', dosage: '30g' })

    const recordId = createRes.body.data.id

    // Delete it
    const res = await request(app.callback())
      .delete(`/api/supplements/${recordId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.deleted).toBe(true)
  })

  it('should return 404 for non-existent record', async () => {
    const { token } = await makeAuthHeaders()

    const res = await request(app.callback())
      .delete('/api/supplements/non-existent-id')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})
