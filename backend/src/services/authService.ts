import axios from 'axios'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'

const prisma = new PrismaClient()

export async function getWxOpenid(code: string): Promise<string> {
  const url = 'https://api.weixin.qq.com/sns/jscode2session'
  const { data } = await axios.get(url, {
    params: {
      appid: env.wxAppId,
      secret: env.wxSecret,
      js_code: code,
      grant_type: 'authorization_code',
    },
  })
  if (data.errcode) {
    throw Object.assign(new Error(data.errmsg), { status: 400 })
  }
  return data.openid as string
}

export async function loginOrRegister(openid: string) {
  const user = await prisma.user.upsert({
    where: { openid },
    update: {},
    create: { openid },
  })
  const token = jwt.sign(
    { userId: user.id },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  )
  return { token, user }
}