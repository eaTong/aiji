import request from 'supertest'
import app from '../src/app'
import { prisma } from './setup'

describe('POST /api/auth/wx-login', () => {
  it('should return 400 when code is missing', async () => {
    const res = await request(app.callback()).post('/api/auth/wx-login').send({})
    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })

  it('should return token and user on valid login', async () => {
    // Mock the WxOpenid call to return a known openid
    jest.spyOn(require('../src/services/authService'), 'getWxOpenid')
      .mockResolvedValueOnce('test_openid_001')

    const res = await request(app.callback())
      .post('/api/auth/wx-login')
      .send({ code: 'fake_code' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('token')
    expect(res.body.data).toHaveProperty('user')
    expect(res.body.data.user.openid).toBe('test_openid_001')
  })

  it('should create new user on first login', async () => {
    jest.spyOn(require('../src/services/authService'), 'getWxOpenid')
      .mockResolvedValueOnce('brand_new_openid')

    const res = await request(app.callback())
      .post('/api/auth/wx-login')
      .send({ code: 'new_user_code' })

    expect(res.status).toBe(200)
    expect(res.body.data.user.openid).toBe('brand_new_openid')
  })

  it('should return existing user on repeat login', async () => {
    const existing = await prisma.user.create({ data: { openid: 'existing_user_openid' } })

    jest.spyOn(require('../src/services/authService'), 'getWxOpenid')
      .mockResolvedValueOnce('existing_user_openid')

    const res = await request(app.callback())
      .post('/api/auth/wx-login')
      .send({ code: 'existing_user_code' })

    expect(res.status).toBe(200)
    expect(res.body.data.user.id).toBe(existing.id)
    expect(res.body.data.user.openid).toBe('existing_user_openid')
  })
})