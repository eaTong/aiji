import { PrismaClient, ArticleType, ArticleStatus } from '@prisma/client'
import { success, fail } from '../../types'
import * as aiGatewayService from '../aiGatewayService'

const prisma = new PrismaClient()

// Categories
export async function getCategories(type?: string) {
  const where = type ? { type: type as ArticleType } : {}
  const categories = await prisma.articleCategory.findMany({
    where,
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { articles: true } } }
  })
  return success(categories)
}

export async function createCategory(data: { name: string; slug: string; type: string; parentId?: string; order?: number }) {
  const category = await prisma.articleCategory.create({
    data: {
      name: data.name,
      slug: data.slug,
      type: data.type as ArticleType,
      parentId: data.parentId,
      order: data.order || 0
    }
  })
  return success(category)
}

export async function updateCategory(id: string, data: { name?: string; slug?: string; order?: number }) {
  const category = await prisma.articleCategory.update({ where: { id }, data })
  return success(category)
}

export async function deleteCategory(id: string) {
  await prisma.articleCategory.delete({ where: { id } })
  return success(null)
}

// Articles
export async function getArticles(params: {
  page: number
  pageSize: number
  categoryId?: string
  type?: string
  status?: string
  keyword?: string
}) {
  const { page = 1, pageSize = 20, categoryId, type, status, keyword } = params
  const where: any = {}
  if (categoryId) where.categoryId = categoryId
  if (type) where.type = type as ArticleType
  if (status) where.status = status as ArticleStatus
  if (keyword) where.title = { contains: keyword }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      include: { category: true, author: true }
    }),
    prisma.article.count({ where })
  ])

  return success({ articles, total, page, pageSize })
}

export async function getArticleById(id: string) {
  const article = await prisma.article.findUnique({
    where: { id },
    include: { category: true, author: true, versions: { orderBy: { version: 'desc' }, take: 5 } }
  })
  if (!article) return fail('文章不存在', 404)
  return success(article)
}

export async function createArticle(data: {
  title: string
  slug: string
  categoryId: string
  type: string
  content: string
  summary?: string
  coverImage?: string
  tags?: string[]
}) {
  const article = await prisma.article.create({
    data: {
      title: data.title,
      slug: data.slug,
      categoryId: data.categoryId,
      type: data.type as ArticleType,
      content: data.content,
      summary: data.summary,
      coverImage: data.coverImage,
      tags: data.tags || []
    }
  })
  return success(article)
}

export async function updateArticle(id: string, data: any, adminId: string) {
  const article = await prisma.article.findUnique({ where: { id } })
  if (!article) return fail('文章不存在', 404)

  await prisma.articleVersion.create({
    data: {
      articleId: id,
      version: 1,
      title: article.title,
      content: article.content,
      changedBy: adminId,
      changeNote: 'Admin update'
    }
  })

  const updated = await prisma.article.update({
    where: { id },
    data: {
      title: data.title,
      slug: data.slug,
      categoryId: data.categoryId,
      content: data.content,
      summary: data.summary,
      coverImage: data.coverImage,
      tags: data.tags
    }
  })
  return success(updated)
}

export async function publishArticle(id: string) {
  const article = await prisma.article.update({
    where: { id },
    data: { status: 'PUBLISHED', publishedAt: new Date() }
  })
  return success(article)
}

export async function deleteArticle(id: string) {
  await prisma.article.delete({ where: { id } })
  return success(null)
}

export async function generateArticleContent(prompt: string) {
  // 检查 AI 服务是否可用
  if (!aiGatewayService.isAIServiceAvailable()) {
    return success({ content: 'AI 服务未配置，请联系管理员配置 AI_API_KEY' })
  }

  // 调用 AI Gateway Service 生成内容
  const response = await aiGatewayService.callAI({
    userId: 'system',
    message: prompt,
    intent: 'CHITCHAT'
  })

  if (response.error) {
    return success({ content: `AI 生成失败: ${response.error}` })
  }

  return success({ content: response.content })
}

// Contributions
export async function getContributions(params: { page: number; pageSize: number; status?: string }) {
  const { page = 1, pageSize = 20, status } = params
  const where = status ? { status: status as any } : {}

  const [contributions, total] = await Promise.all([
    prisma.userContribution.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { user: true, article: true }
    }),
    prisma.userContribution.count({ where })
  ])

  return success({ contributions, total, page, pageSize })
}

export async function reviewContribution(id: string, adminId: string, approved: boolean, note?: string) {
  const contribution = await prisma.userContribution.update({
    where: { id },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      reviewerId: adminId,
      reviewNote: note,
      reviewedAt: new Date()
    },
    include: { article: true }
  })

  if (approved && contribution.articleId) {
    const originalArticle = await prisma.article.findUnique({ where: { id: contribution.articleId } })
    if (originalArticle) {
      await prisma.article.update({
        where: { id: contribution.articleId },
        data: { title: contribution.title || originalArticle.title, content: contribution.content }
      })
    }
  }

  return success(contribution)
}

// Stats
export async function getKnowledgeStats() {
  const [totalArticles, publishedArticles, pendingContributions, totalViews] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { status: 'PUBLISHED' } }),
    prisma.userContribution.count({ where: { status: 'PENDING' } }),
    prisma.article.aggregate({ _sum: { viewCount: true } })
  ])

  return success({
    totalArticles,
    publishedArticles,
    pendingContributions,
    totalViews: totalViews._sum.viewCount || 0
  })
}
