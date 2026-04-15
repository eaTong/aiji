import { Context } from 'koa'
import { adminLogin, getAdminProfile } from '../../services/admin/authService'

export async function login(ctx: Context) {
  const { username, password } = ctx.request.body as { username?: string, password?: string }
  if (!username || !password) {
    ctx.status = 400
    ctx.body = { code: 400, message: '用户名和密码不能为空', data: null }
    return
  }
  const result = await adminLogin(username, password)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function getProfile(ctx: Context) {
  const adminId = ctx.state.admin?.adminId
  if (!adminId) {
    ctx.status = 401
    ctx.body = { code: 401, message: '未授权', data: null }
    return
  }
  const result = await getAdminProfile(adminId)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function logout(ctx: Context) {
  ctx.body = { code: 0, message: '退出成功', data: null }
}
