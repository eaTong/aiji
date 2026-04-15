import { Context } from 'koa'
import { getExercises, getExerciseById, createExercise, updateExercise, deleteExercise } from '../../services/admin/exerciseService'

export async function list(ctx: Context) {
  const { page, pageSize, keyword, category } = ctx.query as any
  const result = await getExercises({
    page: parseInt(page) || 1,
    pageSize: parseInt(pageSize) || 20,
    keyword,
    category
  })
  ctx.body = result
}

export async function getById(ctx: Context) {
  const { id } = ctx.params
  const result = await getExerciseById(id)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function create(ctx: Context) {
  const data = ctx.request.body as any
  const result = await createExercise(data)
  ctx.status = result.code === 0 ? 201 : result.code
  ctx.body = result
}

export async function update(ctx: Context) {
  const { id } = ctx.params
  const data = ctx.request.body as any
  const result = await updateExercise(id, data)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function remove(ctx: Context) {
  const { id } = ctx.params
  const result = await deleteExercise(id)
  ctx.status = result.code === 0 ? 204 : result.code
  ctx.body = result
}
