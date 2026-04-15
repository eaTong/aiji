import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../../src/app'
import { prisma, trackUser } from '../setup'
import { env } from '../../src/config/env'

describe('POST /admin/api/auth/login', () => {
  it('should return token with valid admin credentials', async () => {
    const res = await request(app.callback())
      .post('/admin/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.userId).toBeDefined()
    expect(res.body.data.nickname).toBe('admin')
  })

  it('should return 401 with invalid password', async () => {
    const res = await request(app.callback())
      .post('/admin/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
    expect(res.body.message).toBe('用户名或密码错误')
  })

  it('should return 401 with invalid username', async () => {
    const res = await request(app.callback())
      .post('/admin/api/auth/login')
      .send({ username: 'notadmin', password: 'admin123' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
    expect(res.body.message).toBe('用户名或密码错误')
  })

  it('should return 400 without username or password', async () => {
    const res = await request(app.callback())
      .post('/admin/api/auth/login')
      .send({})

    expect(res.status).toBe(400)
  })
})

describe('GET /admin/api/auth/profile', () => {
  it('should return 401 without authorization', async () => {
    const res = await request(app.callback()).get('/admin/api/auth/profile')
    expect(res.status).toBe(401)
  })

  it('should return admin profile with valid token', async () => {
    // First login to get token
    const loginRes = await request(app.callback())
      .post('/admin/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })

    const token = loginRes.body.data.token

    const res = await request(app.callback())
      .get('/admin/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.nickname).toBe('admin')
    expect(res.body.data.role).toBe('ADMIN')
  })

  it('should return 401 with invalid token', async () => {
    const res = await request(app.callback())
      .get('/admin/api/auth/profile')
      .set('Authorization', 'Bearer invalid_token')

    expect(res.status).toBe(401)
  })
})

describe('POST /admin/api/auth/logout', () => {
  it('should return success on logout', async () => {
    const loginRes = await request(app.callback())
      .post('/admin/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })

    const token = loginRes.body.data.token

    const res = await request(app.callback())
      .post('/admin/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
  })
})
