import { mkdir, cp } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// 使用 process.cwd() 作为基础路径
const CWD = process.cwd()
const SCRIPT_DIR = CWD  // npm run 会在脚本目录执行
const FREE_EXERCISE_DB_DIR = join(SCRIPT_DIR, 'free-exercise-db')
const DATA_DIR = join(SCRIPT_DIR, 'data')

/**
 * 从本地 free-exercise-db 目录复制数据
 */
async function copyFromLocal(): Promise<void> {
  console.log('从本地复制数据...')

  // 检查本地目录是否存在
  if (!existsSync(FREE_EXERCISE_DB_DIR)) {
    throw new Error(`本地目录不存在: ${FREE_EXERCISE_DB_DIR}`)
  }

  // 确保输出目录存在
  await mkdir(DATA_DIR, { recursive: true })
  await mkdir(join(DATA_DIR, 'images'), { recursive: true })

  // 复制 exercises.json
  const srcJson = join(FREE_EXERCISE_DB_DIR, 'dist', 'exercises.json')
  const destJson = join(DATA_DIR, 'exercises.json')

  if (!existsSync(srcJson)) {
    throw new Error(`exercises.json 不存在: ${srcJson}`)
  }

  await cp(srcJson, destJson)
  console.log(`已复制 exercises.json`)

  // 复制 exercises 文件夹（图片）
  const srcImages = join(FREE_EXERCISE_DB_DIR, 'exercises')
  const destImages = join(DATA_DIR, 'images')

  if (existsSync(srcImages)) {
    await cp(srcImages, destImages, { recursive: true })
    console.log(`已复制 exercises 图片目录`)
  }
}

/**
 * 验证数据
 */
async function verifyData(): Promise<number> {
  const exercisesPath = join(DATA_DIR, 'exercises.json')

  if (!existsSync(exercisesPath)) {
    throw new Error('exercises.json 未找到，请先运行 npm run download')
  }

  const content = await import('fs').then(fs => fs.promises.readFile(exercisesPath, 'utf-8'))
  const data = JSON.parse(content)

  console.log(`验证: ${data.length} 个动作已加载`)

  // 检查图片
  const imagesDir = join(DATA_DIR, 'images')
  if (existsSync(imagesDir)) {
    const imageCount = await countDirectories(imagesDir)
    console.log(`验证: ${imageCount} 个动作有图片目录`)
  }

  return data.length
}

/**
 * 统计目录数量
 */
async function countDirectories(dir: string): Promise<number> {
  const { readdir } = await import('fs/promises')
  const entries = await readdir(dir, { withFileTypes: true })
  return entries.filter(e => e.isDirectory()).length
}

/**
 * 主函数
 */
export async function download(): Promise<void> {
  console.log('=== 复制 free-exercise-db 数据 ===\n')
  console.log(`源目录: ${FREE_EXERCISE_DB_DIR}`)
  console.log(`目标目录: ${DATA_DIR}\n`)

  await copyFromLocal()
  const count = await verifyData()

  console.log(`\n完成！共 ${count} 个动作`)
  console.log('请运行 npm run transform 继续')
}

// 如果直接运行此脚本
if (require.main === module) {
  download().catch(console.error)
}

export { copyFromLocal, verifyData }
