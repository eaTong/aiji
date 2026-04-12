import { Context } from 'koa'
export async function getProfile(ctx: Context) {
  ctx.body = { code: 0, message: 'ok', data: null }
}

export async function updateProfile(ctx: Context) {
  ctx.body = { code: 0, message: 'ok', data: null }
}