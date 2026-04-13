import { PrismaClient, MuscleCategory, MuscleRole } from '@prisma/client'
import muscles from '../src/seeds/muscles.json'

const prisma = new PrismaClient()

interface MuscleSeed {
  code: string
  name: string
  aliases: string[]
  category: MuscleCategory
  parentCode: string | null
  recoveryHours: number
}

async function seedMuscles(): Promise<void> {
  console.log('开始 seed 肌肉数据...\n')

  // 检查是否已有数据
  const existingCount = await prisma.muscle.count()
  if (existingCount > 0) {
    console.log(`肌肉数据已存在 (${existingCount} 条)，跳过 seed`)
    return
  }

  const musclesData = muscles as MuscleSeed[]

  for (const muscle of musclesData) {
    await prisma.muscle.create({
      data: {
        code: muscle.code,
        name: muscle.name,
        aliases: muscle.aliases,
        category: muscle.category,
        parentCode: muscle.parentCode,
        recoveryHours: muscle.recoveryHours,
      },
    })
    console.log(`  ✓ ${muscle.code} - ${muscle.name}`)
  }

  console.log(`\n肌肉 seed 完成！共 ${musclesData.length} 条`)
}

// 执行 seed
seedMuscles()
  .catch((error) => {
    console.error('Seed 失败:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })