import fs from 'fs'
import path from 'path'

const LOG_DIR = path.join(__dirname, '..', 'logs')
const LOG_FILE = path.join(LOG_DIR, 'app.log')

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

function formatDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function writeLog(level: string, message: string, data?: any): void {
  const timestamp = formatDate(new Date())
  const dataStr = data ? ` ${JSON.stringify(data)}` : ''
  const logLine = `[${timestamp}] [${level}] ${message}${dataStr}\n`

  // 写入文件
  fs.appendFileSync(LOG_FILE, logLine)

  // 同时输出到控制台
  if (process.env.NODE_ENV !== 'test') {
    console.log(logLine.trim())
  }
}

export const logger = {
  info: (message: string, data?: any) => writeLog('INFO', message, data),
  warn: (message: string, data?: any) => writeLog('WARN', message, data),
  error: (message: string, data?: any) => writeLog('ERROR', message, data),
  debug: (message: string, data?: any) => writeLog('DEBUG', message, data),
}
