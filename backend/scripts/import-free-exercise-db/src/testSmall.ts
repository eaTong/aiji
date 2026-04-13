/**
 * 小批量 AI Enrich 测试脚本
 * 处理 20 个动作，验证所有字段是否正确翻译
 */

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { ProcessedExercise, EnrichedExercise } from './types'

const CWD = process.cwd()
const OUTPUT_DIR = join(CWD, 'output')
const BATCH_SIZE = 2
const CONCURRENCY = 2
const TEST_COUNT = 20

const MINIMAX_API_KEY = 'sk-cp-g2f8gf-BF_bd4WkOVvvI8OsEGfYrojAwJ9esutVeRHK-fBDHWj9DDvocvT3lAo5J-RORvlQ7cVi2qLz8XT_9j-TyefbS6HCh4HEUgDc0HDlMzcWdqAZDxcI'
const MINIMAX_API_URL = 'https://api.minimaxi.com/v1/chat/completions'

async function enrichBatch(
  exercises: ProcessedExercise[]
): Promise<Array<{ name: string; instructionsZh: string; warnings: string[]; mistakes: string[] }>> {
  const exercisesText = exercises.map((ex, i) => {
    const muscles = [
      ...ex.primaryMuscles.map(m => `${m.code}(权重${m.ratio})`),
      ...ex.secondaryMuscles.map(m => `${m.code}(辅权重${m.ratio})`),
    ].join(', ')

    return `${i + 1}. ${ex.nameEn}
   肌肉: ${muscles || '无'}
   步骤: ${ex.instructions.substring(0, 80)}`
  }).join('\n\n')

  const prompt = `请将以下健身动作翻译成中文并返回完整JSON数组（不要任何其他内容）：

${exercisesText}

请直接返回JSON数组（不要任何其他内容）：
[{"name":"中文名称1","instructionsZh":"中文步骤说明","warnings":["注意事项1","注意事项2"],"mistakes":["易错点1","易错点2"]},...]`

  try {
    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`API 失败: ${response.status} - ${errorText}`)
      return exercises.map(() => ({ name: '', instructionsZh: '', warnings: [], mistakes: [] }))
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; reply?: string }
    const content = data.choices?.[0]?.message?.content || data.reply || ''

    // 移除思考标签
    const thinkCloseIndex = content.indexOf('</think>')
    let jsonStr = content
    if (thinkCloseIndex !== -1) {
      jsonStr = content.substring(thinkCloseIndex + 8).trim()
    }

    // 移除 markdown 代码块
    jsonStr = jsonStr.replace(/```json\n?/, '').replace(/```\n?$/, '').trim()

    // 尝试找到完整的 JSON 数组
    const arrayStart = jsonStr.indexOf('[')
    const arrayEnd = jsonStr.lastIndexOf(']')

    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      const trimmedJson = jsonStr.substring(arrayStart, arrayEnd + 1)
      try {
        const results = JSON.parse(trimmedJson)
        if (Array.isArray(results)) {
          return results.slice(0, exercises.length).map((r: any) => ({
            name: r.name || '',
            instructionsZh: r.instructionsZh || '',
            warnings: Array.isArray(r.warnings) ? r.warnings : [],
            mistakes: Array.isArray(r.mistakes) ? r.mistakes : [],
          }))
        }
      } catch (e) {
        console.warn(`JSON解析失败: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    console.warn('未找到有效JSON数组')
    console.warn('内容预览:', jsonStr.substring(0, 300))
  } catch (error) {
    console.error('API 错误:', error)
  }

  return exercises.map(() => ({ name: '', instructionsZh: '', warnings: [], mistakes: [] }))
}

function generateChineseInstructions(exercise: ProcessedExercise): string {
  const lines = exercise.instructions.split('\n').filter(Boolean)
  return lines.map((line, i) => `${i + 1}. ${line}`).join('\n')
}

async function testSmall(): Promise<void> {
  const transformedPath = join(OUTPUT_DIR, 'exercises-transformed.json')
  if (!existsSync(transformedPath)) {
    console.error('请先运行 npm run transform')
    process.exit(1)
  }

  const content = await readFile(transformedPath, 'utf-8')
  const exercises: ProcessedExercise[] = JSON.parse(content)

  // 只取前 20 个
  const testExercises = exercises.slice(0, TEST_COUNT)
  console.log(`测试: 处理 ${testExercises.length} 个动作\n`)

  const results: EnrichedExercise[] = []

  // 分组并发处理
  for (let batchGroupStart = 0; batchGroupStart < testExercises.length; batchGroupStart += BATCH_SIZE * CONCURRENCY) {
    const concurrentPromises: Promise<EnrichedExercise[]>[] = []

    for (let j = 0; j < CONCURRENCY; j++) {
      const start = batchGroupStart + j * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, testExercises.length)

      if (start >= testExercises.length) break

      const batch = testExercises.slice(start, end)
      concurrentPromises.push(
        enrichBatch(batch).then(enrichedResults =>
          batch.map((ex, idx) => ({
            ...ex,
            name: enrichedResults[idx]?.name || ex.nameEn || '',
            instructionsZh: enrichedResults[idx]?.instructionsZh || generateChineseInstructions(ex),
            warnings: enrichedResults[idx]?.warnings || [],
            mistakes: enrichedResults[idx]?.mistakes || [],
            ossImages: [],
          }))
        )
      )
    }

    const batchResults = await Promise.all(concurrentPromises)
    for (const batchResult of batchResults) {
      results.push(...batchResult)
    }

    const progress = Math.min(batchGroupStart + BATCH_SIZE * CONCURRENCY, testExercises.length)
    process.stdout.write(`\r进度: ${progress}/${testExercises.length}`)
  }

  console.log('\n\n=== 结果检查 ===')

  // 检查字段
  let emptyName = 0
  let emptyInstructionsZh = 0
  let emptyWarnings = 0
  let emptyMistakes = 0

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (!r.name || r.name === results[i].nameEn) emptyName++
    if (!r.instructionsZh || r.instructionsZh === results[i].instructions) emptyInstructionsZh++
    if (r.warnings.length === 0) emptyWarnings++
    if (r.mistakes.length === 0) emptyMistakes++
  }

  console.log(`name 中文为空: ${emptyName}/${results.length}`)
  console.log(`instructionsZh 中文为空: ${emptyInstructionsZh}/${results.length}`)
  console.log(`warnings 为空: ${emptyWarnings}/${results.length}`)
  console.log(`mistakes 为空: ${emptyMistakes}/${results.length}`)

  // 显示前 5 个结果
  console.log('\n=== 前 5 个结果示例 ===')
  for (let i = 0; i < Math.min(5, results.length); i++) {
    const r = results[i]
    console.log(`\n动作 ${i + 1}:`)
    console.log(`  英文名: ${r.nameEn}`)
    console.log(`  中文名: ${r.name}`)
    console.log(`  说明(ZH): ${r.instructionsZh.substring(0, 100)}...`)
    console.log(`  注意事项: ${r.warnings.join(', ')}`)
    console.log(`  易错点: ${r.mistakes.join(', ')}`)
  }

  // 保存结果
  const final = results.map(r => ({
    name: r.name || r.nameEn,
    nameEn: r.nameEn,
    category: r.category,
    equipment: r.equipment,
    primaryMuscles: r.primaryMuscles,
    secondaryMuscles: r.secondaryMuscles,
    instructions: r.instructions,
    instructionsZh: r.instructionsZh || null,
    commonMistakes: r.mistakes.join('；') || null,
    warnings: r.warnings.join('；') || null,
    videoUrl: r.ossImages.join(',') || null,
    isCustom: false,
    isFavorite: false,
    userId: null,
  }))

  await writeFile(
    join(OUTPUT_DIR, 'test-20-processed.json'),
    JSON.stringify({ exercises: final, generatedAt: new Date().toISOString() }, null, 2),
    'utf-8'
  )
  console.log('\n\n测试结果已保存: output/test-20-processed.json')
}

testSmall().catch(console.error)
