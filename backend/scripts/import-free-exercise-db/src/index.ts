import 'dotenv/config'
import { download, verifyData } from './downloader'
import { transform } from './transformer'
import { enrich } from './aiEnricher'
import { upload, uploadAllImages, mergeImageUrls } from './uploader'
import { importToDatabase } from './importer'

/**
 * 完整导入流程
 *
 * 执行步骤：
 * 1. copy    - 从本地 free-exercise-db 复制数据
 * 2. transform - 字段转换（中英映射、分类映射、肌肉映射）
 * 3. enrich - AI增强（中文说明、注意事项、易错点）
 * 4. upload - 图片上传至阿里云OSS
 * 5. import - 导入数据到数据库
 */

type Step = 'copy' | 'transform' | 'enrich' | 'upload' | 'import' | 'all'

const STEPS: Step[] = ['copy', 'transform', 'enrich', 'upload', 'import']

async function runStep(step: Step): Promise<void> {
  switch (step) {
    case 'copy':
      await download()
      break
    case 'transform':
      await transform()
      break
    case 'enrich':
      await enrich()
      break
    case 'upload':
      await upload()
      break
    case 'import':
      await importToDatabase()
      break
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const targetStep = args[0] as Step || 'all'

  console.log('=== free-exercise-db 数据导入工具 ===\n')

  if (targetStep === 'all') {
    // 执行完整流程
    console.log('开始完整导入流程...\n')

    for (const step of STEPS) {
      console.log(`\n[${STEPS.indexOf(step) + 1}/${STEPS.length}] ${step.toUpperCase()}`)
      console.log('─'.repeat(40))
      await runStep(step)
    }

    console.log('\n' + '='.repeat(40))
    console.log('=== 导入完成 ===')
    console.log('输出文件: output/exercises-processed.json')
    console.log('数据库: 已导入 exercises 表')
  } else {
    // 执行指定步骤
    if (!STEPS.includes(targetStep)) {
      console.error(`未知步骤: ${targetStep}`)
      console.log(`可用步骤: ${['all', ...STEPS].join(', ')}`)
      process.exit(1)
    }

    await runStep(targetStep)
  }
}

main().catch((error) => {
  console.error('导入失败:', error)
  process.exit(1)
})
