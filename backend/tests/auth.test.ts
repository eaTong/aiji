import request from 'supertest'
import app from '../src/app'
import { prisma, trackUser } from './setup'

describe('POST /api/auth/dev-login', () => {
  it('should return 400 when openid is missing', async () => {
    const res = await request(app.callback()).post('/api/auth/dev-login').send({})
    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })

  it('should return token and user with valid openid', async () => {
    const res = await request(app.callback())
      .post('/api/auth/dev-login')
      .send({ openid: 'dev_test_user_001' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data).toHaveProperty('token')
    expect(res.body.data).toHaveProperty('user')
    expect(res.body.data.user.openid).toBe('dev_test_user_001')
    trackUser(res.body.data.user.id)
  })

  it('should create user if not exists', async () => {
    const res = await request(app.callback())
      .post('/api/auth/dev-login')
      .send({ openid: 'dev_new_user_999' })

    expect(res.status).toBe(200)
    trackUser(res.body.data.user.id)
    const user = await prisma.user.findUnique({ where: { openid: 'dev_new_user_999' } })
    expect(user).not.toBeNull()
  })

  it('should return existing user on repeated call', async () => {
    const existing = await prisma.user.create({ data: { openid: 'dev_repeat_user' } })
    trackUser(existing.id)

    const first = await request(app.callback())
      .post('/api/auth/dev-login')
      .send({ openid: 'dev_repeat_user' })

    const second = await request(app.callback())
      .post('/api/auth/dev-login')
      .send({ openid: 'dev_repeat_user' })

    expect(first.body.data.user.id).toBe(existing.id)
    expect(second.body.data.user.id).toBe(existing.id)
  })
})

describe('POST /api/auth/wx-login', () => {
  it('should return 400 when code is missing', async () => {
    const res = await request(app.callback()).post('/api/auth/wx-login').send({})
    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })

  it('should return token and user on valid login', async () => {
    jest.spyOn(require('../src/services/authService'), 'getWxOpenid')
      .mockResolvedValueOnce('test_openid_001')

    const res = await request(app.callback())
      .post('/api/auth/wx-login')
      .send({ code: 'fake_code' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('token')
    expect(res.body.data).toHaveProperty('user')
    expect(res.body.data.user.openid).toBe('test_openid_001')
    trackUser(res.body.data.user.id)
  })

  it('should create new user on first login', async () => {
    jest.spyOn(require('../src/services/authService'), 'getWxOpenid')
      .mockResolvedValueOnce('brand_new_openid')

    const res = await request(app.callback())
      .post('/api/auth/wx-login')
      .send({ code: 'new_user_code' })

    expect(res.status).toBe(200)
    expect(res.body.data.user.openid).toBe('brand_new_openid')
    trackUser(res.body.data.user.id)
  })

  it('should return existing user on repeat login', async () => {
    const existing = await prisma.user.create({ data: { openid: 'existing_user_openid' } })
    trackUser(existing.id)

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
