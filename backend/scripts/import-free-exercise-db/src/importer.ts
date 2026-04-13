import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { PrismaClient } from '@prisma/client'

const CWD = process.cwd()
const OUTPUT_DIR = join(CWD, 'output')

const prisma = new PrismaClient()

interface FinalExercise {
  name: string
  nameEn: string
  category: string
  equipment: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string | null
  commonMistakes: string | null
  videoUrl: string | null
  isCustom: boolean
  isFavorite: boolean
  userId: string | null
}

interface ProcessedData {
  generatedAt: string
  exercises: FinalExercise[]
}

/**
 * 导入数据到数据库
 */
async function importToDatabase(): Promise<void> {
  const processedPath = join(OUTPUT_DIR, 'exercises-processed.json')

  if (!existsSync(processedPath)) {
    throw new Error('请先完成前面的步骤: copy, transform, enrich, upload')
  }

  console.log('读取处理后的数据...')
  const content = await readFile(processedPath, 'utf-8')
  const data: ProcessedData = JSON.parse(content)

  console.log(`共 ${data.exercises.length} 个动作待导入`)

  // 检查是否已有数据
  const existingCount = await prisma.exercise.count({
    where: { isCustom: false, userId: null },
  })

  if (existingCount > 0) {
    console.warn(`警告: 数据库中已有 ${existingCount} 个系统动作`)
    console.warn('为避免重复，导入前将清空现有系统动作')
    console.warn('按 Ctrl+C 取消，或继续...')
    // 自动继续，不等待输入
  }

  // 清空现有系统动作（可选）
  // await prisma.exercise.deleteMany({
  //   where: { isCustom: false, userId: null }
  // })

  // 批量导入
  const BATCH_SIZE = 50
  let imported = 0
  let skipped = 0

  console.log('开始导入数据库...')

  for (let i = 0; i < data.exercises.length; i += BATCH_SIZE) {
    const batch = data.exercises.slice(i, i + BATCH_SIZE)

    try {
      await prisma.exercise.createMany({
        data: batch.map(ex => ({
          name: ex.name,
          nameEn: ex.nameEn,
          category: ex.category as any,
          equipment: ex.equipment as any,
          primaryMuscles: ex.primaryMuscles,
          secondaryMuscles: ex.secondaryMuscles,
          instructions: ex.instructions,
          commonMistakes: ex.commonMistakes,
          videoUrl: ex.videoUrl,
          isCustom: ex.isCustom,
          isFavorite: ex.isFavorite,
          userId: ex.userId,
        })),
        skipDuplicates: true,  // 跳过已存在的
      })

      imported += batch.length
      process.stdout.write(`\r进度: ${imported}/${data.exercises.length}`)
    } catch (error) {
      console.error(`\n批量 ${i / BATCH_SIZE + 1} 导入失败:`, error)
      skipped += batch.length
    }
  }

  console.log(`\n\n导入完成！`)
  console.log(`  成功: ${imported - skipped}`)
  console.log(`  跳过: ${skipped}`)
  console.log(`  总计: ${data.exercises.length}`)
}

// 如果直接运行此脚本
if (require.main === module) {
  importToDatabase()
    .then(() => {
      console.log('数据库导入完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('导入失败:', error)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}

export { importToDatabase }
