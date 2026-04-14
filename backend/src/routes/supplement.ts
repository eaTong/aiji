import Router from '@koa/router'
import { authMiddleware } from '../middleware/auth'
import {
  createSupplement,
  listSupplements,
  removeSupplement,
} from '../controllers/supplementController'

const supplementRouter = new Router({ prefix: '/api/supplements' })

// POST /api/supplements - 创建补剂记录
supplementRouter.post('/', authMiddleware, createSupplement)

// GET /api/supplements - 获取补剂记录列表
supplementRouter.get('/', authMiddleware, listSupplements)

// DELETE /api/supplements/:id - 删除补剂记录
supplementRouter.delete('/:id', authMiddleware, removeSupplement)

export default supplementRouter
