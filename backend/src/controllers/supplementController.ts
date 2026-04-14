import { Context } from 'koa'
import { success } from '../types'
import { AuthContext } from '../types'
import {
  createSupplementRecord,
  getSupplementRecords,
  getSupplementRecordById,
  deleteSupplementRecord,
} from '../services/supplementService'

export interface CreateSupplementBody {
  supplement: string
  dosage?: string
  timing?: string
  note?: string
  date?: string
}

/**
 * POST /api/supplements - 创建补剂记录
 */
export async function createSupplement(ctx: Context) {
  const userId = (ctx as AuthContext).state.user.userId
  const body = ctx.request.body as CreateSupplementBody

  if (!body.supplement) {
    ctx.status = 400
    ctx.body = { code: 400, message: '补剂名称不能为空', data: null }
    return
  }

  const record = await createSupplementRecord(userId, body)
  ctx.body = success(record)
}

/**
 * GET /api/supplements - 获取补剂记录列表
 */
export async function listSupplements(ctx: Context) {
  const userId = (ctx as AuthContext).state.user.userId
  const date = ctx.query.date as string | undefined
  const days = parseInt(ctx.query.days as string) || 7

  const records = await getSupplementRecords(userId, { date, days })
  ctx.body = success(records)
}

/**
 * DELETE /api/supplements/:id - 删除补剂记录
 */
export async function removeSupplement(ctx: Context) {
  const userId = (ctx as AuthContext).state.user.userId
  const { id } = ctx.params

  const record = await getSupplementRecordById(id)
  if (!record) {
    ctx.status = 404
    ctx.body = { code: 404, message: '补剂记录不存在', data: null }
    return
  }

  if (record.userId !== userId) {
    ctx.status = 403
    ctx.body = { code: 403, message: '无权删除此记录', data: null }
    return
  }

  await deleteSupplementRecord(id)
  ctx.body = success({ deleted: true })
}
