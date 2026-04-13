/**
 * 小批量 AI Enrich 测试脚本
 * 只处理前 10 个动作验证流程
 */

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { ProcessedExercise, EnrichedExercise } from './types'

const CWD = process.cwd()
const OUTPUT_DIR = join(CWD, 'output')
const BATCH_SIZE = 10

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
   肌肉: ${muscles}
   步骤: ${ex.instructions.substring(0, 150)}...`
  }).join('\n\n')

  const prompt = `请将以下健身动作翻译成中文并返回完整JSON（不要任何其他内容）：

${exercisesText}

请直接返回JSON数组（不要任何其他内容）：
[{"name":"中文名称1","instructionsZh":"中文步骤说明","warnings":["注意事项1","注意事项2"],"mistakes":["易错点1","易错点2"]},...]`

  console.log('\n=== Prompt 预览 ===')
  console.log(prompt.substring(0, 500) + '...\n')

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
      console.warn(`API 失败: ${response.status} - ${errorText}`)
      return exercises.map(() => ({ name: '', instructionsZh: '', warnings: [], mistakes: [] }))
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; reply?: string }
    const content = data.choices?.[0]?.message?.content || data.reply || ''

    console.log('\n=== API 响应 ===')
    console.log(content.substring(0, 800) + '...\n')

    const thinkCloseIndex = content.indexOf('</think>')
    let jsonStr = content

    if (thinkCloseIndex !== -1) {
      jsonStr = content.substring(thinkCloseIndex + 8).trim()
    }

    jsonStr = jsonStr.replace(/```json\n?/, '').replace(/```\n?$/, '').trim()

    // 尝试找到完整的 JSON 数组
    const arrayStart = jsonStr.indexOf('[')
    const arrayEnd = jsonStr.lastIndexOf(']')

    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      const trimmedJson = jsonStr.substring(arrayStart, arrayEnd + 1)
      try {
        const results = JSON.parse(trimmedJson)
        if (Array.isArray(results)) {
          console.log('\n=== JSON 解析成功 ===')
          return results.slice(0, exercises.length).map((r: any) => ({
            name: r.name || '',
            instructionsZh: r.instructionsZh || '',
            warnings: Array.isArray(r.warnings) ? r.warnings : [],
            mistakes: Array.isArray(r.mistakes) ? r.mistakes : [],
          }))
        }
      } catch (e) {
        console.warn('JSON 数组解析失败:', e.message)
        console.log('原始内容:', trimmedJson.substring(0, 500))
      }
    } else {
      console.warn('未找到有效的 JSON 数组')
      console.log('内容:', jsonStr.substring(0, 500))
    }
  } catch (error) {
    console.error('API 错误:', error)
  }

  return exercises.map(() => ({ name: '', instructionsZh: '', warnings: [], mistakes: [] }))
}

async function testEnrich(): Promise<void> {
  const transformedPath = join(OUTPUT_DIR, 'exercises-transformed.json')
  if (!existsSync(transformedPath)) {
    console.error('请先运行 npm run transform')
    process.exit(1)
  }

  const content = await readFile(transformedPath, 'utf-8')
  const exercises: ProcessedExercise[] = JSON.parse(content)

  // 只取前 3 个
  const testExercises = exercises.slice(0, 3)
  console.log(`测试: 处理 ${testExercises.length} 个动作\n`)

  const results = await enrichBatch(testExercises)

  console.log('\n=== 解析结果 ===')
  results.forEach((r, i) => {
    console.log(`\n动作 ${i + 1}:`)
    console.log(`  中文名: ${r.name}`)
    console.log(`  说明: ${r.instructionsZh.substring(0, 100)}...`)
    console.log(`  注意事项: ${r.warnings.join(', ')}`)
    console.log(`  易错点: ${r.mistakes.join(', ')}`)
  })

  // 保存测试结果
  await writeFile(
    join(OUTPUT_DIR, 'test-enriched.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  )
  console.log('\n\n测试结果已保存: output/test-enriched.json')
}

testEnrich().catch(console.error)
