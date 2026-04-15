import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync, readdirSync } from 'fs'
import { config } from 'dotenv'
import OSS from 'ali-oss'
import { EnrichedExercise } from './types'

// 加载 .env 文件
config({ path: join(__dirname, '..', '.env') })

const CWD = process.cwd()
const DATA_DIR = join(CWD, 'data')
const OUTPUT_DIR = join(CWD, 'output')
const CONCURRENCY = 5

/**
 * 构建 nameEn -> 目录名 的映射
 */
function buildNameToDirMapping(): Map<string, string> {
  const mapping = new Map<string, string>()
  const imagesDir = join(DATA_DIR, 'images')
  const entries = readdirSync(imagesDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      // 目录名就是实际的映射键
      // 例如: "Adductor_Groin" -> "Adductor_Groin"
      mapping.set(entry.name, entry.name)
    }
  }
  return mapping
}

/**
 * 根据 nameEn 找到匹配的目录名
 */
function findMatchingDir(nameEn: string, mapping: Map<string, string>): string | null {
  // 1. 直接尝试转换空格为下划线
  const basicTransform = nameEn.replace(/ /g, '_')
  if (mapping.has(basicTransform)) {
    return basicTransform
  }

  // 2. 尝试多种变换
  const transforms = [
    nameEn.replace(/[\/\\]/g, '_').replace(/ /g, '_'),           // / -> _
    nameEn.replace(/[()]/g, '').replace(/ /g, '_'),               // 移除括号
    nameEn.replace(/[,'-]/g, '').replace(/ /g, '_'),             // 移除特殊字符
    nameEn.replace(/[()]/g, '').replace(/,/g, '').replace(/ /g, '_').replace(/-/g, '_'),
  ]

  for (const t of transforms) {
    if (mapping.has(t)) {
      return t
    }
  }

  // 3. 模糊匹配：查找包含 nameEn 主要部分的目录
  const normalizedName = nameEn.replace(/[^\w]/g, '').toLowerCase()
  for (const [dirName] of mapping) {
    const normalizedDir = dirName.replace(/[^\w]/g, '').toLowerCase()
    if (normalizedDir.includes(normalizedName) || normalizedName.includes(normalizedDir)) {
      return dirName
    }
  }

  return null
}

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
  exercise: { nameEn: string },
  nameToDirMapping: Map<string, string>
): Promise<string[]> {
  // 查找匹配的目录
  let imageDirName = findMatchingDir(exercise.nameEn, nameToDirMapping)
  if (!imageDirName) {
    console.warn(`图片目录不存在: ${exercise.nameEn}`)
    return []
  }

  const imageDir = join(DATA_DIR, 'images', imageDirName)
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
      const ossUrl = await uploadImage(client, localPath, imageDirName, file)
      urls.push(ossUrl)
    }
  } catch (error) {
    console.warn(`处理图片失败 ${exercise.nameEn}:`, error)
  }

  return urls
}

/**
 * 批量上传所有图片
 */
async function uploadAllImages(
  exercises: Array<{ nameEn: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<Record<string, string[]>> {
  const client = createOssClient()
  const imageUrls: Record<string, string[]> = {}

  // 构建目录映射
  const nameToDirMapping = buildNameToDirMapping()
  console.log(`已加载 ${nameToDirMapping.size} 个图片目录`)

  let completed = 0
  const total = exercises.length

  for (let i = 0; i < exercises.length; i += CONCURRENCY) {
    const batch = exercises.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(async (ex) => {
        const urls = await uploadExerciseImages(client, ex, nameToDirMapping)
        completed++
        onProgress?.(completed, total)
        return { id: ex.nameEn, urls }
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
