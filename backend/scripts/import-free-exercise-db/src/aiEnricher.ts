import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { ProcessedExercise, EnrichedExercise } from './types'

const CWD = process.cwd()
const OUTPUT_DIR = join(CWD, 'output')
const BATCH_SIZE = 2  // 每批处理2个动作
const CONCURRENCY = 1  // 并发数

// MiniMax API 配置
const MINIMAX_API_KEY = 'sk-cp-g2f8gf-BF_bd4WkOVvvI8OsEGfYrojAwJ9esutVeRHK-fBDHWj9DDvocvT3lAo5J-RORvlQ7cVi2qLz8XT_9j-TyefbS6HCh4HEUgDc0HDlMzcWdqAZDxcI'
const MINIMAX_API_URL = 'https://api.minimaxi.com/v1/chat/completions'

/**
 * AI增强单批动作（10个）
 */
async function enrichBatch(
  exercises: ProcessedExercise[]
): Promise<Array<{ name: string; instructionsZh: string; warnings: string[]; mistakes: string[] }>> {
  // 构建 prompt
  const exercisesText = exercises.map((ex, i) => {
    const muscles = [
      ...ex.primaryMuscles.map(m => `${m.code}(权重${m.ratio})`),
      ...ex.secondaryMuscles.map(m => `${m.code}(辅权重${m.ratio})`),
    ].join(', ')

    return `${i + 1}. ${ex.nameEn}
   肌肉: ${muscles}
   步骤: ${ex.instructions.substring(0, 200)}...`
  }).join('\n\n')

  const prompt = `请将以下健身动作翻译成中文并返回完整JSON（不要任何其他内容）：

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
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`MiniMax API 失败: ${response.status} - ${errorText}`)
      // 返回空结果
      return exercises.map(() => ({ name: '', instructionsZh: '', warnings: [], mistakes: [] }))
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; reply?: string }
    const content = data.choices?.[0]?.message?.content || data.reply || ''

    // 提取 JSON（移除思考标签）
    const thinkCloseIndex = content.indexOf('</think>')
    let jsonStr = content

    if (thinkCloseIndex !== -1) {
      jsonStr = content.substring(thinkCloseIndex + 8).trim()  // 8 = strlen('</think>')
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

    // 解析失败，返回空结果
    return exercises.map(() => ({ name: '', instructionsZh: '', warnings: [], mistakes: [] }))
  } catch (error) {
    console.warn(`MiniMax API 错误:`, error)
    return exercises.map(() => ({ name: '', instructionsZh: '', warnings: [], mistakes: [] }))
  }
}

/**
 * 生成中文动作说明（备用，当AI失败时）
 */
function generateChineseInstructions(exercise: ProcessedExercise): string {
  const lines = exercise.instructions.split('\n').filter(Boolean)
  const zhLines = lines.map((line, i) => `${i + 1}. ${line}`)
  return zhLines.join('\n')
}

/**
 * AI增强单个动作
 */
async function enrichExercise(
  exercise: ProcessedExercise
): Promise<EnrichedExercise> {
  const [result] = await enrichBatch([exercise])

  return {
    ...exercise,
    name: exercise.name,  // AI 填充中文名
    instructionsZh: result.instructionsZh || generateChineseInstructions(exercise),
    warnings: result.warnings,
    mistakes: result.mistakes,
    ossImages: [],
  }
}

/**
 * 批量AI增强
 */
async function enrichAll(
  exercises: ProcessedExercise[],
  onProgress?: (current: number, total: number) => void
): Promise<EnrichedExercise[]> {
  const results: EnrichedExercise[] = []

  // 分组并发处理：每次并发 CONCURRENCY 个批次，每个批次 BATCH_SIZE 个动作
  for (let batchGroupStart = 0; batchGroupStart < exercises.length; batchGroupStart += BATCH_SIZE * CONCURRENCY) {
    const concurrentPromises: Promise<EnrichedExercise[]>[] = []

    for (let j = 0; j < CONCURRENCY; j++) {
      const start = batchGroupStart + j * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, exercises.length)

      if (start >= exercises.length) break

      const batch = exercises.slice(start, end)
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

    const progress = Math.min(batchGroupStart + BATCH_SIZE * CONCURRENCY, exercises.length)
    onProgress?.(progress, exercises.length)
  }

  return results
}

/**
 * 转换为最终导入格式
 */
function toFinalExercise(enriched: EnrichedExercise) {
  return {
    name: enriched.name || enriched.nameEn,
    nameEn: enriched.nameEn,
    category: enriched.category,
    equipment: enriched.equipment,
    primaryMuscles: enriched.primaryMuscles,
    secondaryMuscles: enriched.secondaryMuscles,
    instructions: enriched.instructions,
    instructionsZh: enriched.instructionsZh || null,
    commonMistakes: enriched.mistakes.join('；') || null,
    warnings: enriched.warnings.join('；') || null,
    videoUrl: enriched.ossImages.join(',') || null,
    isCustom: false,
    isFavorite: false,
    userId: null,
  }
}

/**
 * 主函数
 */
async function enrich(): Promise<void> {
  // 加载转换后的数据
  const transformedPath = join(OUTPUT_DIR, 'exercises-transformed.json')
  if (!existsSync(transformedPath)) {
    console.error('请先运行 npm run transform')
    process.exit(1)
  }

  const content = await readFile(transformedPath, 'utf-8')
  const exercises: ProcessedExercise[] = JSON.parse(content)
  console.log(`加载 ${exercises.length} 个动作`)

  // 检查是否有已处理的数据，用于增量处理
  const processedPath = join(OUTPUT_DIR, 'exercises-processed.json')
  let existingProcessed: any[] = []
  let startIndex = 0

  if (existsSync(processedPath)) {
    try {
      const processedContent = await readFile(processedPath, 'utf-8')
      const processedData = JSON.parse(processedContent)
      if (processedData.exercises && Array.isArray(processedData.exercises)) {
        existingProcessed = processedData.exercises
        // 根据已处理的 nameEn 找出起始位置
        const processedNames = new Set(existingProcessed.map((e: any) => e.nameEn))
        for (let i = 0; i < exercises.length; i++) {
          if (!processedNames.has(exercises[i].nameEn)) {
            startIndex = i
            break
          }
          if (i === exercises.length - 1) {
            startIndex = exercises.length // 全部处理完了
          }
        }
        console.log(`发现已处理 ${existingProcessed.length} 条，从索引 ${startIndex} 继续`)
      }
    } catch (e) {
      console.warn('读取已处理数据失败，将从头开始')
    }
  }

  if (startIndex >= exercises.length) {
    console.log('所有动作已处理完成!')
    return
  }

  const remainingExercises = exercises.slice(startIndex)
  console.log(`剩余 ${remainingExercises.length} 个动作待处理`)

  console.log(`开始AI增强（每批${BATCH_SIZE}个，并发${CONCURRENCY}）...`)
  const enriched = await enrichAll(remainingExercises, (current, total) => {
    process.stdout.write(`\r进度: ${current}/${total}`)
  })

  console.log('\n转换最终格式...')
  const final = enriched.map(toFinalExercise)

  // 合并已有数据和新处理的数据
  const allProcessed = [...existingProcessed, ...final]

  // 保存
  await writeFile(
    join(OUTPUT_DIR, 'exercises-processed.json'),
    JSON.stringify({ exercises: allProcessed, generatedAt: new Date().toISOString() }, null, 2),
    'utf-8'
  )

  console.log(`\nAI增强完成! 本次新增 ${final.length} 条，总计 ${allProcessed.length} 条`)
}

// 如果直接运行此脚本
if (require.main === module) {
  enrich().catch(console.error)
}

export { enrich, enrichExercise, enrichAll, toFinalExercise }
