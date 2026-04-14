# Phase 2B: 训练计划 + 我的计划 + 围度趋势图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 完成 Phase 2 剩余功能——训练计划 AI 生成、我的计划页面（含周视图）、围度记录页面补充各部位趋势图、用户引导问卷、动作替换。

**更新时间：** 2026-04-14（补充引导问卷 + 动作替换）

---

## 文件结构

### 后端新增

```
backend/src/
├── routes/
│   ├── trainingPlan.ts         # /api/training-plans/*
│   └── onboarding.ts           # /api/onboarding/* (引导问卷)
├── controllers/
│   ├── trainingPlanController.ts
│   └── onboardingController.ts
├── services/
│   ├── trainingPlanService.ts  # AI 计划生成 + CRUD + 替换
│   └── onboardingService.ts   # 引导问卷业务逻辑
```

### 前端新增

```
front/src/
├── pages/training/
│   ├── plan-list.vue            # 我的计划列表
│   ├── plan-detail.vue          # 计划详情（周视图）+ 动作替换入口
│   └── plan-generate.vue        # AI 生成计划页
├── pages/onboarding/
│   └── index.vue                # 引导问卷页（4 步）
├── components/training/
│   └── ExerciseReplaceModal.vue # 替换动作弹窗
└── components/onboarding/       # 引导问卷子组件
    ├── StepIndicator.vue
    ├── StepGoal.vue
    ├── StepStatus.vue
    ├── StepBodyData.vue
    └── StepDuration.vue
```

### 前端修改

```
front/src/pages/data/measurements.vue   # 补充 9 个围度趋势图
```

---

## Task 1: 训练计划后端（AI 生成 + CRUD）

**Files:**
- Create: `backend/src/services/trainingPlanService.ts`
- Create: `backend/src/controllers/trainingPlanController.ts`
- Create: `backend/src/routes/trainingPlan.ts`
- Modify: `backend/src/routes/index.ts`（挂载路由）

### Prisma 模型（已在 Task 1 中创建）

```prisma
model WorkoutPlan {
  id          String   @id @default(uuid())
  userId      String
  name        String           // 如 "增肌周期第3周"
  weeks       Int              // 计划总周数
  startDate   DateTime @db.Date
  endDate     DateTime @db.Date
  status      PlanStatus @default(ACTIVE)  // ACTIVE / COMPLETED / ARCHIVED
  createdAt   DateTime @default(now())

  user        User @relation(...)
  planDays    PlanDay[]
}

model PlanDay {
  id           String @id @default(uuid())
  planId       String
  weekNumber   Int    // 1-based
  dayOfWeek    Int    // 1-7 (Mon-Sun)
  trainingType String // 如 "胸部+三头" / "休息日"

  plan          WorkoutPlan @relation(...)
  plannedExercises PlannedExercise[]
}

model PlannedExercise {
  id           String @id @default(uuid())
  planDayId    String
  exerciseId   String
  targetSets   Int
  targetReps   String   // "8-12"
  targetWeight Float?
  orderIndex   Int

  planDay   PlanDay @relation(...)
  exercise  Exercise @relation(...)
}
```

### AI 计划生成算法

**输入：** User 档案（goal, level, equipment, weeklyTrainingDays）

**输出：** WorkoutPlan + PlanDay[] + PlannedExercise[]

```ts
// 训练类型模板（按目标）
const TEMPLATES = {
  GAIN_MUSCLE: {
    weeklySchedule: ['chest+triceps', 'back+biceps', 'legs', 'shoulders+arms', 'rest', 'legs', 'core'],
    // 每周重量递增 +2.5%, 容量递增 +5%
  },
  LOSE_FAT: {
    weeklySchedule: ['chest+triceps', 'back+biceps', 'legs', 'shoulders+arms', 'cardio', 'full body', 'rest'],
    // 保持重量，降低容量，增加有氧
  },
  BODY_SHAPE: {
    weeklySchedule: ['upper body', 'lower body', 'cardio', 'upper body', 'lower body', 'full body', 'rest'],
  },
  IMPROVE_FITNESS: {
    weeklySchedule: ['push', 'pull', 'legs', 'push', 'pull', 'functional', 'rest'],
  },
}

// 按器材过滤可用动作
function getExercisesByEquipment(equipment: Equipment, category: string): Exercise[] {
  // ...
}

// 生成计划
export async function generateTrainingPlan(userId: string): Promise<WorkoutPlan> {
  // 1. 获取用户档案
  // 2. 选择模板
  // 3. 按周生成，每天选择动作（考虑恢复）
  // 4. 计算 startDate / endDate
  // 5. 保存 plan + planDays + plannedExercises
}
```

**关键逻辑：**
- 每肌群每周训练 1-2 次（大肌群如腿 7-10 天恢复）
- 初级用户：全身分离方案；中级用户： Push/Pull/Legs 方案
- 根据 equipment 过滤动作库（无健身房 → 自重/哑铃方案）
- 新计划从下周一开始，持续 4 周

### Service 函数

```ts
export async function generateTrainingPlan(userId: string): Promise<WorkoutPlan>
export async function getUserPlans(userId: string): Promise<WorkoutPlan[]>
export async function getPlanDetail(planId: string): Promise<WorkoutPlan & { planDays: PlanDay[] }>
export async function archivePlan(planId: string): Promise<void>
export async function completePlan(planId: string): Promise<void>
```

### Controller 路由

```
GET  /api/training-plans          # 用户所有计划
POST /api/training-plans/generate  # AI 生成新计划
GET  /api/training-plans/:id       # 计划详情（含每日安排）
PUT  /api/training-plans/:id/archive
PUT  /api/training-plans/:id/complete
```

---

## Task 2: 训练计划前端（plan-list + plan-detail + plan-generate）

**Files:**
- Create: `front/src/api/trainingPlan.ts`
- Create: `front/src/pages/training/plan-list.vue`
- Create: `front/src/pages/training/plan-detail.vue`
- Create: `front/src/pages/training/plan-generate.vue`

### plan-list.vue（我的计划）

```
Tab 3 主入口页面 → "我的计划" 入口
├── 当前进行中计划卡片（如果有）
│   ├── 计划名称 / 周期
│   ├── 进度条（已完成周数/总周数）
│   └── 本周安排概览
├── 历史计划列表（ARCHIVED）
└── "生成新计划" 按钮
```

### plan-detail.vue（计划详情）

```
├── 计划头部（名称 / 周期 / 进度）
├── 周切换 Tab（周1 / 周2 / 周3 / 周4）
├── 每日训练卡片（周一到周日）
│   ├── 休息日：显示 "休息" + 恢复建议
│   └── 训练日：显示动作列表（动作名 × 组数 × 次数）
└── 开始今日训练按钮（跳转到 today.vue 并携带 planDayId）
```

### plan-generate.vue（AI 生成计划）

```
├── 预览参数（基于用户档案）
│   ├── 训练类型（增肌/减脂/塑形/体能）
│   ├── 当前水平
│   ├── 器材
│   └── 每周训练天数
├── 调整参数（可选）
│   └── 每周训练天数微调
├── 生成预览（显示生成的每周安排）
└── 确认生成 → 保存并跳转到 plan-detail
```

### API

```ts
GET    /api/training-plans
POST   /api/training-plans/generate
GET    /api/training-plans/:id
PUT    /api/training-plans/:id/archive
PUT    /api/training-plans/:id/complete
```

---

## Task 3: 围度记录页面补充趋势图

**已实现（Phase 1 补充）：**
- Task 1: BodySilhouette 组件 ✅
- Task 2: MeasurementPopup ✅
- Task 3: MeasurementTrendChart ✅
- Task 4: measurements.vue 重构 ✅

**确认验证：** 确认 measurements.vue 已正确引入 9 个 MeasurementTrendChart 组件。

检查 `front/src/pages/data/measurements.vue` 是否已有趋势图代码，如缺失则补充。

---

## Task 4: 用户引导问卷

### 功能描述

新用户首次打开小程序时，引导完成基本信息收集，然后自动生成个性化训练计划。

### 问卷流程（4 步）

| Step | 内容 | 说明 |
|------|------|------|
| Step 1 | 健身目标 | 增肌 / 减脂 / 塑形 / 提升体能 |
| Step 2 | 当前状态 | 训练水平 + 器材 + 每周训练天数 |
| Step 3 | 身体数据（可选） | 身高 / 体重 / 目标体重（可跳过） |
| Step 4 | 健身时长 | 3个月以下 / 3-6个月 / 6-12个月 / 1年以上 |

### API

```
POST /api/onboarding/complete   # 提交问卷，生成计划
GET  /api/onboarding/status     # 获取引导状态
```

### 业务逻辑

```typescript
// 问卷提交后处理
async function processOnboarding(userId: string, data: OnboardingData) {
  // 1. 更新用户档案（goal, level, equipment, weeklyTrainingDays, fitnessDuration）
  // 2. 记录体重（如提供）到 BodyData
  // 3. 标记 hasCompletedOnboarding = true
  // 4. 生成训练计划
  return await generateTrainingPlan(userId)
}
```

### 文件清单

| 文件 | 状态 |
|------|------|
| `backend/prisma/schema.prisma` (User 新增字段) | ✅ |
| `backend/src/routes/onboarding.ts` | ✅ |
| `backend/src/controllers/onboardingController.ts` | ✅ |
| `backend/src/services/onboardingService.ts` | ✅ |
| `front/api/onboarding.ts` | ✅ |
| `front/pages/onboarding/index.vue` | ✅ |
| `front/components/onboarding/*.vue` (5个子组件) | ✅ |

---

## Task 5: 动作替换

### 功能描述

用户可在计划详情页点击动作卡片，选择替换原因（同类型动作列表），完成动作替换。

### 交互流程

```
[计划详情页] → 点击动作卡片 → [替换弹窗]
    ├── 选择替换原因：不感兴趣 / 没有器械 / 不会练 / 其他
    ├── 选择替换动作：同类型动作列表
    └── 确认替换 → 更新计划 + 记录历史
```

### API

```
GET  /api/training-plans/:planId/exercises/:exerciseId/replacable  # 获取可替换动作
PUT  /api/training-plans/:planId/exercises/:exerciseId/replace      # 执行替换
```

### 数据模型

```prisma
model PlanExerciseReplacement {
  id                  String   @id @default(uuid())
  plannedExerciseId   String   // 被替换的计划动作 ID
  originalExerciseId  String   // 原动作 ID
  newExerciseId       String   // 新动作 ID
  reason             String   // 替换原因
  createdAt          DateTime @default(now())
}
```

### 替换原因

| 原因 | 值 | 图标 |
|------|-----|------|
| 不感兴趣 | not_interested | 😴 |
| 没有器械 | no_equipment | 🏋️ |
| 不会练 | dont_know_how | 🤔 |
| 其他原因 | other | 📝 |

### 文件清单

| 文件 | 状态 |
|------|------|
| `backend/prisma/schema.prisma` (PlanExerciseReplacement) | ✅ |
| `backend/src/services/trainingPlanService.ts` (替换逻辑) | ✅ |
| `backend/src/controllers/trainingPlanController.ts` | ✅ |
| `backend/src/routes/trainingPlan.ts` | ✅ |
| `front/api/trainingPlan.ts` | ✅ |
| `front/components/training/ExerciseReplaceModal.vue` | ✅ |
| `front/pages/training/plan-detail.vue` (集成弹窗) | ✅ |

---

## 自检清单

| 规格要求 | 对应任务 | 状态 |
|---------|---------|------|
| AI 生成训练计划 | Task 1 | ✅ |
| 我的计划（概览 + 周视图 + 历史归档）| Task 2 | ✅ |
| 围度 9 部位趋势图 | Task 3 | ✅ |
| 用户引导问卷（4 步） | Task 4 | ✅ |
| 动作替换（原因 + 列表） | Task 5 | ✅ |
| 训练计划与训练日志关联（planId 传入）| Task 1, 2 | ✅ |
