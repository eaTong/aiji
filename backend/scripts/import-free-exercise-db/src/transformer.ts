import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { FreeExerciseDbItem, ProcessedExercise, MuscleItem } from './types'
import {
  EQUIPMENT_MAPPING,
  CATEGORY_MAPPING,
  inferCategory,
} from './mapping'
import { getMuscleMapping } from './muscleMapping'

const CWD = process.cwd()
const DATA_DIR = join(CWD, 'data')
const OUTPUT_DIR = join(CWD, 'output')

/**
 * 加载原始数据
 */
async function loadRawData(): Promise<FreeExerciseDbItem[]> {
  const dataPath = join(DATA_DIR, 'exercises.json')
  const content = await readFile(dataPath, 'utf-8')
  return JSON.parse(content)
}

/**
 * 转换单个 free-exercise-db 肌肉名称到 Muscle.code 数组
 */
function mapMuscle(muscleName: string, role: 'PRIMARY' | 'SECONDARY'): MuscleItem[] {
  const mapping = getMuscleMapping(muscleName, role)
  if (!mapping) {
    return []
  }
  return mapping.map(m => ({
    code: m.code,
    ratio: m.ratio,
  }))
}

/**
 * 转换单个动作
 */
function transformExercise(item: FreeExerciseDbItem): ProcessedExercise | null {
  // 过滤无效分类
  const validCategories = ['strength', 'cardio', 'stretching', 'olympic', 'powerlifting', 'strongman']
  if (!validCategories.includes(item.category.toLowerCase())) {
    return null
  }

  // 确定分类
  let category = CATEGORY_MAPPING[item.category.toLowerCase()]
  if (!category) {
    category = inferCategory(item.primaryMuscles)
  }

  // 确定器械
  const equipmentKey = item.equipment?.toLowerCase() || 'other'
  let equipment = EQUIPMENT_MAPPING[equipmentKey]
  if (!equipment) {
    console.warn(`未知的器械: ${item.equipment}，默认使用 GYM`)
    equipment = 'GYM'
  }

  // 转换主肌群
  const primaryMuscles: MuscleItem[] = []
  for (const muscle of item.primaryMuscles || []) {
    primaryMuscles.push(...mapMuscle(muscle, 'PRIMARY'))
  }

  // 转换辅肌群
  const secondaryMuscles: MuscleItem[] = []
  for (const muscle of item.secondaryMuscles || []) {
    secondaryMuscles.push(...mapMuscle(muscle, 'SECONDARY'))
  }

  // 合并 instructions 数组为字符串
  const instructions = item.instructions?.join('\n') || ''

  return {
    sourceId: item.id,
    name: '',  // 待 AI 填充
    nameEn: item.name,
    category,
    equipment,
    primaryMuscles,
    secondaryMuscles,
    instructions,
    level: item.level,
    images: item.images || [],
  }
}

/**
 * 转换所有数据
 */
async function transform(): Promise<ProcessedExercise[]> {
  console.log('加载原始数据...')
  const rawData = await loadRawData()
  console.log(`共 ${rawData.length} 个动作`)

  console.log('转换数据...')
  const transformed: ProcessedExercise[] = []
  let skipped = 0

  for (const item of rawData) {
    const processed = transformExercise(item)
    if (processed) {
      transformed.push(processed)
    } else {
      skipped++
    }
  }

  console.log(`转换完成: ${transformed.length} 个动作, ${skipped} 个跳过（无效分类）`)

  // 检查未映射的肌肉
  const allMuscles = new Set<string>()
  for (const ex of transformed) {
    for (const m of ex.primaryMuscles) {
      allMuscles.add(m.code)
    }
    for (const m of ex.secondaryMuscles) {
      allMuscles.add(m.code)
    }
  }
  console.log(`涉及 ${allMuscles.size} 个肌肉部位`)

  // 确保输出目录存在
  await writeFile(
    join(OUTPUT_DIR, 'exercises-transformed.json'),
    JSON.stringify(transformed, null, 2),
    'utf-8'
  )

  console.log(`转换完成，输出: ${OUTPUT_DIR}/exercises-transformed.json`)
  return transformed
}

/**
 * 检查图片是否存在
 */
async function checkImages(exercises: ProcessedExercise[]): Promise<void> {
  const imagesDir = join(DATA_DIR, 'images')
  let found = 0
  let missing = 0

  for (const ex of exercises) {
    const hasImages = ex.images && ex.images.length > 0
    if (hasImages) {
      // 检查第一张图片是否存在
      const firstImage = join(imagesDir, ex.images[0])
      if (existsSync(firstImage)) {
        found++
      } else {
        missing++
      }
    }
  }

  console.log(`图片检查: ${found} 个动作有图片, ${missing} 个动作图片缺失`)
}

// 如果直接运行此脚本
if (require.main === module) {
  transform().catch(console.error)
}

export { transform, loadRawData, transformExercise }
