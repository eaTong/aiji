import { Context } from 'koa'
import { getPushTemplates, createPushTask, getPushTasks, sendPushNow, getPushRecords } from '../../services/admin/pushService'

export async function listTemplates(ctx: Context) {
  const result = await getPushTemplates()
  ctx.body = result
}

export async function listTasks(ctx: Context) {
  const { page, pageSize } = ctx.query as any
  const result = await getPushTasks({
    page: parseInt(page) || 1,
    pageSize: parseInt(pageSize) || 20
  })
  ctx.body = result
}

export async function createTask(ctx: Context) {
  const data = ctx.request.body as any
  const result = await createPushTask(data)
  ctx.status = result.code === 0 ? 201 : result.code
  ctx.body = result
}

export async function send(ctx: Context) {
  const data = ctx.request.body as any
  const result = await sendPushNow(data)
  ctx.status = result.code === 0 ? 201 : result.code
  ctx.body = result
}

export async function listRecords(ctx: Context) {
  const { page, pageSize } = ctx.query as any
  const result = await getPushRecords({
    page: parseInt(page) || 1,
    pageSize: parseInt(pageSize) || 20
  })
  ctx.body = result
}
