import { Context } from 'koa'
import { getPlans, getPlanById, createPlan, updatePlan, deletePlan } from '../../services/admin/planService'

export async function list(ctx: Context) {
  const { page, pageSize, keyword } = ctx.query as any
  const result = await getPlans({
    page: parseInt(page) || 1,
    pageSize: parseInt(pageSize) || 20,
    keyword
  })
  ctx.body = result
}

export async function getById(ctx: Context) {
  const { id } = ctx.params
  const result = await getPlanById(id)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function create(ctx: Context) {
  const data = ctx.request.body as any
  const result = await createPlan(data)
  ctx.status = result.code === 0 ? 201 : result.code
  ctx.body = result
}

export async function update(ctx: Context) {
  const { id } = ctx.params
  const data = ctx.request.body as any
  const result = await updatePlan(id, data)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function remove(ctx: Context) {
  const { id } = ctx.params
  const result = await deletePlan(id)
  ctx.status = result.code === 0 ? 204 : result.code
  ctx.body = result
}
