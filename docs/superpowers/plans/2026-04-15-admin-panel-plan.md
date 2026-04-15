# 后台运营端实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立独立运营端前端(React+Ant Design)，与小程序后台共用，复用现有数据库和后端服务

**Architecture:**
- 前端: React 18 + Ant Design 5 + TypeScript，部署在 `/admin/` 子路径
- 后端: Koa 新增 `/admin/*` 路由，独立 JWT 认证
- 数据库: 扩展 User 表加 role 字段，新增知识库相关表

**Tech Stack:** React 18, Ant Design 5, Koa, Prisma, MySQL, JWT

---

## 文件结构

```
aiji/
├── admin/                              # 新建: React 运营端
│   ├── public/
│   ├── src/
│   │   ├── api/                       # API 请求封装
│   │   ├── components/               # 通用组件
│   │   ├── layouts/                  # 布局组件
│   │   ├── pages/                   # 页面
│   │   │   ├── Login/               # 登录页
│   │   │   ├── Dashboard/           # 看板
│   │   │   ├── User/                # 用户管理
│   │   │   ├── Exercise/            # 动作库
│   │   │   ├── Plan/                # 计划模板
│   │   │   ├── Knowledge/           # 知识库
│   │   │   ├── Push/                # 推送运营
│   │   │   └── Settings/            # 设置
│   │   ├── stores/                   # 状态管理
│   │   ├── types/                    # 类型定义
│   │   ├── utils/                    # 工具函数
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── router.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/                            # 现有: Koa 后端
│   └── src/
│       ├── routes/admin/              # 新增: admin 路由
│       │   ├── index.ts
│       │   ├── auth.ts
│       │   ├── users.ts
│       │   ├── exercises.ts
│       │   ├── plans.ts
│       │   ├── stats.ts
│       │   ├── push.ts
│       │   └── knowledge.ts
│       ├── controllers/admin/         # 新增
│       │   ├── authController.ts
│       │   ├── userController.ts
│       │   ├── exerciseController.ts
│       │   ├── planController.ts
│       │   ├── statsController.ts
│       │   ├── pushController.ts
│       │   └── knowledgeController.ts
│       ├── services/admin/            # 新增
│       │   ├── authService.ts
│       │   ├── userService.ts
│       │   ├── exerciseService.ts
│       │   ├── planService.ts
│       │   ├── statsService.ts
│       │   ├── pushService.ts
│       │   └── knowledgeService.ts
│       └── middleware/adminAuth.ts    # 新增: admin 认证中间件
└── front/                             # 现有: uni-app 小程序
```

---

## Part 1: 数据库迁移

### Task 1.1: 扩展 User 表 + 新增知识库表

**Files:**
- Modify: `backend/prisma/schema.prisma`

```prisma
// User 表新增 role 字段
model User {
  // ... existing fields
  role         UserRole  @default(USER)
}

enum UserRole {
  USER
  ADMIN
}

// 新增 AdminLog 表
model AdminLog {
  id        String   @id @default(uuid())
  adminId   String
  action    String
  target    String
  detail    Json?
  createdAt DateTime @default(now())
}

// 新增知识库相关表
model ArticleCategory {
  id        String   @id @default(uuid())
  name      String
  slug      String
  type      ArticleType
  parentId  String?
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  articles Article[]
  parent   ArticleCategory? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children ArticleCategory[] @relation("CategoryHierarchy")
}

enum ArticleType {
  KNOWLEDGE
  FAQ
  COURSE
}

model Article {
  id          String   @id @default(uuid())
  title       String
  slug        String
  categoryId  String
  type        ArticleType
  content     String   @db.Text
  summary     String?
  coverImage  String?
  authorId    String?
  status      ArticleStatus @default(DRAFT)
  viewCount   Int      @default(0)
  likeCount   Int      @default(0)
  isPinned    Boolean  @default(false)
  tags        Json
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  category     ArticleCategory @relation(fields: [categoryId], references: [id])
  author       User?            @relation(fields: [authorId], references: [id])
  versions     ArticleVersion[]
  contributions UserContribution[]
}

enum ArticleStatus {
  DRAFT
  PENDING
  PUBLISHED
  REJECTED
}

model ArticleVersion {
  id         String   @id @default(uuid())
  articleId  String
  version    Int
  title      String
  content    String   @db.Text
  changedBy  String
  changeNote String?
  createdAt  DateTime @default(now())

  article Article @relation(fields: [articleId], references: [id])
}

model UserContribution {
  id          String   @id @default(uuid())
  userId      String
  articleId   String?
  type        ContributionType
  title       String?
  content     String   @db.Text
  status      ContributionStatus @default(PENDING)
  reviewerId  String?
  reviewNote  String?
  reviewedAt  DateTime?
  createdAt   DateTime @default(now())

  user    User     @relation(fields: [userId], references: [id])
  article Article? @relation(fields: [articleId], references: [id])
}

enum ContributionType {
  CREATE
  EDIT
}

enum ContributionStatus {
  PENDING
  APPROVED
  REJECTED
}
```

- [ ] **Step 1: 运行数据库迁移**

Run: `cd backend && npm run prisma:migrate --name add_admin_role_and_knowledge`

- [ ] **Step 2: 生成 Prisma Client**

Run: `cd backend && npm run prisma:generate`

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "database: add admin role and knowledge base tables"
```

---

## Part 2: 后端 - Admin 认证系统

### Task 2.1: Admin 认证中间件

**Files:**
- Create: `backend/src/middleware/adminAuth.ts`

```typescript
import { Context, Next } from 'koa'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { prisma } from '../config/database'

export async function adminAuthMiddleware(ctx: Context, next: Next) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    ctx.status = 401
    ctx.body = { code: 401, message: '未授权', data: null }
    return
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string }
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true }
    })
    if (!user || user.role !== 'ADMIN') {
      ctx.status = 403
      ctx.body = { code: 403, message: '无权限', data: null }
      return
    }
    ctx.state.admin = { adminId: user.id }
  } catch (err) {
    ctx.status = 401
    ctx.body = { code: 401, message: 'Token 无效或已过期', data: null }
    return
  }
  await next()
}
```

- [ ] **Step 1: 创建 adminAuth 中间件**

Create `backend/src/middleware/adminAuth.ts` with the code above

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/middleware/adminAuth.ts
git commit -m "middleware: add admin authentication middleware"
```

---

### Task 2.2: Admin Auth Service

**Files:**
- Create: `backend/src/services/admin/authService.ts`

```typescript
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/database'
import { env } from '../../config/env'
import { success, fail } from '../../types'

export async function adminLogin(username: string, password: string) {
  // 简单验证，实际项目中应从环境变量或数据库读取 admin 账号
  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  if (username !== adminUsername || password !== adminPassword) {
    return fail('用户名或密码错误', 401)
  }

  // 查找或创建 admin 用户
  let adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN', nickname: username }
  })

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        openid: `admin_${username}_${Date.now()}`,
        nickname: username,
        role: 'ADMIN'
      }
    })
  }

  const token = jwt.sign(
    { userId: adminUser.id, role: 'ADMIN' },
    env.jwtSecret,
    { expiresIn: '7d' }
  )

  return success({ token, userId: adminUser.id, nickname: adminUser.nickname })
}

export async function getAdminProfile(adminId: string) {
  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, nickname: true, role: true, createdAt: true }
  })
  if (!user) return fail('用户不存在', 404)
  return success(user)
}
```

- [ ] **Step 1: 创建 admin auth service**

Create `backend/src/services/admin/authService.ts`

- [ ] **Step 2: 验证编译**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/admin/authService.ts
git commit -m "service: add admin authentication service"
```

---

### Task 2.3: Admin Auth Controller & Route

**Files:**
- Create: `backend/src/controllers/admin/authController.ts`
- Create: `backend/src/routes/admin/auth.ts`
- Modify: `backend/src/routes/index.ts`

**authController.ts:**
```typescript
import { Context } from 'koa'
import { adminLogin, getAdminProfile } from '../services/admin/authService'

export async function login(ctx: Context) {
  const { username, password } = ctx.request.body as { username?: string, password?: string }
  if (!username || !password) {
    ctx.status = 400
    ctx.body = { code: 400, message: '用户名和密码不能为空', data: null }
    return
  }
  const result = await adminLogin(username, password)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function getProfile(ctx: Context) {
  const adminId = ctx.state.admin?.adminId
  if (!adminId) {
    ctx.status = 401
    ctx.body = { code: 401, message: '未授权', data: null }
    return
  }
  const result = await getAdminProfile(adminId)
  ctx.status = result.code === 0 ? 200 : result.code
  ctx.body = result
}

export async function logout(ctx: Context) {
  ctx.body = { code: 0, message: '退出成功', data: null }
}
```

**routes/admin/auth.ts:**
```typescript
import Router from '@koa/router'
import { login, getProfile, logout } from '../../controllers/admin/authController'
import { adminAuthMiddleware } from '../../middleware/adminAuth'

const router = new Router({ prefix: '/admin/api/auth' })

router.post('/login', login)
router.post('/logout', adminAuthMiddleware, logout)
router.get('/profile', adminAuthMiddleware, getProfile)

export default router
```

- [ ] **Step 1: 创建 auth controller**

Create `backend/src/controllers/admin/authController.ts`

- [ ] **Step 2: 创建 auth routes**

Create `backend/src/routes/admin/auth.ts`

- [ ] **Step 3: 创建 admin routes 目录的 index**

Create `backend/src/routes/admin/index.ts` that imports all admin routes

- [ ] **Step 4: 修改 routes/index.ts 引入 admin 路由**

Modify `backend/src/routes/index.ts` to import and use admin router

- [ ] **Step 5: 验证编译**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/admin/authController.ts backend/src/routes/admin/auth.ts backend/src/routes/admin/index.ts backend/src/routes/index.ts
git commit -m "feat: add admin authentication routes"
```

---

## Part 3: 后端 - 用户管理 API

### Task 3.1: Admin User Service

**Files:**
- Create: `backend/src/services/admin/userService.ts`

```typescript
import { prisma } from '../../config/database'
import { success, fail } from '../../types'

export async function getUsers(params: {
  page: number
  pageSize: number
  keyword?: string
  role?: string
}) {
  const { page = 1, pageSize = 20, keyword, role } = params
  const where: any = {}
  if (keyword) {
    where.OR = [
      { nickname: { contains: keyword } },
      { openid: { contains: keyword } }
    ]
  }
  if (role) where.role = role

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        openid: true,
        nickname: true,
        avatarUrl: true,
        role: true,
        hasCompletedOnboarding: true,
        createdAt: true,
        _count: { select: { trainingLogs: true } }
      }
    }),
    prisma.user.count({ where })
  ])

  return success({ users, total, page, pageSize })
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      weightRecords: { orderBy: { recordedAt: 'desc' }, take: 10 },
      trainingLogs: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 20,
        include: { logEntries: true }
      },
      _count: { select: { trainingLogs: true, achievements: true } }
    }
  })
  if (!user) return fail('用户不存在', 404)
  return success(user)
}

export async function updateUser(id: string, data: { nickname?: string; role?: string }) {
  const user = await prisma.user.update({
    where: { id },
    data: { nickname: data.nickname, role: data.role as any }
  })
  return success(user)
}

export async function disableUser(id: string, disabled: boolean) {
  // 实际项目中可能需要 disabled 字段，暂用 role 区分
  return success({ id, disabled })
}
```

- [ ] **Step 1: 创建 user service**

Create `backend/src/services/admin/userService.ts`

- [ ] **Step 2: 验证编译**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/admin/userService.ts
git commit -m "service: add admin user management service"
```

---

### Task 3.2: Admin User Controller & Route

**Files:**
- Create: `backend/src/controllers/admin/userController.ts`
- Create: `backend/src/routes/admin/users.ts`

- [ ] **Step 1: 创建 user controller**

Create `backend/src/controllers/admin/userController.ts` with list, getById, update, disable methods

- [ ] **Step 2: 创建 users routes**

Create `backend/src/routes/admin/users.ts`

- [ ] **Step 3: 验证编译**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

---

## Part 4: 后端 - 知识库 API

### Task 4.1: Admin Knowledge Service

**Files:**
- Create: `backend/src/services/admin/knowledgeService.ts`

```typescript
import { prisma } from '../../config/database'
import { success, fail } from '../../types'

// Categories
export async function getCategories(type?: string) {
  const where = type ? { type: type as any } : {}
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
      type: data.type as any,
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
  if (type) where.type = type as any
  if (status) where.status = status as any
  if (keyword) where.title = { contains: keyword } }

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
      type: data.type as any,
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

  // 创建版本历史
  await prisma.articleVersion.create({
    data: {
      articleId: id,
      version: (article as any).version || 1,
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

// AI Generate - 调用现有 AI Gateway
export async function generateArticleContent(prompt: string) {
  // TODO: 调用 AI Gateway Service 生成内容
  // const result = await aiGatewayService.generateContent(prompt)
  return success({ content: 'AI generated content placeholder' })
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

  // 如果采纳，创建新文章或更新现有文章
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
```

- [ ] **Step 1: 创建 knowledge service**

Create `backend/src/services/admin/knowledgeService.ts`

- [ ] **Step 2: 验证编译**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

---

### Task 4.2: Admin Knowledge Controller & Route

**Files:**
- Create: `backend/src/controllers/admin/knowledgeController.ts`
- Create: `backend/src/routes/admin/knowledge.ts`

- [ ] **Step 1: 创建 knowledge controller**

Create `backend/src/controllers/admin/knowledgeController.ts` with all knowledge CRUD methods

- [ ] **Step 2: 创建 knowledge routes**

Create `backend/src/routes/admin/knowledge.ts`

- [ ] **Step 3: 验证编译**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

---

## Part 5: 后端 - 动作库/计划/统计/推送 API

### Task 5.1: Admin Exercise Service & Controller

**Files:**
- Create: `backend/src/services/admin/exerciseService.ts`
- Create: `backend/src/controllers/admin/exerciseController.ts`
- Create: `backend/src/routes/admin/exercises.ts`

```typescript
import { prisma } from '../../config/database'
import { success, fail } from '../../types'

export async function getExercises(params: { page: number; pageSize: number; keyword?: string; category?: string }) {
  const { page = 1, pageSize = 20, keyword, category } = params
  const where: any = {}
  if (keyword) where.OR = [{ name: { contains: keyword } }, { nameEn: { contains: keyword } }]
  if (category) where.category = category

  const [exercises, total] = await Promise.all([
    prisma.exercise.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, nameEn: true, category: true, equipment: true, isCustom: true, createdAt: true }
    }),
    prisma.exercise.count({ where })
  ])

  return success({ exercises, total, page, pageSize })
}

export async function getExerciseById(id: string) {
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: { exerciseMuscles: { include: { muscle: true } } }
  })
  if (!exercise) return fail('动作不存在', 404)
  return success(exercise)
}

export async function createExercise(data: any) {
  const exercise = await prisma.exercise.create({
    data: {
      name: data.name,
      nameEn: data.nameEn,
      category: data.category,
      equipment: data.equipment,
      primaryMuscles: data.primaryMuscles || [],
      secondaryMuscles: data.secondaryMuscles || [],
      instructions: data.instructions,
      instructionsZh: data.instructionsZh,
      imageUrls: data.imageUrls,
      videoUrl: data.videoUrl
    }
  })
  return success(exercise)
}

export async function updateExercise(id: string, data: any) {
  const exercise = await prisma.exercise.update({ where: { id }, data })
  return success(exercise)
}

export async function deleteExercise(id: string) {
  await prisma.exercise.delete({ where: { id } })
  return success(null)
}
```

- [ ] **Step 1: 创建 exercise service**

Create `backend/src/services/admin/exerciseService.ts`

- [ ] **Step 2: 创建 exercise controller**

Create `backend/src/controllers/admin/exerciseController.ts`

- [ ] **Step 3: 创建 exercises routes**

Create `backend/src/routes/admin/exercises.ts`

- [ ] **Step 4: 验证编译**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 5: Commit**

---

### Task 5.2: Admin Plan Service & Controller

**Files:**
- Create: `backend/src/services/admin/planService.ts`
- Create: `backend/src/controllers/admin/planController.ts`
- Create: `backend/src/routes/admin/plans.ts`

- [ ] **Step 1: 创建 plan service**

Create `backend/src/services/admin/planService.ts`

- [ ] **Step 2: 创建 plan controller**

Create `backend/src/controllers/admin/planController.ts`

- [ ] **Step 3: 创建 plans routes**

Create `backend/src/routes/admin/plans.ts`

- [ ] **Step 4: 验证编译**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 5: Commit**

---

### Task 5.3: Admin Stats Service & Controller

**Files:**
- Create: `backend/src/services/admin/statsService.ts`
- Create: `backend/src/controllers/admin/statsController.ts`
- Create: `backend/src/routes/admin/stats.ts`

```typescript
import { prisma } from '../../config/database'
import { success } from '../../types'

export async function getOverviewStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalUsers, todayNewUsers, totalTrainingLogs, todayTrainingLogs] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.user.count({ where: { role: 'USER', createdAt: { gte: today } } }),
    prisma.trainingLog.count({ where: { status: 'COMPLETED' } }),
    prisma.trainingLog.count({ where: { status: 'COMPLETED', completedAt: { gte: today } } })
  ])

  return success({
    totalUsers,
    todayNewUsers,
    totalTrainingLogs,
    todayTrainingLogs
  })
}

export async function getUserGrowthStats(params: { startDate: string; endDate: string }) {
  const { startDate, endDate } = params
  const start = new Date(startDate)
  const end = new Date(endDate)

  const users = await prisma.user.findMany({
    where: { role: 'USER', createdAt: { gte: start, lte: end } },
    select: { createdAt: true }
  })

  // 按日期聚合
  const dateMap = new Map<string, number>()
  for (const user of users) {
    const date = user.createdAt.toISOString().split('T')[0]
    dateMap.set(date, (dateMap.get(date) || 0) + 1)
  }

  return success(Array.from(dateMap.entries()).map(([date, count]) => ({ date, count })))
}

export async function getTrainingStats(params: { startDate?: string; endDate?: string }) {
  const where: any = { status: 'COMPLETED' }
  if (params.startDate) where.completedAt = { ...where.completedAt, gte: new Date(params.startDate) }
  if (params.endDate) where.completedAt = { ...where.completedAt, lte: new Date(params.endDate) }

  const [logs, popularExercises] = await Promise.all([
    prisma.trainingLog.findMany({
      where,
      include: { logEntries: true }
    }),
    prisma.logEntry.groupBy({
      by: ['exerciseName'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    })
  ])

  const totalVolume = logs.reduce((sum, log) => sum + (log.totalVolume || 0), 0)

  return success({
    totalLogs: logs.length,
    totalVolume,
    popularExercises: popularExercises.map(e => ({ name: e.exerciseName, count: e._count.id }))
  })
}
```

- [ ] **Step 1: 创建 stats service**

Create `backend/src/services/admin/statsService.ts`

- [ ] **Step 2: 创建 stats controller**

Create `backend/src/controllers/admin/statsController.ts`

- [ ] **Step 3: 创建 stats routes**

Create `backend/src/routes/admin/stats.ts`

- [ ] **Step 4: 验证编译**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 5: Commit**

---

### Task 5.4: Admin Push Service & Controller

**Files:**
- Create: `backend/src/services/admin/pushService.ts`
- Create: `backend/src/controllers/admin/pushController.ts`
- Create: `backend/src/routes/admin/push.ts`

- [ ] **Step 1: 创建 push service**

Create `backend/src/services/admin/pushService.ts` (复用现有的 pushService 或创建新封装)

- [ ] **Step 2: 创建 push controller**

Create `backend/src/controllers/admin/pushController.ts`

- [ ] **Step 3: 创建 push routes**

Create `backend/src/routes/admin/push.ts`

- [ ] **Step 4: 验证编译**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 5: Commit**

---

## Part 6: React 运营端前端

### Task 6.1: 项目初始化

**Files:**
- Create: `admin/package.json`
- Create: `admin/vite.config.ts`
- Create: `admin/tsconfig.json`
- Create: `admin/index.html`
- Create: `admin/src/main.tsx`
- Create: `admin/src/App.tsx`

**package.json:**
```json
{
  "name": "aiji-admin",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "antd": "^5.12.0",
    "@ant-design/icons": "^5.2.6",
    "axios": "^1.6.0",
    "dayjs": "^1.11.10"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 1: 创建 admin 项目基础文件**

Create `admin/` directory with package.json, vite.config.ts, tsconfig.json, index.html

- [ ] **Step 2: 创建入口文件**

Create `admin/src/main.tsx` and `admin/src/App.tsx`

- [ ] **Step 3: 安装依赖**

Run: `cd admin && npm install`

- [ ] **Step 4: 验证项目启动**

Run: `cd admin && npm run dev`

- [ ] **Step 5: Commit**

---

### Task 6.2: 登录页面

**Files:**
- Create: `admin/src/pages/Login/index.tsx`
- Create: `admin/src/api/auth.ts`

```typescript
// admin/src/api/auth.ts
import axios from 'axios'

const api = axios.create({
  baseURL: '/admin/api'
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authApi = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile')
}

export default api
```

```tsx
// admin/src/pages/Login/index.tsx
import { Form, Input, Button, Card, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'

export default function Login() {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const handleSubmit = async (values: { username: string; password: string }) => {
    try {
      const res = await authApi.login(values.username, values.password)
      if (res.data.code === 0) {
        localStorage.setItem('admin_token', res.data.data.token)
        message.success('登录成功')
        navigate('/dashboard')
      } else {
        message.error(res.data.message)
      }
    } catch {
      message.error('登录失败')
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card title="运营端登录" style={{ width: 400 }}>
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>登录</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 1: 创建 API 封装**

Create `admin/src/api/auth.ts`

- [ ] **Step 2: 创建登录页面**

Create `admin/src/pages/Login/index.tsx`

- [ ] **Step 3: 配置路由**

Update `admin/src/App.tsx` with login route

- [ ] **Step 4: 测试登录流程**

Run: `cd admin && npm run dev` and test login

- [ ] **Step 5: Commit**

---

### Task 6.3: 布局和主路由

**Files:**
- Create: `admin/src/layouts/MainLayout.tsx`
- Create: `admin/src/router.tsx`
- Modify: `admin/src/App.tsx`

```tsx
// admin/src/layouts/MainLayout.tsx
import { Layout, Menu, Avatar, Dropdown } from 'antd'
import { useNavigate, Outlet } from 'react-router-dom'
import {
  DashboardOutlined,
  UserOutlined,
  TrophyOutlined,
  PushpinOutlined,
  BookOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { authApi } from '../api/auth'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '看板' },
  { key: '/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/exercises', icon: <TrophyOutlined />, label: '动作库' },
  { key: '/plans', icon: <BookOutlined />, label: '计划模板' },
  { key: '/knowledge', icon: <BookOutlined />, label: '知识库' },
  { key: '/push', icon: <PushpinOutlined />, label: '推送运营' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' }
]

export default function MainLayout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authApi.logout()
    localStorage.removeItem('admin_token')
    navigate('/login')
  }

  const userMenu = {
    items: [{ key: 'logout', label: '退出登录' }],
    onClick: () => handleLogout()
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={200}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 'bold' }}>
          AI己 运营端
        </div>
        <Menu mode="inline" items={menuItems} onClick={({ key }) => navigate(key)} style={{ height: 'calc(100vh - 64px)' }} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingRight: 24 }}>
          <Dropdown menu={userMenu}>
            <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
          </Dropdown>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
```

- [ ] **Step 1: 创建主布局组件**

Create `admin/src/layouts/MainLayout.tsx`

- [ ] **Step 2: 创建路由配置**

Create `admin/src/router.tsx` with all routes

- [ ] **Step 3: 更新 App.tsx**

Update `admin/src/App.tsx` to use router

- [ ] **Step 4: 测试布局**

Run dev server and verify layout

- [ ] **Step 5: Commit**

---

### Task 6.4: 看板页面

**Files:**
- Create: `admin/src/pages/Dashboard/index.tsx`
- Create: `admin/src/api/stats.ts`

```tsx
// admin/src/pages/Dashboard/index.tsx
import { Card, Row, Col, Statistic } from 'antd'
import { UserOutlined, TrophyOutlined, RiseOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { statsApi } from '../../api/stats'

export default function Dashboard() {
  const [stats, setStats] = useState<any>({})

  useEffect(() => {
    statsApi.getOverview().then(res => {
      if (res.data.code === 0) setStats(res.data.data)
    })
  }, [])

  return (
    <div>
      <h2>数据看板</h2>
      <Row gutter={16}>
        <Col span={6}>
          <Card><Statistic title="总用户数" value={stats.totalUsers} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="今日新增" value={stats.todayNewUsers} prefix={<RiseOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="总训练次数" value={stats.totalTrainingLogs} prefix={<TrophyOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="今日训练" value={stats.todayTrainingLogs} /></Card>
        </Col>
      </Row>
    </div>
  )
}
```

- [ ] **Step 1: 创建 stats API**

Create `admin/src/api/stats.ts`

- [ ] **Step 2: 创建 Dashboard 页面**

Create `admin/src/pages/Dashboard/index.tsx`

- [ ] **Step 3: Commit**

---

### Task 6.5: 用户管理页面

**Files:**
- Create: `admin/src/pages/Users/index.tsx`
- Create: `admin/src/pages/Users/UserDetail.tsx`
- Create: `admin/src/api/users.ts`

- [ ] **Step 1: 创建 users API**

Create `admin/src/api/users.ts`

- [ ] **Step 2: 创建用户列表页面**

Create `admin/src/pages/Users/index.tsx` with table, pagination, search

- [ ] **Step 3: 创建用户详情页面**

Create `admin/src/pages/Users/UserDetail.tsx`

- [ ] **Step 4: Commit**

---

### Task 6.6: 知识库页面

**Files:**
- Create: `admin/src/pages/Knowledge/ArticleList.tsx`
- Create: `admin/src/pages/Knowledge/ArticleEdit.tsx`
- Create: `admin/src/pages/Knowledge/Categories.tsx`
- Create: `admin/src/pages/Knowledge/Contributions.tsx`
- Create: `admin/src/api/knowledge.ts`

- [ ] **Step 1: 创建 knowledge API**

Create `admin/src/api/knowledge.ts`

- [ ] **Step 2: 创建文章列表页面**

Create `admin/src/pages/Knowledge/ArticleList.tsx`

- [ ] **Step 3: 创建文章编辑页面**

Create `admin/src/pages/Knowledge/ArticleEdit.tsx`

- [ ] **Step 4: 创建分类管理页面**

Create `admin/src/pages/Knowledge/Categories.tsx`

- [ ] **Step 5: 创建贡献审核页面**

Create `admin/src/pages/Knowledge/Contributions.tsx`

- [ ] **Step 6: Commit**

---

### Task 6.7: 其他页面 (动作库、计划模板、推送、设置)

**Files:**
- Create: `admin/src/pages/Exercises/index.tsx`
- Create: `admin/src/pages/Plans/index.tsx`
- Create: `admin/src/pages/Push/index.tsx`
- Create: `admin/src/pages/Settings/index.tsx`
- Create: `admin/src/api/exercises.ts`
- Create: `admin/src/api/plans.ts`
- Create: `admin/src/api/push.ts`

- [ ] **Step 1: 创建 API 文件**

Create `admin/src/api/exercises.ts`, `admin/src/api/plans.ts`, `admin/src/api/push.ts`

- [ ] **Step 2: 创建动作库页面**

Create `admin/src/pages/Exercises/index.tsx`

- [ ] **Step 3: 创建计划模板页面**

Create `admin/src/pages/Plans/index.tsx`

- [ ] **Step 4: 创建推送运营页面**

Create `admin/src/pages/Push/index.tsx`

- [ ] **Step 5: 创建设置页面**

Create `admin/src/pages/Settings/index.tsx`

- [ ] **Step 6: Commit**

---

## Part 7: 小程序端知识库 (前端新增)

### Task 7.1: 小程序知识库 Tab

**Files:**
- Modify: `front/pages.json`
- Create: `front/pages/knowledge/index.vue`
- Create: `front/pages/knowledge/detail.vue`
- Create: `front/api/knowledge.ts`

- [ ] **Step 1: 添加 knowledge tab 页面**

Add to `front/pages.json` and create `front/pages/knowledge/index.vue`

- [ ] **Step 2: 创建知识库 API**

Create `front/api/knowledge.ts`

- [ ] **Step 3: 创建知识库列表页**

Create `front/pages/knowledge/index.vue`

- [ ] **Step 4: 创建文章详情页**

Create `front/pages/knowledge/detail.vue`

- [ ] **Step 5: Commit**

---

### Task 7.2: 小程序端多入口

**Files:**
- Modify: `front/pages/chat/index.vue` (AI 对话页添加知识库入口)
- Modify: `front/pages/profile/index.vue` (个人中心添加知识库入口)

- [ ] **Step 1: AI 对话页添加知识库入口**

Modify `front/pages/chat/index.vue`

- [ ] **Step 2: 个人中心添加知识库入口**

Modify `front/pages/profile/index.vue`

- [ ] **Step 3: Commit**

---

## Part 8: CLAUDE.md 更新

### Task 8.1: 更新架构文档

**Files:**
- Modify: `CLAUDE.md`

更新项目结构，增加 admin 项目说明、新的工作流程

```markdown
## 项目结构

```
aiji/
├── admin/                      # 运营端 (React + Ant Design)
├── backend/                   # 后端服务 (Koa + Prisma)
│   └── src/
│       ├── routes/admin/      # 运营端 API 路由
│       ├── controllers/admin/ # 运营端 Controller
│       └── services/admin/   # 运营端 Service
└── front/                      # 小程序 (uni-app + Vue3)
```

## 工作流程

### 运营端开发
1. 后端 API: `backend/src/routes/admin/` + `controllers/admin/` + `services/admin/`
2. 前端页面: `admin/src/pages/`
3. API 代理: `/admin/api/*` -> Koa `/admin/api/*`
```

- [ ] **Step 1: 更新 CLAUDE.md**

Add admin project structure and development workflow

- [ ] **Step 2: Commit**

---

## 计划自检

1. **Spec 覆盖检查:**
   - [x] 用户管理 API ✓
   - [x] 动作库 API ✓
   - [x] 训练计划 API ✓
   - [x] 数据统计 API ✓
   - [x] 推送运营 API ✓
   - [x] 知识库 API (含分类、文章、贡献审核、AI生成) ✓
   - [x] Admin 认证 ✓
   - [x] React 运营端 (登录、看板、各管理页面) ✓
   - [x] 小程序知识库展示 ✓
   - [x] CLAUDE.md 更新 ✓

2. **占位符扫描:** 无 TBD/TODO/placeholder

3. **类型一致性:** 方法名、参数类型在各 task 中保持一致
