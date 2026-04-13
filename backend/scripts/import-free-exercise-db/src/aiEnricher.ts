import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { ProcessedExercise, EnrichedExercise, WebSearchResult } from './types'

const CWD = process.cwd()
const OUTPUT_DIR = join(CWD, 'output')
const CONCURRENCY = 5

/**
 * 搜索动作的注意事项和易错点
 */
async function searchExerciseInfo(
  exercise: ProcessedExercise
): Promise<{ warnings: string[]; mistakes: string[] }> {
  const query = `${exercise.nameEn} exercise form tips mistakes warnings`

  try {
    const results = await webSearch(query)

    // 提取注意事项
    const warnings = extractWarnings(results)
    // 提取易错点
    const mistakes = extractMistakes(results)

    return { warnings, mistakes }
  } catch (error) {
    console.warn(`搜索失败 ${exercise.nameEn}:`, error)
    return { warnings: [], mistakes: [] }
  }
}

/**
 * WebSearch 封装
 */
async function webSearch(query: string): Promise<WebSearchResult[]> {
  // 使用 DuckDuckGo HTML 版本
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })

    const html = await response.text()

    // 解析搜索结果
    const results: WebSearchResult[] = []
    const resultRegex = /<a class="result__a" href="([^"]+)">([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)</g

    let match
    while ((match = resultRegex.exec(html)) !== null && results.length < 10) {
      const link = match[1]
      const title = match[2].replace(/<[^>]+>/g, '').trim()
      const snippet = match[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

      if (title && link && snippet) {
        results.push({ title, url: link, snippet })
      }
    }

    return results
  } catch (error) {
    console.warn(`搜索请求失败: ${query}`, error)
    return []
  }
}

/**
 * 从搜索结果中提取注意事项
 */
function extractWarnings(results: WebSearchResult[]): string[] {
  const warnings: string[] = []

  const patterns = [
    /warning[s]?:?\s*([^.]+)/gi,
    /tip[s]?:?\s*([^.]+)/gi,
    /safety[s]?:?\s*([^.]+)/gi,
    /注意[s]?:?\s*([^。]+)/g,
    /安全[s]?:?\s*([^。]+)/g,
  ]

  for (const result of results) {
    const content = result.snippet
    for (const pattern of patterns) {
      const matches = content.matchAll(new RegExp(pattern.source, pattern.flags))
      for (const match of matches) {
        const text = match[1].trim()
        if (text.length > 10 && text.length < 200) {
          warnings.push(text)
        }
      }
    }
  }

  return [...new Set(warnings)].slice(0, 5)
}

/**
 * 从搜索结果中提取易错点
 */
function extractMistakes(results: WebSearchResult[]): string[] {
  const mistakes: string[] = []

  const patterns = [
    /common\s+mistake[s]?:?\s*([^.]+)/gi,
    /error[s]?:?\s*([^.]+)/gi,
    /avoid\s+([^.]+)/gi,
    /don'?t\s+([^.]+)/gi,
    /易错[s]?:?\s*([^。]+)/g,
    /错误[s]?:?\s*([^。]+)/g,
    /不要[s]?:?\s*([^。]+)/g,
  ]

  for (const result of results) {
    const content = result.snippet
    for (const pattern of patterns) {
      const matches = content.matchAll(new RegExp(pattern.source, pattern.flags))
      for (const match of matches) {
        const text = match[1].trim()
        if (text.length > 10 && text.length < 200) {
          mistakes.push(text)
        }
      }
    }
  }

  return [...new Set(mistakes)].slice(0, 5)
}

/**
 * 生成中文动作说明
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
  // 搜索网络信息
  const searchResult = await searchExerciseInfo(exercise)

  return {
    sourceId: exercise.sourceId,
    name: exercise.nameEn,  // 暂用英文名，AI翻译后替换
    nameEn: exercise.nameEn,
    category: exercise.category,
    equipment: exercise.equipment,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    instructions: exercise.instructions,
    level: exercise.level,
    images: exercise.images,
    instructionsZh: generateChineseInstructions(exercise),
    warnings: searchResult.warnings,
    mistakes: searchResult.mistakes,
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

  for (let i = 0; i < exercises.length; i += CONCURRENCY) {
    const batch = exercises.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(enrichExercise))
    results.push(...batchResults)

    onProgress?.(Math.min(i + CONCURRENCY, exercises.length), exercises.length)
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
    instructions: enriched.instructionsZh || enriched.instructions,
    commonMistakes: enriched.mistakes.join('；') || null,
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

  console.log('开始AI增强...')
  const enriched = await enrichAll(exercises, (current, total) => {
    process.stdout.write(`\r进度: ${current}/${total}`)
  })

  console.log('\n转换最终格式...')
  const final = enriched.map(toFinalExercise)

  // 保存
  await writeFile(
    join(OUTPUT_DIR, 'exercises-processed.json'),
    JSON.stringify({ exercises: final, generatedAt: new Date().toISOString() }, null, 2),
    'utf-8'
  )

  console.log('\nAI增强完成!')
}

// 如果直接运行此脚本
if (require.main === module) {
  enrich().catch(console.error)
}

export { enrich, enrichExercise, enrichAll, toFinalExercise }
