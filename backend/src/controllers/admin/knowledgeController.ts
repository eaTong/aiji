import { Context } from 'koa'
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getArticles, getArticleById, createArticle, updateArticle, publishArticle, deleteArticle,
  generateArticleContent,
  getContributions, reviewContribution,
  getKnowledgeStats
} from '../../services/admin/knowledgeService'

// Categories
export async function listCategories(ctx: Context) {
  const { type } = ctx.query as { type?: string }
  const result = await getCategories(type)
  ctx.body = result
}

export async function create(ctx: Context) {
  const data = ctx.request.body as any
  const result = await createCategory(data)
  ctx.status = result.code === 0 ? 201 : result.code
  ctx.body = result
}

export async function update(ctx: Context) {
  const { id } = ctx.params
  const data = ctx.request.body as any
  const result = await updateCategory(id, data)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function remove(ctx: Context) {
  const { id } = ctx.params
  const result = await deleteCategory(id)
  ctx.status = result.code === 0 ? 204 : result.code
  ctx.body = result
}

// Articles
export async function listArticles(ctx: Context) {
  const { page, pageSize, categoryId, type, status, keyword } = ctx.query as any
  const result = await getArticles({
    page: parseInt(page) || 1,
    pageSize: parseInt(pageSize) || 20,
    categoryId,
    type,
    status,
    keyword
  })
  ctx.body = result
}

export async function getArticle(ctx: Context) {
  const { id } = ctx.params
  const result = await getArticleById(id)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function createArticleHandler(ctx: Context) {
  const data = ctx.request.body as any
  const result = await createArticle(data)
  ctx.status = result.code === 0 ? 201 : result.code
  ctx.body = result
}

export async function updateArticleHandler(ctx: Context) {
  const { id } = ctx.params
  const data = ctx.request.body as any
  const adminId = ctx.state.admin?.adminId
  const result = await updateArticle(id, data, adminId)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function publish(ctx: Context) {
  const { id } = ctx.params
  const result = await publishArticle(id)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function deleteArticleHandler(ctx: Context) {
  const { id } = ctx.params
  const result = await deleteArticle(id)
  ctx.status = result.code === 0 ? 204 : result.code
  ctx.body = result
}

export async function aiGenerate(ctx: Context) {
  const { prompt } = ctx.request.body as { prompt?: string }
  if (!prompt) {
    ctx.status = 400
    ctx.body = { code: 400, message: 'prompt 不能为空', data: null }
    return
  }
  const result = await generateArticleContent(prompt)
  ctx.body = result
}

// Contributions
export async function listContributions(ctx: Context) {
  const { page, pageSize, status } = ctx.query as any
  const result = await getContributions({
    page: parseInt(page) || 1,
    pageSize: parseInt(pageSize) || 20,
    status
  })
  ctx.body = result
}

export async function review(ctx: Context) {
  const { id } = ctx.params
  const { approved, note } = ctx.request.body as { approved?: boolean; note?: string }
  const adminId = ctx.state.admin?.adminId
  const result = await reviewContribution(id, adminId, approved ?? false, note)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

// Stats
export async function stats(ctx: Context) {
  const result = await getKnowledgeStats()
  ctx.body = result
}
