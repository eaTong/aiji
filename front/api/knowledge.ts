import { request } from './request'

export interface Article {
  id: string
  title: string
  slug: string
  type: string
  summary: string | null
  coverImage: string | null
  viewCount: number
  likeCount: number
  isPinned: boolean
  tags: string[]
  publishedAt: string | null
  category: { id: string; name: string; slug: string }
  author: { id: string; nickname: string | null } | null
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  slug: string
  type: string
  order: number
}

export const knowledgeApi = {
  getArticles(params: { page?: number; pageSize?: number; type?: string; keyword?: string }) {
    return request<{ articles: Article[]; total: number; page: number; pageSize: number }>('GET', '/knowledge/articles', params)
  },

  getArticle(id: string) {
    return request<Article>('GET', `/knowledge/articles/${id}`)
  },

  getCategories(type?: string) {
    return request<Category[]>('GET', '/knowledge/categories', type ? { type } : undefined)
  },

  likeArticle(id: string) {
    return request<void>('POST', `/knowledge/articles/${id}/like`)
  },

  contribute(data: { articleId?: string; title?: string; content: string }) {
    return request<void>('POST', '/knowledge/contribute', data)
  }
}
