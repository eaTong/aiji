import request from 'supertest'
import app from '../../src/app'
import { prisma, trackUser } from '../setup'

async function makeAdminAuth() {
  const loginRes = await request(app.callback())
    .post('/admin/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
  return loginRes.body.data.token as string
}

describe('GET /admin/api/knowledge/categories', () => {
  let token: string

  beforeAll(async () => {
    token = await makeAdminAuth()
  })

  it('should return all categories', async () => {
    const res = await request(app.callback())
      .get('/admin/api/knowledge/categories')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('should filter categories by type', async () => {
    const res = await request(app.callback())
      .get('/admin/api/knowledge/categories?type=KNOWLEDGE')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
  })

  it('should return 401 without auth', async () => {
    const res = await request(app.callback())
      .get('/admin/api/knowledge/categories')

    expect(res.status).toBe(401)
  })
})

describe('GET /admin/api/knowledge/articles', () => {
  let token: string

  beforeAll(async () => {
    token = await makeAdminAuth()
  })

  it('should return paginated articles', async () => {
    const res = await request(app.callback())
      .get('/admin/api/knowledge/articles?page=1&pageSize=10')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.articles).toBeDefined()
    expect(res.body.data.total).toBeDefined()
  })

  it('should filter articles by type', async () => {
    const res = await request(app.callback())
      .get('/admin/api/knowledge/articles?type=KNOWLEDGE')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
  })

  it('should search articles by keyword', async () => {
    const res = await request(app.callback())
      .get('/admin/api/knowledge/articles?keyword=test')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
  })
})

describe('GET /admin/api/knowledge/stats', () => {
  let token: string

  beforeAll(async () => {
    token = await makeAdminAuth()
  })

  it('should return knowledge statistics', async () => {
    const res = await request(app.callback())
      .get('/admin/api/knowledge/stats')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.totalArticles).toBeDefined()
    expect(res.body.data.publishedArticles).toBeDefined()
    expect(res.body.data.pendingContributions).toBeDefined()
    expect(res.body.data.totalViews).toBeDefined()
  })
})

describe('GET /admin/api/knowledge/contributions', () => {
  let token: string

  beforeAll(async () => {
    token = await makeAdminAuth()
  })

  it('should return paginated contributions', async () => {
    const res = await request(app.callback())
      .get('/admin/api/knowledge/contributions?page=1&pageSize=10')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.contributions).toBeDefined()
    expect(res.body.data.total).toBeDefined()
  })

  it('should filter contributions by status', async () => {
    const res = await request(app.callback())
      .get('/admin/api/knowledge/contributions?status=PENDING')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
  })
})

describe('POST /admin/api/knowledge/articles/:id/ai-generate', () => {
  let token: string

  beforeAll(async () => {
    token = await makeAdminAuth()
  })

  it('should return generated content placeholder', async () => {
    // First create an article to get an ID
    const createRes = await request(app.callback())
      .post('/admin/api/knowledge/articles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '测试文章',
        slug: 'test-article',
        categoryId: 'test-category-id',
        type: 'KNOWLEDGE',
        content: '测试内容'
      })

    const articleId = createRes.body?.data?.id || 'test-id'

    const res = await request(app.callback())
      .post(`/admin/api/knowledge/articles/${articleId}/ai-generate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: '生成一篇关于增肌的文章' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.content).toBeDefined()
  })
})
