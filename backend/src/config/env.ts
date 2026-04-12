import dotenv from 'dotenv'
dotenv.config()

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env variable: ${key}`)
  return value
}

export const env = {
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  wxAppId: requireEnv('WX_APPID'),
  wxSecret: requireEnv('WX_SECRET'),
  port: (() => {
  const p = process.env.PORT ? Number(process.env.PORT) : 3000
  if (isNaN(p)) throw new Error('PORT must be a valid number')
  return p
})(),
}