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
  // AI 服务配置
  aiApiKey: process.env['AI_API_KEY'] || '',
  aiApiUrl: process.env['AI_API_URL'] || 'https://api.openai.com/v1/chat/completions',
  aiModel: process.env['AI_MODEL'] || 'gpt-3.5-turbo',
  aiTemperature: process.env['AI_TEMPERATURE'] ? Number(process.env['AI_TEMPERATURE']) : 0.7,
  aiMaxTokens: process.env['AI_MAX_TOKENS'] ? Number(process.env['AI_MAX_TOKENS']) : 500,
}