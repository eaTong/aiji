import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import OSS from 'ali-oss'
import { EnrichedExercise } from './types'

const CWD = process.cwd()
const DATA_DIR = join(CWD, 'data')
const OUTPUT_DIR = join(CWD, 'output')
const CONCURRENCY = 5

// OSS 配置
const OSS_CONFIG = {
  region: process.env.OSS_REGION || 'oss-cn-beijing',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.OSS_BUCKET || '',
}

/**
 * 创建 OSS 客户端
 */
function createOssClient(): OSS {
  if (!OSS_CONFIG.accessKeyId || !OSS_CONFIG.accessKeySecret) {
    throw new Error('请设置环境变量: OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET')
  }
  return new OSS(OSS_CONFIG)
}

/**
 * 上传单个图片到OSS
 */
async function uploadImage(
  client: OSS,
  localPath: string,
  exerciseId: string,
  imageName: string
): Promise<string> {
  const ossPath = `exercises/${exerciseId}/${imageName}`

  try {
    const result = await client.put(ossPath, localPath)
    return result.url || `https://${OSS_CONFIG.bucket}.${OSS_CONFIG.region}.aliyuncs.com/${ossPath}`
  } catch (error) {
    console.error(`上传失败 ${localPath}:`, error)
    throw error
  }
}

/**
 * 上传单个动作的所有图片
 */
async function uploadExerciseImages(
  client: OSS,
  exercise: EnrichedExercise
): Promise<string[]> {
  const imageDir = join(DATA_DIR, 'images', exercise.sourceId)
  const urls: string[] = []

  if (!existsSync(imageDir)) {
    console.warn(`图片目录不存在: ${imageDir}`)
    return urls
  }

  try {
    const files = await readdir(imageDir)

    for (const file of files) {
      // 只处理图片文件
      if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) continue

      const localPath = join(imageDir, file)
      const ossUrl = await uploadImage(client, localPath, exercise.sourceId, file)
      urls.push(ossUrl)
    }
  } catch (error) {
    console.warn(`处理图片失败 ${exercise.sourceId}:`, error)
  }

  return urls
}

/**
 * 批量上传所有图片
 */
async function uploadAllImages(
  exercises: EnrichedExercise[],
  onProgress?: (current: number, total: number) => void
): Promise<Record<string, string[]>> {
  const client = createOssClient()
  const imageUrls: Record<string, string[]> = {}

  let completed = 0
  const total = exercises.length

  for (let i = 0; i < exercises.length; i += CONCURRENCY) {
    const batch = exercises.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(async (ex) => {
        const urls = await uploadExerciseImages(client, ex)
        completed++
        onProgress?.(completed, total)
        return { id: ex.sourceId, urls }
      })
    )

    for (const result of batchResults) {
      imageUrls[result.id] = result.urls
    }
  }

  // 保存图片URL映射
  await writeFile(
    join(OUTPUT_DIR, 'images-urls.json'),
    JSON.stringify(imageUrls, null, 2),
    'utf-8'
  )

  return imageUrls
}

/**
 * 合并图片URL到最终数据
 */
async function mergeImageUrls(): Promise<void> {
  const processedPath = join(OUTPUT_DIR, 'exercises-processed.json')
  const urlsPath = join(OUTPUT_DIR, 'images-urls.json')

  if (!existsSync(processedPath) || !existsSync(urlsPath)) {
    console.error('请先运行 npm run enrich 和 npm run upload')
    process.exit(1)
  }

  const processed = JSON.parse(await readFile(processedPath, 'utf-8'))
  const urls = JSON.parse(await readFile(urlsPath, 'utf-8'))

  for (const exercise of processed.exercises) {
    const exerciseUrls = urls[exercise.sourceId] || []
    exercise.videoUrl = exerciseUrls.join(',') || null
  }

  await writeFile(processedPath, JSON.stringify(processed, null, 2), 'utf-8')
  console.log('图片URL合并完成')
}

/**
 * 主函数
 */
async function upload(): Promise<void> {
  const processedPath = join(OUTPUT_DIR, 'exercises-processed.json')

  if (!existsSync(processedPath)) {
    console.error('请先运行 npm run enrich')
    process.exit(1)
  }

  const content = await readFile(processedPath, 'utf-8')
  const data = JSON.parse(content)
  const exercises: EnrichedExercise[] = data.exercises

  console.log(`开始上传 ${exercises.length} 个动作的图片...`)
  await uploadAllImages(exercises, (current, total) => {
    process.stdout.write(`\r进度: ${current}/${total}`)
  })

  console.log('\n开始合并图片URL...')
  await mergeImageUrls()

  console.log('\n上传完成!')
}

// 如果直接运行此脚本
if (require.main === module) {
  upload().catch(console.error)
}

export { upload, uploadAllImages, mergeImageUrls }
