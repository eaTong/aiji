/**
 * 训练记录 API 测试
 */

import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma, trackUser } from './setup'
import { env } from '../src/config/env'

// Mock AI 服务，返回 RECORD_TRAINING 意图
jest.mock('../src/services/aiGatewayService', () => ({
  determineIntent: jest.fn().mockResolvedValue({ intent: 'RECORD_TRAINING', confidence: 0.95 }),
  parseEntities: jest.fn().mockResolvedValue({
    exercises: [
      { name: '上斜杠铃卧推', sets: [{ weight: 25, reps: 8 }, { weight: 25, reps: 8 }, { weight: 25, reps: 8 }, { weight: 25, reps: 8 }, { weight: 25, reps: 8 }] },
      { name: '杠铃卧推', sets: [{ weight: 30, reps: 8 }, { weight: 30, reps: 8 }, { weight: 30, reps: 8 }, { weight: 30, reps: 8 }, { weight: 30, reps: 8 }] }
    ]
  }),
  isAIServiceAvailable: jest.fn().mockReturnValue(true),
}))

jest.mock('../src/services/aiChatService', () => ({
  chat: jest.fn().mockResolvedValue({
    type: 'text',
    content: '训练记录已保存',
  }),
}))

async function makeAuth(openid = 'training_test_' + Date.now()) {
  const user = await prisma.user.create({ data: { openid } })
  trackUser(user.id)
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token, auth: `Bearer ${token}` }
}

describe('训练记录 API 测试', () => {
  describe('POST /api/chat/send - 训练记录', () => {
    it('should save training with multiple exercises and groups', async () => {
      const { user, auth } = await makeAuth('training_record_api_test')

      const res = await request(app.callback())
        .post('/api/chat/send')
        .set('Authorization', auth)
        .send({ content: '上斜杠铃卧推25公斤，5组8次，杠铃卧推30公斤，5组8次' })

      console.log('Response:', JSON.stringify(res.body, null, 2))

      expect(res.status).toBe(200)
      expect(res.body.code).toBe(0)

      // 验证返回了意图
      expect(res.body.data.intent).toBe('RECORD_TRAINING')

      // 验证 AI 消息类型是卡片
      expect(res.body.data.aiMessage.type).toBe('card')
      expect(res.body.data.aiMessage.cardType).toBe('training-editable')

      // 验证卡片数据
      expect(res.body.data.aiMessage.cardData.exercises).toHaveLength(2)
      expect(res.body.data.aiMessage.cardData.exercises[0].name).toBe('上斜杠铃卧推')
      expect(res.body.data.aiMessage.cardData.exercises[0].sets).toHaveLength(5)
      expect(res.body.data.aiMessage.cardData.exercises[1].name).toBe('杠铃卧推')
      expect(res.body.data.aiMessage.cardData.exercises[1].sets).toHaveLength(5)
    })
  })
})