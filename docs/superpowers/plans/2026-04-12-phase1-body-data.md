# Phase 1: 项目基础架构 + 身体数据记录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 AI己 小程序前后端基础架构，实现用户微信登录、个人档案管理、体重/围度/进度照片记录与可视化，让用户能看到自己的身体变化。

**Architecture:** 前端 uni-app（Vue3 + TypeScript + Pinia）调用后端 Koa REST API，后端通过 Prisma ORM 操作 MySQL 数据库。微信登录使用 code 换 openid 模式，服务端签发 JWT Token，前端统一请求拦截器携带 Token。

**Tech Stack:** uni-app 3.x / Vue3 / TypeScript / Pinia / Node.js / Koa / Prisma / MySQL 8.0 / Jest / wxcloud 或 自有服务器

---

## 文件结构

### 后端 `backend/`

```
backend/
├── src/
│   ├── app.ts                        # Koa 实例创建与中间件注册
│   ├── server.ts                     # 启动入口
│   ├── config/
│   │   ├── env.ts                    # 环境变量读取与校验
│   │   └── wechat.ts                 # 微信相关配置常量
│   ├── middleware/
│   │   ├── auth.ts                   # JWT 验证中间件
│   │   ├── error.ts                  # 全局错误处理
│   │   └── logger.ts                 # 请求日志
│   ├── routes/
│   │   ├── index.ts                  # 路由聚合
│   │   ├── auth.ts                   # /api/auth/*
│   │   ├── user.ts                   # /api/user/*
│   │   └── bodyData.ts               # /api/body-data/*
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   └── bodyDataController.ts
│   ├── services/
│   │   ├── authService.ts            # 微信登录逻辑、JWT 签发
│   │   ├── userService.ts            # 用户档案 CRUD
│   │   └── bodyDataService.ts        # 体重/围度/照片 CRUD + 统计
│   └── types/
│       └── index.ts                  # 共享类型定义
├── prisma/
│   └── schema.prisma                 # 数据库 Schema
├── tests/
│   ├── setup.ts                      # Jest 测试环境初始化
│   ├── auth.test.ts
│   ├── user.test.ts
│   └── bodyData.test.ts
├── .env.example
├── package.json
├── tsconfig.json
└── jest.config.ts
```

### 前端 `front/`

```
front/
├── src/
│   ├── pages/
│   │   ├── index/
│   │   │   └── index.vue             # AI助手首页（Tab1，本阶段占位页）
│   │   ├── data/
│   │   │   ├── index.vue             # 数据中心总览（Tab2）
│   │   │   ├── weight.vue            # 体重记录页
│   │   │   ├── measurements.vue      # 围度记录页
│   │   │   └── photos.vue            # 进度照片页
│   │   ├── training/
│   │   │   └── index.vue             # 训练（Tab3，本阶段占位页）
│   │   └── profile/
│   │       ├── index.vue             # 我的（Tab4）
│   │       ├── edit.vue              # 编辑个人档案
│   │       └── login.vue             # 微信授权登录页
│   ├── components/
│   │   ├── charts/
│   │   │   ├── LineChart.vue         # 折线图（体重/围度趋势）
│   │   │   └── ProgressBar.vue       # 目标进度条
│   │   ├── forms/
│   │   │   ├── WeightInput.vue       # 体重快速输入表单
│   │   │   └── MeasurementInput.vue  # 围度输入表单
│   │   └── common/
│   │       ├── NavBar.vue            # 自定义导航栏
│   │       └── Empty.vue             # 空状态占位组件
│   ├── stores/
│   │   ├── user.ts                   # 用户信息 + Token 状态
│   │   └── bodyData.ts               # 体重/围度/照片数据缓存
│   ├── api/
│   │   ├── request.ts                # uni.request 封装 + 拦截器
│   │   ├── auth.ts                   # 登录接口调用
│   │   ├── user.ts                   # 用户档案接口调用
│   │   └── bodyData.ts               # 身体数据接口调用
│   ├── types/
│   │   └── index.ts                  # 前端类型定义
│   └── utils/
│       ├── date.ts                   # 日期格式化工具
│       └── smooth.ts                 # 7日均值平滑算法
├── App.vue
├── main.ts
├── pages.json
├── manifest.json
├── package.json
└── tsconfig.json
```

---

## Task 1: 初始化后端项目

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/jest.config.ts`
- Create: `backend/.env.example`
- Create: `backend/src/config/env.ts`

- [ ] **Step 1: 创建后端目录并初始化**

```bash
cd /Users/eatong/eaTong_projects/aiji
mkdir -p backend/src/{config,middleware,routes,controllers,services,types}
mkdir -p backend/{prisma,tests}
cd backend
npm init -y
```

- [ ] **Step 2: 安装依赖**

```bash
npm install koa @koa/router @koa/cors koa-body koa-jwt jsonwebtoken \
  axios prisma @prisma/client dotenv
npm install -D typescript ts-node @types/node @types/koa @types/koa__router \
  @types/koa__cors @types/koa-body @types/jsonwebtoken \
  jest ts-jest @types/jest supertest @types/supertest
```

- [ ] **Step 3: 写入 `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: 写入 `backend/jest.config.ts`**

```ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterFramework: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
}

export default config
```

- [ ] **Step 5: 写入 `backend/.env.example`**

```
DATABASE_URL="mysql://root:password@localhost:3306/aiji"
JWT_SECRET="your-jwt-secret-min-32-chars"
JWT_EXPIRES_IN="7d"
WX_APPID="your-wechat-appid"
WX_SECRET="your-wechat-appsecret"
PORT=3000
```

- [ ] **Step 6: 写入 `backend/src/config/env.ts`**

```ts
import dotenv from 'dotenv'
dotenv.config()

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env variable: ${key}`)
  return value
}

export const env = {
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  wxAppId: requireEnv('WX_APPID'),
  wxSecret: requireEnv('WX_SECRET'),
  port: Number(process.env.PORT ?? 3000),
}
```

- [ ] **Step 7: 更新 `backend/package.json` scripts**

```json
{
  "scripts": {
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  }
}
```

- [ ] **Step 8: Commit**

```bash
cd /Users/eatong/eaTong_projects/aiji
git init
git add backend/
git commit -m "feat: 初始化后端项目结构与依赖配置"
```

---

## Task 2: 数据库 Schema 设计与迁移

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/tests/setup.ts`

- [ ] **Step 1: 初始化 Prisma**

```bash
cd backend
npx prisma init --datasource-provider mysql
```

- [ ] **Step 2: 写入 `backend/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id                String    @id @default(uuid())
  openid            String    @unique
  nickname          String?
  avatarUrl         String?
  height            Float?
  targetWeight      Float?
  goal              Goal?
  level             Level     @default(BEGINNER)
  equipment         Equipment @default(GYM)
  weeklyTrainingDays Int      @default(3)
  currentPhase      Phase     @default(MAINTAIN)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  weightRecords      WeightRecord[]
  measurementRecords MeasurementRecord[]
  progressPhotos     ProgressPhoto[]
}

model WeightRecord {
  id         String   @id @default(uuid())
  userId     String
  weight     Float
  recordedAt DateTime @db.Date
  note       String?
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, recordedAt])
}

model MeasurementRecord {
  id          String   @id @default(uuid())
  userId      String
  waist       Float?
  hip         Float?
  chest       Float?
  leftArm     Float?
  rightArm    Float?
  leftThigh   Float?
  rightThigh  Float?
  leftCalf    Float?
  rightCalf   Float?
  bodyFat     Float?
  recordedAt  DateTime @db.Date
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model ProgressPhoto {
  id         String      @id @default(uuid())
  userId     String
  photoUrl   String
  angle      PhotoAngle
  recordedAt DateTime    @db.Date
  createdAt  DateTime    @default(now())

  user User @relation(fields: [userId], references: [id])
}

enum Goal {
  LOSE_FAT
  GAIN_MUSCLE
  BODY_SHAPE
  IMPROVE_FITNESS
}

enum Level {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

enum Equipment {
  GYM
  DUMBBELL
  BODYWEIGHT
}

enum Phase {
  CUT
  BULK
  MAINTAIN
}

enum PhotoAngle {
  FRONT
  SIDE
  BACK
}
```

- [ ] **Step 3: 写入 `backend/tests/setup.ts`**

```ts
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
})

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

afterEach(async () => {
  await prisma.progressPhoto.deleteMany()
  await prisma.measurementRecord.deleteMany()
  await prisma.weightRecord.deleteMany()
  await prisma.user.deleteMany()
})
```

- [ ] **Step 4: 运行迁移**

在 `.env` 中设置好 `DATABASE_URL` 后：

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

预期输出：`Your database is now in sync with your schema.`

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/ backend/tests/setup.ts
git commit -m "feat: 定义数据库 Schema 并完成初始迁移"
```

---

## Task 3: 共享类型与基础中间件

**Files:**
- Create: `backend/src/types/index.ts`
- Create: `backend/src/middleware/error.ts`
- Create: `backend/src/middleware/logger.ts`

- [ ] **Step 1: 写入 `backend/src/types/index.ts`**

```ts
import { Context } from 'koa'

export interface AuthContext extends Context {
  state: {
    user: { userId: string }
  }
}

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export function success<T>(data: T, message = 'ok'): ApiResponse<T> {
  return { code: 0, message, data }
}

export function fail(message: string, code = 1): ApiResponse<null> {
  return { code, message, data: null }
}
```

- [ ] **Step 2: 写入 `backend/src/middleware/error.ts`**

```ts
import { Context, Next } from 'koa'

export async function errorMiddleware(ctx: Context, next: Next) {
  try {
    await next()
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string }
    const status = error.status ?? 500
    const message = error.message ?? 'Internal Server Error'

    ctx.status = status
    ctx.body = { code: status, message, data: null }

    if (status === 500) {
      console.error('[Server Error]', err)
    }
  }
}
```

- [ ] **Step 3: 写入 `backend/src/middleware/logger.ts`**

```ts
import { Context, Next } from 'koa'

export async function loggerMiddleware(ctx: Context, next: Next) {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${ctx.method} ${ctx.url} ${ctx.status} - ${ms}ms`)
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/types/ backend/src/middleware/
git commit -m "feat: 添加共享类型定义与基础中间件"
```

---

## Task 4: Koa 应用主体与路由骨架

**Files:**
- Create: `backend/src/app.ts`
- Create: `backend/src/server.ts`
- Create: `backend/src/routes/index.ts`
- Create: `backend/src/routes/auth.ts`
- Create: `backend/src/routes/user.ts`
- Create: `backend/src/routes/bodyData.ts`
- Create: `backend/src/middleware/auth.ts`

- [ ] **Step 1: 写入 `backend/src/middleware/auth.ts`**

```ts
import { Context, Next } from 'koa'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export async function authMiddleware(ctx: Context, next: Next) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    ctx.status = 401
    ctx.body = { code: 401, message: '未授权', data: null }
    return
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string }
    ctx.state.user = { userId: payload.userId }
    await next()
  } catch {
    ctx.status = 401
    ctx.body = { code: 401, message: 'Token 无效或已过期', data: null }
  }
}
```

- [ ] **Step 2: 写入 `backend/src/routes/auth.ts`**

```ts
import Router from '@koa/router'
import { wxLogin } from '../controllers/authController'

const router = new Router({ prefix: '/api/auth' })
router.post('/wx-login', wxLogin)

export default router
```

- [ ] **Step 3: 写入 `backend/src/routes/user.ts`**

```ts
import Router from '@koa/router'
import { authMiddleware } from '../middleware/auth'
import { getProfile, updateProfile } from '../controllers/userController'

const router = new Router({ prefix: '/api/user' })
router.use(authMiddleware)
router.get('/profile', getProfile)
router.put('/profile', updateProfile)

export default router
```

- [ ] **Step 4: 写入 `backend/src/routes/bodyData.ts`**

```ts
import Router from '@koa/router'
import { authMiddleware } from '../middleware/auth'
import {
  createWeightRecord,
  getWeightRecords,
  createMeasurementRecord,
  getMeasurementRecords,
  uploadProgressPhoto,
  getProgressPhotos,
} from '../controllers/bodyDataController'

const router = new Router({ prefix: '/api/body-data' })
router.use(authMiddleware)

router.post('/weight', createWeightRecord)
router.get('/weight', getWeightRecords)
router.post('/measurements', createMeasurementRecord)
router.get('/measurements', getMeasurementRecords)
router.post('/photos', uploadProgressPhoto)
router.get('/photos', getProgressPhotos)

export default router
```

- [ ] **Step 5: 写入 `backend/src/routes/index.ts`**

```ts
import Router from '@koa/router'
import authRouter from './auth'
import userRouter from './user'
import bodyDataRouter from './bodyData'

const router = new Router()
router.use(authRouter.routes())
router.use(userRouter.routes())
router.use(bodyDataRouter.routes())

export default router
```

- [ ] **Step 6: 写入 `backend/src/app.ts`**

```ts
import Koa from 'koa'
import cors from '@koa/cors'
import { koaBody } from 'koa-body'
import router from './routes'
import { errorMiddleware } from './middleware/error'
import { loggerMiddleware } from './middleware/logger'

const app = new Koa()

app.use(errorMiddleware)
app.use(loggerMiddleware)
app.use(cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE'] }))
app.use(koaBody())
app.use(router.routes())
app.use(router.allowedMethods())

export default app
```

- [ ] **Step 7: 写入 `backend/src/server.ts`**

```ts
import app from './app'
import { env } from './config/env'

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`)
})
```

- [ ] **Step 8: 验证服务启动**

```bash
cd backend
cp .env.example .env   # 填入真实配置
npm run dev
```

预期输出：`Server running on port 3000`

- [ ] **Step 9: Commit**

```bash
git add backend/src/
git commit -m "feat: 搭建 Koa 应用主体与路由骨架"
```

---

## Task 5: 微信登录 + JWT 认证

**Files:**
- Create: `backend/src/services/authService.ts`
- Create: `backend/src/controllers/authController.ts`
- Create: `backend/tests/auth.test.ts`

- [ ] **Step 1: 写失败测试**

写入 `backend/tests/auth.test.ts`：

```ts
import request from 'supertest'
import app from '../src/app'
import { prisma } from './setup'

describe('POST /api/auth/wx-login', () => {
  it('should return 400 when code is missing', async () => {
    const res = await request(app.callback()).post('/api/auth/wx-login').send({})
    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })

  it('should return token and user on valid login', async () => {
    // 创建已存在的测试用户（跳过真实微信接口）
    const user = await prisma.user.create({
      data: { openid: 'test_openid_001' },
    })

    // 注入 mock：authService.getWxOpenid 返回固定 openid
    jest.spyOn(require('../src/services/authService'), 'getWxOpenid')
      .mockResolvedValueOnce('test_openid_001')

    const res = await request(app.callback())
      .post('/api/auth/wx-login')
      .send({ code: 'fake_code' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('token')
    expect(res.body.data.user.id).toBe(user.id)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd backend
npm test -- tests/auth.test.ts
```

预期：`FAIL` - controller 未实现

- [ ] **Step 3: 写入 `backend/src/services/authService.ts`**

```ts
import axios from 'axios'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'

const prisma = new PrismaClient()

export async function getWxOpenid(code: string): Promise<string> {
  const url = 'https://api.weixin.qq.com/sns/jscode2session'
  const { data } = await axios.get(url, {
    params: {
      appid: env.wxAppId,
      secret: env.wxSecret,
      js_code: code,
      grant_type: 'authorization_code',
    },
  })
  if (data.errcode) {
    throw Object.assign(new Error(data.errmsg), { status: 400 })
  }
  return data.openid as string
}

export async function loginOrRegister(openid: string) {
  const user = await prisma.user.upsert({
    where: { openid },
    update: {},
    create: { openid },
  })
  const token = jwt.sign({ userId: user.id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  })
  return { token, user }
}
```

- [ ] **Step 4: 写入 `backend/src/controllers/authController.ts`**

```ts
import { Context } from 'koa'
import { getWxOpenid, loginOrRegister } from '../services/authService'
import { success, fail } from '../types'

export async function wxLogin(ctx: Context) {
  const { code } = ctx.request.body as { code?: string }
  if (!code) {
    ctx.status = 400
    ctx.body = fail('code 不能为空', 400)
    return
  }
  const openid = await getWxOpenid(code)
  const result = await loginOrRegister(openid)
  ctx.body = success(result)
}
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
npm test -- tests/auth.test.ts
```

预期：`PASS` 2 tests

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/authService.ts \
        backend/src/controllers/authController.ts \
        backend/tests/auth.test.ts
git commit -m "feat: 实现微信登录与 JWT 签发"
```

---

## Task 6: 用户档案 API

**Files:**
- Create: `backend/src/services/userService.ts`
- Create: `backend/src/controllers/userController.ts`
- Create: `backend/tests/user.test.ts`

- [ ] **Step 1: 写失败测试**

写入 `backend/tests/user.test.ts`：

```ts
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma } from './setup'
import { env } from '../src/config/env'

async function makeUser() {
  const user = await prisma.user.create({ data: { openid: 'test_openid_profile' } })
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token }
}

describe('GET /api/user/profile', () => {
  it('should return 401 without token', async () => {
    const res = await request(app.callback()).get('/api/user/profile')
    expect(res.status).toBe(401)
  })

  it('should return user profile', async () => {
    const { user, token } = await makeUser()
    const res = await request(app.callback())
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(user.id)
  })
})

describe('PUT /api/user/profile', () => {
  it('should update height and goal', async () => {
    const { token } = await makeUser()
    const res = await request(app.callback())
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ height: 175, goal: 'LOSE_FAT' })
    expect(res.status).toBe(200)
    expect(res.body.data.height).toBe(175)
    expect(res.body.data.goal).toBe('LOSE_FAT')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/user.test.ts
```

预期：`FAIL`

- [ ] **Step 3: 写入 `backend/src/services/userService.ts`**

```ts
import { PrismaClient, Goal, Level, Equipment, Phase } from '@prisma/client'

const prisma = new PrismaClient()

export async function getUserById(userId: string) {
  return prisma.user.findUniqueOrThrow({ where: { id: userId } })
}

export interface UpdateProfileInput {
  nickname?: string
  height?: number
  targetWeight?: number
  goal?: Goal
  level?: Level
  equipment?: Equipment
  weeklyTrainingDays?: number
  currentPhase?: Phase
}

export async function updateUser(userId: string, input: UpdateProfileInput) {
  return prisma.user.update({ where: { id: userId }, data: input })
}
```

- [ ] **Step 4: 写入 `backend/src/controllers/userController.ts`**

```ts
import { Context } from 'koa'
import { getUserById, updateUser, UpdateProfileInput } from '../services/userService'
import { success } from '../types'
import { AuthContext } from '../types'

export async function getProfile(ctx: AuthContext) {
  const user = await getUserById(ctx.state.user.userId)
  ctx.body = success(user)
}

export async function updateProfile(ctx: AuthContext) {
  const input = ctx.request.body as UpdateProfileInput
  const user = await updateUser(ctx.state.user.userId, input)
  ctx.body = success(user)
}
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
npm test -- tests/user.test.ts
```

预期：`PASS` 3 tests

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/userService.ts \
        backend/src/controllers/userController.ts \
        backend/tests/user.test.ts
git commit -m "feat: 实现用户档案查询与更新 API"
```

---

## Task 7: 身体数据 API（体重 + 围度 + 照片）

**Files:**
- Create: `backend/src/services/bodyDataService.ts`
- Create: `backend/src/controllers/bodyDataController.ts`
- Create: `backend/tests/bodyData.test.ts`

- [ ] **Step 1: 写失败测试**

写入 `backend/tests/bodyData.test.ts`：

```ts
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app'
import { prisma } from './setup'
import { env } from '../src/config/env'

async function makeUser() {
  const user = await prisma.user.create({ data: { openid: 'test_body_user' } })
  const token = jwt.sign({ userId: user.id }, env.jwtSecret)
  return { user, token }
}

describe('POST /api/body-data/weight', () => {
  it('should create weight record', async () => {
    const { token } = await makeUser()
    const res = await request(app.callback())
      .post('/api/body-data/weight')
      .set('Authorization', `Bearer ${token}`)
      .send({ weight: 72.5, recordedAt: '2026-04-12' })
    expect(res.status).toBe(200)
    expect(res.body.data.weight).toBe(72.5)
  })

  it('should reject duplicate date', async () => {
    const { token } = await makeUser()
    await request(app.callback())
      .post('/api/body-data/weight')
      .set('Authorization', `Bearer ${token}`)
      .send({ weight: 72.5, recordedAt: '2026-04-12' })
    const res = await request(app.callback())
      .post('/api/body-data/weight')
      .set('Authorization', `Bearer ${token}`)
      .send({ weight: 73.0, recordedAt: '2026-04-12' })
    expect(res.status).toBe(409)
  })
})

describe('GET /api/body-data/weight', () => {
  it('should return weight records with 7-day average', async () => {
    const { user, token } = await makeUser()
    await prisma.weightRecord.createMany({
      data: [
        { userId: user.id, weight: 72.0, recordedAt: new Date('2026-04-06') },
        { userId: user.id, weight: 72.5, recordedAt: new Date('2026-04-07') },
        { userId: user.id, weight: 71.8, recordedAt: new Date('2026-04-08') },
      ],
    })
    const res = await request(app.callback())
      .get('/api/body-data/weight')
      .set('Authorization', `Bearer ${token}`)
      .query({ startDate: '2026-04-01', endDate: '2026-04-30' })
    expect(res.status).toBe(200)
    expect(res.body.data.records).toHaveLength(3)
    expect(res.body.data.records[2]).toHaveProperty('sevenDayAvg')
  })
})

describe('POST /api/body-data/measurements', () => {
  it('should create measurement record', async () => {
    const { token } = await makeUser()
    const res = await request(app.callback())
      .post('/api/body-data/measurements')
      .set('Authorization', `Bearer ${token}`)
      .send({ waist: 80.0, chest: 95.0, recordedAt: '2026-04-12' })
    expect(res.status).toBe(200)
    expect(res.body.data.waist).toBe(80.0)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/bodyData.test.ts
```

预期：`FAIL`

- [ ] **Step 3: 写入 `backend/src/services/bodyDataService.ts`**

```ts
import { PrismaClient, PhotoAngle } from '@prisma/client'

const prisma = new PrismaClient()

// ---- 体重 ----

export async function createWeightRecord(userId: string, weight: number, recordedAt: string, note?: string) {
  const date = new Date(recordedAt)
  const existing = await prisma.weightRecord.findUnique({
    where: { userId_recordedAt: { userId, recordedAt: date } },
  })
  if (existing) {
    throw Object.assign(new Error('该日期已有体重记录'), { status: 409 })
  }
  return prisma.weightRecord.create({ data: { userId, weight, recordedAt: date, note } })
}

export async function getWeightRecords(userId: string, startDate: string, endDate: string) {
  const records = await prisma.weightRecord.findMany({
    where: {
      userId,
      recordedAt: { gte: new Date(startDate), lte: new Date(endDate) },
    },
    orderBy: { recordedAt: 'asc' },
  })

  // 计算 7 日滑动平均
  const withAvg = records.map((rec, idx) => {
    const window = records.slice(Math.max(0, idx - 6), idx + 1)
    const avg = window.reduce((sum, r) => sum + r.weight, 0) / window.length
    return { ...rec, sevenDayAvg: Math.round(avg * 10) / 10 }
  })

  return { records: withAvg }
}

// ---- 围度 ----

export interface MeasurementInput {
  waist?: number
  hip?: number
  chest?: number
  leftArm?: number
  rightArm?: number
  leftThigh?: number
  rightThigh?: number
  leftCalf?: number
  rightCalf?: number
  bodyFat?: number
  recordedAt: string
}

export async function createMeasurementRecord(userId: string, input: MeasurementInput) {
  const { recordedAt, ...rest } = input
  return prisma.measurementRecord.create({
    data: { userId, ...rest, recordedAt: new Date(recordedAt) },
  })
}

export async function getMeasurementRecords(userId: string, startDate: string, endDate: string) {
  return prisma.measurementRecord.findMany({
    where: {
      userId,
      recordedAt: { gte: new Date(startDate), lte: new Date(endDate) },
    },
    orderBy: { recordedAt: 'asc' },
  })
}

// ---- 进度照片 ----

export async function createProgressPhoto(userId: string, photoUrl: string, angle: PhotoAngle, recordedAt: string) {
  return prisma.progressPhoto.create({
    data: { userId, photoUrl, angle, recordedAt: new Date(recordedAt) },
  })
}

export async function getProgressPhotos(userId: string) {
  return prisma.progressPhoto.findMany({
    where: { userId },
    orderBy: { recordedAt: 'desc' },
  })
}
```

- [ ] **Step 4: 写入 `backend/src/controllers/bodyDataController.ts`**

```ts
import { PhotoAngle } from '@prisma/client'
import { AuthContext } from '../types'
import { success } from '../types'
import {
  createWeightRecord,
  getWeightRecords,
  createMeasurementRecord,
  getMeasurementRecords,
  MeasurementInput,
  createProgressPhoto,
  getProgressPhotos,
} from '../services/bodyDataService'

export async function createWeightRecord_ctrl(ctx: AuthContext) {
  const { weight, recordedAt, note } = ctx.request.body as {
    weight: number; recordedAt: string; note?: string
  }
  const record = await createWeightRecord(ctx.state.user.userId, weight, recordedAt, note)
  ctx.body = success(record)
}

export async function getWeightRecords_ctrl(ctx: AuthContext) {
  const { startDate = '2020-01-01', endDate = '2099-12-31' } = ctx.query as Record<string, string>
  const data = await getWeightRecords(ctx.state.user.userId, startDate, endDate)
  ctx.body = success(data)
}

export async function createMeasurementRecord_ctrl(ctx: AuthContext) {
  const input = ctx.request.body as MeasurementInput
  const record = await createMeasurementRecord(ctx.state.user.userId, input)
  ctx.body = success(record)
}

export async function getMeasurementRecords_ctrl(ctx: AuthContext) {
  const { startDate = '2020-01-01', endDate = '2099-12-31' } = ctx.query as Record<string, string>
  const records = await getMeasurementRecords(ctx.state.user.userId, startDate, endDate)
  ctx.body = success(records)
}

export async function uploadProgressPhoto(ctx: AuthContext) {
  const { photoUrl, angle, recordedAt } = ctx.request.body as {
    photoUrl: string; angle: PhotoAngle; recordedAt: string
  }
  const photo = await createProgressPhoto(ctx.state.user.userId, photoUrl, angle, recordedAt)
  ctx.body = success(photo)
}

export async function getProgressPhotos_ctrl(ctx: AuthContext) {
  const photos = await getProgressPhotos(ctx.state.user.userId)
  ctx.body = success(photos)
}
```

- [ ] **Step 5: 更新 `backend/src/routes/bodyData.ts` 使用正确函数名**

```ts
import Router from '@koa/router'
import { authMiddleware } from '../middleware/auth'
import {
  createWeightRecord_ctrl as createWeightRecord,
  getWeightRecords_ctrl as getWeightRecords,
  createMeasurementRecord_ctrl as createMeasurementRecord,
  getMeasurementRecords_ctrl as getMeasurementRecords,
  uploadProgressPhoto,
  getProgressPhotos_ctrl as getProgressPhotos,
} from '../controllers/bodyDataController'

const router = new Router({ prefix: '/api/body-data' })
router.use(authMiddleware)

router.post('/weight', createWeightRecord)
router.get('/weight', getWeightRecords)
router.post('/measurements', createMeasurementRecord)
router.get('/measurements', getMeasurementRecords)
router.post('/photos', uploadProgressPhoto)
router.get('/photos', getProgressPhotos)

export default router
```

- [ ] **Step 6: 运行全部测试**

```bash
npm test
```

预期：`PASS` 全部测试通过

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/bodyDataService.ts \
        backend/src/controllers/bodyDataController.ts \
        backend/src/routes/bodyData.ts \
        backend/tests/bodyData.test.ts
git commit -m "feat: 实现体重/围度/进度照片 CRUD API（含7日均值算法）"
```

---

## Task 8: 初始化前端 uni-app 项目

**Files:**
- Create: `front/` （uni-app 项目目录）
- Create: `front/src/api/request.ts`
- Create: `front/src/types/index.ts`
- Create: `front/src/utils/date.ts`

- [ ] **Step 1: 创建 uni-app 项目**

```bash
cd /Users/eatong/eaTong_projects/aiji
npx degit dcloudio/uni-preset-vue#vite-ts front
cd front
npm install
```

- [ ] **Step 2: 安装额外依赖**

```bash
npm install pinia @pinia/plugin-persistedstate
npm install -D @uni-helper/uni-app-types
```

- [ ] **Step 3: 配置 `front/pages.json`**

```json
{
  "pages": [
    { "path": "pages/index/index", "style": { "navigationBarTitleText": "AI己" } },
    { "path": "pages/data/index", "style": { "navigationBarTitleText": "数据中心" } },
    { "path": "pages/data/weight", "style": { "navigationBarTitleText": "体重记录" } },
    { "path": "pages/data/measurements", "style": { "navigationBarTitleText": "围度记录" } },
    { "path": "pages/data/photos", "style": { "navigationBarTitleText": "进度照片" } },
    { "path": "pages/training/index", "style": { "navigationBarTitleText": "训练" } },
    { "path": "pages/profile/index", "style": { "navigationBarTitleText": "我的" } },
    { "path": "pages/profile/edit", "style": { "navigationBarTitleText": "编辑档案" } },
    { "path": "pages/profile/login", "style": { "navigationBarTitleText": "登录" } }
  ],
  "tabBar": {
    "color": "#999",
    "selectedColor": "#333",
    "list": [
      { "pagePath": "pages/index/index", "text": "AI助手" },
      { "pagePath": "pages/data/index", "text": "数据" },
      { "pagePath": "pages/training/index", "text": "训练" },
      { "pagePath": "pages/profile/index", "text": "我" }
    ]
  }
}
```

- [ ] **Step 4: 写入 `front/src/types/index.ts`**

```ts
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface User {
  id: string
  openid: string
  nickname?: string
  height?: number
  targetWeight?: number
  goal?: 'LOSE_FAT' | 'GAIN_MUSCLE' | 'BODY_SHAPE' | 'IMPROVE_FITNESS'
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  equipment: 'GYM' | 'DUMBBELL' | 'BODYWEIGHT'
  weeklyTrainingDays: number
  currentPhase: 'CUT' | 'BULK' | 'MAINTAIN'
}

export interface WeightRecord {
  id: string
  weight: number
  recordedAt: string
  sevenDayAvg?: number
  note?: string
}

export interface MeasurementRecord {
  id: string
  waist?: number
  hip?: number
  chest?: number
  leftArm?: number
  rightArm?: number
  leftThigh?: number
  rightThigh?: number
  leftCalf?: number
  rightCalf?: number
  bodyFat?: number
  recordedAt: string
}

export interface ProgressPhoto {
  id: string
  photoUrl: string
  angle: 'FRONT' | 'SIDE' | 'BACK'
  recordedAt: string
}
```

- [ ] **Step 5: 写入 `front/src/api/request.ts`**

```ts
import { ApiResponse } from '../types'

const BASE_URL = 'http://localhost:3000'

function getToken(): string {
  return uni.getStorageSync('token') ?? ''
}

export function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method,
      data,
      header: { Authorization: `Bearer ${getToken()}` },
      success(res) {
        const body = res.data as ApiResponse<T>
        if (body.code === 0) {
          resolve(body.data)
        } else if (body.code === 401) {
          uni.navigateTo({ url: '/pages/profile/login' })
          reject(new Error('未授权'))
        } else {
          uni.showToast({ title: body.message, icon: 'none' })
          reject(new Error(body.message))
        }
      },
      fail(err) {
        uni.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      },
    })
  })
}
```

- [ ] **Step 6: 写入 `front/src/utils/date.ts`**

```ts
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return formatDate(new Date())
}

export function dateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { startDate: formatDate(start), endDate: formatDate(end) }
}
```

- [ ] **Step 7: Commit**

```bash
cd /Users/eatong/eaTong_projects/aiji
git add front/
git commit -m "feat: 初始化 uni-app 前端项目结构与基础工具"
```

---

## Task 9: 前端 Pinia Store + 微信登录流程

**Files:**
- Create: `front/src/stores/user.ts`
- Create: `front/src/stores/bodyData.ts`
- Create: `front/src/api/auth.ts`
- Create: `front/src/api/user.ts`
- Modify: `front/src/main.ts`
- Create: `front/src/pages/profile/login.vue`

- [ ] **Step 1: 写入 `front/src/api/auth.ts`**

```ts
import { request } from './request'
import { User } from '../types'

export interface LoginResponse {
  token: string
  user: User
}

export function wxLogin(code: string): Promise<LoginResponse> {
  return request<LoginResponse>('POST', '/api/auth/wx-login', { code })
}
```

- [ ] **Step 2: 写入 `front/src/api/user.ts`**

```ts
import { request } from './request'
import { User } from '../types'

export function getProfile(): Promise<User> {
  return request<User>('GET', '/api/user/profile')
}

export function updateProfile(data: Partial<User>): Promise<User> {
  return request<User>('PUT', '/api/user/profile', data as Record<string, unknown>)
}
```

- [ ] **Step 3: 写入 `front/src/stores/user.ts`**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { User } from '../types'
import { getProfile } from '../api/user'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(uni.getStorageSync('token') ?? '')
  const user = ref<User | null>(null)

  function setToken(newToken: string) {
    token.value = newToken
    uni.setStorageSync('token', newToken)
  }

  function setUser(newUser: User) {
    user.value = newUser
  }

  async function fetchProfile() {
    user.value = await getProfile()
  }

  function logout() {
    token.value = ''
    user.value = null
    uni.removeStorageSync('token')
    uni.reLaunch({ url: '/pages/profile/login' })
  }

  return { token, user, setToken, setUser, fetchProfile, logout }
}, { persist: true })
```

- [ ] **Step 4: 写入 `front/src/stores/bodyData.ts`**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { WeightRecord, MeasurementRecord, ProgressPhoto } from '../types'

export const useBodyDataStore = defineStore('bodyData', () => {
  const weightRecords = ref<WeightRecord[]>([])
  const measurementRecords = ref<MeasurementRecord[]>([])
  const progressPhotos = ref<ProgressPhoto[]>([])

  function setWeightRecords(records: WeightRecord[]) {
    weightRecords.value = records
  }

  function setMeasurementRecords(records: MeasurementRecord[]) {
    measurementRecords.value = records
  }

  function setProgressPhotos(photos: ProgressPhoto[]) {
    progressPhotos.value = photos
  }

  return { weightRecords, measurementRecords, progressPhotos,
           setWeightRecords, setMeasurementRecords, setProgressPhotos }
})
```

- [ ] **Step 5: 写入 `front/src/pages/profile/login.vue`**

```vue
<template>
  <view class="login-container">
    <view class="logo-area">
      <text class="app-name">AI己</text>
      <text class="tagline">你的AI健身管家</text>
    </view>
    <button
      class="wx-login-btn"
      open-type="getPhoneNumber"
      @tap="handleLogin"
      :loading="loading"
    >
      微信一键登录
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { wxLogin } from '../../api/auth'
import { useUserStore } from '../../stores/user'

const loading = ref(false)
const userStore = useUserStore()

async function handleLogin() {
  loading.value = true
  try {
    const { code } = await uni.login({ provider: 'weixin' })
    const { token, user } = await wxLogin(code)
    userStore.setToken(token)
    userStore.setUser(user)
    uni.switchTab({ url: '/pages/index/index' })
  } catch (e) {
    uni.showToast({ title: '登录失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f9f9f9;
}
.app-name { font-size: 48rpx; font-weight: bold; color: #333; }
.tagline { font-size: 28rpx; color: #999; margin-top: 16rpx; }
.wx-login-btn {
  margin-top: 120rpx;
  background: #07c160;
  color: #fff;
  border-radius: 48rpx;
  padding: 24rpx 80rpx;
}
</style>
```

- [ ] **Step 6: 更新 `front/src/main.ts` 注册 Pinia**

```ts
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { createPersistedState } from '@pinia/plugin-persistedstate'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  pinia.use(createPersistedState({ storage: { getItem: uni.getStorageSync, setItem: uni.setStorageSync } }))
  app.use(pinia)
  return { app }
}
```

- [ ] **Step 7: Commit**

```bash
git add front/src/stores/ front/src/api/ front/src/pages/profile/login.vue front/src/main.ts
git commit -m "feat: 实现微信登录前端流程与 Pinia 状态管理"
```

---

## Task 10: 前端体重记录页面与趋势图

**Files:**
- Create: `front/src/api/bodyData.ts`
- Create: `front/src/components/charts/LineChart.vue`
- Create: `front/src/components/forms/WeightInput.vue`
- Create: `front/src/pages/data/weight.vue`

- [ ] **Step 1: 写入 `front/src/api/bodyData.ts`**

```ts
import { request } from './request'
import { WeightRecord, MeasurementRecord, ProgressPhoto } from '../types'

export function createWeightRecord(data: { weight: number; recordedAt: string; note?: string }): Promise<WeightRecord> {
  return request('POST', '/api/body-data/weight', data)
}

export function getWeightRecords(startDate: string, endDate: string): Promise<{ records: WeightRecord[] }> {
  return request('GET', `/api/body-data/weight?startDate=${startDate}&endDate=${endDate}`)
}

export function createMeasurement(data: Record<string, unknown>): Promise<MeasurementRecord> {
  return request('POST', '/api/body-data/measurements', data)
}

export function getMeasurements(startDate: string, endDate: string): Promise<MeasurementRecord[]> {
  return request('GET', `/api/body-data/measurements?startDate=${startDate}&endDate=${endDate}`)
}

export function uploadPhoto(data: { photoUrl: string; angle: string; recordedAt: string }): Promise<ProgressPhoto> {
  return request('POST', '/api/body-data/photos', data)
}

export function getPhotos(): Promise<ProgressPhoto[]> {
  return request('GET', '/api/body-data/photos')
}
```

- [ ] **Step 2: 写入 `front/src/components/charts/LineChart.vue`**

```vue
<template>
  <view class="chart-wrapper">
    <canvas
      type="2d"
      :id="canvasId"
      :style="{ width: '100%', height: height + 'rpx' }"
      @touchstart="handleTouch"
    />
  </view>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'

interface DataPoint { label: string; value: number; avgValue?: number }

const props = withDefaults(defineProps<{
  canvasId: string
  data: DataPoint[]
  unit?: string
  height?: number
  showAvg?: boolean
}>(), { unit: 'kg', height: 400, showAvg: true })

function drawChart() {
  if (!props.data.length) return
  const query = uni.createSelectorQuery()
  query.select(`#${props.canvasId}`).fields({ node: true, size: true }).exec((res) => {
    const canvas = res[0].node as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const { width, height } = res[0]
    canvas.width = width * 2
    canvas.height = height * 2
    ctx.scale(2, 2)

    const pad = { top: 20, right: 20, bottom: 40, left: 40 }
    const w = width - pad.left - pad.right
    const h = height - pad.top - pad.bottom
    const values = props.data.map(d => d.value)
    const min = Math.min(...values) - 1
    const max = Math.max(...values) + 1
    const scaleX = (i: number) => pad.left + (i / (props.data.length - 1)) * w
    const scaleY = (v: number) => pad.top + h - ((v - min) / (max - min)) * h

    // 背景网格
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * h
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + w, y); ctx.stroke()
    }

    // 主折线
    ctx.beginPath()
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    props.data.forEach((d, i) => {
      i === 0 ? ctx.moveTo(scaleX(i), scaleY(d.value)) : ctx.lineTo(scaleX(i), scaleY(d.value))
    })
    ctx.stroke()

    // 7日均值线
    if (props.showAvg) {
      ctx.beginPath()
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      props.data.forEach((d, i) => {
        if (d.avgValue == null) return
        i === 0 ? ctx.moveTo(scaleX(i), scaleY(d.avgValue)) : ctx.lineTo(scaleX(i), scaleY(d.avgValue))
      })
      ctx.stroke()
      ctx.setLineDash([])
    }

    // 数据点
    props.data.forEach((d, i) => {
      ctx.beginPath()
      ctx.arc(scaleX(i), scaleY(d.value), 3, 0, Math.PI * 2)
      ctx.fillStyle = '#333'
      ctx.fill()
    })
  })
}

onMounted(drawChart)
watch(() => props.data, drawChart, { deep: true })

function handleTouch() { /* 预留触摸交互 */ }
</script>

<style>
.chart-wrapper { width: 100%; }
</style>
```

- [ ] **Step 3: 写入 `front/src/components/forms/WeightInput.vue`**

```vue
<template>
  <view class="weight-input">
    <text class="label">今日体重</text>
    <view class="input-row">
      <input
        type="digit"
        v-model="weightStr"
        placeholder="0.0"
        class="input"
        @input="onInput"
      />
      <text class="unit">kg</text>
    </view>
    <input
      type="text"
      v-model="note"
      placeholder="备注（可选）"
      class="note-input"
    />
    <button class="submit-btn" @tap="submit" :disabled="!isValid">保存</button>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{ (e: 'submit', weight: number, note: string): void }>()
const weightStr = ref('')
const note = ref('')
const isValid = computed(() => {
  const v = parseFloat(weightStr.value)
  return !isNaN(v) && v > 20 && v < 300
})
function onInput() {
  weightStr.value = weightStr.value.replace(/[^\d.]/g, '')
}
function submit() {
  if (!isValid.value) return
  emit('submit', parseFloat(weightStr.value), note.value)
  weightStr.value = ''
  note.value = ''
}
</script>

<style>
.weight-input { padding: 32rpx; }
.label { font-size: 28rpx; color: #666; }
.input-row { display: flex; align-items: center; margin: 16rpx 0; }
.input { flex: 1; font-size: 64rpx; font-weight: bold; border-bottom: 2rpx solid #eee; }
.unit { font-size: 32rpx; color: #999; margin-left: 16rpx; }
.note-input { width: 100%; border: 1rpx solid #eee; border-radius: 16rpx; padding: 16rpx; font-size: 28rpx; margin-top: 16rpx; }
.submit-btn { margin-top: 32rpx; background: #333; color: #fff; border-radius: 48rpx; }
</style>
```

- [ ] **Step 4: 写入 `front/src/pages/data/weight.vue`**

```vue
<template>
  <view class="container">
    <!-- 图表区 -->
    <view class="card">
      <view class="card-header">
        <text class="card-title">体重趋势</text>
        <view class="range-tabs">
          <text
            v-for="r in ranges"
            :key="r.label"
            :class="['tab', { active: currentRange === r.days }]"
            @tap="changeRange(r.days)"
          >{{ r.label }}</text>
        </view>
      </view>
      <LineChart
        canvas-id="weight-chart"
        :data="chartData"
        unit="kg"
        :height="400"
        :show-avg="true"
      />
      <view class="legend">
        <view class="legend-item"><view class="dot solid" /><text>体重</text></view>
        <view class="legend-item"><view class="dot dashed" /><text>7日均值</text></view>
      </view>
    </view>

    <!-- 最近记录 -->
    <view class="card">
      <text class="card-title">记录列表</text>
      <view v-for="r in records" :key="r.id" class="record-row">
        <text class="record-date">{{ r.recordedAt }}</text>
        <text class="record-value">{{ r.weight }} kg</text>
      </view>
      <view v-if="!records.length" class="empty">暂无记录，点击下方添加</view>
    </view>

    <!-- 输入表单 -->
    <WeightInput @submit="handleSubmit" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LineChart from '../../components/charts/LineChart.vue'
import WeightInput from '../../components/forms/WeightInput.vue'
import { getWeightRecords, createWeightRecord } from '../../api/bodyData'
import { useBodyDataStore } from '../../stores/bodyData'
import { today, dateRange, formatDate } from '../../utils/date'
import { WeightRecord } from '../../types'

const store = useBodyDataStore()
const currentRange = ref(30)
const ranges = [
  { label: '周', days: 7 },
  { label: '月', days: 30 },
  { label: '3月', days: 90 },
]

const records = computed(() => store.weightRecords)

const chartData = computed(() =>
  records.value.map(r => ({
    label: r.recordedAt.slice(5),
    value: r.weight,
    avgValue: r.sevenDayAvg,
  }))
)

async function loadData() {
  const { startDate, endDate } = dateRange(currentRange.value)
  const { records } = await getWeightRecords(startDate, endDate)
  store.setWeightRecords(records)
}

async function changeRange(days: number) {
  currentRange.value = days
  await loadData()
}

async function handleSubmit(weight: number, note: string) {
  await createWeightRecord({ weight, recordedAt: today(), note })
  await loadData()
  uni.showToast({ title: '记录成功', icon: 'success' })
}

onMounted(loadData)
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.card { background: #fff; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.card-title { font-size: 32rpx; font-weight: bold; color: #333; }
.range-tabs { display: flex; gap: 16rpx; }
.tab { font-size: 24rpx; color: #999; padding: 8rpx 20rpx; border-radius: 32rpx; }
.tab.active { background: #333; color: #fff; }
.legend { display: flex; gap: 32rpx; margin-top: 16rpx; }
.legend-item { display: flex; align-items: center; gap: 8rpx; font-size: 24rpx; color: #999; }
.dot { width: 16rpx; height: 4rpx; }
.dot.solid { background: #333; }
.dot.dashed { background: repeating-linear-gradient(to right, #999 0 4rpx, transparent 4rpx 8rpx); }
.record-row { display: flex; justify-content: space-between; padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.record-date { font-size: 28rpx; color: #666; }
.record-value { font-size: 28rpx; font-weight: bold; color: #333; }
.empty { text-align: center; color: #ccc; padding: 40rpx 0; font-size: 28rpx; }
</style>
```

- [ ] **Step 5: Commit**

```bash
git add front/src/api/bodyData.ts \
        front/src/components/ \
        front/src/pages/data/weight.vue
git commit -m "feat: 实现体重记录页面（折线图 + 7日均值 + 记录列表）"
```

---

## Task 11: 数据中心总览页 + 围度/照片页（占位）

**Files:**
- Create: `front/src/pages/data/index.vue`
- Create: `front/src/pages/data/measurements.vue`
- Create: `front/src/pages/data/photos.vue`

- [ ] **Step 1: 写入数据中心总览 `front/src/pages/data/index.vue`**

```vue
<template>
  <view class="container">
    <!-- 总览卡片 -->
    <view class="overview-card">
      <view class="overview-item" @tap="goTo('weight')">
        <text class="label">今日体重</text>
        <text class="value">{{ latestWeight ?? '--' }} <text class="unit">kg</text></text>
        <text class="sub" v-if="weightDelta !== null">
          {{ weightDelta > 0 ? '+' : '' }}{{ weightDelta }} kg vs 上周
        </text>
      </view>
    </view>

    <!-- 快速入口 -->
    <view class="entry-grid">
      <view class="entry-item" @tap="goTo('weight')">
        <text class="entry-icon">⚖️</text>
        <text class="entry-label">体重</text>
      </view>
      <view class="entry-item" @tap="goTo('measurements')">
        <text class="entry-icon">📏</text>
        <text class="entry-label">围度</text>
      </view>
      <view class="entry-item" @tap="goTo('photos')">
        <text class="entry-icon">📷</text>
        <text class="entry-label">照片</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getWeightRecords } from '../../api/bodyData'
import { dateRange } from '../../utils/date'

const recentWeights = ref<{ weight: number; recordedAt: string }[]>([])

const latestWeight = computed(() =>
  recentWeights.value.length ? recentWeights.value[recentWeights.value.length - 1].weight : null
)

const weightDelta = computed(() => {
  if (recentWeights.value.length < 2) return null
  const latest = recentWeights.value[recentWeights.value.length - 1].weight
  const prev = recentWeights.value[0].weight
  return Math.round((latest - prev) * 10) / 10
})

function goTo(page: string) {
  uni.navigateTo({ url: `/pages/data/${page}` })
}

onMounted(async () => {
  const { startDate, endDate } = dateRange(7)
  const { records } = await getWeightRecords(startDate, endDate)
  recentWeights.value = records
})
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.overview-card { background: #333; color: #fff; border-radius: 24rpx; padding: 40rpx; margin-bottom: 24rpx; }
.label { font-size: 26rpx; opacity: 0.7; }
.value { font-size: 64rpx; font-weight: bold; display: block; margin-top: 8rpx; }
.unit { font-size: 32rpx; }
.sub { font-size: 24rpx; opacity: 0.7; display: block; margin-top: 8rpx; }
.entry-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24rpx; }
.entry-item { background: #fff; border-radius: 24rpx; padding: 32rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.entry-icon { font-size: 48rpx; }
.entry-label { font-size: 28rpx; color: #333; }
</style>
```

- [ ] **Step 2: 写入 `front/src/pages/data/measurements.vue`（核心逻辑）**

```vue
<template>
  <view class="container">
    <view class="card">
      <text class="card-title">围度记录</text>
      <view v-for="field in fields" :key="field.key" class="input-row">
        <text class="field-label">{{ field.label }}</text>
        <input type="digit" v-model="form[field.key]" :placeholder="'cm'" class="field-input" />
      </view>
      <button class="submit-btn" @tap="submit">保存今日围度</button>
    </view>

    <view class="card" v-if="latestRecord">
      <text class="card-title">上次记录（{{ latestRecord.recordedAt }}）</text>
      <view v-for="field in fields" :key="field.key" class="record-row">
        <text>{{ field.label }}</text>
        <text>{{ latestRecord[field.key] ?? '--' }} cm</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { createMeasurement, getMeasurements } from '../../api/bodyData'
import { today, dateRange } from '../../utils/date'
import { MeasurementRecord } from '../../types'

const fields = [
  { key: 'waist', label: '腰围' },
  { key: 'hip', label: '臀围' },
  { key: 'chest', label: '胸围' },
  { key: 'leftArm', label: '左臂围' },
  { key: 'rightArm', label: '右臂围' },
  { key: 'leftThigh', label: '左大腿' },
  { key: 'rightThigh', label: '右大腿' },
  { key: 'bodyFat', label: '体脂率' },
] as const

const form = reactive<Record<string, string>>({})
const latestRecord = ref<MeasurementRecord | null>(null)

async function submit() {
  const data: Record<string, unknown> = { recordedAt: today() }
  fields.forEach(f => { if (form[f.key]) data[f.key] = parseFloat(form[f.key]) })
  await createMeasurement(data)
  uni.showToast({ title: '记录成功', icon: 'success' })
  Object.keys(form).forEach(k => { form[k] = '' })
  await loadLatest()
}

async function loadLatest() {
  const { startDate, endDate } = dateRange(90)
  const records = await getMeasurements(startDate, endDate)
  latestRecord.value = records[records.length - 1] ?? null
}

onMounted(loadLatest)
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.card { background: #fff; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; }
.card-title { font-size: 32rpx; font-weight: bold; color: #333; display: block; margin-bottom: 24rpx; }
.input-row { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.field-label { font-size: 28rpx; color: #666; }
.field-input { font-size: 28rpx; text-align: right; width: 150rpx; }
.record-row { display: flex; justify-content: space-between; padding: 16rpx 0; font-size: 28rpx; color: #666; }
.submit-btn { margin-top: 32rpx; background: #333; color: #fff; border-radius: 48rpx; }
</style>
```

- [ ] **Step 3: 写入 `front/src/pages/data/photos.vue`（基础版）**

```vue
<template>
  <view class="container">
    <view class="card">
      <text class="card-title">上传进度照片</text>
      <view class="angle-tabs">
        <text
          v-for="a in angles"
          :key="a.value"
          :class="['angle-tab', { active: selectedAngle === a.value }]"
          @tap="selectedAngle = a.value"
        >{{ a.label }}</text>
      </view>
      <button class="upload-btn" @tap="choosePhoto">选择照片上传</button>
    </view>

    <view class="photo-grid">
      <view v-for="photo in photos" :key="photo.id" class="photo-item">
        <image :src="photo.photoUrl" mode="aspectFill" class="photo-img" />
        <text class="photo-meta">{{ photo.angle }} · {{ photo.recordedAt }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { uploadPhoto, getPhotos } from '../../api/bodyData'
import { today } from '../../utils/date'
import { ProgressPhoto } from '../../types'

const angles = [
  { label: '正面', value: 'FRONT' },
  { label: '侧面', value: 'SIDE' },
  { label: '背面', value: 'BACK' },
]
const selectedAngle = ref('FRONT')
const photos = ref<ProgressPhoto[]>([])

async function choosePhoto() {
  const res = await uni.chooseImage({ count: 1, sizeType: ['compressed'] })
  const tempPath = res.tempFilePaths[0]
  // 实际项目需上传到云存储，此处简化为直接使用临时路径
  const photo = await uploadPhoto({
    photoUrl: tempPath,
    angle: selectedAngle.value,
    recordedAt: today(),
  })
  photos.value.unshift(photo)
  uni.showToast({ title: '上传成功', icon: 'success' })
}

onMounted(async () => {
  photos.value = await getPhotos()
})
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.card { background: #fff; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; }
.card-title { font-size: 32rpx; font-weight: bold; color: #333; display: block; margin-bottom: 24rpx; }
.angle-tabs { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.angle-tab { padding: 12rpx 32rpx; border-radius: 32rpx; border: 1rpx solid #eee; font-size: 28rpx; color: #666; }
.angle-tab.active { background: #333; color: #fff; border-color: #333; }
.upload-btn { background: #333; color: #fff; border-radius: 48rpx; }
.photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.photo-item { background: #fff; border-radius: 16rpx; overflow: hidden; }
.photo-img { width: 100%; height: 300rpx; }
.photo-meta { font-size: 22rpx; color: #999; padding: 12rpx; display: block; }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add front/src/pages/data/
git commit -m "feat: 实现数据中心总览页、围度记录页、进度照片页"
```

---

## Task 12: 个人档案页 + Tab 占位页 + E2E 验证

**Files:**
- Create: `front/src/pages/profile/index.vue`
- Create: `front/src/pages/profile/edit.vue`
- Create: `front/src/pages/index/index.vue`（占位）
- Create: `front/src/pages/training/index.vue`（占位）

- [ ] **Step 1: 写入个人档案页 `front/src/pages/profile/index.vue`**

```vue
<template>
  <view class="container">
    <view class="profile-card">
      <view class="avatar-area">
        <text class="avatar">{{ userInitial }}</text>
      </view>
      <text class="nickname">{{ user?.nickname ?? '健身者' }}</text>
    </view>

    <view class="info-card">
      <view class="info-row">
        <text class="info-label">身高</text>
        <text class="info-value">{{ user?.height ?? '--' }} cm</text>
      </view>
      <view class="info-row">
        <text class="info-label">目标体重</text>
        <text class="info-value">{{ user?.targetWeight ?? '--' }} kg</text>
      </view>
      <view class="info-row">
        <text class="info-label">健身目标</text>
        <text class="info-value">{{ goalLabel }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">训练水平</text>
        <text class="info-value">{{ levelLabel }}</text>
      </view>
    </view>

    <button class="edit-btn" @tap="uni.navigateTo({ url: '/pages/profile/edit' })">编辑档案</button>
    <button class="logout-btn" @tap="userStore.logout()">退出登录</button>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const user = computed(() => userStore.user)
const userInitial = computed(() => user.value?.nickname?.[0] ?? '我')

const goalMap: Record<string, string> = {
  LOSE_FAT: '减脂', GAIN_MUSCLE: '增肌', BODY_SHAPE: '塑形', IMPROVE_FITNESS: '提升体能',
}
const levelMap: Record<string, string> = {
  BEGINNER: '入门', INTERMEDIATE: '中级', ADVANCED: '进阶',
}
const goalLabel = computed(() => user.value?.goal ? goalMap[user.value.goal] : '--')
const levelLabel = computed(() => levelMap[user.value?.level ?? 'BEGINNER'])

onMounted(() => userStore.fetchProfile())
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.profile-card { background: #333; color: #fff; border-radius: 24rpx; padding: 48rpx 32rpx; text-align: center; margin-bottom: 24rpx; }
.avatar { width: 120rpx; height: 120rpx; background: rgba(255,255,255,0.2); border-radius: 50%; font-size: 48rpx; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
.nickname { font-size: 36rpx; font-weight: bold; display: block; margin-top: 16rpx; }
.info-card { background: #fff; border-radius: 24rpx; padding: 8rpx 32rpx; margin-bottom: 24rpx; }
.info-row { display: flex; justify-content: space-between; padding: 28rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.info-label { font-size: 28rpx; color: #666; }
.info-value { font-size: 28rpx; color: #333; }
.edit-btn { background: #333; color: #fff; border-radius: 48rpx; margin-bottom: 24rpx; }
.logout-btn { background: #fff; color: #999; border: 1rpx solid #eee; border-radius: 48rpx; }
</style>
```

- [ ] **Step 2: 写入档案编辑页 `front/src/pages/profile/edit.vue`**

```vue
<template>
  <view class="container">
    <view class="form-card">
      <view class="form-row">
        <text class="form-label">昵称</text>
        <input v-model="form.nickname" placeholder="请输入昵称" class="form-input" />
      </view>
      <view class="form-row">
        <text class="form-label">身高 (cm)</text>
        <input type="digit" v-model="heightStr" placeholder="如 175" class="form-input" />
      </view>
      <view class="form-row">
        <text class="form-label">目标体重 (kg)</text>
        <input type="digit" v-model="targetWeightStr" placeholder="如 70" class="form-input" />
      </view>
      <view class="form-row">
        <text class="form-label">健身目标</text>
        <picker :range="goalOptions" :range-key="'label'" @change="onGoalChange">
          <text class="form-input">{{ currentGoalLabel }}</text>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-label">每周训练天数</text>
        <picker :range="[1,2,3,4,5,6,7]" @change="e => form.weeklyTrainingDays = Number(e.detail.value) + 1">
          <text class="form-input">{{ form.weeklyTrainingDays }} 天</text>
        </picker>
      </view>
    </view>
    <button class="save-btn" @tap="save" :loading="saving">保存</button>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { updateProfile } from '../../api/user'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const saving = ref(false)
const form = reactive({ nickname: '', weeklyTrainingDays: 3, goal: 'LOSE_FAT' })
const heightStr = ref('')
const targetWeightStr = ref('')

const goalOptions = [
  { label: '减脂', value: 'LOSE_FAT' },
  { label: '增肌', value: 'GAIN_MUSCLE' },
  { label: '塑形', value: 'BODY_SHAPE' },
  { label: '提升体能', value: 'IMPROVE_FITNESS' },
]
const currentGoalLabel = computed(() => goalOptions.find(g => g.value === form.goal)?.label ?? '')
function onGoalChange(e: { detail: { value: number } }) {
  form.goal = goalOptions[e.detail.value].value
}

async function save() {
  saving.value = true
  try {
    const updated = await updateProfile({
      nickname: form.nickname,
      height: parseFloat(heightStr.value) || undefined,
      targetWeight: parseFloat(targetWeightStr.value) || undefined,
      goal: form.goal as 'LOSE_FAT',
      weeklyTrainingDays: form.weeklyTrainingDays,
    })
    userStore.setUser(updated)
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1200)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  const user = userStore.user
  if (user) {
    form.nickname = user.nickname ?? ''
    heightStr.value = user.height ? String(user.height) : ''
    targetWeightStr.value = user.targetWeight ? String(user.targetWeight) : ''
    form.goal = user.goal ?? 'LOSE_FAT'
    form.weeklyTrainingDays = user.weeklyTrainingDays
  }
})
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.form-card { background: #fff; border-radius: 24rpx; padding: 8rpx 32rpx; margin-bottom: 24rpx; }
.form-row { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.form-label { font-size: 28rpx; color: #666; }
.form-input { font-size: 28rpx; color: #333; text-align: right; }
.save-btn { background: #333; color: #fff; border-radius: 48rpx; }
</style>
```

- [ ] **Step 3: 写入占位页**

写入 `front/src/pages/index/index.vue`：
```vue
<template>
  <view class="placeholder">
    <text>AI助手（Phase 3 实现）</text>
  </view>
</template>
<style>
.placeholder { display: flex; align-items: center; justify-content: center; height: 100vh; font-size: 32rpx; color: #ccc; }
</style>
```

写入 `front/src/pages/training/index.vue`：
```vue
<template>
  <view class="placeholder">
    <text>训练（Phase 2 实现）</text>
  </view>
</template>
<style>
.placeholder { display: flex; align-items: center; justify-content: center; height: 100vh; font-size: 32rpx; color: #ccc; }
</style>
```

- [ ] **Step 4: 运行后端全量测试，确保均通过**

```bash
cd /Users/eatong/eaTong_projects/aiji/backend
npm test
```

预期：`PASS` 所有测试套件

- [ ] **Step 5: 在微信开发者工具中验证以下路径**

```
1. 启动后端：cd backend && npm run dev
2. 打开微信开发者工具，导入 front/ 目录
3. 首次进入 → 自动跳转登录页 → 微信登录成功 → 进入主页
4. 点击「数据」Tab → 进入数据中心总览
5. 点击「体重」→ 输入体重 → 点击保存 → 列表更新，图表刷新
6. 点击「围度」→ 填写腰围/胸围 → 保存 → 显示上次记录
7. 点击「照片」→ 选择照片 → 上传成功 → 照片显示在列表
8. 点击「我」Tab → 显示个人信息 → 点击编辑 → 修改身高/目标 → 保存 → 返回页面更新
```

- [ ] **Step 6: Final Commit**

```bash
cd /Users/eatong/eaTong_projects/aiji
git add front/src/pages/
git commit -m "feat: 完成 Phase 1 全部前端页面（个人档案、数据总览、体重/围度/照片）"
git tag phase1-complete
```

---

## 自检清单

| 规格要求 | 对应 Task |
|---------|---------|
| 微信登录 | Task 5, 9 |
| 个人档案（身高/目标/水平/器材） | Task 6, 12 |
| 体重记录 + 折线图 + 7日均值 | Task 7, 10 |
| 围度记录（多部位） | Task 7, 11 |
| 进度照片上传（正/侧/背） | Task 7, 11 |
| 数据中心总览卡片 | Task 11 |
| 后端单元测试覆盖 | Task 5, 6, 7 |
| 重复日期体重拒绝（409） | Task 7 |
| 无 Token 返回 401 | Task 6 |
| Tab 导航 4 个 Tab | Task 8 |
