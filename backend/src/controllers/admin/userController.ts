import { Context } from 'koa'
import { getUsers, getUserById, updateUser, disableUser } from '../../services/admin/userService'

export async function list(ctx: Context) {
  const { page, pageSize, keyword, role } = ctx.query as any
  const result = await getUsers({
    page: parseInt(page) || 1,
    pageSize: parseInt(pageSize) || 20,
    keyword,
    role
  })
  ctx.body = result
}

export async function getById(ctx: Context) {
  const { id } = ctx.params
  const result = await getUserById(id)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function update(ctx: Context) {
  const { id } = ctx.params
  const data = ctx.request.body as { nickname?: string; role?: string }
  const result = await updateUser(id, data)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function disable(ctx: Context) {
  const { id } = ctx.params
  const { disabled } = ctx.request.body as { disabled?: boolean }
  const result = await disableUser(id, disabled ?? false)
  ctx.body = result
}
