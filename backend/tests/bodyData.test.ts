import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma, trackUser } from './setup'
import { env } from '../src/config/env'

async function makeUser(openid = 'test_body_user') {
  const user = await prisma.user.create({ data: { openid } })
  trackUser(user.id)
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token }
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

describe('POST /api/body-data/weight', () => {
  it('should create weight record', async () => {
    const { token } = await makeUser()
    const res = await request(app.callback())
      .post('/api/body-data/weight')
      .set(authHeader(token))
      .send({ weight: 72.5, recordedAt: '2026-04-12' })
    expect(res.status).toBe(200)
    expect(res.body.data.weight).toBe(72.5)
    expect(res.body.data.recordedAt).toContain('2026-04-12')
  })

  it('should return 409 when weight for same date already exists', async () => {
    const { token } = await makeUser()
    await request(app.callback())
      .post('/api/body-data/weight')
      .set(authHeader(token))
      .send({ weight: 72.0, recordedAt: '2026-04-13' })
    const res = await request(app.callback())
      .post('/api/body-data/weight')
      .set(authHeader(token))
      .send({ weight: 73.0, recordedAt: '2026-04-13' })
    expect(res.status).toBe(409)
  })
})

describe('GET /api/body-data/weight', () => {
  it('should return weight records with 7-day average calculated', async () => {
    const { user, token } = await makeUser()
    await prisma.weightRecord.createMany({
      data: [
        { userId: user.id, weight: 72.0, recordedAt: new Date('2026-04-06') },
        { userId: user.id, weight: 72.5, recordedAt: new Date('2026-04-07') },
        { userId: user.id, weight: 71.8, recordedAt: new Date('2026-04-08') },
      ],
    })
    const res = await request(app.callback())
      .get('/api/body-data/weight')
      .set(authHeader(token))
      .query({ startDate: '2026-04-01', endDate: '2026-04-30' })

    expect(res.status).toBe(200)
    expect(res.body.data.records).toHaveLength(3)
    // For the 3rd record (2026-04-08), avg of [72.0, 72.5, 71.8] = 72.1
    expect(res.body.data.records[2].sevenDayAvg).toBeCloseTo(72.1, 1)
  })
})

describe('POST /api/body-data/measurements', () => {
  it('should create measurement record with all fields', async () => {
    const { token } = await makeUser()
    const res = await request(app.callback())
      .post('/api/body-data/measurements')
      .set(authHeader(token))
      .send({ waist: 80.0, chest: 95.0, bodyFat: 18.5, recordedAt: '2026-04-12' })

    expect(res.status).toBe(200)
    expect(res.body.data.waist).toBe(80.0)
    expect(res.body.data.chest).toBe(95.0)
    expect(res.body.data.bodyFat).toBe(18.5)
  })
})

describe('GET /api/body-data/measurements', () => {
  it('should return measurement records sorted by date', async () => {
    const { user, token } = await makeUser()
    await prisma.measurementRecord.createMany({
      data: [
        { userId: user.id, waist: 82, recordedAt: new Date('2026-04-10') },
        { userId: user.id, waist: 81, recordedAt: new Date('2026-04-15') },
      ],
    })
    const res = await request(app.callback())
      .get('/api/body-data/measurements')
      .set(authHeader(token))
      .query({ startDate: '2026-04-01', endDate: '2026-04-30' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(new Date(res.body.data[0].recordedAt).getTime()).toBeLessThan(
      new Date(res.body.data[1].recordedAt).getTime()
    )
  })
})

describe('POST+GET /api/body-data/photos', () => {
  it('should create and retrieve progress photo', async () => {
    const { token } = await makeUser()
    const createRes = await request(app.callback())
      .post('/api/body-data/photos')
      .set(authHeader(token))
      .send({ photoUrl: 'https://example.com/photo.jpg', angle: 'FRONT', recordedAt: '2026-04-12' })
    expect(createRes.status).toBe(200)
    expect(createRes.body.data.angle).toBe('FRONT')

    const getRes = await request(app.callback())
      .get('/api/body-data/photos')
      .set(authHeader(token))
    expect(getRes.status).toBe(200)
    expect(getRes.body.data.length).toBeGreaterThan(0)
  })
})