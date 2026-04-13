import { PrismaClient } from '../backend_node_modules/@prisma/client'

const prisma = new PrismaClient()

async function verify() {
  console.log('=== 验证导入数据 ===\n')

  // 检查动作数量
  const exerciseCount = await prisma.exercise.count({
    where: { isCustom: false, userId: null },
  })
  console.log(`动作数量: ${exerciseCount}`)

  // 获取前 3 个动作详情
  const exercises = await prisma.exercise.findMany({
    where: { isCustom: false, userId: null },
    take: 3,
    include: {
      exerciseMuscles: {
        include: { muscle: true }
      }
    }
  })

  for (const ex of exercises) {
    console.log(`\n动作: ${ex.name} (${ex.nameEn})`)
    console.log(`  分类: ${ex.category}`)
    console.log(`  器械: ${ex.equipment}`)
    console.log(`  说明: ${ex.instructionsZh?.substring(0, 50)}...`)
    console.log(`  注意事项: ${ex.warnings}`)
    console.log(`  易错点: ${ex.commonMistakes}`)
    console.log(`  肌肉关联:`)
    for (const em of ex.exerciseMuscles) {
      console.log(`    - ${em.muscle.name} (${em.role}, ratio: ${em.ratio})`)
    }
  }

  // 检查肌肉数量
  const muscleCount = await prisma.muscle.count()
  console.log(`\n\n肌肉数量: ${muscleCount}`)
}

verify()
  .then(() => {
    console.log('\n\n验证完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('验证失败:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
