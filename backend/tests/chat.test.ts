import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma, trackUser } from './setup'
import { env } from '../src/config/env'

// Mock AI 相关服务，避免真实调用外部 API
jest.mock('../src/services/aiGatewayService', () => ({
  determineIntent: jest.fn().mockResolvedValue({ intent: 'CHAT', confidence: 0.9 }),
  parseEntities: jest.fn().mockResolvedValue({}),
}))

jest.mock('../src/services/aiChatService', () => ({
  chat: jest.fn().mockResolvedValue({
    type: 'text',
    content: 'AI 回复测试内容',
  }),
}))

jest.mock('../src/services/clarificationService', () => ({
  processMessage: jest.fn().mockResolvedValue({
    shouldRespond: false,
    completed: false,
  }),
}))

async function makeAuth(openid = 'chat_test_user') {
  const user = await prisma.user.create({ data: { openid } })
  trackUser(user.id)
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token, auth: `Bearer ${token}` }
}

// ============================================
// GET /api/chat/init
// ============================================
describe('GET /api/chat/init', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app.callback()).get('/api/chat/init')
    expect(res.status).toBe(401)
  })

  it('should return greeting and unreadPushes', async () => {
    const { auth } = await makeAuth('chat_init_user')

    const res = await request(app.callback())
      .get('/api/chat/init')
      .set('Authorization', auth)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data).toHaveProperty('greeting')
    expect(res.body.data).toHaveProperty('unreadPushes')
    expect(Array.isArray(res.body.data.unreadPushes)).toBe(true)
  })

  it('greeting should have type field', async () => {
    const { auth } = await makeAuth('chat_init_greeting_user')

    const res = await request(app.callback())
      .get('/api/chat/init')
      .set('Authorization', auth)

    expect(res.status).toBe(200)
    expect(res.body.data.greeting).toHaveProperty('type')
  })
})

// ============================================
// GET /api/chat/messages
// ============================================
describe('GET /api/chat/messages', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app.callback()).get('/api/chat/messages')
    expect(res.status).toBe(401)
  })

  it('should return empty messages for new user', async () => {
    const { auth } = await makeAuth('chat_msg_user')

    const res = await request(app.callback())
      .get('/api/chat/messages')
      .set('Authorization', auth)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data.messages)).toBe(true)
    expect(res.body.data.messages.length).toBe(0)
  })

  it('should return messages after send', async () => {
    const { user, auth } = await makeAuth('chat_msg_after_send')

    // 直接写入一条消息
    await prisma.chatMessage.create({
      data: { userId: user.id, role: 'user', type: 'text', content: '你好' },
    })

    const res = await request(app.callback())
      .get('/api/chat/messages?limit=10')
      .set('Authorization', auth)

    expect(res.status).toBe(200)
    expect(res.body.data.messages.length).toBe(1)
    expect(res.body.data.messages[0].content).toBe('你好')
  })

  it('should respect limit param', async () => {
    const { user, auth } = await makeAuth('chat_msg_limit_user')

    for (let i = 0; i < 5; i++) {
      await prisma.chatMessage.create({
        data: { userId: user.id, role: 'user', type: 'text', content: `消息${i}` },
      })
    }

    const res = await request(app.callback())
      .get('/api/chat/messages?limit=3')
      .set('Authorization', auth)

    expect(res.status).toBe(200)
    expect(res.body.data.messages.length).toBe(3)
  })
})

// ============================================
// POST /api/chat/send
// ============================================
describe('POST /api/chat/send', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app.callback())
      .post('/api/chat/send')
      .send({ content: '测试' })
    expect(res.status).toBe(401)
  })

  it('should return 400 when content is missing', async () => {
    const { auth } = await makeAuth('chat_send_no_content')

    const res = await request(app.callback())
      .post('/api/chat/send')
      .set('Authorization', auth)
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(400)
  })

  it('should save user message and return AI reply', async () => {
    const { user, auth } = await makeAuth('chat_send_normal')

    const res = await request(app.callback())
      .post('/api/chat/send')
      .set('Authorization', auth)
      .send({ content: '今天天气不错' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data).toHaveProperty('message')
    expect(res.body.data).toHaveProperty('aiMessage')
    expect(res.body.data.message.content).toBe('今天天气不错')
    expect(res.body.data.message.role).toBe('user')

    // 验证消息存入数据库
    const dbMsg = await prisma.chatMessage.findFirst({ where: { userId: user.id, role: 'user' } })
    expect(dbMsg).not.toBeNull()
    expect(dbMsg!.content).toBe('今天天气不错')
  })

  it('should return intent in response', async () => {
    const { auth } = await makeAuth('chat_send_intent')

    const res = await request(app.callback())
      .post('/api/chat/send')
      .set('Authorization', auth)
      .send({ content: '随便聊聊' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('intent')
  })
})

// ============================================
// POST /api/chat/confirm
// ============================================
describe('POST /api/chat/confirm', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app.callback())
      .post('/api/chat/confirm')
      .send({ cardId: 'x', cardType: 'weight' })
    expect(res.status).toBe(401)
  })

  it('should return 400 when cardId is missing', async () => {
    const { auth } = await makeAuth('chat_confirm_no_card')

    const res = await request(app.callback())
      .post('/api/chat/confirm')
      .set('Authorization', auth)
      .send({ cardType: 'weight' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(400)
  })

  it('should return 400 when cardType is missing', async () => {
    const { auth } = await makeAuth('chat_confirm_no_type')

    const res = await request(app.callback())
      .post('/api/chat/confirm')
      .set('Authorization', auth)
      .send({ cardId: 'some-id' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(400)
  })

  it('should process confirm and return saved status', async () => {
    const { auth } = await makeAuth('chat_confirm_ok')

    const res = await request(app.callback())
      .post('/api/chat/confirm')
      .set('Authorization', auth)
      .send({ cardId: 'card-001', cardType: 'weight', cardData: { weight: 70 }, confirmed: true })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data).toHaveProperty('saved')
  })

  it('should handle declined confirmation', async () => {
    const { auth } = await makeAuth('chat_confirm_declined')

    const res = await request(app.callback())
      .post('/api/chat/confirm')
      .set('Authorization', auth)
      .send({ cardId: 'card-002', cardType: 'weight', confirmed: false })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.saved).toBe(false)
  })
})

// ============================================
// POST /api/chat/action
// ============================================
describe('POST /api/chat/action', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app.callback())
      .post('/api/chat/action')
      .send({ messageId: 'x', actionId: 'y' })
    expect(res.status).toBe(401)
  })

  it('should return 400 when messageId is missing', async () => {
    const { auth } = await makeAuth('chat_action_no_msg')

    const res = await request(app.callback())
      .post('/api/chat/action')
      .set('Authorization', auth)
      .send({ actionId: 'confirm' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(400)
  })

  it('should return 400 when actionId is missing', async () => {
    const { auth } = await makeAuth('chat_action_no_action')

    const res = await request(app.callback())
      .post('/api/chat/action')
      .set('Authorization', auth)
      .send({ messageId: 'some-id' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(400)
  })

  it('should handle navigate action', async () => {
    const { user, auth } = await makeAuth('chat_action_navigate')

    // 创建一条带 actions 的 AI 消息
    const msg = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: 'ai',
        type: 'card',
        cardType: 'daily-plan',
        actions: [{ id: 'start', label: '开始训练', action: 'navigate', target: '/pages/training/start' }],
      },
    })

    const res = await request(app.callback())
      .post('/api/chat/action')
      .set('Authorization', auth)
      .send({ messageId: msg.id, actionId: 'start' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.type).toBe('navigate')
    expect(res.body.data.result.target).toBe('/pages/training/start')
  })

  it('should handle dismiss action and delete message', async () => {
    const { user, auth } = await makeAuth('chat_action_dismiss')

    const msg = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: 'ai',
        type: 'card',
        cardType: 'daily-plan',
        actions: [{ id: 'skip', label: '跳过', action: 'dismiss' }],
      },
    })

    const res = await request(app.callback())
      .post('/api/chat/action')
      .set('Authorization', auth)
      .send({ messageId: msg.id, actionId: 'skip' })

    expect(res.status).toBe(200)
    expect(res.body.data.type).toBe('dismissed')

    // 消息应已被删除
    const deleted = await prisma.chatMessage.findUnique({ where: { id: msg.id } })
    expect(deleted).toBeNull()
  })
})

// ============================================
// GET /api/chat/push
// ============================================
describe('GET /api/chat/push', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app.callback()).get('/api/chat/push')
    expect(res.status).toBe(401)
  })

  it('should return empty pushes for new user', async () => {
    const { auth } = await makeAuth('chat_push_empty')

    const res = await request(app.callback())
      .get('/api/chat/push')
      .set('Authorization', auth)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data.pushes)).toBe(true)
    expect(res.body.data.pushes.length).toBe(0)
  })

  it('should return pending pushes', async () => {
    const { user, auth } = await makeAuth('chat_push_pending')

    const now = new Date()
    await prisma.pushQueue.create({
      data: {
        userId: user.id,
        cardType: 'weekly-report',
        data: { totalDays: 3 },
        actions: [],
        triggerAt: new Date(now.getTime() - 1000), // 已触发
        expiresAt: new Date(now.getTime() + 3600000), // 未过期
        priority: 5,
      },
    })

    const res = await request(app.callback())
      .get('/api/chat/push')
      .set('Authorization', auth)

    expect(res.status).toBe(200)
    expect(res.body.data.pushes.length).toBe(1)
    expect(res.body.data.pushes[0].cardType).toBe('weekly-report')
  })
})

// ============================================
// POST /api/chat/push/:id/read
// ============================================
describe('POST /api/chat/push/:id/read', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app.callback()).post('/api/chat/push/fake-id/read')
    expect(res.status).toBe(401)
  })

  it('should mark push as read', async () => {
    const { user, auth } = await makeAuth('chat_push_read')

    const now = new Date()
    const push = await prisma.pushQueue.create({
      data: {
        userId: user.id,
        cardType: 'weekly-report',
        data: {},
        actions: [],
        triggerAt: new Date(now.getTime() - 1000),
        expiresAt: new Date(now.getTime() + 3600000),
        priority: 5,
      },
    })

    const res = await request(app.callback())
      .post(`/api/chat/push/${push.id}/read`)
      .set('Authorization', auth)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)

    // 验证 sentAt 已更新
    const updated = await prisma.pushQueue.findUnique({ where: { id: push.id } })
    expect(updated!.sentAt).not.toBeNull()
  })
})

// ============================================
// GET /api/chat/sessions
// ============================================
describe('GET /api/chat/sessions', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app.callback()).get('/api/chat/sessions')
    expect(res.status).toBe(401)
  })

  it('should return empty sessions for new user', async () => {
    const { auth } = await makeAuth('chat_sessions_empty')

    const res = await request(app.callback())
      .get('/api/chat/sessions')
      .set('Authorization', auth)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data.sessions)).toBe(true)
  })

  it('should return existing sessions', async () => {
    const { user, auth } = await makeAuth('chat_sessions_exists')

    await prisma.chatSession.create({
      data: {
        userId: user.id,
        status: 'COMPLETED',
        context: { intent: 'RECORD_WEIGHT' },
      },
    })

    const res = await request(app.callback())
      .get('/api/chat/sessions')
      .set('Authorization', auth)

    expect(res.status).toBe(200)
    expect(res.body.data.sessions.length).toBe(1)
  })
})

// ============================================
// DELETE /api/chat/session
// ============================================
describe('DELETE /api/chat/session', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app.callback()).delete('/api/chat/session')
    expect(res.status).toBe(401)
  })

  it('should clear active sessions', async () => {
    const { user, auth } = await makeAuth('chat_clear_session')

    await prisma.chatSession.create({
      data: { userId: user.id, status: 'ACTIVE', context: {} },
    })

    const res = await request(app.callback())
      .delete('/api/chat/session')
      .set('Authorization', auth)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)

    // 验证会话已被设置为 EXPIRED
    const session = await prisma.chatSession.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
    })
    expect(session).toBeNull()
  })

  it('should succeed even with no active sessions', async () => {
    const { auth } = await makeAuth('chat_clear_no_session')

    const res = await request(app.callback())
      .delete('/api/chat/session')
      .set('Authorization', auth)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
  })
})

// ============================================
// POST /api/chat/session/pause
// ============================================
describe('POST /api/chat/session/pause', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app.callback()).post('/api/chat/session/pause').send({})
    expect(res.status).toBe(401)
  })

  it('should clear all active sessions when no sessionId provided', async () => {
    const { user, auth } = await makeAuth('chat_pause_no_id')

    await prisma.chatSession.create({
      data: { userId: user.id, status: 'AWAITING_CLARIFICATION', context: {} },
    })

    const res = await request(app.callback())
      .post('/api/chat/session/pause')
      .set('Authorization', auth)
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)

    const active = await prisma.chatSession.findFirst({
      where: { userId: user.id, status: { in: ['ACTIVE', 'AWAITING_CLARIFICATION'] } },
    })
    expect(active).toBeNull()
  })

  it('should pause specific session to ACTIVE when sessionId provided', async () => {
    const { user, auth } = await makeAuth('chat_pause_with_id')

    const session = await prisma.chatSession.create({
      data: { userId: user.id, status: 'AWAITING_CLARIFICATION', context: {} },
    })

    const res = await request(app.callback())
      .post('/api/chat/session/pause')
      .set('Authorization', auth)
      .send({ sessionId: session.id })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)

    const updated = await prisma.chatSession.findUnique({ where: { id: session.id } })
    expect(updated!.status).toBe('ACTIVE')
  })
})
