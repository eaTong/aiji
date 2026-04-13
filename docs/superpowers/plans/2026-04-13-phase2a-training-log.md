# Phase 2A: 动作库 + 训练日志 + 恢复状态 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 实现动作库管理、训练日志记录（含 e1RM 计算）、恢复状态评分，让用户能记录训练并获得 AI 激励所需的数据基础。

**Architecture:** 前端 uni-app，后端 Koa + Prisma + MySQL。训练日志是核心数据源，支撑 Phase 3 的 AI 激励机制。

---

## 文件结构

### 后端新增

```
backend/src/
├── models/
│   └── exerciseSeed.ts          # 动作库初始数据
├── routes/
│   └── exercise.ts              # /api/exercises/*
├── controllers/
│   └── exerciseController.ts
├── services/
│   ├── exerciseService.ts       # 动作库 CRUD + 搜索
│   ├── trainingLogService.ts     # 训练日志 + 容量计算 + e1RM
│   └── recoveryService.ts        # 恢复状态算法
└── routes/
    ├── trainingLog.ts           # /api/training-logs/*
    └── recovery.ts              # /api/recovery/*
```

### 前端新增

```
front/src/
├── pages/training/
│   ├── today.vue                 # 今日训练执行界面
│   ├── library.vue               # 动作库浏览/搜索
│   └── exercise-detail.vue       # 动作详情
├── components/training/
│   ├── ExerciseCard.vue          # 动作卡片
│   ├── SetInput.vue              # 组次重量录入
│   └── RestTimer.vue             # 组间计时器
├── components/recovery/
│   ├── MuscleHeatmap.vue         # 肌群热力图
│   └── RecoveryScore.vue         # 恢复评分
└── api/
    ├── exercise.ts
    ├── trainingLog.ts
    └── recovery.ts
```

---

## Task 1: 动作库后端（Exercise 模型 + CRUD API）

**Files:**
- Create: `backend/prisma/schema.prisma` (追加 Exercise model)
- Create: `backend/src/routes/exercise.ts`
- Create: `backend/src/controllers/exerciseController.ts`
- Create: `backend/src/services/exerciseService.ts`
- Create: `backend/src/models/exerciseSeed.ts`
- Create: `backend/tests/exercise.test.ts`

- [ ] **Step 1: 追加 Exercise 模型到 schema**

```prisma
model Exercise {
  id            String   @id @default(uuid())
  name          String             // 中文名，如 "杠铃卧推"
  nameEn        String?            // 英文名
  category      ExerciseCategory
  equipment     Equipment
  primaryMuscles String[]          // 主肌群，如 ["chest", "triceps"]
  secondaryMuscles String[]        // 协同肌群
  instructions  String?            // 标准动作要点
  commonMistakes String?            // 常见错误
  videoUrl      String?
  isCustom      Boolean  @default(false)
  isFavorite    Boolean  @default(false)
  userId        String?            // 用户自定义动作
  createdAt     DateTime  @default(now())

  user          User?     @relation(fields: [userId], references: [id])
  logEntries    LogEntry[]
  plannedExercises PlannedExercise[]
}

enum ExerciseCategory {
  CHEST
  BACK
  LEGS
  SHOULDERS
  ARMS
  CORE
  CARDIO
}
```

- [ ] **Step 2: 写入 exerciseService.ts**

```ts
import { PrismaClient, ExerciseCategory, Equipment } from '@prisma/client'
const prisma = new PrismaClient()

export interface ExerciseFilter {
  category?: ExerciseCategory
  equipment?: Equipment
  keyword?: string
  userId?: string
  favoritesOnly?: boolean
}

export async function getExercises(filter: ExerciseFilter) {
  const where: Record<string, unknown> = { isCustom: false }
  if (filter.userId) {
    where.userId = filter.userId
    where.isCustom = true
  }
  if (filter.category) where.category = filter.category
  if (filter.equipment) where.equipment = filter.equipment
  if (filter.keyword) {
    where.OR = [
      { name: { contains: filter.keyword } },
      { nameEn: { contains: filter.keyword } },
    ]
  }
  if (filter.favoritesOnly) where.isFavorite = true

  return prisma.exercise.findMany({ where, orderBy: { name: 'asc' } })
}

export async function getExerciseById(id: string) {
  return prisma.exercise.findUniqueOrThrow({ where: { id } })
}

export async function toggleFavorite(userId: string, exerciseId: string) {
  const exercise = await prisma.exercise.findFirst({ where: { id: exerciseId } })
  if (!exercise) throw new Error('Exercise not found')
  // 如果是自定义动作，直接更新
  if (exercise.isCustom) {
    return prisma.exercise.update({ where: { id: exerciseId }, data: { isFavorite: !exercise.isFavorite } })
  }
  // 如果是系统动作，创建用户副本并标记收藏
  const userExercise = await prisma.exercise.findFirst({
    where: { userId, name: exercise.name, isCustom: true },
  })
  if (userExercise) {
    return prisma.exercise.update({ where: { id: userExercise.id }, data: { isFavorite: !userExercise.isFavorite } })
  }
  return prisma.exercise.create({
    data: {
      name: exercise.name,
      nameEn: exercise.nameEn,
      category: exercise.category,
      equipment: exercise.equipment,
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles,
      instructions: exercise.instructions,
      commonMistakes: exercise.commonMistakes,
      videoUrl: exercise.videoUrl,
      isCustom: true,
      isFavorite: true,
      userId,
    },
  })
}

export async function seedExercises() {
  // 初始动作库数据，插入所有常见训练动作
  const exercises = [
    // CHEST
    { name: '杠铃卧推', nameEn: 'Barbell Bench Press', category: 'CHEST', equipment: 'BARBELL', primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders'] },
    { name: '哑铃卧推', nameEn: 'Dumbbell Bench Press', category: 'CHEST', equipment: 'DUMBBELL', primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders'] },
    { name: '上斜杠铃卧推', nameEn: 'Incline Barbell Bench Press', category: 'CHEST', equipment: 'BARBELL', primaryMuscles: ['upper_chest'], secondaryMuscles: ['chest', 'triceps'] },
    { name: '双杠臂屈伸', nameEn: 'Dip', category: 'CHEST', equipment: 'BODYWEIGHT', primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders'] },
    { name: '绳索飞鸟', nameEn: 'Cable Fly', category: 'CHEST', equipment: 'CABLE', primaryMuscles: ['chest'], secondaryMuscles: [] },
    // BACK
    { name: '引体向上', nameEn: 'Pull-up', category: 'BACK', equipment: 'BODYWEIGHT', primaryMuscles: ['lats', 'biceps'], secondaryMuscles: ['back', 'core'] },
    { name: '高位下拉', nameEn: 'Lat Pulldown', category: 'BACK', equipment: 'CABLE', primaryMuscles: ['lats'], secondaryMuscles: ['biceps', 'back'] },
    { name: '杠铃划船', nameEn: 'Barbell Row', category: 'BACK', equipment: 'BARBELL', primaryMuscles: ['back', 'lats'], secondaryMuscles: ['biceps', 'core'] },
    { name: '坐姿划船', nameEn: 'Seated Cable Row', category: 'BACK', equipment: 'CABLE', primaryMuscles: ['back', 'lats'], secondaryMuscles: ['biceps'] },
    { name: '哑铃划船', nameEn: 'Dumbbell Row', category: 'BACK', equipment: 'DUMBBELL', primaryMuscles: ['lats', 'back'], secondaryMuscles: ['biceps'] },
    // LEGS
    { name: '杠铃深蹲', nameEn: 'Barbell Squat', category: 'LEGS', equipment: 'BARBELL', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'] },
    { name: '哑铃深蹲', nameEn: 'Dumbbell Squat', category: 'LEGS', equipment: 'DUMBBELL', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'] },
    { name: '腿举', nameEn: 'Leg Press', category: 'LEGS', equipment: 'MACHINE', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'] },
    { name: '腿弯举', nameEn: 'Leg Curl', category: 'LEGS', equipment: 'MACHINE', primaryMuscles: ['hamstrings'], secondaryMuscles: [] },
    { name: '腿伸展', nameEn: 'Leg Extension', category: 'LEGS', equipment: 'MACHINE', primaryMuscles: ['quads'], secondaryMuscles: [] },
    { name: '罗马尼亚硬拉', nameEn: 'Romanian Deadlift', category: 'LEGS', equipment: 'BARBELL', primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['back', 'core'] },
    { name: '保加利亚深蹲', nameEn: 'Bulgarian Split Squat', category: 'LEGS', equipment: 'DUMBBELL', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'] },
    // SHOULDERS
    { name: '杠铃肩推', nameEn: 'Barbell Shoulder Press', category: 'SHOULDERS', equipment: 'BARBELL', primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps'] },
    { name: '哑铃肩推', nameEn: 'Dumbbell Shoulder Press', category: 'SHOULDERS', equipment: 'DUMBBELL', primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps'] },
    { name: '侧平举', nameEn: 'Lateral Raise', category: 'SHOULDERS', equipment: 'DUMBBELL', primaryMuscles: ['side_delts'], secondaryMuscles: ['shoulders'] },
    { name: '面拉', nameEn: 'Face Pull', category: 'SHOULDERS', equipment: 'CABLE', primaryMuscles: ['rear_delts', 'upper_back'], secondaryMuscles: ['shoulders'] },
    // ARMS
    { name: '杠铃弯举', nameEn: 'Barbell Curl', category: 'ARMS', equipment: 'BARBELL', primaryMuscles: ['biceps'], secondaryMuscles: [] },
    { name: '哑铃弯举', nameEn: 'Dumbbell Curl', category: 'ARMS', equipment: 'DUMBBELL', primaryMuscles: ['biceps'], secondaryMuscles: [] },
    { name: '锤式弯举', nameEn: 'Hammer Curl', category: 'ARMS', equipment: 'DUMBBELL', primaryMuscles: ['biceps', 'brachialis'], secondaryMuscles: [] },
    { name: '绳索下压', nameEn: 'Cable Pushdown', category: 'ARMS', equipment: 'CABLE', primaryMuscles: ['triceps'], secondaryMuscles: [] },
    { name: '过头臂屈伸', nameEn: 'Overhead Tricep Extension', category: 'ARMS', equipment: 'DUMBBELL', primaryMuscles: ['triceps'], secondaryMuscles: [] },
    // CORE
    { name: '平板支撑', nameEn: 'Plank', category: 'CORE', equipment: 'BODYWEIGHT', primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'] },
    { name: '卷腹', nameEn: 'Crunch', category: 'CORE', equipment: 'BODYWEIGHT', primaryMuscles: ['abs'], secondaryMuscles: [] },
    { name: '悬垂举腿', nameEn: 'Hanging Leg Raise', category: 'CORE', equipment: 'BODYWEIGHT', primaryMuscles: ['abs', 'hip_flexors'], secondaryMuscles: ['core'] },
  ]
  // 批量插入，忽略已存在的
  for (const ex of exercises) {
    await prisma.exercise.upsert({
      where: { id: ex.name }, // 临时用 name 作为唯一键，实际用 uuid
      update: {},
      create: { id: require('uuid').v4(), ...ex },
    })
  }
}
```

> 注意：上述 seed 需要临时修改 schema 给 name 加 @unique 用于 upsert，或者先不 upsert，直接 createMany。

- [ ] **Step 3: 写入 exerciseController.ts**

```ts
import { Context } from 'koa'
import { getExercises, getExerciseById, toggleFavorite } from '../services/exerciseService'
import { success } from '../types'
import { AuthContext } from '../types'

export async function listExercises(ctx: AuthContext) {
  const { category, equipment, keyword, favorites } = ctx.query as Record<string, string>
  const exercises = await getExercises({
    category: category as any,
    equipment: equipment as any,
    keyword,
    favoritesOnly: favorites === 'true',
  })
  ctx.body = success(exercises)
}

export async function getExercise(ctx: AuthContext) {
  const { id } = ctx.params
  const exercise = await getExerciseById(id)
  ctx.body = success(exercise)
}

export async function favoriteExercise(ctx: AuthContext) {
  const { id } = ctx.params
  const userId = ctx.state.user.userId
  const result = await toggleFavorite(userId, id)
  ctx.body = success(result)
}
```

- [ ] **Step 4: 写入 routes/exercise.ts**

```ts
import Router from '@koa/router'
import { authMiddleware } from '../middleware/auth'
import { listExercises, getExercise, favoriteExercise } from '../controllers/exerciseController'

const router = new Router({ prefix: '/api/exercises' })
router.use(authMiddleware)
router.get('/', listExercises)
router.get('/:id', getExercise)
router.post('/:id/favorite', favoriteExercise)
export default router
```

- [ ] **Step 5: 挂载新路由到 app.ts（追加到 routes/index.ts）**

- [ ] **Step 6: 写测试 exercise.test.ts**

```ts
describe('GET /api/exercises', () => {
  it('should return exercise list', async () => {
    const res = await request(app.callback())
      .get('/api/exercises')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('should filter by category', async () => {
    const res = await request(app.callback())
      .get('/api/exercises?category=CHEST')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    res.body.data.forEach((ex: any) => expect(ex.category).toBe('CHEST'))
  })
})
```

- [ ] **Step 7: 运行测试确认通过后 Commit**

---

## Task 2: 训练日志后端（TrainingLog + LogEntry + e1RM）

**Files:**
- Create: `backend/prisma/schema.prisma` (追加 TrainingLog, LogEntry 模型)
- Create: `backend/src/routes/trainingLog.ts`
- Create: `backend/src/controllers/trainingLogController.ts`
- Create: `backend/src/services/trainingLogService.ts`
- Create: `backend/tests/trainingLog.test.ts`

- [ ] **Step 1: 追加 TrainingLog + LogEntry 模型**

```prisma
model TrainingLog {
  id          String    @id @default(uuid())
  userId      String
  planId      String?
  planDayId   String?
  startedAt   DateTime  @default(now())
  completedAt DateTime?
  duration    Int?       // 秒
  totalVolume Float?     // 总容量 kg = sum(weight × reps) 排除热身
  status      LogStatus @default(IN_PROGRESS)
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id])
  plan        TrainingPlan? @relation(fields: [planId], references: [id])
  logEntries  LogEntry[]
}

enum LogStatus {
  IN_PROGRESS
  COMPLETED
  ABANDONED
}

model LogEntry {
  id          String   @id @default(uuid())
  logId       String
  exerciseId  String
  exerciseName String  // 冗余存储，方便展示
  setNumber   Int
  weight      Float
  reps        Int
  isWarmup    Boolean  @default(false)
  e1rm        Float?   // 估算 1RM (Epley: weight × (1 + reps/30))
  completedAt DateTime @default(now())

  log        TrainingLog @relation(fields: [logId], references: [id])
  exercise   Exercise    @relation(fields: [exerciseId], references: [id])
}
```

- [ ] **Step 2: 写入 trainingLogService.ts**

```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// e1RM 计算（Epley 公式）
export function calcE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

// 计算一组容量（排除热身组）
function calcSetVolume(weight: number, reps: number, isWarmup: boolean): number {
  if (isWarmup) return 0
  return weight * reps
}

// 开始训练（创建 log）
export async function startTraining(userId: string, planId?: string, planDayId?: string) {
  return prisma.trainingLog.create({
    data: { userId, planId, planDayId },
  })
}

// 添加训练组次
export async function addLogEntry(
  logId: string,
  exerciseId: string,
  exerciseName: string,
  setNumber: number,
  weight: number,
  reps: number,
  isWarmup = false
) {
  const e1rm = isWarmup ? null : calcE1RM(weight, reps)
  return prisma.logEntry.create({
    data: { logId, exerciseId, exerciseName, setNumber, weight, reps, isWarmup, e1rm },
  })
}

// 完成训练（计算总容量）
export async function completeTraining(logId: string) {
  const log = await prisma.trainingLog.findUnique({
    where: { id: logId },
    include: { logEntries: true },
  })
  if (!log) throw new Error('Log not found')

  const totalVolume = log.logEntries.reduce((sum, entry) => {
    return sum + calcSetVolume(entry.weight, entry.reps, entry.isWarmup)
  }, 0)

  const duration = Math.round(
    (new Date().getTime() - log.startedAt.getTime()) / 1000
  )

  return prisma.trainingLog.update({
    where: { id: logId },
    data: { completedAt: new Date(), totalVolume, duration, status: 'COMPLETED' },
  })
}

// 获取用户训练历史（支持分页）
export async function getTrainingLogs(userId: string, limit = 20, offset = 0) {
  return prisma.trainingLog.findMany({
    where: { userId },
    include: { logEntries: { include: { exercise: true }, orderBy: { setNumber: 'asc' } } },
    orderBy: { startedAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

// 获取某动作的历史记录（用于参考重量）
export async function getExerciseHistory(userId: string, exerciseId: string, limit = 10) {
  return prisma.logEntry.findMany({
    where: { log: { userId }, exerciseId },
    orderBy: { completedAt: 'desc' },
    take: limit,
  })
}
```

- [ ] **Step 3: 写入 trainingLogController.ts**

```ts
import { Context } from 'koa'
import { AuthContext } from '../types'
import { success, fail } from '../types'
import {
  startTraining,
  addLogEntry,
  completeTraining,
  getTrainingLogs,
  getExerciseHistory,
} from '../services/trainingLogService'

export async function startLog(ctx: AuthContext) {
  const { planId, planDayId } = ctx.request.body as { planId?: string; planDayId?: string }
  const log = await startTraining(ctx.state.user.userId, planId, planDayId)
  ctx.body = success(log)
}

export async function addEntry(ctx: AuthContext) {
  const { logId, exerciseId, exerciseName, setNumber, weight, reps, isWarmup } = ctx.request.body as any
  if (!logId || !exerciseId || !setNumber || weight == null || reps == null) {
    ctx.status = 400
    ctx.body = fail('缺少必填字段', 400)
    return
  }
  const entry = await addLogEntry(logId, exerciseId, exerciseName, setNumber, weight, reps, isWarmup)
  ctx.body = success(entry)
}

export async function finishLog(ctx: AuthContext) {
  const { logId } = ctx.request.body as { logId: string }
  const log = await completeTraining(logId)
  ctx.body = success(log)
}

export async function listLogs(ctx: AuthContext) {
  const { limit, offset } = ctx.query as { limit?: string; offset?: string }
  const logs = await getTrainingLogs(
    ctx.state.user.userId,
    parseInt(limit ?? '20'),
    parseInt(offset ?? '0')
  )
  ctx.body = success(logs)
}

export async function exerciseHistory(ctx: AuthContext) {
  const { exerciseId } = ctx.params
  const history = await getExerciseHistory(ctx.state.user.userId, exerciseId)
  ctx.body = success(history)
}
```

- [ ] **Step 4: 写入 routes/trainingLog.ts**

```ts
import Router from '@koa/router'
import { authMiddleware } from '../middleware/auth'
import { startLog, addEntry, finishLog, listLogs, exerciseHistory } from '../controllers/trainingLogController'

const router = new Router({ prefix: '/api/training-logs' })
router.use(authMiddleware)
router.post('/', startLog)
router.post('/entries', addEntry)
router.post('/finish', finishLog)
router.get('/', listLogs)
router.get('/exercise/:exerciseId/history', exerciseHistory)
export default router
```

- [ ] **Step 5: 挂载路由**

- [ ] **Step 6: 写测试 trainingLog.test.ts（覆盖 start → addEntry → finish 全流程）**

- [ ] **Step 7: 运行测试确认通过后 Commit**

---

## Task 3: 恢复状态后端（Recovery 算法）

**Files:**
- Create: `backend/prisma/schema.prisma` (追加 RecoveryStatus model)
- Create: `backend/src/routes/recovery.ts`
- Create: `backend/src/controllers/recoveryController.ts`
- Create: `backend/src/services/recoveryService.ts`

- [ ] **Step 1: 追加 RecoveryStatus 模型**

```prisma
model RecoveryStatus {
  id             String   @id @default(uuid())
  userId         String
  date           DateTime @db.Date
  score          Int      // 0-100 综合恢复评分
  sleepHours     Float?
  muscleStatus   Json     // { "chest": 80, "back": 100, "legs": 60 }  0-100
  recommendation String   // TRAIN / REST / LIGHT
  createdAt      DateTime @default(now())

  @@unique([userId, date])
  user           User     @relation(fields: [userId], references: [id])
}
```

- [ ] **Step 2: 写入 recoveryService.ts**

```ts
import { PrismaClient } from '@prisma/client'
import { calcE1RM } from './trainingLogService'

const prisma = new PrismaClient()

// 肌群恢复所需时间（小时）
const MUSCLE_RECOVERY_HOURS: Record<string, number> = {
  chest: 48,
  back: 48,
  legs: 72,
  shoulders: 48,
  arms: 36,
  core: 24,
  // 细分肌群
  upper_chest: 48,
  lats: 48,
  quads: 72,
  hamstrings: 72,
  glutes: 48,
  triceps: 36,
  biceps: 36,
  abs: 24,
  side_delts: 48,
  rear_delts: 48,
}

// 计算某个动作涉及的肌群恢复状态
async function calcMuscleStatusFromLogs(userId: string, date: Date) {
  // 获取最近 7 天的训练日志
  const sevenDaysAgo = new Date(date)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const logs = await prisma.trainingLog.findMany({
    where: {
      userId,
      startedAt: { gte: sevenDaysAgo, lte: date },
      status: 'COMPLETED',
    },
    include: {
      logEntries: { include: { exercise: true } },
    },
  })

  const now = date.getTime()
  const muscleScores: Record<string, number> = {}

  for (const [muscle, recoveryHours] of Object.entries(MUSCLE_RECOVERY_HOURS)) {
    // 找最近一次训练该肌群的时间
    let lastTrained: Date | null = null
    for (const log of logs) {
      for (const entry of log.logEntries) {
        const primary = entry.exercise.primaryMuscles as string[]
        if (primary.includes(muscle)) {
          if (!lastTrarained || log.startedAt > lastTrained) {
            lastTrained = log.startedAt
          }
        }
      }
    }

    if (!lastTrained) {
      // 未训练过，完全恢复
      muscleScores[muscle] = 100
    } else {
      const hoursSince = (now - lastTrained.getTime()) / (1000 * 3600)
      const recovery = Math.min(100, Math.round((hoursSince / recoveryHours) * 100))
      muscleScores[muscle] = recovery
    }
  }

  return muscleScores
}

// 综合恢复评分 = 肌群恢复均值（可加入睡眠因子）
async function calcRecoveryScore(muscleScores: Record<string, number>, sleepHours?: number): Promise<number> {
  const values = Object.values(muscleScores)
  const avgMuscle = values.reduce((a, b) => a + b, 0) / values.length
  // 睡眠因子：每少1小时扣2分，基准8小时
  const sleepFactor = sleepHours != null ? Math.max(0, (sleepHours - 8) * 2) : 0
  return Math.min(100, Math.round(avgMuscle - sleepFactor))
}

// 推荐训练建议
function getRecommendation(score: number): string {
  if (score < 50) return 'REST'
  if (score < 75) return 'LIGHT'
  return 'TRAIN'
}

// 获取或计算某日恢复状态
export async function getRecoveryStatus(userId: string, date: Date) {
  const existing = await prisma.recoveryStatus.findUnique({
    where: { userId_date: { userId, date } },
  })
  if (existing) return existing

  // 懒计算：从训练日志推导
  const muscleStatus = await calcMuscleStatusFromLogs(userId, date)
  const score = await calcRecoveryScore(muscleStatus)
  const recommendation = getRecommendation(score)

  return prisma.recoveryStatus.create({
    data: { userId, date, score, muscleStatus, recommendation },
  })
}

// 手动记录睡眠（更新当日恢复状态）
export async function updateSleep(userId: string, date: Date, sleepHours: number) {
  const muscleStatus = await calcMuscleStatusFromLogs(userId, date)
  const score = await calcRecoveryScore(muscleStatus, sleepHours)
  const recommendation = getRecommendation(score)

  return prisma.recoveryStatus.upsert({
    where: { userId_date: { userId, date } },
    update: { sleepHours, score, muscleStatus, recommendation },
    create: { userId, date, sleepHours, score, muscleStatus, recommendation },
  })
}
```

- [ ] **Step 3: 写入 recoveryController.ts**

```ts
import { Context } from 'koa'
import { AuthContext } from '../types'
import { success } from '../types'
import { getRecoveryStatus, updateSleep } from '../services/recoveryService'

export async function getRecovery(ctx: AuthContext) {
  const { date } = ctx.query as { date?: string }
  const targetDate = date ? new Date(date) : new Date()
  const status = await getRecoveryStatus(ctx.state.user.userId, targetDate)
  ctx.body = success(status)
}

export async function updateSleepRecord(ctx: AuthContext) {
  const { date, sleepHours } = ctx.request.body as { date: string; sleepHours: number }
  const status = await updateSleep(ctx.state.user.userId, new Date(date), sleepHours)
  ctx.body = success(status)
}
```

- [ ] **Step 4: 写入 routes/recovery.ts**

```ts
import Router from '@koa/router'
import { authMiddleware } from '../middleware/auth'
import { getRecovery, updateSleepRecord } from '../controllers/recoveryController'

const router = new Router({ prefix: '/api/recovery' })
router.use(authMiddleware)
router.get('/', getRecovery)
router.post('/sleep', updateSleepRecord)
export default router
```

- [ ] **Step 5: 挂载路由后 Commit**

---

## Task 4: 今日训练前端（today.vue + 组件）

**Files:**
- Create: `front/src/api/trainingLog.ts`
- Create: `front/src/components/training/ExerciseCard.vue`
- Create: `front/src/components/training/SetInput.vue`
- Create: `front/src/components/training/RestTimer.vue`
- Create: `front/src/pages/training/today.vue`

- [ ] **Step 1: 写入 front/src/api/trainingLog.ts**

```ts
import { request } from './request'

export interface LogEntry {
  id: string
  exerciseId: string
  exerciseName: string
  setNumber: number
  weight: number
  reps: number
  isWarmup: boolean
  e1rm?: number
}

export interface TrainingLog {
  id: string
  startedAt: string
  completedAt?: string
  duration?: number
  totalVolume?: number
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
  logEntries: LogEntry[]
}

export function startTrainingLog(planId?: string, planDayId?: string): Promise<TrainingLog> {
  return request('POST', '/api/training-logs', { planId, planDayId })
}

export function addLogEntry(data: {
  logId: string
  exerciseId: string
  exerciseName: string
  setNumber: number
  weight: number
  reps: number
  isWarmup?: boolean
}): Promise<LogEntry> {
  return request('POST', '/api/training-logs/entries', data)
}

export function finishTrainingLog(logId: string): Promise<TrainingLog> {
  return request('POST', '/api/training-logs/finish', { logId })
}

export function getTrainingLogs(limit?: number, offset?: number): Promise<TrainingLog[]> {
  return request('GET', `/api/training-logs?limit=${limit ?? 20}&offset=${offset ?? 0}`)
}

export function getExerciseHistory(exerciseId: string): Promise<LogEntry[]> {
  return request('GET', `/api/training-logs/exercise/${exerciseId}/history`)
}
```

- [ ] **Step 2: 写入 ExerciseCard.vue**

```vue
<template>
  <view class="exercise-card">
    <view class="card-header">
      <text class="exercise-name">{{ exercise.name }}</text>
      <text class="muscle-tag">{{ muscleLabel }}</text>
    </view>
    <view class="card-body">
      <view class="info-row" v-if="lastRecord">
        <text class="info-label">上次</text>
        <text class="info-value">{{ lastRecord.weight }}kg × {{ lastRecord.reps }}</text>
        <text class="e1rm">e1RM {{ lastRecord.e1rm ?? '--' }}kg</text>
      </view>
      <view class="sets-list">
        <SetInput
          v-for="(set, idx) in sets"
          :key="idx"
          :set-number="idx + 1"
          v-model:weight="set.weight"
          v-model:reps="set.reps"
          v-model:is-warmup="set.isWarmup"
          :suggested-weight="lastRecord?.weight"
          @remove="removeSet(idx)"
        />
      </view>
      <button class="add-set-btn" @tap="addSet">+ 添加一组</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SetInput from './SetInput.vue'

const props = defineProps<{
  exercise: { id: string; name: string; primaryMuscles: string[] }
  lastRecord?: { weight: number; reps: number; e1rm?: number }
}>()

const emit = defineEmits<{ (e: 'change', sets: Set[]): void }>()

interface Set { weight: number; reps: number; isWarmup: boolean }
const sets = ref<Set[]>([{ weight: 0, reps: 0, isWarmup: false }])

const muscleLabels: Record<string, string> = {
  chest: '胸肌', back: '背部', legs: '腿部', shoulders: '肩部',
  arms: '手臂', core: '核心', upper_chest: '上胸', lats: '背阔肌',
  quads: '股四头肌', hamstrings: '腘绳肌', glutes: '臀肌',
  triceps: '三头', biceps: '二头', abs: '腹肌',
  side_delts: '侧肩', rear_delts: '后肩',
}

const muscleLabel = computed(() =>
  props.exercise.primaryMuscles.map((m: string) => muscleLabels[m] ?? m).join(' / ')
)

function addSet() {
  sets.value.push({ weight: sets.value[sets.value.length - 1]?.weight ?? 0, reps: 0, isWarmup: false })
  emitChange()
}

function removeSet(idx: number) {
  sets.value.splice(idx, 1)
  emitChange()
}

function emitChange() {
  emit('change', sets.value)
}
</script>

<style scoped>
.exercise-card { background: #fff; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.exercise-name { font-size: 32rpx; font-weight: bold; color: #333; }
.muscle-tag { font-size: 24rpx; color: #999; background: #f5f5f5; padding: 8rpx 16rpx; border-radius: 16rpx; }
.card-body { display: flex; flex-direction: column; gap: 16rpx; }
.info-row { display: flex; align-items: center; gap: 12rpx; font-size: 28rpx; }
.info-label { color: #999; }
.info-value { color: #333; font-weight: bold; }
.e1rm { color: #666; font-size: 24rpx; }
.sets-list { display: flex; flex-direction: column; gap: 12rpx; }
.add-set-btn { background: #f5f5f5; color: #666; border-radius: 16rpx; font-size: 28rpx; padding: 20rpx; }
</style>
```

- [ ] **Step 3: 写入 SetInput.vue**

```vue
<template>
  <view class="set-row" :class="{ warmup: isWarmup }">
    <text class="set-num">{{ setNumber }}</text>
    <input
      type="digit"
      :value="weight"
      @input="onWeightInput"
      placeholder="重量"
      class="weight-input"
    />
    <text class="unit">kg</text>
    <text class="separator">×</text>
    <input
      type="number"
      :value="reps"
      @input="onRepsInput"
      placeholder="次数"
      class="reps-input"
    />
    <text class="unit">次</text>
    <view class="warmup-toggle" @tap="toggleWarmup">
      <text :class="['toggle-label', { active: isWarmup }]">热身</text>
    </view>
    <text class="remove-btn" @tap="emit('remove')">×</text>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{
  setNumber: number
  weight: number
  reps: number
  isWarmup: boolean
  suggestedWeight?: number
}>()

const emit = defineEmits<{
  (e: 'update:weight', v: number): void
  (e: 'update:reps', v: number): void
  (e: 'update:isWarmup', v: boolean): void
  (e: 'remove'): void
}>()

function onWeightInput(e: any) {
  emit('update:weight', parseFloat(e.detail.value) || 0)
}
function onRepsInput(e: any) {
  emit('update:reps', parseInt(e.detail.value) || 0)
}
function toggleWarmup() {
  emit('update:isWarmup', !props.isWarmup)
}
</script>

<style scoped>
.set-row { display: flex; align-items: center; gap: 8rpx; padding: 16rpx; background: #f9f9f9; border-radius: 16rpx; }
.set-row.warmup { background: #fff9f0; }
.set-num { width: 40rpx; text-align: center; font-size: 28rpx; color: #999; font-weight: bold; }
.weight-input, .reps-input { background: #fff; border-radius: 8rpx; padding: 12rpx 16rpx; font-size: 28rpx; text-align: center; }
.weight-input { width: 100rpx; }
.reps-input { width: 80rpx; }
.unit { font-size: 24rpx; color: #999; }
.separator { color: #ccc; font-size: 28rpx; }
.warmup-toggle { margin-left: 12rpx; }
.toggle-label { font-size: 22rpx; padding: 6rpx 12rpx; border-radius: 12rpx; background: #e8e8e8; color: #999; }
.toggle-label.active { background: #ffe4b5; color: #f60; }
.remove-btn { font-size: 36rpx; color: #ccc; margin-left: 8rpx; }
</style>
```

- [ ] **Step 4: 写入 RestTimer.vue**

```vue
<template>
  <view v-if="visible" class="timer-overlay" @tap="skip">
    <view class="timer-card" @tap.stop>
      <text class="timer-title">组间休息</text>
      <text class="timer-display">{{ displayTime }}</text>
      <view class="timer-controls">
        <button class="timer-btn add" @tap="addTime">+30s</button>
        <button class="timer-btn skip" @tap="skip">跳过</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean
  duration?: number  // 秒
}>(), { duration: 90 })

const emit = defineEmits<{
  (e: 'done'): void
  (e: 'skip'): void
}>()

const remaining = ref(props.duration)
let interval: ReturnType<typeof setInterval> | null = null

watch(() => props.visible, (v) => {
  if (v) {
    remaining.value = props.duration
    startTimer()
  } else {
    stopTimer()
  }
})

function startTimer() {
  stopTimer()
  interval = setInterval(() => {
    remaining.value--
    if (remaining.value <= 0) {
      stopTimer()
      emit('done')
    }
  }, 1000)
}

function stopTimer() {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
}

const displayTime = computed(() => {
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

function addTime() {
  remaining.value += 30
}

function skip() {
  stopTimer()
  emit('skip')
}
</script>

<style scoped>
.timer-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.timer-card { background: #fff; border-radius: 32rpx; padding: 64rpx; text-align: center; width: 400rpx; }
.timer-title { font-size: 28rpx; color: #999; display: block; margin-bottom: 24rpx; }
.timer-display { font-size: 120rpx; font-weight: bold; color: #333; display: block; margin-bottom: 48rpx; font-variant-numeric: tabular-nums; }
.timer-controls { display: flex; gap: 24rpx; justify-content: center; }
.timer-btn { flex: 1; height: 88rpx; line-height: 88rpx; border-radius: 44rpx; font-size: 32rpx; }
.timer-btn.add { background: #f5f5f5; color: #333; }
.timer-btn.skip { background: #333; color: #fff; }
</style>
```

- [ ] **Step 5: 写入 today.vue（核心训练执行页面）**

```vue
<template>
  <view class="container">
    <!-- 训练头部 -->
    <view class="train-header">
      <view class="header-left">
        <text class="train-date">{{ todayStr }}</text>
        <text class="train-status">{{ logStatus }}</text>
      </view>
      <view class="header-right">
        <text class="timer-display-mini" v-if="elapsedTime">{{ elapsedDisplay }}</text>
        <text class="volume-display" v-if="totalVolume > 0">容量 {{ totalVolume }}kg</text>
      </view>
    </view>

    <!-- 无进行中训练 -->
    <view v-if="!currentLogId" class="empty-state">
      <text class="empty-icon">💪</text>
      <text class="empty-text">今日还没有开始训练</text>
      <button class="start-btn" @tap="startTraining">开始训练</button>
    </view>

    <!-- 训练动作列表 -->
    <view v-else class="exercise-list">
      <ExerciseCard
        v-for="item in exerciseItems"
        :key="item.exercise.id"
        :exercise="item.exercise"
        :last-record="item.lastRecord"
        @change="(sets) => onExerciseChange(item.exercise.id, item.exercise.name, sets)"
      />
    </view>

    <!-- 添加动作 -->
    <button v-if="currentLogId" class="add-exercise-btn" @tap="goToLibrary">
      + 添加动作
    </button>

    <!-- 完成训练 -->
    <button
      v-if="currentLogId && exerciseItems.length > 0"
      class="finish-btn"
      @tap="finishTraining"
    >
      完成训练
    </button>

    <!-- 组间计时器 -->
    <RestTimer
      :visible="timerVisible"
      :duration="restDuration"
      @done="timerVisible = false"
      @skip="timerVisible = false"
    />

    <!-- 训练选择器（弹窗） -->
    <view v-if="showExercisePicker" class="picker-mask" @tap="showExercisePicker = false">
      <view class="picker-card" @tap.stop>
        <text class="picker-title">选择动作</text>
        <input
          v-model="searchKeyword"
          placeholder="搜索动作..."
          class="search-input"
          @input="searchExercises"
        />
        <scroll-view scroll-y class="exercise-scroll">
          <view
            v-for="ex in filteredExercises"
            :key="ex.id"
            class="picker-item"
            @tap="pickExercise(ex)"
          >
            <text class="picker-name">{{ ex.name }}</text>
            <text class="picker-muscle">{{ ex.category }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ExerciseCard from '../../components/training/ExerciseCard.vue'
import RestTimer from '../../components/training/RestTimer.vue'
import { startTrainingLog, addLogEntry, finishTrainingLog, getTrainingLogs, getExerciseHistory } from '../../api/trainingLog'
import { getExercises } from '../../api/exercise'
import { formatDate } from '../../utils/date'

interface Set { weight: number; reps: number; isWarmup: boolean }
interface Exercise { id: string; name: string; category: string; primaryMuscles: string[] }
interface ExerciseItem { exercise: Exercise; lastRecord?: { weight: number; reps: number; e1rm?: number } }
interface LogEntryData { exerciseId: string; exerciseName: string; setNumber: number; weight: number; reps: number; isWarmup: boolean }

const todayStr = formatDate(new Date())
const currentLogId = ref<string | null>(null)
const exerciseItems = ref<ExerciseItem[]>([])
const allEntries = ref<LogEntryData[]>([]) // 待提交 entries
const totalVolume = ref(0)
const elapsedSeconds = ref(0)
const timerVisible = ref(false)
const restDuration = ref(90)
const showExercisePicker = ref(false)
const searchKeyword = ref('')
const filteredExercises = ref<Exercise[]>([])
const allExercises = ref<Exercise[]>([])

let elapsedTimer: ReturnType<typeof setInterval> | null = null

const logStatus = computed(() => {
  if (!currentLogId.value) return '未开始'
  if (exerciseItems.value.length === 0) return '添加动作'
  return '进行中'
})

const elapsedDisplay = computed(() => {
  const m = Math.floor(elapsedSeconds.value / 60)
  const s = elapsedSeconds.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

async function startTraining() {
  const log = await startTrainingLog()
  currentLogId.value = log.id
  startTimer()
}

function startTimer() {
  stopTimer()
  elapsedTimer = setInterval(() => { elapsedSeconds.value++ }, 1000)
}

function stopTimer() {
  if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null }
}

async function goToLibrary() {
  allExercises.value = await getExercises({}) as Exercise[]
  filteredExercises.value = allExercises.value
  showExercisePicker.value = true
}

function searchExercises() {
  const kw = searchKeyword.value.toLowerCase()
  filteredExercises.value = allExercises.value.filter(
    (ex) => ex.name.toLowerCase().includes(kw) || ex.nameEn?.toLowerCase().includes(kw)
  )
}

async function pickExercise(ex: Exercise) {
  showExercisePicker.value = false
  // 获取该动作历史
  let lastRecord
  try {
    const history = await getExerciseHistory(ex.id) as any[]
    if (history.length) {
      const best = history.sort((a, b) => (b.e1rm ?? 0) - (a.e1rm ?? 0))[0]
      lastRecord = { weight: best.weight, reps: best.reps, e1rm: best.e1rm }
    }
  } catch {}
  exerciseItems.value.push({ exercise: ex, lastRecord })
}

async function onExerciseChange(exerciseId: string, exerciseName: string, sets: Set[]) {
  const existing = allEntries.value.filter((e) => e.exerciseId === exerciseId)
  allEntries.value = allEntries.value.filter((e) => e.exerciseId !== exerciseId)
  sets.forEach((s, idx) => {
    if (s.weight > 0 && s.reps > 0) {
      allEntries.value.push({
        exerciseId,
        exerciseName,
        setNumber: idx + 1,
        weight: s.weight,
        reps: s.reps,
        isWarmup: s.isWarmup,
      })
    }
  })
  // 计算临时容量
  totalVolume.value = allEntries.value.reduce((sum, e) => {
    return e.isWarmup ? sum : sum + e.weight * e.reps
  }, 0)
}

async function finishTraining() {
  if (!currentLogId.value) return
  // 先提交所有 entries
  for (const entry of allEntries.value) {
    await addLogEntry({ logId: currentLogId.value, ...entry })
  }
  const completed = await finishTrainingLog(currentLogId.value)
  stopTimer()
  uni.showModal({
    title: '训练完成',
    content: `总容量: ${completed.totalVolume}kg\n时长: ${Math.round((completed.duration ?? 0) / 60)}分钟`,
    showCancel: false,
  })
  currentLogId.value = null
  exerciseItems.value = []
  allEntries.value = []
  totalVolume.value = 0
  elapsedSeconds.value = 0
}

// 检查是否有进行中的训练
onMounted(async () => {
  try {
    const logs = await getTrainingLogs(10, 0) as any[]
    const inProgress = logs.find((l) => l.status === 'IN_PROGRESS')
    if (inProgress) {
      currentLogId.value = inProgress.id
      elapsedSeconds.value = Math.round((Date.now() - new Date(inProgress.startedAt).getTime()) / 1000)
      startTimer()
    }
  } catch {}
})

onUnmounted(() => { stopTimer() })
</script>

<style scoped>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.train-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32rpx; }
.train-date { font-size: 32rpx; font-weight: bold; color: #333; }
.train-status { font-size: 24rpx; color: #999; margin-left: 16rpx; }
.timer-display-mini { font-size: 28rpx; color: #666; font-variant-numeric: tabular-nums; margin-right: 16rpx; }
.volume-display { font-size: 28rpx; color: #07c160; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; }
.empty-icon { font-size: 120rpx; }
.empty-text { font-size: 28rpx; color: #999; margin: 24rpx 0; }
.start-btn { background: #333; color: #fff; border-radius: 48rpx; padding: 24rpx 80rpx; font-size: 32rpx; }
.exercise-list { display: flex; flex-direction: column; gap: 24rpx; }
.add-exercise-btn { background: #fff; color: #333; border: 2rpx solid #333; border-radius: 48rpx; padding: 24rpx; font-size: 32rpx; margin-top: 16rpx; }
.finish-btn { background: #07c160; color: #fff; border-radius: 48rpx; padding: 28rpx; font-size: 34rpx; margin-top: 24rpx; }
.picker-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 999; }
.picker-card { background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 48rpx 40rpx; width: 100%; }
.picker-title { font-size: 36rpx; font-weight: bold; color: #333; display: block; margin-bottom: 24rpx; }
.search-input { background: #f5f5f5; border-radius: 16rpx; padding: 24rpx; font-size: 28rpx; margin-bottom: 24rpx; }
.exercise-scroll { max-height: 600rpx; }
.picker-item { display: flex; justify-content: space-between; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.picker-name { font-size: 30rpx; color: #333; }
.picker-muscle { font-size: 24rpx; color: #999; }
</style>
```

- [ ] **Step 6: 写入 front/src/api/exercise.ts**

```ts
import { request } from './request'

export interface Exercise {
  id: string
  name: string
  nameEn?: string
  category: string
  equipment: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions?: string
  commonMistakes?: string
  isFavorite: boolean
}

export function getExercises(params?: {
  category?: string
  equipment?: string
  keyword?: string
  favorites?: boolean
}): Promise<Exercise[]> {
  const q = new URLSearchParams()
  if (params?.category) q.set('category', params.category)
  if (params?.equipment) q.set('equipment', params.equipment)
  if (params?.keyword) q.set('keyword', params.keyword)
  if (params?.favorites) q.set('favorites', 'true')
  return request('GET', `/api/exercises?${q.toString()}`)
}

export function getExercise(id: string): Promise<Exercise> {
  return request('GET', `/api/exercises/${id}`)
}

export function toggleFavorite(id: string): Promise<Exercise> {
  return request('POST', `/api/exercises/${id}/favorite`)
}
```

- [ ] **Step 7: Commit**

---

## Task 5: 恢复状态前端（MuscleHeatmap + RecoveryScore）

**Files:**
- Create: `front/src/components/recovery/MuscleHeatmap.vue`
- Create: `front/src/components/recovery/RecoveryScore.vue`
- Create: `front/src/pages/training/recovery.vue`
- Create: `front/src/api/recovery.ts`

- [ ] **Step 1: 写入 front/src/api/recovery.ts**

```ts
import { request } from './request'

export interface RecoveryStatus {
  date: string
  score: number
  sleepHours?: number
  muscleStatus: Record<string, number>  // muscle -> 0-100
  recommendation: 'TRAIN' | 'REST' | 'LIGHT'
}

export function getRecovery(date?: string): Promise<RecoveryStatus> {
  const q = date ? `?date=${date}` : ''
  return request('GET', `/api/recovery${q}`)
}

export function updateSleep(date: string, sleepHours: number): Promise<RecoveryStatus> {
  return request('POST', '/api/recovery/sleep', { date, sleepHours })
}
```

- [ ] **Step 2: 写入 MuscleHeatmap.vue**

```vue
<template>
  <view class="heatmap-container">
    <text class="heatmap-title">肌群恢复状态</text>
    <view class="muscle-grid">
      <view
        v-for="item in muscleItems"
        :key="item.key"
        class="muscle-item"
        :style="{ background: getColor(item.value) }"
      >
        <text class="muscle-name">{{ item.label }}</text>
        <text class="muscle-value">{{ item.value }}%</text>
      </view>
    </view>
    <view class="color-bar">
      <text class="color-label">未恢复</text>
      <view class="color-gradient" />
      <text class="color-label">已恢复</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  muscleStatus: Record<string, number>  // 如 { chest: 80, back: 100, legs: 60 }
}>()

const labels: Record<string, string> = {
  chest: '胸', back: '背', legs: '腿', shoulders: '肩',
  arms: '手臂', core: '核心', upper_chest: '上胸', lats: '背阔',
  quads: '股四', hamstrings: '腘绳', glutes: '臀', triceps: '三头',
  biceps: '二头', abs: '腹', side_delts: '侧肩', rear_delts: '后肩',
}

const muscleItems = computed(() =>
  Object.entries(props.muscleStatus).map(([key, value]) => ({
    key,
    label: labels[key] ?? key,
    value,
  }))
)

function getColor(value: number): string {
  if (value < 40) return '#FFCDD2'  // 红 - 未恢复
  if (value < 70) return '#FFE0B2'  // 橙 - 部分恢复
  return '#C8E6C9'                   // 绿 - 已恢复
}
</script>

<style scoped>
.heatmap-container { background: #fff; border-radius: 24rpx; padding: 32rpx; }
.heatmap-title { font-size: 32rpx; font-weight: bold; color: #333; display: block; margin-bottom: 24rpx; }
.muscle-grid { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 24rpx; }
.muscle-item { width: calc(33.33% - 8rpx); padding: 20rpx 16rpx; border-radius: 16rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.muscle-name { font-size: 24rpx; color: #333; }
.muscle-value { font-size: 28rpx; font-weight: bold; color: #333; }
.color-bar { display: flex; align-items: center; gap: 16rpx; }
.color-gradient { flex: 1; height: 16rpx; border-radius: 8rpx; background: linear-gradient(to right, #FFCDD2, #FFE0B2, #C8E6C9); }
.color-label { font-size: 22rpx; color: #999; }
</style>
```

- [ ] **Step 3: 写入 RecoveryScore.vue**

```vue
<template>
  <view class="score-container">
    <view class="score-circle">
      <text class="score-num">{{ score }}</text>
      <text class="score-label">恢复评分</text>
    </view>
    <view class="recommendation-badge" :class="recommendation.toLowerCase()">
      <text class="badge-text">{{ recommendationLabel }}</text>
    </view>
    <view class="sleep-input" v-if="editable">
      <text class="sleep-label">睡眠时长</text>
      <input type="digit" v-model="sleepStr" placeholder="小时" class="sleep-input-field" @blur="updateSleep" />
      <text class="sleep-unit">小时</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  score: number
  recommendation: 'TRAIN' | 'REST' | 'LIGHT'
  sleepHours?: number
  editable?: boolean
}>()

const emit = defineEmits<{ (e: 'sleep', hours: number): void }>()

const sleepStr = ref(props.sleepHours?.toString() ?? '')

const recommendationLabel = computed(() => {
  if (props.recommendation === 'TRAIN') return '适合训练'
  if (props.recommendation === 'LIGHT') return '轻度活动'
  return '充分休息'
})

function updateSleep() {
  const h = parseFloat(sleepStr.value)
  if (!isNaN(h) && h > 0) emit('sleep', h)
}
</script>

<style scoped>
.score-container { background: #fff; border-radius: 24rpx; padding: 32rpx; display: flex; align-items: center; gap: 32rpx; }
.score-circle { width: 160rpx; height: 160rpx; border-radius: 50%; background: #f5f5f5; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.score-num { font-size: 56rpx; font-weight: bold; color: #333; }
.score-label { font-size: 22rpx; color: #999; }
.recommendation-badge { padding: 16rpx 32rpx; border-radius: 24rpx; font-size: 28rpx; font-weight: bold; }
.badge-text { color: #fff; }
.badge.train { background: #07c160; }
.badge.light { background: #ff9800; }
.badge.rest { background: #999; }
.sleep-input { display: flex; align-items: center; gap: 8rpx; margin-left: auto; }
.sleep-label { font-size: 26rpx; color: #999; }
.sleep-input-field { background: #f5f5f5; border-radius: 8rpx; padding: 12rpx 16rpx; width: 100rpx; font-size: 28rpx; text-align: center; }
.sleep-unit { font-size: 26rpx; color: #666; }
</style>
```

- [ ] **Step 4: 写入 recovery.vue 页面**

```vue
<template>
  <view class="container">
    <RecoveryScore
      :score="status.score"
      :recommendation="status.recommendation"
      :sleep-hours="status.sleepHours"
      :editable="true"
      @sleep="onSleepInput"
    />
    <MuscleHeatmap :muscle-status="status.muscleStatus" />
    <view class="tips-card">
      <text class="tips-title">恢复建议</text>
      <text class="tips-content">{{ tipText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import RecoveryScore from '../../components/recovery/RecoveryScore.vue'
import MuscleHeatmap from '../../components/recovery/MuscleHeatmap.vue'
import { getRecovery, updateSleep, RecoveryStatus } from '../../api/recovery'
import { formatDate } from '../../utils/date'

const status = ref<RecoveryStatus>({
  score: 100,
  recommendation: 'TRAIN',
  muscleStatus: {},
  date: formatDate(new Date()),
})

const tipText = computed(() => {
  const r = status.value.recommendation
  const score = status.value.score
  if (r === 'REST') return '身体恢复不足，建议今日休息。可进行轻度拉伸或散步。'
  if (r === 'LIGHT') return '可以选择轻度活动，如瑜伽、散步或主动恢复训练。'
  const lowMuscles = Object.entries(status.value.muscleStatus)
    .filter(([, v]) => v < 70)
    .map(([k]) => k)
  if (lowMuscles.length) return `大部分肌群恢复良好。可以训练，注意还未恢复的肌群（${lowMuscles.join(',')}）避免过度使用。`
  return '身体状态良好，适合进行完整训练！'
})

async function loadData(date?: string) {
  status.value = await getRecovery(date)
}

async function onSleepInput(hours: number) {
  const today = formatDate(new Date())
  await updateSleep(today, hours)
  await loadData(today)
}

onMounted(() => loadData())
</script>

<style scoped>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; display: flex; flex-direction: column; gap: 24rpx; }
.tips-card { background: #fff; border-radius: 24rpx; padding: 32rpx; }
.tips-title { font-size: 32rpy; font-weight: bold; color: #333; display: block; margin-bottom: 16rpx; }
.tips-content { font-size: 28rpx; color: #666; line-height: 1.6; }
</style>
```

- [ ] **Step 5: Commit**

---

## Task 6: 动作库前端（library.vue + exercise-detail.vue）

**Files:**
- Create: `front/src/pages/training/library.vue`
- Create: `front/src/pages/training/exercise-detail.vue`

- [ ] **Step 1: 写入 library.vue**

```vue
<template>
  <view class="container">
    <!-- 搜索 -->
    <view class="search-bar">
      <input
        v-model="keyword"
        placeholder="搜索动作..."
        class="search-input"
        @input="onSearch"
      />
    </view>

    <!-- 分类筛选 -->
    <scroll-view scroll-x class="category-tabs">
      <view
        v-for="cat in categories"
        :key="cat.value"
        :class="['tab', { active: selectedCategory === cat.value }]"
        @tap="selectCategory(cat.value)"
      >
        {{ cat.label }}
      </view>
    </scroll-view>

    <!-- 动作列表 -->
    <view class="exercise-list">
      <view
        v-for="ex in exercises"
        :key="ex.id"
        class="exercise-item"
        @tap="goDetail(ex)"
      >
        <view class="ex-info">
          <text class="ex-name">{{ ex.name }}</text>
          <text class="ex-meta">{{ catLabel(ex.category) }} · {{ equipLabel(ex.equipment) }}</text>
        </view>
        <view class="ex-muscles">
          <text
            v-for="m in ex.primaryMuscles"
            :key="m"
            class="muscle-tag"
          >{{ m }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getExercises, Exercise } from '../../api/exercise'

const keyword = ref('')
const selectedCategory = ref('')
const exercises = ref<Exercise[]>([])

const categories = [
  { label: '全部', value: '' },
  { label: '胸部', value: 'CHEST' },
  { label: '背部', value: 'BACK' },
  { label: '腿部', value: 'LEGS' },
  { label: '肩部', value: 'SHOULDERS' },
  { label: '手臂', value: 'ARMS' },
  { label: '核心', value: 'CORE' },
]

const catLabels: Record<string, string> = { CHEST: '胸', BACK: '背', LEGS: '腿', SHOULDERS: '肩', ARMS: '手臂', CORE: '核心', CARDIO: '有氧' }
const equipLabels: Record<string, string> = { BARBELL: '杠铃', DUMBBELL: '哑铃', CABLE: '绳索', MACHINE: '器械', BODYWEIGHT: '自重' }

const catLabel = (c: string) => catLabels[c] ?? c
const equipLabel = (e: string) => equipLabels[e] ?? e

async function loadExercises() {
  exercises.value = await getExercises({
    category: selectedCategory.value || undefined,
    keyword: keyword.value || undefined,
  }) as Exercise[]
}

function onSearch() {
  loadExercises()
}

function selectCategory(cat: string) {
  selectedCategory.value = cat
  loadExercises()
}

function goDetail(ex: Exercise) {
  uni.navigateTo({ url: `/pages/training/exercise-detail?id=${ex.id}` })
}

onMounted(loadExercises)
</script>

<style scoped>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.search-bar { margin-bottom: 24rpx; }
.search-input { background: #fff; border-radius: 16rpx; padding: 24rpx; font-size: 28rpx; }
.category-tabs { white-space: nowrap; margin-bottom: 24rpx; }
.tab { display: inline-block; padding: 12rpx 32rpx; border-radius: 32rpx; font-size: 28rpx; color: #666; margin-right: 16rpx; }
.tab.active { background: #333; color: #fff; }
.exercise-list { display: flex; flex-direction: column; gap: 16rpx; }
.exercise-item { background: #fff; border-radius: 20rpx; padding: 28rpx; }
.ex-info { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.ex-name { font-size: 32rpx; font-weight: bold; color: #333; }
.ex-meta { font-size: 24rpx; color: #999; }
.ex-muscles { display: flex; gap: 8rpx; flex-wrap: wrap; }
.muscle-tag { font-size: 22rpx; padding: 6rpx 16rpx; background: #f5f5f5; color: #666; border-radius: 12rpx; }
</style>
```

- [ ] **Step 2: 写入 exercise-detail.vue**

```vue
<template>
  <view class="container" v-if="exercise">
    <view class="header-card">
      <text class="ex-name">{{ exercise.name }}</text>
      <text class="ex-name-en">{{ exercise.nameEn }}</text>
      <view class="tags">
        <text class="tag">{{ catLabel(exercise.category) }}</text>
        <text class="tag">{{ equipLabel(exercise.equipment) }}</text>
      </view>
    </view>

    <view class="section" v-if="exercise.primaryMuscles?.length">
      <text class="section-title">目标肌群</text>
      <view class="muscle-list">
        <text v-for="m in exercise.primaryMuscles" :key="m" class="muscle-chip primary">{{ m }}</text>
        <text v-for="m in exercise.secondaryMuscles" :key="m" class="muscle-chip secondary">{{ m }}</text>
      </view>
    </view>

    <view class="section" v-if="exercise.instructions">
      <text class="section-title">标准动作</text>
      <text class="section-content">{{ exercise.instructions }}</text>
    </view>

    <view class="section" v-if="exercise.commonMistakes">
      <text class="section-title">常见错误</text>
      <text class="section-content error">{{ exercise.commonMistakes }}</text>
    </view>

    <view class="section" v-if="history.length">
      <text class="section-title">我的记录</text>
      <view v-for="h in history" :key="h.id" class="history-item">
        <text class="history-date">{{ h.completedAt?.slice(0, 10) }}</text>
        <text class="history-value">{{ h.weight }}kg × {{ h.reps }}</text>
        <text class="history-e1rm">e1RM {{ h.e1rm ?? '--' }}kg</text>
      </view>
    </view>

    <button class="favorite-btn" @tap="toggleFav">
      {{ exercise.isFavorite ? '取消收藏' : '收藏动作' }}
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getExercise, toggleFavorite, getExerciseHistory, Exercise } from '../../api/exercise'

const exercise = ref<Exercise | null>(null)
const history = ref<any[]>([])

const catLabels: Record<string, string> = { CHEST: '胸部', BACK: '背部', LEGS: '腿部', SHOULDERS: '肩部', ARMS: '手臂', CORE: '核心' }
const equipLabels: Record<string, string> = { BARBELL: '杠铃', DUMBBELL: '哑铃', CABLE: '绳索', MACHINE: '器械', BODYWEIGHT: '自重' }
const catLabel = (c: string) => catLabels[c] ?? c
const equipLabel = (e: string) => equipLabels[e] ?? e

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const id = page.options?.id
  if (!id) return
  exercise.value = await getExercise(id) as Exercise
  try { history.value = await getExerciseHistory(id) as any[] } catch {}
})

async function toggleFav() {
  if (!exercise.value) return
  const updated = await toggleFavorite(exercise.value.id) as Exercise
  exercise.value.isFavorite = updated.isFavorite
}
</script>

<style scoped>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; display: flex; flex-direction: column; gap: 24rpx; }
.header-card { background: #fff; border-radius: 24rpx; padding: 40rpx; }
.ex-name { font-size: 40rpx; font-weight: bold; color: #333; display: block; }
.ex-name-en { font-size: 28rpx; color: #999; display: block; margin-top: 8rpx; }
.tags { display: flex; gap: 16rpx; margin-top: 24rpx; }
.tag { font-size: 24rpx; padding: 8rpx 24rpx; background: #f5f5f5; color: #666; border-radius: 16rpx; }
.section { background: #fff; border-radius: 24rpx; padding: 32rpx; }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; display: block; margin-bottom: 16rpx; }
.section-content { font-size: 28rpx; color: #666; line-height: 1.6; }
.section-content.error { color: #f60; }
.muscle-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.muscle-chip { font-size: 26rpx; padding: 8rpx 20rpx; border-radius: 16rpx; }
.muscle-chip.primary { background: #333; color: #fff; }
.muscle-chip.secondary { background: #f5f5f5; color: #666; }
.history-item { display: flex; justify-content: space-between; padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.history-date { font-size: 26rpx; color: #999; }
.history-value { font-size: 28rpx; font-weight: bold; color: #333; }
.history-e1rm { font-size: 24rpx; color: #666; }
.favorite-btn { background: #fff; color: #333; border: 2rpx solid #333; border-radius: 48rpx; padding: 28rpx; font-size: 32rpx; }
</style>
```

- [ ] **Step 3: Commit**

---

## Task 7: 整合到 Tab 3 + 恢复页面入口

**Files:**
- Modify: `front/src/pages/training/index.vue`（替换占位页）
- Create: `front/src/pages/training/recovery.vue`（恢复状态独立页面）

- [ ] **Step 1: 重写 training/index.vue**

```vue
<template>
  <view class="container">
    <!-- 今日恢复状态 -->
    <RecoveryScore
      :score="recoveryScore"
      :recommendation="recommendation"
      :editable="true"
      @sleep="updateSleep"
    />

    <!-- 快捷操作 -->
    <view class="quick-actions">
      <view class="action-card" @tap="goToday">
        <text class="action-icon">💪</text>
        <text class="action-label">今日训练</text>
      </view>
      <view class="action-card" @tap="goRecovery">
        <text class="action-icon">📊</text>
        <text class="action-label">恢复状态</text>
      </view>
      <view class="action-card" @tap="goLibrary">
        <text class="action-icon">📚</text>
        <text class="action-label">动作库</text>
      </view>
    </view>

    <!-- 最近训练 -->
    <view class="recent-card">
      <text class="card-title">最近训练</text>
      <view v-if="recentLogs.length === 0" class="empty">暂无训练记录</view>
      <view v-for="log in recentLogs" :key="log.id" class="log-item">
        <text class="log-date">{{ log.startedAt.slice(0, 10) }}</text>
        <text class="log-volume">{{ log.totalVolume ?? 0 }}kg</text>
        <text class="log-status" :class="log.status.toLowerCase()">{{ statusLabel(log.status) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import RecoveryScore from '../../components/recovery/RecoveryScore.vue'
import { getRecovery } from '../../api/recovery'
import { getTrainingLogs } from '../../api/trainingLog'

const recoveryScore = ref(100)
const recommendation = ref<'TRAIN' | 'REST' | 'LIGHT'>('TRAIN')
const recentLogs = ref<any[]>([])

function goToday() { uni.navigateTo({ url: '/pages/training/today' }) }
function goRecovery() { uni.navigateTo({ url: '/pages/training/recovery' }) }
function goLibrary() { uni.navigateTo({ url: '/pages/training/library' }) }

async function updateSleep(hours: number) {
  const today = new Date().toISOString().slice(0, 10)
  await import('../../api/recovery').then(m => m.updateSleep(today, hours))
  const status = await getRecovery()
  recoveryScore.value = status.score
  recommendation.value = status.recommendation
}

function statusLabel(s: string) {
  return { IN_PROGRESS: '进行中', COMPLETED: '已完成', ABANDONED: '已放弃' }[s] ?? s
}

onMounted(async () => {
  try {
    const status = await getRecovery()
    recoveryScore.value = status.score
    recommendation.value = status.recommendation
  } catch {}
  try {
    recentLogs.value = (await getTrainingLogs(5, 0) as any[]).filter(l => l.status !== 'IN_PROGRESS')
  } catch {}
})
</script>

<style scoped>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; display: flex; flex-direction: column; gap: 24rpx; }
.quick-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24rpx; }
.action-card { background: #fff; border-radius: 24rpx; padding: 40rpx 20rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.action-icon { font-size: 56rpx; }
.action-label { font-size: 28rpx; color: #333; }
.recent-card { background: #fff; border-radius: 24rpx; padding: 32rpx; }
.card-title { font-size: 32rpx; font-weight: bold; color: #333; display: block; margin-bottom: 24rpx; }
.log-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.log-date { font-size: 28rpx; color: #666; }
.log-volume { font-size: 28rpx; font-weight: bold; color: #333; }
.log-status { font-size: 24rpx; padding: 4rpx 12rpx; border-radius: 12rpx; }
.log-status.completed { background: #e8f5e9; color: #07c160; }
.log-status.abandoned { background: #f5f5f5; color: #999; }
.empty { text-align: center; color: #ccc; padding: 40rpx; font-size: 28rpx; }
</style>
```

- [ ] **Step 2: 添加 pages.json 路由（追加新页面）**

```json
{
  "pages": [
    "pages/training/today",
    "pages/training/library",
    "pages/training/exercise-detail",
    "pages/training/recovery"
  ]
}
```

- [ ] **Step 3: Commit**

---

## 自检清单

| 规格要求 | 对应任务 |
|---------|---------|
| 动作库 CRUD + 分类搜索 | Task 1 |
| 训练日志记录（开始→组次→完成）| Task 2, 4 |
| e1RM 计算（Epley 公式）| Task 2 |
| 组间计时器 | Task 4 (RestTimer) |
| 恢复状态算法 + 热力图 | Task 3, 5 |
| 今日训练建议（练/休/轻度）| Task 3, 5 |
| Tab 3 整合入口 | Task 7 |
