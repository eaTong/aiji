import Router from '@koa/router'
import * as chatController from '../controllers/chatController'
import { authMiddleware } from '../middleware/auth'

const router = new Router({ prefix: '/api/chat' })

// 所有路由都需要认证
router.use(authMiddleware)

// 获取聊天初始化信息（问候语和未读推送）
router.get('/init', chatController.getInit)

// 获取消息列表
router.get('/messages', chatController.getMessages)

// 发送消息
router.post('/send', chatController.sendMessage)

// 确认并保存记录（确认卡片后调用）
router.post('/confirm', chatController.confirmSave)

// 处理卡片按钮点击
router.post('/action', chatController.handleAction)

// 获取未读推送
router.get('/push', chatController.getPushes)

// 标记推送已读
router.post('/push/:id/read', chatController.markPushRead)

// 获取会话历史
router.get('/sessions', chatController.getSessions)

// 清除当前追问状态
router.delete('/session', chatController.clearSession)

// 暂停追问
router.post('/session/pause', chatController.pauseSession)

export default router
