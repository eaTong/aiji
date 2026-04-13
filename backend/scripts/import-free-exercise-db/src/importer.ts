import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
// @ts-ignore - 使用 backend 的 prisma client
import { PrismaClient } from '../backend_node_modules/@prisma/client'
import { FinalExercise } from './types'

const CWD = process.cwd()
const OUTPUT_DIR = join(CWD, 'output')

const prisma = new PrismaClient()

interface ProcessedData {
  generatedAt: string
  exercises: FinalExercise[]
}

/**
 * 根据 Muscle.code 查找 Muscle.id
 */
async function getMuscleIdByCode(code: string): Promise<string | null> {
  const muscle = await prisma.muscle.findUnique({
    where: { code },
    select: { id: true },
  })
  return muscle?.id || null
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
  }

  // 清空现有系统动作的中间表和动作
  console.log('清空现有系统动作...')
  await prisma.exerciseMuscle.deleteMany({
    where: {
      exercise: {
        isCustom: false,
        userId: null,
      },
    },
  })
  await prisma.exercise.deleteMany({
    where: { isCustom: false, userId: null },
  })

  // 批量导入
  let imported = 0
  let skipped = 0
  let musclesNotFound = 0

  console.log('开始导入数据库...')

  for (let i = 0; i < data.exercises.length; i++) {
    const ex = data.exercises[i]

    try {
      // 收集所有肌肉关联（去重）
      const allMuscles: Array<{ muscleCode: string; ratio: number; role: 'PRIMARY' | 'SECONDARY' }> = []

      for (const muscle of ex.primaryMuscles) {
        allMuscles.push({ muscleCode: muscle.code, ratio: muscle.ratio, role: 'PRIMARY' })
      }
      for (const muscle of ex.secondaryMuscles) {
        allMuscles.push({ muscleCode: muscle.code, ratio: muscle.ratio * 0.5, role: 'SECONDARY' })
      }

      // 去重：同一肌肉只保留一个（主肌群优先）
      const uniqueMuscles = new Map<string, { ratio: number; role: 'PRIMARY' | 'SECONDARY' }>()
      for (const m of allMuscles) {
        const existing = uniqueMuscles.get(m.muscleCode)
        if (!existing || existing.role === 'SECONDARY') {
          uniqueMuscles.set(m.muscleCode, { ratio: m.ratio, role: m.role })
        }
      }

      // 1. 创建 Exercise
      const exercise = await prisma.exercise.create({
        data: {
          name: ex.name,
          nameEn: ex.nameEn,
          category: ex.category,
          equipment: ex.equipment,
          primaryMuscles: ex.primaryMuscles.map(m => m.code),
          secondaryMuscles: ex.secondaryMuscles.map(m => m.code),
          instructions: ex.instructions,
          instructionsZh: ex.instructionsZh,
          commonMistakes: ex.commonMistakes,
          warnings: ex.warnings,
          videoUrl: ex.videoUrl,
          isCustom: ex.isCustom,
          isFavorite: ex.isFavorite,
          userId: ex.userId,
        },
      })

      // 2. 创建肌肉关联
      for (const [muscleCode, { ratio, role }] of uniqueMuscles) {
        const muscleId = await getMuscleIdByCode(muscleCode)
        if (muscleId) {
          await prisma.exerciseMuscle.create({
            data: {
              exerciseId: exercise.id,
              muscleId,
              role,
              ratio,
            },
          })
        } else {
          musclesNotFound++
        }
      }

      imported++
      process.stdout.write(`\r进度: ${imported}/${data.exercises.length}`)
    } catch (error) {
      console.error(`\n动作 ${ex.name} 导入失败:`, error)
      skipped++
    }
  }

  console.log(`\n\n导入完成！`)
  console.log(`  成功: ${imported - skipped}`)
  console.log(`  跳过: ${skipped}`)
  console.log(`  总计: ${data.exercises.length}`)
  if (musclesNotFound > 0) {
    console.log(`  警告: ${musclesNotFound} 个肌肉未找到`)
  }
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
