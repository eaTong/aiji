import { getUserById, updateUser, UpdateProfileInput } from '../services/userService'
import { success } from '../types'
import { AuthContext } from '../types'

export async function getProfile(ctx: AuthContext) {
  const user = await getUserById(ctx.state.user.userId)
  ctx.body = success(user)
}

export async function updateProfile(ctx: AuthContext) {
  const input = ctx.request.body as UpdateProfileInput
  const user = await updateUser(ctx.state.user.userId, input)
  ctx.body = success(user)
}